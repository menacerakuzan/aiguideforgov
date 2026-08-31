import { prisma } from '@proai/db';
import type { Course, Lesson, LessonBlock, LessonSummary, Module, Section } from '@proai/types';
import { getModuleCompletion, isModuleCompleted } from './lib/completion';

/** Курс з повною ієрархією розділів і модулів (без списку уроків — лише лічильники). */
export async function getCourseOverview(userId: string, courseSlug: string): Promise<Course | null> {
  const course = await prisma.course.findUnique({
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
  });
  if (!course) return null;

  // Прогрес по всьому курсу — двома запитами разом, а не по 3 на кожен модуль.
  const allModules = course.sections.flatMap((s) => s.modules);
  const { completedModuleIds, completedLessonIds } = await getModuleCompletion(userId, allModules);

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
    prisma.course.findMany({ select: { id: true, slug: true }, orderBy: { title: 'asc' } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { activeCourseId: true } }),
  ]);

  const courses = await Promise.all(
    list.map(async (c) => {
      const overview = await getCourseOverview(userId, c.slug);
      return { ...overview!, isActive: c.id === user.activeCourseId };
    }),
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
      section: { select: { slug: true, title: true, course: { select: { slug: true, title: true } } } },
    },
  });
  if (!m) return null;

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
  };
}

/** Повний урок: контент-блоки, стан прогресу, посилання на наступний урок. */
export async function getLesson(userId: string, lessonId: string): Promise<Lesson | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { section: { select: { slug: true } } } } },
  });
  if (!lesson) return null;

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

export { isModuleCompleted };
