import { prisma } from '@yasno/db';
import type { CompleteLessonResponse } from '@yasno/types';
import { isModuleCompleted } from './lib/completion';

function dayKey(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

/**
 * Оновлює серію днів. Один пропущений день ще продовжує лічбу,
 * два й більше — серія починається заново з 1.
 */
async function bumpStreak(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();
  const todayKey = dayKey(now);

  let nextStreak: number;
  if (!user.lastActiveAt) {
    nextStreak = 1;
  } else {
    const diff = todayKey - dayKey(user.lastActiveAt);
    if (diff <= 0) nextStreak = user.streak || 1;
    else if (diff <= 2) nextStreak = user.streak + 1;
    else nextStreak = 1;
  }

  await prisma.user.update({ where: { id: userId }, data: { streak: nextStreak, lastActiveAt: now } });
  return nextStreak;
}

/** Відмічає урок пройденим (ідемпотентно) і повертає стан модуля після цього. */
export async function completeLesson(userId: string, lessonId: string): Promise<CompleteLessonResponse> {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });

  await prisma.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},
  });

  const streak = await bumpStreak(userId);

  const [lessonCount, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { moduleId: lesson.moduleId } }),
    prisma.progress.count({ where: { userId, lesson: { moduleId: lesson.moduleId } } }),
  ]);

  const moduleCompleted = await isModuleCompleted(userId, lesson.moduleId);

  return { moduleCompleted, completedLessons, lessonCount, streak };
}
