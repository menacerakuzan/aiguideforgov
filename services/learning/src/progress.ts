import { prisma } from '@proai/db';
import type { CompleteLessonResponse } from '@proai/types';
import { NotEligibleError } from './exam';
import { getModuleLock, isModuleCompleted } from './lib/completion';
import { refreshStreak } from './streak';

/** Відмічає урок пройденим (ідемпотентно) і повертає стан модуля після цього. */
export async function completeLesson(userId: string, lessonId: string): Promise<CompleteLessonResponse> {
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { module: { select: { section: { select: { course: { select: { comingSoon: true } } } } } } },
  });

  // Сторінки уроку закритого курсу не існує, але POST сюди можна надіслати
  // з будь-яким id — інакше прогрес накопичувався б по недоступному курсу.
  if (lesson.module.section.course.comingSoon) {
    throw new NotEligibleError('Курс ще недоступний для навчання');
  }

  // Так само для послідовності: сторінки закритого модуля немає, але відмітити
  // урок можна було б запитом повз неї — і замок обходився б знизу.
  const lock = await getModuleLock(userId, lesson.moduleId);
  if (lock.locked) {
    throw new NotEligibleError(`Спершу завершіть модуль «${lock.lockedBy?.title ?? ''}»`);
  }

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
