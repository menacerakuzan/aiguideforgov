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

/* ============================================================================
   Послідовність проходження модулів
   ========================================================================= */

/** Мінімум даних про модуль, потрібний для розрахунку замків. */
export interface ModuleLockInput extends ModuleCompletionInput {
  slug: string;
  title: string;
}

export interface ModuleLock {
  locked: boolean;
  /** Модуль, який треба завершити раніше. Порожньо, коли модуль відкритий. */
  lockedBy: { slug: string; title: string } | null;
}

/**
 * Скільки модулів відкрито з самого початку, ще до будь-якого прогресу.
 *
 * Два, а не один. Перший модуль — знайомство й реєстрація: потрібний, але
 * нецікавий, і людина, яка прийшла подивитись «а що воно дає», упирається в
 * нього як у турнікет. Другий модуль — одразу практика на справжніх документах,
 * і саме він вирішує, лишиться людина чи піде. Тому вхід у практику не
 * замикаємо.
 *
 * Нічого не втрачено: сертифікат усе одно вимагає ВСІХ модулів курсу
 * (`hasCompletedAllModules`), тож знайомство доведеться пройти — просто не
 * обов'язково першим.
 */
export const MODULES_OPEN_FROM_START = 2;

/**
 * Замки модулів за правилом «модуль N+1 відкривається, коли N завершено».
 *
 * Модулі мають прийти вже в порядку проходження (розділ → order модуля).
 *
 * Перші `MODULES_OPEN_FROM_START` модулів відкриті одразу. У ланцюжку при цьому
 * бере участь лише ОСТАННІЙ із них: третій модуль чекає на другий (практику), а
 * не на перший (знайомство). Інакше вільний вхід у практику нічого б не дав —
 * усе після неї однаково впиралося б у пропущене знайомство.
 *
 * Два винятки, без яких правило зробило б більше шкоди, ніж користі:
 *
 * 1. **Пройдене не закривається ніколи.** Завершений модуль лишається
 *    відкритим для повторного читання — на цьому тримається цінність
 *    бібліотеки-трофеїв: до матеріалу повертаються.
 * 2. **Розпочате не закривається заднім числом.** Якщо в модулі вже є
 *    відмічений урок, замок на нього не вішаємо. Інакше слухачі, які зараз
 *    посеред курсу, назавтра побачили б закритим те, що проходили вчора.
 *
 * Уроки ВСЕРЕДИНІ модуля навмисно не замикаються: вони — сусіди по одній темі,
 * порядок між ними коштує небагато, а жорсткий замок перетворює людину, яка
 * застрягла на одному уроці, на людину, яка пішла. Там працює лише підказка в
 * інтерфейсі («наступний» підсвічено, дальші приглушені).
 */
export function computeModuleLocks(
  orderedModules: ModuleLockInput[],
  completion: ModuleCompletion,
): Map<string, ModuleLock> {
  const { completedModuleIds, completedLessonIds } = completion;
  const locks = new Map<string, ModuleLock>();

  /** Перший незавершений модуль із тих, що йдуть раніше за поточний. */
  let blocker: { slug: string; title: string } | null = null;

  orderedModules.forEach((m, index) => {
    const openFromStart = index < MODULES_OPEN_FROM_START;
    const completed = completedModuleIds.has(m.id);
    const started = m.lessons.some((l) => completedLessonIds.has(l.id));

    const locked = !openFromStart && blocker !== null && !completed && !started;
    locks.set(m.id, { locked, lockedBy: locked ? blocker : null });

    // Перший незавершений модуль закриває все, що йде після нього — але
    // рахунок починається з ОСТАННЬОГО відкритого з початку. Модулі до нього
    // нікого не тримають: вони й самі відкриті, і черги за собою не створюють.
    const inChain = index >= MODULES_OPEN_FROM_START - 1;
    if (inChain && !completed && blocker === null) blocker = { slug: m.slug, title: m.title };
  });

  return locks;
}

/**
 * Замок одного модуля — коли на руках лише він сам (сторінка модуля, урок,
 * відмітка про проходження). Тягне всі модулі того самого курсу, бо відповідь
 * залежить від усього, що йде раніше.
 */
export async function getModuleLock(userId: string, moduleId: string): Promise<ModuleLock> {
  const target = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { section: { select: { courseId: true } } },
  });
  if (!target) return { locked: false, lockedBy: null };

  const modules = await prisma.module.findMany({
    where: { section: { courseId: target.section.courseId } },
    orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
    select: { id: true, slug: true, title: true, lessons: { select: { id: true } }, quiz: { select: { id: true } } },
  });

  const completion = await getModuleCompletion(userId, modules);
  return computeModuleLocks(modules, completion).get(moduleId) ?? { locked: false, lockedBy: null };
}
