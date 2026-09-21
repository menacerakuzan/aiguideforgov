import { prisma } from '@proai/db';
import {
  POINTS,
  computeStreak,
  dayNumber,
  dayStamp,
  getLearnerStats,
  resolveActiveCourseSlug,
  stampFromNumber,
  type ActivityDay,
} from '@proai/learning';
import { alignsWithQuestions, attemptCorrectness, parseAnswers, parseOptions } from './scoring';
import type {
  AdminAnalytics,
  AdminCertificateRow,
  AdminLearnerDetail,
  AdminLearnerRow,
  AdminMistake,
  AdminQuestionStat,
  LearnerJourneyStatus,
} from '@proai/types';

/**
 * Адмін-аналітика: одна вибірка бази — і таблиця людей, і зведення по курсу.
 *
 * Два правила, на яких тут усе тримається.
 *
 * 1. **Рахуємо з історії, не з лічильників.** Джерело правди — Progress,
 *    Attempt, ExamAttempt. `User.streak` лишається кешем для швидких списків,
 *    але аналітика його не питає: збережене число рано чи пізно розходиться з
 *    реальністю, і тоді адмін і слухач бачать різні цифри про одне й те саме.
 *    Формули повторюють `getLearnerStats` навмисно — щоб /progress слухача й
 *    картка в адмінці ніколи не суперечили одна одній.
 *
 * 2. **Один прохід по базі на всю сторінку.** Раніше /admin рахував прогрес
 *    окремим запитом на кожного користувача (N+1), а сторінка відвалу — двома
 *    запитами на кожен урок. Тут усі рядки читаються пакетно (шість запитів
 *    незалежно від кількості людей і уроків), а зведення збирається в памʼяті.
 */

/** Скільки днів без активності робить людину «сплячою» — її варто гукнути. */
const DORMANT_DAYS = 14;
/** Глибина графіка активності платформи. */
const DAILY_WINDOW = 30;

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/* ===========================================================================
   Граф курсу: розділи → модулі → уроки + тест із питаннями
   ======================================================================== */

interface LessonNode {
  id: string;
  title: string;
  order: number;
  minutes: number;
  moduleId: string;
  moduleTitle: string;
  sectionTitle: string;
}

interface QuestionNode {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  moduleTitle: string;
}

interface ModuleNode {
  id: string;
  slug: string;
  title: string;
  order: number;
  isKey: boolean;
  passScore: number;
  sectionTitle: string;
  lessons: LessonNode[];
  quiz: { id: string; passScore: number; questions: QuestionNode[] } | null;
}

interface CourseGraph {
  modules: ModuleNode[];
  lessons: LessonNode[];
  lessonIds: Set<string>;
  /** Урок → модуль, щоб з рядка прогресу одразу знати, куди він належить. */
  moduleByLesson: Map<string, ModuleNode>;
  quizById: Map<string, ModuleNode>;
  sectionCount: number;
  questionCount: number;
}

/**
 * Лише ВІДКРИТІ курси: закритий (`comingSoon`) ще ніхто не проходить, але його
 * заглушки роздули б знаменник — «пройдено 5 зі 100 уроків» замість «5 з 49».
 */
async function loadCourseGraph(): Promise<CourseGraph> {
  const courses = await prisma.course.findMany({
    where: { comingSoon: false },
    orderBy: { title: 'asc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true, minutes: true } },
              quiz: {
                select: {
                  id: true,
                  passScore: true,
                  questions: {
                    orderBy: { order: 'asc' },
                    select: { id: true, text: true, options: true, correctIndex: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const modules: ModuleNode[] = [];
  let sectionCount = 0;

  for (const course of courses) {
    for (const section of course.sections) {
      sectionCount++;
      for (const m of section.modules) {
        const node: ModuleNode = {
          id: m.id,
          slug: m.slug,
          title: m.title,
          order: m.order,
          isKey: m.isKey,
          passScore: m.quiz?.passScore ?? m.passScore,
          sectionTitle: section.title,
          lessons: [],
          quiz: m.quiz
            ? {
                id: m.quiz.id,
                passScore: m.quiz.passScore,
                questions: m.quiz.questions.map((q) => ({
                  id: q.id,
                  text: q.text,
                  options: parseOptions(q.options),
                  correctIndex: q.correctIndex,
                  moduleTitle: m.title,
                })),
              }
            : null,
        };
        node.lessons = m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          order: l.order,
          minutes: l.minutes,
          moduleId: m.id,
          moduleTitle: m.title,
          sectionTitle: section.title,
        }));
        modules.push(node);
      }
    }
  }

  const lessons = modules.flatMap((m) => m.lessons);
  const moduleByLesson = new Map<string, ModuleNode>();
  for (const m of modules) for (const l of m.lessons) moduleByLesson.set(l.id, m);

  const quizById = new Map<string, ModuleNode>();
  for (const m of modules) if (m.quiz) quizById.set(m.quiz.id, m);

  return {
    modules,
    lessons,
    lessonIds: new Set(lessons.map((l) => l.id)),
    moduleByLesson,
    quizById,
    sectionCount,
    questionCount: modules.reduce((sum, m) => sum + (m.quiz?.questions.length ?? 0), 0),
  };
}

/* ===========================================================================
   Події однієї людини
   ======================================================================== */

interface ProgressEvent {
  lessonId: string;
  completedAt: Date;
}
interface AttemptEvent {
  quizId: string;
  score: number;
  passed: boolean;
  answers: string;
  createdAt: Date;
}
interface ExamEvent {
  score: number;
  securityScore: number;
  passed: boolean;
  createdAt: Date;
}

/** Дні, у які людина щось робила — той самий підрахунок, що й у серії слухача. */
function activityDays(progress: ProgressEvent[], attempts: AttemptEvent[], exams: ExamEvent[]): ActivityDay[] {
  const byDay = new Map<string, ActivityDay>();
  const bump = (date: Date, field: 'lessons' | 'quizzes') => {
    const key = dayStamp(date);
    const day = byDay.get(key) ?? { date: key, lessons: 0, quizzes: 0, total: 0 };
    day[field] += 1;
    day.total += 1;
    byDay.set(key, day);
  };

  for (const p of progress) bump(p.completedAt, 'lessons');
  for (const a of attempts) bump(a.createdAt, 'quizzes');
  for (const e of exams) bump(e.createdAt, 'quizzes');

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/* ===========================================================================
   Головна вибірка
   ======================================================================== */

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const graph = await loadCourseGraph();

  const [users, organizations, progressRows, attemptRows, examRows, certificateRows] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        createdAt: true,
        organizationId: true,
        organization: { select: { name: true } },
      },
    }),
    prisma.organization.findMany({ select: { id: true, name: true, kind: true }, orderBy: { name: 'asc' } }),
    prisma.progress.findMany({ select: { userId: true, lessonId: true, completedAt: true } }),
    prisma.attempt.findMany({
      select: { userId: true, quizId: true, score: true, passed: true, answers: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.examAttempt.findMany({
      select: { userId: true, score: true, securityScore: true, passed: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.certificate.findMany({ orderBy: { issuedAt: 'desc' } }),
  ]);

  /* --- Розкладаємо події по людях ---------------------------------------- */
  const progressByUser = new Map<string, ProgressEvent[]>();
  for (const p of progressRows) {
    const list = progressByUser.get(p.userId) ?? [];
    list.push({ lessonId: p.lessonId, completedAt: p.completedAt });
    progressByUser.set(p.userId, list);
  }
  const attemptsByUser = new Map<string, AttemptEvent[]>();
  for (const a of attemptRows) {
    const list = attemptsByUser.get(a.userId) ?? [];
    list.push(a);
    attemptsByUser.set(a.userId, list);
  }
  const examsByUser = new Map<string, ExamEvent[]>();
  for (const e of examRows) {
    const list = examsByUser.get(e.userId) ?? [];
    list.push(e);
    examsByUser.set(e.userId, list);
  }
  const certsByUser = new Map<string, AdminCertificateRow[]>();
  for (const c of certificateRows) {
    const list = certsByUser.get(c.userId) ?? [];
    list.push({
      code: c.code,
      courseTitle: c.courseTitle,
      score: c.score,
      withHonors: c.withHonors,
      issuedAt: c.issuedAt.toISOString(),
      validUntil: c.validUntil.toISOString(),
      revoked: c.revoked,
      revokedReason: c.revokedReason,
    });
    certsByUser.set(c.userId, list);
  }

  const todayNum = dayNumber(dayStamp(new Date()));
  const lessonsTotal = graph.lessons.length;
  const modulesTotal = graph.modules.length;
  const quizzesTotal = graph.modules.filter((m) => m.quiz).length;

  /* --- Накопичувачі зведення --------------------------------------------- */
  /** Модуль → скільки людей почали / закрили. */
  const moduleStarted = new Map<string, number>();
  const moduleCompleted = new Map<string, number>();
  /** Урок → скільки людей завершили. */
  const lessonCompleted = new Map<string, number>();
  /** Тест → спроби, зараховані спроби, найкращі бали учасників. */
  const quizAttemptCount = new Map<string, number>();
  const quizPassedCount = new Map<string, number>();
  const quizBestScores = new Map<string, number[]>();
  /** Питання → відповідей / правильних / як часто обирали кожен хибний варіант. */
  const questionAnswers = new Map<string, number>();
  const questionCorrect = new Map<string, number>();
  const questionWrongPicks = new Map<string, Map<number, number>>();
  /** Дні платформи. */
  const dailyLessons = new Map<string, number>();
  const dailyQuizzes = new Map<string, number>();
  const dailyLearners = new Map<string, Set<string>>();

  const learners: AdminLearnerRow[] = [];

  for (const user of users) {
    const myProgress = (progressByUser.get(user.id) ?? []).slice().sort(
      (a, b) => a.completedAt.getTime() - b.completedAt.getTime(),
    );
    const myAttempts = attemptsByUser.get(user.id) ?? []; // найновіші першими
    const myExams = examsByUser.get(user.id) ?? [];
    const myCerts = certsByUser.get(user.id) ?? [];

    /* Дні платформи — рахуємо по всіх, хто щось робив. */
    const days = activityDays(myProgress, myAttempts, myExams);
    for (const d of days) {
      dailyLessons.set(d.date, (dailyLessons.get(d.date) ?? 0) + d.lessons);
      dailyQuizzes.set(d.date, (dailyQuizzes.get(d.date) ?? 0) + d.quizzes);
      const set = dailyLearners.get(d.date) ?? new Set<string>();
      set.add(user.id);
      dailyLearners.set(d.date, set);
    }

    const streak = computeStreak(days);

    /* --- Уроки ----------------------------------------------------------- */
    const doneLessonIds = new Set(myProgress.map((p) => p.lessonId).filter((id) => graph.lessonIds.has(id)));
    for (const id of doneLessonIds) lessonCompleted.set(id, (lessonCompleted.get(id) ?? 0) + 1);

    const lastProgress = [...myProgress].reverse().find((p) => graph.lessonIds.has(p.lessonId)) ?? null;
    const lastLesson = lastProgress ? graph.moduleByLesson.get(lastProgress.lessonId) : null;
    const lastLessonTitle = lastProgress
      ? (lastLesson?.lessons.find((l) => l.id === lastProgress.lessonId)?.title ?? null)
      : null;

    /* --- Тести ------------------------------------------------------------ */
    const latest = new Map<string, { score: number; passed: boolean }>();
    const best = new Map<string, number>();
    let correctAnswers = 0;
    let answeredQuestions = 0;

    for (const a of myAttempts) {
      if (!latest.has(a.quizId)) latest.set(a.quizId, { score: a.score, passed: a.passed });
      best.set(a.quizId, Math.max(best.get(a.quizId) ?? 0, a.score));

      const { correct, total } = attemptCorrectness(a.score, a.answers);
      correctAnswers += correct;
      answeredQuestions += total;

      quizAttemptCount.set(a.quizId, (quizAttemptCount.get(a.quizId) ?? 0) + 1);
      if (a.passed) quizPassedCount.set(a.quizId, (quizPassedCount.get(a.quizId) ?? 0) + 1);

      /* Питання рахуємо лише коли склад тесту не змінився з часу спроби —
         інакше відповідь «третій варіант» лягла б на чуже питання. */
      const module = graph.quizById.get(a.quizId);
      const questions = module?.quiz?.questions ?? [];
      const answers = parseAnswers(a.answers);
      if (alignsWithQuestions(answers, questions, a.score)) {
        questions.forEach((q, i) => {
          questionAnswers.set(q.id, (questionAnswers.get(q.id) ?? 0) + 1);
          if (answers[i] === q.correctIndex) {
            questionCorrect.set(q.id, (questionCorrect.get(q.id) ?? 0) + 1);
          } else {
            const picks = questionWrongPicks.get(q.id) ?? new Map<number, number>();
            picks.set(answers[i]!, (picks.get(answers[i]!) ?? 0) + 1);
            questionWrongPicks.set(q.id, picks);
          }
        });
      }
    }

    for (const [quizId, score] of best) {
      const list = quizBestScores.get(quizId) ?? [];
      list.push(score);
      quizBestScores.set(quizId, list);
    }

    /* --- Модулі ----------------------------------------------------------- */
    let modulesCompleted = 0;
    let currentModule: ModuleNode | null = null;

    for (const m of graph.modules) {
      const done = m.lessons.filter((l) => doneLessonIds.has(l.id)).length;
      if (done > 0) moduleStarted.set(m.id, (moduleStarted.get(m.id) ?? 0) + 1);

      const allLessonsDone = m.lessons.length > 0 && done === m.lessons.length;
      const quizOk = m.quiz ? (latest.get(m.quiz.id)?.passed ?? false) : true;
      const completed = allLessonsDone && quizOk;

      if (completed) {
        modulesCompleted++;
        moduleCompleted.set(m.id, (moduleCompleted.get(m.id) ?? 0) + 1);
      } else if (!currentModule) {
        currentModule = m;
      }
    }

    const currentLessonTitle = currentModule
      ? (currentModule.lessons.find((l) => !doneLessonIds.has(l.id))?.title ?? 'Тест модуля')
      : null;

    /* --- Атестація й сертифікат ------------------------------------------- */
    const examPassed = myExams.some((e) => e.passed);
    const examBestScore = myExams.length ? Math.max(...myExams.map((e) => e.score)) : null;
    const activeCert = myCerts.find((c) => !c.revoked) ?? myCerts[0] ?? null;

    /* --- Бали: та сама формула, що на /progress у слухача ------------------ */
    const lessonsCompleted = doneLessonIds.size;
    const quizPoints = [...best.entries()]
      .filter(([quizId]) => latest.get(quizId)?.passed)
      .reduce((sum, [, score]) => sum + Math.round((score / 100) * POINTS.quiz), 0);
    const points =
      lessonsCompleted * POINTS.lesson +
      modulesCompleted * POINTS.module +
      quizPoints +
      streak.activeDays * POINTS.activeDay +
      (examPassed ? POINTS.exam : 0);

    const minutes = [...doneLessonIds].reduce(
      (sum, id) => sum + (graph.moduleByLesson.get(id)?.lessons.find((l) => l.id === id)?.minutes ?? 0),
      0,
    );

    const status: LearnerJourneyStatus =
      activeCert && !activeCert.revoked
        ? 'CERTIFIED'
        : modulesTotal > 0 && modulesCompleted === modulesTotal
          ? 'MODULES_DONE'
          : lessonsCompleted > 0
            ? 'IN_PROGRESS'
            : 'NOT_STARTED';

    const lastActivity = days.length ? days[days.length - 1]!.date : null;
    const bestScores = [...best.values()];

    learners.push({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      organizationName: user.organization?.name ?? null,
      registeredAt: user.createdAt.toISOString(),
      lastActivityAt: lastActivity,
      status,
      lessonsCompleted,
      lessonsTotal,
      modulesCompleted,
      modulesTotal,
      minutes,
      quizzesPassed: [...latest.values()].filter((a) => a.passed).length,
      quizzesTotal,
      quizAttempts: myAttempts.length,
      averageQuizScore: average(bestScores),
      correctAnswersPct: answeredQuestions > 0 ? pct(correctAnswers, answeredQuestions) : null,
      examAttempts: myExams.length,
      examBestScore,
      examPassed,
      certificate: activeCert,
      points,
      streak: streak.current,
      longestStreak: streak.longest,
      activeDays: streak.activeDays,
      currentModuleTitle: currentModule ? currentModule.title : null,
      currentLessonTitle,
      lastLessonTitle,
    });
  }

  /* ===========================================================================
     Зведення платформи
     ======================================================================== */

  const onlyLearners = learners.filter((l) => l.role === 'LEARNER');
  const admins = learners.length - onlyLearners.length;

  const gapDays = (stamp: string | null): number | null =>
    stamp === null ? null : todayNum - dayNumber(stamp);

  const engagement = {
    activeToday: onlyLearners.filter((l) => gapDays(l.lastActivityAt) === 0).length,
    active7: onlyLearners.filter((l) => (gapDays(l.lastActivityAt) ?? 999) < 7).length,
    active30: onlyLearners.filter((l) => (gapDays(l.lastActivityAt) ?? 999) < 30).length,
    dormant: onlyLearners.filter(
      (l) => l.lessonsCompleted > 0 && (gapDays(l.lastActivityAt) ?? 999) >= DORMANT_DAYS,
    ).length,
    neverStarted: onlyLearners.filter((l) => l.lessonsCompleted === 0).length,
  };

  const started = onlyLearners.filter((l) => l.lessonsCompleted > 0);
  const oneModule = onlyLearners.filter((l) => l.modulesCompleted > 0);
  const allModules = onlyLearners.filter((l) => modulesTotal > 0 && l.modulesCompleted === modulesTotal);
  const examOk = onlyLearners.filter((l) => l.examPassed);
  const certified = onlyLearners.filter((l) => l.certificate && !l.certificate.revoked);

  const funnel = [
    { key: 'registered', label: 'Зареєстровані', count: onlyLearners.length, hint: 'Усі слухачі платформи' },
    { key: 'started', label: 'Почали навчання', count: started.length, hint: 'Завершили хоча б один урок' },
    { key: 'module', label: 'Закрили модуль', count: oneModule.length, hint: 'Усі уроки модуля + зарахований тест' },
    { key: 'allModules', label: 'Пройшли курс', count: allModules.length, hint: 'Закрито всі модулі програми' },
    { key: 'exam', label: 'Склали атестацію', count: examOk.length, hint: 'Фінальний іспит зараховано' },
    { key: 'certified', label: 'Мають сертифікат', count: certified.length, hint: 'Чинний, не відкликаний' },
  ].map((step) => ({ ...step, pct: pct(step.count, onlyLearners.length) }));

  /* --- Графік активності: останні 30 днів підряд, включно з порожніми ------ */
  const daily = Array.from({ length: DAILY_WINDOW }, (_, i) => {
    const date = stampFromNumber(todayNum - (DAILY_WINDOW - 1) + i);
    return {
      date,
      lessons: dailyLessons.get(date) ?? 0,
      quizzes: dailyQuizzes.get(date) ?? 0,
      learners: dailyLearners.get(date)?.size ?? 0,
    };
  });

  /* --- Модулі ------------------------------------------------------------- */
  const moduleStats = graph.modules.map((m) => {
    const attempts = m.quiz ? (quizAttemptCount.get(m.quiz.id) ?? 0) : 0;
    const passed = m.quiz ? (quizPassedCount.get(m.quiz.id) ?? 0) : 0;
    return {
      slug: m.slug,
      title: m.title,
      sectionTitle: m.sectionTitle,
      order: m.order,
      isKey: m.isKey,
      lessonCount: m.lessons.length,
      started: moduleStarted.get(m.id) ?? 0,
      completed: moduleCompleted.get(m.id) ?? 0,
      hasQuiz: !!m.quiz,
      passScore: m.passScore,
      quizAttempts: attempts,
      quizPassRate: attempts > 0 ? pct(passed, attempts) : null,
      averageQuizScore: m.quiz ? average(quizBestScores.get(m.quiz.id) ?? []) : null,
    };
  });

  /* --- Уроки: «дійшли до уроку» серед тих, хто почав його модуль ---------- */
  const lessonStats = graph.lessons.map((l) => {
    const module = graph.moduleByLesson.get(l.id)!;
    const startedModule = moduleStarted.get(module.id) ?? 0;
    const done = lessonCompleted.get(l.id) ?? 0;
    return {
      id: l.id,
      title: l.title,
      moduleTitle: l.moduleTitle,
      sectionTitle: l.sectionTitle,
      order: l.order,
      started: startedModule,
      completed: done,
      completionPct: pct(done, startedModule),
      dropoffPct: startedModule > 0 ? 100 - pct(done, startedModule) : 0,
    };
  });

  /* --- Питання ------------------------------------------------------------ */
  const questionStats: AdminQuestionStat[] = [];
  for (const m of graph.modules) {
    for (const q of m.quiz?.questions ?? []) {
      const answers = questionAnswers.get(q.id) ?? 0;
      if (answers === 0) continue;
      const correct = questionCorrect.get(q.id) ?? 0;
      const picks = questionWrongPicks.get(q.id);
      let topWrongOption: string | null = null;
      if (picks?.size) {
        const [index] = [...picks.entries()].sort((a, b) => b[1] - a[1])[0]!;
        topWrongOption = q.options[index] ?? null;
      }
      questionStats.push({
        id: q.id,
        moduleTitle: m.title,
        text: q.text,
        answers,
        correct,
        correctPct: pct(correct, answers),
        topWrongOption,
      });
    }
  }

  /* --- Організації --------------------------------------------------------- */
  const byOrg = new Map<string, AdminLearnerRow[]>();
  for (const user of users) {
    if (!user.organizationId) continue;
    const row = learners.find((l) => l.id === user.id);
    if (!row) continue;
    const list = byOrg.get(user.organizationId) ?? [];
    list.push(row);
    byOrg.set(user.organizationId, list);
  }
  const orgStats = organizations.map((o) => {
    const rows = byOrg.get(o.id) ?? [];
    return {
      id: o.id,
      name: o.name,
      kind: o.kind,
      users: rows.length,
      started: rows.filter((r) => r.lessonsCompleted > 0).length,
      certified: rows.filter((r) => r.certificate && !r.certificate.revoked).length,
      averageProgressPct: average(rows.map((r) => pct(r.lessonsCompleted, r.lessonsTotal))) ?? 0,
    };
  });

  /* --- Тести й атестація загалом -------------------------------------------- */
  const allAttemptCorrectness = attemptRows.reduce(
    (acc, a) => {
      const { correct, total } = attemptCorrectness(a.score, a.answers);
      return { correct: acc.correct + correct, total: acc.total + total };
    },
    { correct: 0, total: 0 },
  );

  const examLearnerIds = new Set(examRows.map((e) => e.userId));

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      users: users.length,
      learners: onlyLearners.length,
      admins,
      organizations: organizations.length,
      sections: graph.sectionCount,
      modules: modulesTotal,
      lessons: lessonsTotal,
      questions: graph.questionCount,
    },
    engagement,
    completion: {
      lessonsCompleted: onlyLearners.reduce((sum, l) => sum + l.lessonsCompleted, 0),
      modulesCompleted: onlyLearners.reduce((sum, l) => sum + l.modulesCompleted, 0),
      averageCoursePct: average(onlyLearners.map((l) => pct(l.lessonsCompleted, l.lessonsTotal))) ?? 0,
      averageLessonsPerLearner: average(onlyLearners.map((l) => l.lessonsCompleted)) ?? 0,
      minutesLearned: onlyLearners.reduce((sum, l) => sum + l.minutes, 0),
    },
    quizzes: {
      attempts: attemptRows.length,
      passRate: attemptRows.length ? pct(attemptRows.filter((a) => a.passed).length, attemptRows.length) : null,
      averageScore: average(attemptRows.map((a) => a.score)),
      correctAnswersPct:
        allAttemptCorrectness.total > 0 ? pct(allAttemptCorrectness.correct, allAttemptCorrectness.total) : null,
    },
    exam: {
      attempts: examRows.length,
      learners: examLearnerIds.size,
      passed: examRows.filter((e) => e.passed).length,
      passRate: examRows.length ? pct(examRows.filter((e) => e.passed).length, examRows.length) : null,
      averageScore: average(examRows.map((e) => e.score)),
    },
    certificates: {
      active: certificateRows.filter((c) => !c.revoked).length,
      revoked: certificateRows.filter((c) => c.revoked).length,
    },
    funnel,
    daily,
    learners,
    modules: moduleStats,
    lessons: lessonStats,
    questions: questionStats,
    organizations: orgStats,
  };
}

/* ===========================================================================
   Картка однієї людини
   ======================================================================== */

/**
 * Усе про одну людину. Основа — той самий `getLearnerStats`, який бачить сам
 * слухач на /progress: адмін і слухач мають дивитись на однакові числа.
 * Понад це — історія спроб, помилки з останніх спроб і стрічка уроків, яких
 * слухачеві на його сторінці не показують.
 */
export async function getLearnerDetail(userId: string): Promise<AdminLearnerDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      createdAt: true,
      lastActiveAt: true,
      banned: true,
      organization: { select: { name: true } },
      activeCourse: { select: { title: true } },
    },
  });
  if (!user) return null;

  const courseSlug = await resolveActiveCourseSlug(userId);

  const [stats, attempts, exams, certificates, progressRows] = await Promise.all([
    getLearnerStats(userId, courseSlug),
    prisma.attempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        quizId: true,
        score: true,
        passed: true,
        answers: true,
        createdAt: true,
        quiz: {
          select: {
            passScore: true,
            module: { select: { title: true, slug: true } },
            questions: { orderBy: { order: 'asc' }, select: { text: true, options: true, correctIndex: true } },
          },
        },
      },
    }),
    prisma.examAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { score: true, securityScore: true, passed: true, createdAt: true },
    }),
    prisma.certificate.findMany({ where: { userId }, orderBy: { issuedAt: 'desc' } }),
    prisma.progress.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 20,
      select: { completedAt: true, lesson: { select: { title: true, module: { select: { title: true } } } } },
    }),
  ]);

  /* --- Історія тестів ------------------------------------------------------ */
  const quizHistory = attempts.map((a) => {
    const { correct, total } = attemptCorrectness(a.score, a.answers);
    return {
      moduleTitle: a.quiz.module.title,
      moduleSlug: a.quiz.module.slug,
      score: a.score,
      passScore: a.quiz.passScore,
      passed: a.passed,
      correct,
      total,
      createdAt: a.createdAt.toISOString(),
    };
  });

  const answered = quizHistory.reduce((sum, a) => sum + a.total, 0);
  const correctAnswers = quizHistory.reduce((sum, a) => sum + a.correct, 0);

  /* --- Помилки з ОСТАННЬОЇ спроби кожного тесту ----------------------------
     Попередні спроби не беремо: цікаво не «що колись не знав», а що людина
     розуміє не так зараз. Спробу зі зміненим складом питань пропускаємо — див.
     коментар до parseAnswers. */
  const mistakes: AdminMistake[] = [];
  const seenQuizzes = new Set<string>();
  for (const a of attempts) {
    if (seenQuizzes.has(a.quizId)) continue;
    seenQuizzes.add(a.quizId);

    const questions = a.quiz.questions;
    const answers = parseAnswers(a.answers);
    if (!alignsWithQuestions(answers, questions, a.score)) continue;

    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) return;
      const options = parseOptions(q.options);
      mistakes.push({
        moduleTitle: a.quiz.module.title,
        questionText: q.text,
        pickedText: options[answers[i]!] ?? 'без відповіді',
        correctText: options[q.correctIndex] ?? '',
        createdAt: a.createdAt.toISOString(),
      });
    });
  }

  /* --- Де людина стоїть зараз ---------------------------------------------- */
  const currentModule = stats.moduleRows.find((m) => m.status !== 'DONE') ?? null;
  let currentLessonTitle: string | null = null;
  if (currentModule) {
    const [module, done] = await Promise.all([
      prisma.module.findUnique({
        where: { slug: currentModule.slug },
        select: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true } } },
      }),
      prisma.progress.findMany({ where: { userId }, select: { lessonId: true } }),
    ]);
    const doneIds = new Set(done.map((p) => p.lessonId));
    currentLessonTitle = module?.lessons.find((l) => !doneIds.has(l.id))?.title ?? 'Тест модуля';
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      organizationName: user.organization?.name ?? null,
      registeredAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null,
      activeCourseTitle: user.activeCourse?.title ?? null,
      banned: user.banned ?? false,
    },
    stats,
    correctAnswersPct: answered > 0 ? pct(correctAnswers, answered) : null,
    currentModuleTitle: currentModule?.title ?? null,
    currentLessonTitle,
    quizHistory,
    examHistory: exams.map((e) => ({
      score: e.score,
      securityScore: e.securityScore,
      passed: e.passed,
      createdAt: e.createdAt.toISOString(),
    })),
    mistakes,
    recentLessons: progressRows.map((p) => ({
      title: p.lesson.title,
      moduleTitle: p.lesson.module.title,
      completedAt: p.completedAt.toISOString(),
    })),
    certificates: certificates.map((c) => ({
      code: c.code,
      courseTitle: c.courseTitle,
      score: c.score,
      withHonors: c.withHonors,
      issuedAt: c.issuedAt.toISOString(),
      validUntil: c.validUntil.toISOString(),
      revoked: c.revoked,
      revokedReason: c.revokedReason,
    })),
  };
}
