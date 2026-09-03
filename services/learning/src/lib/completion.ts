import { prisma } from '@proai/db';

/**
 * Модуль вважається пройденим, коли: (а) відмічено прогрес по КОЖНОМУ уроку,
 * і (б) якщо в модуля є тест — остання спроба зарахована (passed=true).
 *
 * Усі перевірки тут пакетні: раніше кожен модуль коштував 3 окремі запити,
 * і дашборд на 49 модулів робив ~350 послідовних звернень до бази. Тепер
 * скільки б не було модулів — 2 запити на прогрес і спроби разом узяті.
 */

/** Мінімум даних про модуль, потрібний для висновку про його проходження. */
export interface ModuleCompletionInput {
  id: string;
  lessons: { id: string }[];
  quiz: { id: string } | null;
}

export interface ModuleCompletion {
  /** id модулів, які слухач пройшов повністю. */
  completedModuleIds: Set<string>;
  /** id уроків із відміченим прогресом — для підрахунку «X з N» без зайвих запитів. */
  completedLessonIds: Set<string>;
  /** id тестів, останню спробу яких зараховано. Потрібен сторінкам, щоб не
      питати про кожен тест окремо: без нього модуль з тестом ніколи не
      показувався пройденим у списках курсу. */
  passedQuizIds: Set<string>;
}

/**
 * Пакетний розрахунок для вже завантажених модулів — 2 запити незалежно від
 * їх кількості. Викликайте цей варіант, якщо модулі з уроками й тестом уже є
 * на руках (наприклад, після вибірки курсу з include).
 */
export async function getModuleCompletion(
  userId: string,
  modules: ModuleCompletionInput[],
): Promise<ModuleCompletion> {
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const quizIds = modules.flatMap((m) => (m.quiz ? [m.quiz.id] : []));

  const [progress, attempts] = await Promise.all([
    lessonIds.length
      ? prisma.progress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true } })
      : [],
    quizIds.length
      ? prisma.attempt.findMany({
          where: { userId, quizId: { in: quizIds } },
          select: { quizId: true, passed: true },
          orderBy: { createdAt: 'desc' },
        })
      : [],
  ]);

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  // Спроби відсортовані від найновішої: перша зустрінута для тесту і є останньою.
  const latestPassed = new Map<string, boolean>();
  for (const a of attempts) if (!latestPassed.has(a.quizId)) latestPassed.set(a.quizId, a.passed);

  const completedModuleIds = new Set<string>();
  for (const m of modules) {
    if (m.lessons.some((l) => !completedLessonIds.has(l.id))) continue;
    if (m.quiz && !(latestPassed.get(m.quiz.id) ?? false)) continue;
    completedModuleIds.add(m.id);
  }

  const passedQuizIds = new Set<string>();
  for (const [quizId, passed] of latestPassed) if (passed) passedQuizIds.add(quizId);

  return { completedModuleIds, completedLessonIds, passedQuizIds };
}

/** Те саме, але коли на руках лише id модулів — додає один запит на їх вибірку. */
export async function getCompletedModuleIds(userId: string, moduleIds: string[]): Promise<Set<string>> {
  if (!moduleIds.length) return new Set();

  const modules = await prisma.module.findMany({
    where: { id: { in: moduleIds } },
    select: { id: true, lessons: { select: { id: true } }, quiz: { select: { id: true } } },
  });

  const { completedModuleIds } = await getModuleCompletion(userId, modules);
  return completedModuleIds;
}

/** Чи пройдений конкретний модуль. */
export async function isModuleCompleted(userId: string, moduleId: string): Promise<boolean> {
  const completed = await getCompletedModuleIds(userId, [moduleId]);
  return completed.has(moduleId);
}

/** Усі id модулів курсу (для перевірки повного проходження). */
export async function courseModuleIds(courseId: string): Promise<string[]> {
  const modules = await prisma.module.findMany({
    where: { section: { courseId } },
    select: { id: true },
  });
  return modules.map((m) => m.id);
}

/** Чи пройдені ВСІ модулі курсу — умова допуску до фінальної атестації. */
export async function hasCompletedAllModules(userId: string, courseId: string): Promise<boolean> {
  const ids = await courseModuleIds(courseId);
  if (!ids.length) return false;

  const completed = await getCompletedModuleIds(userId, ids);
  return completed.size === ids.length;
}
