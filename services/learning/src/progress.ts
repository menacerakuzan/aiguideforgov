import { prisma } from '@proai/db';
import type { CompleteLessonResponse } from '@proai/types';
import { isModuleCompleted } from './lib/completion';
import { refreshStreak } from './streak';

/** Відмічає урок пройденим (ідемпотентно) і повертає стан модуля після цього. */
export async function completeLesson(userId: string, lessonId: string): Promise<CompleteLessonResponse> {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });

  await prisma.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},
  });

  const { current: streak } = await refreshStreak(userId);

  const [lessonCount, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { moduleId: lesson.moduleId } }),
    prisma.progress.count({ where: { userId, lesson: { moduleId: lesson.moduleId } } }),
  ]);

  const moduleCompleted = await isModuleCompleted(userId, lesson.moduleId);

  return { moduleCompleted, completedLessons, lessonCount, streak };
}
