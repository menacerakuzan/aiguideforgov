import { prisma } from '@proai/db';
import type { Course, Lesson, LessonBlock, LessonSummary, Module, Section } from '@proai/types';
import { computeModuleLocks, getModuleCompletion, getModuleLock, isModuleCompleted } from './lib/completion';

/**
 * Курс з повною ієрархією розділів і модулів (без списку уроків — лише лічильники).
 *
 * `activeCourseId` можна передати ззовні, якщо він уже на руках (список курсів
 * читає його один раз на всі курси) — інакше беремо з бази самі. Без цього
 * поле `isActive` лишалося порожнім на сторінці курсу, і кнопка «Розпочати
 * курс» показувалась навіть для курсу, який слухач уже проходить.
 */
export async function getCourseOverview(
  userId: string,
  courseSlug: string,
  activeCourseId?: string | null,
): Promise<Course | null> {
  const [course, active] = await Promise.all([
    prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            modules: {
              orderBy: { order: 'asc' },
              include: { lessons: { select: { id: true } }, quiz: { select: { id: true } } },
            },
          },
        },
      },
    }),
    activeCourseId !== undefined
      ? Promise.resolve(activeCourseId)
      : prisma.user
          .findUniqueOrThrow({ where: { id: userId }, select: { activeCourseId: true } })
          .then((u) => u.activeCourseId),
  ]);
  if (!course) return null;

  // Прогрес по всьому курсу — двома запитами разом, а не по 3 на кожен модуль.
  // `allModules` уже в порядку проходження (розділи й модулі вибрані з order asc),
  // тому той самий список годиться і для розрахунку замків послідовності.
  const allModules = course.sections.flatMap((s) => s.modules);
  const completion = await getModuleCompletion(userId, allModules);
  const { completedModuleIds, completedLessonIds, passedQuizIds } = completion;
  const locks = computeModuleLocks(allModules, completion);

  const sections: Section[] = [];
  let totalModules = 0;
  let totalLessons = 0;
  let totalCompletedModules = 0;

  for (const s of course.sections) {
    const modules: Module[] = [];
    let sectionCompleted = 0;

    for (const m of s.modules) {
      const completedLessons = m.lessons.filter((l) => completedLessonIds.has(l.id)).length;
      const completed = completedModuleIds.has(m.id);
      if (completed) {
        sectionCompleted++;
        totalCompletedModules++;
      }
      totalModules++;
      totalLessons += m.lessons.length;

      modules.push({
        id: m.id,
        slug: m.slug,
        title: m.title,
        description: m.description,
        order: m.order,
        minutes: m.minutes,
        isKey: m.isKey,
        passScore: m.passScore,
        sectionId: s.id,
        sectionSlug: s.slug,
        sectionTitle: s.title,
        lessonCount: m.lessons.length,
        completedLessons,
        hasQuiz: !!m.quiz,
        quizPassed: m.quiz ? passedQuizIds.has(m.quiz.id) : undefined,
        locked: locks.get(m.id)?.locked ?? false,
        lockedBy: locks.get(m.id)?.lockedBy ?? undefined,
      });
    }

    sections.push({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      order: s.order,
      color: s.color,
      courseId: course.id,
      modules,
      moduleCount: modules.length,
      completedModules: sectionCompleted,
    });
  }

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    sections,
    sectionCount: sections.length,
    moduleCount: totalModules,
    lessonCount: totalLessons,
    completedModules: totalCompletedModules,
    isActive: course.id === active,
    comingSoon: course.comingSoon,
  };
}

/**
 * Усі курси платформи з прогресом слухача й позначкою активного.
 *
 * Живе тут, а не в route-хендлері, щоб сторінка /courses могла зібрати список
 * прямо на сервері, без рейсу браузера до власного ж API.
 */
export async function getCoursesForUser(userId: string): Promise<Course[]> {
  const [list, user] = await Promise.all([
    prisma.course.findMany({
      select: { id: true, slug: true },
      // Закриті курси — в кінці списку: слухач має бачити спершу те, що можна проходити.
      // Далі — власний порядок курсу: за назвою «Продвинутий курс» ставав перед
      // «ШІ для відкритих даних», бо в кириличній абетці П іде раніше за Ш.
      orderBy: [{ comingSoon: 'asc' }, { order: 'asc' }, { title: 'asc' }],
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { activeCourseId: true } }),
  ]);

  const courses = await Promise.all(
    list.map(async (c) => (await getCourseOverview(userId, c.slug, user.activeCourseId))!),
  );

  return courses;
}

/** Модуль за slug разом зі списком уроків і станом кожного для слухача. */
export async function getModuleBySlug(userId: string, slug: string): Promise<Module | null> {
  const m = await prisma.module.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { order: 'asc' } },
      quiz: { select: { id: true } },
      section: {
        select: { slug: true, title: true, course: { select: { slug: true, title: true, comingSoon: true } } },
      },
    },
  });
  if (!m) return null;
  // Курс ще не відкрито — для слухача такого модуля просто не існує. Ховати
  // картку на сторінці курсу мало: прямим посиланням у нього все одно зайшли б.
  if (m.section.course.comingSoon) return null;

  const progress = await prisma.progress.findMany({
    where: { userId, lessonId: { in: m.lessons.map((l) => l.id) } },
    select: { lessonId: true },
  });
  const doneIds = new Set(progress.map((p) => p.lessonId));

  const lessons: LessonSummary[] = m.lessons.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    minutes: l.minutes,
    order: l.order,
    kind: l.kind,
    completed: doneIds.has(l.id),
  }));

  const quizPassed = m.quiz
    ? ((await prisma.attempt.findFirst({ where: { userId, quizId: m.quiz.id }, orderBy: { createdAt: 'desc' } }))
        ?.passed ?? false)
    : undefined;

  // Модуль може бути закритий послідовністю: попередній ще не завершено.
  // Сторінка сама вирішує, що з цим робити — показати замок, а не 404: людині
  // корисно бачити, що попереду, і знати, чим саме воно відкривається.
  const lock = await getModuleLock(userId, m.id);

  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    description: m.description,
    order: m.order,
    minutes: m.minutes,
    isKey: m.isKey,
    passScore: m.passScore,
    sectionSlug: m.section.slug,
    sectionTitle: m.section.title,
    courseSlug: m.section.course.slug,
    courseTitle: m.section.course.title,
    lessons,
    lessonCount: lessons.length,
    completedLessons: lessons.filter((l) => l.completed).length,
    hasQuiz: !!m.quiz,
    quizPassed,
    locked: lock.locked,
    lockedBy: lock.lockedBy ?? undefined,
  };
}

/** Повний урок: контент-блоки, стан прогресу, посилання на наступний урок. */
export async function getLesson(userId: string, lessonId: string): Promise<Lesson | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { section: { select: { slug: true, course: { select: { comingSoon: true } } } } } },
    },
  });
  if (!lesson) return null;
  // Див. коментар у getModuleBySlug: урок закритого курсу недосяжний і за id.
  if (lesson.module.section.course.comingSoon) return null;

  // Те саме для модуля, закритого послідовністю. На відміну від сторінки
  // модуля, тут показувати нічого: сам текст уроку і є те, що закрито.
  if ((await getModuleLock(userId, lesson.moduleId)).locked) return null;

  const completed =
    (await prisma.progress.findUnique({ where: { userId_lessonId: { userId, lessonId } } })) !== null;

  const next = await prisma.lesson.findFirst({
    where: { moduleId: lesson.moduleId, order: { gt: lesson.order } },
    orderBy: { order: 'asc' },
  });

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    minutes: lesson.minutes,
    order: lesson.order,
    kind: lesson.kind,
    completed,
    moduleId: lesson.moduleId,
    moduleSlug: lesson.module.slug,
    moduleTitle: lesson.module.title,
    sectionSlug: lesson.module.section.slug,
    blocks: JSON.parse(lesson.content) as LessonBlock[],
    validAsOf: lesson.validAsOf ? lesson.validAsOf.toISOString() : null,
    nextLesson: next ? { id: next.id, slug: next.slug, title: next.title, minutes: next.minutes } : null,
  };
}

/**
 * Демонстраційний урок — 1.1 базового курсу, відкритий гостям без реєстрації.
 *
 * Шукаємо за slug, а не за id: id — cuid і міняється після кожного `db:seed`,
 * а slug зафіксовано в `prisma/src/content/lessons-module-1.ts`.
 */
export const DEMO_LESSON_SLUG = 'demonstratsiya-yak-tse-vyhlyadaie';

/**
 * Урок 1.1 для гостя на `/demo`. Без userId, тож без прогресу й замків:
 * `completed` завжди false, а `nextLesson` — null, бо з демо далі в курс
 * не пускаємо. Відкривається лише цей один slug — решта уроків, як і раніше,
 * вимагає сесії.
 */
export async function getDemoLesson(): Promise<Lesson | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { slug: DEMO_LESSON_SLUG },
    include: {
      module: { include: { section: { select: { slug: true, course: { select: { comingSoon: true } } } } } },
    },
  });
  if (!lesson || lesson.module.section.course.comingSoon) return null;

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    minutes: lesson.minutes,
    order: lesson.order,
    kind: lesson.kind,
    completed: false,
    moduleId: lesson.moduleId,
    moduleSlug: lesson.module.slug,
    moduleTitle: lesson.module.title,
    sectionSlug: lesson.module.section.slug,
    blocks: JSON.parse(lesson.content) as LessonBlock[],
    validAsOf: lesson.validAsOf ? lesson.validAsOf.toISOString() : null,
    nextLesson: null,
  };
}

export { isModuleCompleted };
