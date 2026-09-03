import { prisma } from '@proai/db';
import type { LearnerStats, ModuleProgressRow, PointsEntry } from '@proai/types';
import { computeStreak, getActivityDays } from './streak';

/**
 * Повна картина прогресу слухача — те, що показує сторінка «Прогрес».
 *
 * Усе рахується з історії (Progress, Attempt, ExamAttempt), а не зі збережених
 * лічильників: збережений лічильник рано чи пізно розходиться з реальністю, і
 * тоді сторінка статистики починає брехати — найгірше, що вона може робити.
 *
 * Запитів фіксована кількість незалежно від розміру курсу: одна вибірка курсу
 * з ієрархією, одна — прогресу, одна — спроб тестів.
 */

/** Скільки балів дає кожна дія. Свідомо просто: людина має вміти порахувати сама. */
export const POINTS = {
  /** За кожен пройдений урок. */
  lesson: 10,
  /** За кожен повністю пройдений модуль (усі уроки + зарахований тест). */
  module: 25,
  /** Максимум за тест модуля; фактично — пропорційно найкращому балу. */
  quiz: 50,
  /** За кожен день, коли слухач навчався. */
  activeDay: 5,
  /** За складену фінальну атестацію. */
  exam: 150,
} as const;

/**
 * `courseSlug` звужує статистику до одного курсу. Якщо його немає (слухач ще
 * не обрав курс, а їх на платформі кілька) — рахуємо по всіх курсах одразу.
 * Інакше сторінка показувала б «0 з 0 уроків» людині, яка вже щось пройшла:
 * прогрес існує незалежно від того, чи натиснуто «Розпочати курс».
 */
export async function getLearnerStats(userId: string, courseSlug: string | null): Promise<LearnerStats> {
  const courses = await prisma.course.findMany({
    where: courseSlug ? { slug: courseSlug } : {},
    orderBy: { title: 'asc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: { select: { id: true, minutes: true } },
              quiz: { select: { id: true, passScore: true } },
            },
          },
        },
      },
      finalExam: { select: { id: true } },
    },
  });

  // Курс у відповіді — лише коли він справді один і обраний: заголовок сторінки
  // не має називати конкретний курс, коли цифри зібрані з усіх.
  const course = courseSlug ? (courses[0] ?? null) : null;
  const examIds = courses.flatMap((c) => (c.finalExam ? [c.finalExam.id] : []));

  const modules = courses.flatMap((c) =>
    c.sections.flatMap((s) =>
      s.modules.map((m) => ({ ...m, sectionTitle: s.title, sectionSlug: s.slug, sectionOrder: s.order })),
    ),
  );
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const quizIds = modules.flatMap((m) => (m.quiz ? [m.quiz.id] : []));

  const [progressRows, attempts, examAttempts, certificates, activity] = await Promise.all([
    prisma.progress.findMany({ where: { userId }, select: { lessonId: true, completedAt: true } }),
    quizIds.length
      ? prisma.attempt.findMany({
          where: { userId, quizId: { in: quizIds } },
          select: { quizId: true, score: true, passed: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [],
    examIds.length
      ? prisma.examAttempt.findMany({
          where: { userId, examId: { in: examIds } },
          select: { score: true, securityScore: true, passed: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [],
    prisma.certificate.count({ where: { userId, revoked: false } }),
    getActivityDays(userId),
  ]);

  const doneLessonIds = new Set(progressRows.map((p) => p.lessonId));
  const streak = computeStreak(activity);

  /* --- Тести: остання спроба вирішує зарахування, найкраща — бал ---------- */
  const latest = new Map<string, { score: number; passed: boolean }>();
  const best = new Map<string, number>();
  const tries = new Map<string, number>();
  for (const a of attempts) {
    if (!latest.has(a.quizId)) latest.set(a.quizId, { score: a.score, passed: a.passed });
    best.set(a.quizId, Math.max(best.get(a.quizId) ?? 0, a.score));
    tries.set(a.quizId, (tries.get(a.quizId) ?? 0) + 1);
  }

  /* --- Рядок на кожен модуль курсу ---------------------------------------- */
  const moduleRows: ModuleProgressRow[] = modules.map((m) => {
    const completedLessons = m.lessons.filter((l) => doneLessonIds.has(l.id)).length;
    const quizPassed = m.quiz ? (latest.get(m.quiz.id)?.passed ?? false) : null;
    const allLessonsDone = m.lessons.length > 0 && completedLessons === m.lessons.length;
    const completed = allLessonsDone && (m.quiz ? quizPassed === true : true);

    return {
      slug: m.slug,
      title: m.title,
      order: m.order,
      isKey: m.isKey,
      sectionTitle: m.sectionTitle,
      sectionSlug: m.sectionSlug,
      lessonCount: m.lessons.length,
      completedLessons,
      minutes: m.minutes,
      hasQuiz: !!m.quiz,
      quizPassed,
      passScore: m.quiz?.passScore ?? m.passScore,
      bestScore: m.quiz ? (best.get(m.quiz.id) ?? null) : null,
      attempts: m.quiz ? (tries.get(m.quiz.id) ?? 0) : 0,
      status: completed ? 'DONE' : completedLessons > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    };
  });

  const completedModules = moduleRows.filter((m) => m.status === 'DONE');

  /* --- Розділи ------------------------------------------------------------- */
  const sections = courses.flatMap((c) => c.sections).map((s) => {
    const rows = moduleRows.filter((m) => m.sectionSlug === s.slug);
    return {
      slug: s.slug,
      title: s.title,
      color: s.color,
      order: s.order,
      moduleCount: rows.length,
      completedModules: rows.filter((m) => m.status === 'DONE').length,
      lessonCount: rows.reduce((sum, m) => sum + m.lessonCount, 0),
      completedLessons: rows.reduce((sum, m) => sum + m.completedLessons, 0),
    };
  });

  /* --- Хвилини: рахуємо реально пройдені уроки, а не частку модуля -------- */
  const lessonMinutes = new Map<string, number>();
  for (const m of modules) for (const l of m.lessons) lessonMinutes.set(l.id, l.minutes);
  const minutes = [...doneLessonIds].reduce((sum, id) => sum + (lessonMinutes.get(id) ?? 0), 0);


  /* --- Тести загалом ------------------------------------------------------- */
  const quizzesTaken = latest.size;
  const quizzesPassed = [...latest.values()].filter((a) => a.passed).length;
  const bestScores = [...best.values()];
  const averageBest = bestScores.length
    ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length)
    : null;

  const examPassed = examAttempts.some((a) => a.passed);
  const examBest = examAttempts.length ? Math.max(...examAttempts.map((a) => a.score)) : null;

  /* --- Бали ----------------------------------------------------------------
     Рахуємо з тих самих чисел, що показані в плитках: інакше сторінка
     повідомляла б «0 уроків пройдено» і тут-таки нараховувала за них бали. */
  const lessonsCompleted = moduleRows.reduce((sum, m) => sum + m.completedLessons, 0);

  const quizPoints = [...best.entries()]
    .filter(([quizId]) => latest.get(quizId)?.passed)
    .reduce((sum, [, score]) => sum + Math.round((score / 100) * POINTS.quiz), 0);

  const points: PointsEntry[] = [
    { label: 'Пройдені уроки', count: lessonsCompleted, each: `${POINTS.lesson} за урок`, points: lessonsCompleted * POINTS.lesson },
    { label: 'Завершені модулі', count: completedModules.length, each: `${POINTS.module} за модуль`, points: completedModules.length * POINTS.module },
    { label: 'Складені тести', count: quizzesPassed, each: `до ${POINTS.quiz} за бал тесту`, points: quizPoints },
    { label: 'Дні навчання', count: streak.activeDays, each: `${POINTS.activeDay} за день`, points: streak.activeDays * POINTS.activeDay },
    { label: 'Фінальна атестація', count: examPassed ? 1 : 0, each: `${POINTS.exam} за складену`, points: examPassed ? POINTS.exam : 0 },
  ];

  const completions = progressRows.map((p) => p.completedAt).sort((a, b) => a.getTime() - b.getTime());

  return {
    course: course ? { slug: course.slug, title: course.title } : null,
    lessons: { completed: lessonsCompleted, total: lessonIds.length },
    modules: { completed: completedModules.length, total: moduleRows.length },
    sections,
    moduleRows,
    minutes,
    streak,
    activity,
    points,
    totalPoints: points.reduce((sum, p) => sum + p.points, 0),
    quizzes: { taken: quizzesTaken, passed: quizzesPassed, total: quizIds.length, averageBest },
    exam: { attempts: examAttempts.length, bestScore: examBest, passed: examPassed },
    certificates,
    startedAt: completions[0] ? completions[0].toISOString() : null,
    lastActivityAt: streak.lastActiveDate,
  };
}
