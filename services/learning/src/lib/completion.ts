import { prisma } from '@yasno/db';

/**
 * Модуль вважається пройденим, коли: (а) відмічено прогрес по КОЖНОМУ уроку,
 * і (б) якщо в модуля є тест — остання спроба зарахована (passed=true).
 */
export async function isModuleCompleted(userId: string, moduleId: string): Promise<boolean> {
  const module = await prisma.module.findUniqueOrThrow({
    where: { id: moduleId },
    include: { lessons: { select: { id: true } }, quiz: { select: { id: true } } },
  });

  const doneCount = await prisma.progress.count({
    where: { userId, lessonId: { in: module.lessons.map((l) => l.id) } },
  });
  if (doneCount < module.lessons.length) return false;

  if (!module.quiz) return true;

  const lastAttempt = await prisma.attempt.findFirst({
    where: { userId, quizId: module.quiz.id },
    orderBy: { createdAt: 'desc' },
  });
  return lastAttempt?.passed ?? false;
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
  for (const id of ids) {
    if (!(await isModuleCompleted(userId, id))) return false;
  }
  return true;
}
