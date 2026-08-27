import { prisma } from '@proai/db';
import type { DropoffResponse } from '@proai/types';

/**
 * Для кожного уроку: скільки людей узагалі почали цей модуль (пройшли
 * хоча б один урок у ньому) проти скількох дійшли саме до цього уроку.
 * dropoffPct — яка частка тих, хто почав модуль, не дійшла до уроку.
 * Дає видиму «точку відвалу» всередині кожного модуля.
 */
export async function getLessonDropoff(): Promise<DropoffResponse> {
  const lessons = await prisma.lesson.findMany({
    include: { module: { select: { title: true } } },
    orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
  });

  const rows = await Promise.all(
    lessons.map(async (lesson) => {
      const [reachedUsers, completed] = await Promise.all([
        prisma.progress.findMany({
          where: { lesson: { moduleId: lesson.moduleId } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        prisma.progress.count({ where: { lessonId: lesson.id } }),
      ]);
      const reached = reachedUsers.length;
      const dropoffPct = reached > 0 ? Math.round((1 - completed / reached) * 100) : 0;

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleTitle: lesson.module.title,
        reached,
        completed,
        dropoffPct,
      };
    }),
  );

  return { rows };
}
