import { prisma } from '@proai/db';
import type { LibraryItem, LibraryKind, LibraryResponse } from '@proai/types';

/**
 * Бібліотека слухача — «трофеї».
 *
 * Живе в сервісному шарі, а не в route-хендлері, щоб серверний компонент
 * сторінки міг зібрати ті самі дані прямим викликом — без рейсу браузера до
 * власного ж API. Саме цей зайвий рейс і був помітний як «елементи довго
 * підвантажуються»: сторінка приходила швидко, а вміст — окремим запитом.
 */

/** Порожнє тіло — картка, яка відкривається в нікуди. Такі не віддаємо. */
const HAS_BODY = { body: { not: '' } };

const LESSON_SELECT = {
  select: {
    id: true,
    slug: true,
    title: true,
    module: { select: { slug: true, title: true } },
  },
} as const;

export async function getLibrary(userId: string, q = ''): Promise<LibraryResponse> {
  const completed = await prisma.progress.findMany({ where: { userId }, select: { lessonId: true } });
  const doneIds = completed.map((p) => p.lessonId);

  // Пошук звужує видачу, але не лічильники: «відкрито 12 з 47» має лишатися
  // правдою й тоді, коли пошук нічого не знайшов.
  const search = q ? { OR: [{ title: { contains: q } }, { summary: { contains: q } }, { body: { contains: q } }] } : {};
  const promptSearch = q
    ? { OR: [{ title: { contains: q } }, { useCase: { contains: q } }, { body: { contains: q } }] }
    : {};

  const [resources, prompts, lockedResources, lockedPrompts, unlockedLessons, totalTrophyLessons] = await Promise.all([
    prisma.resource.findMany({
      where: { lessonId: { in: doneIds }, ...HAS_BODY, ...search },
      include: { lesson: LESSON_SELECT },
      orderBy: { title: 'asc' },
    }),
    prisma.prompt.findMany({
      where: { lessonId: { in: doneIds }, ...promptSearch },
      include: { lesson: LESSON_SELECT },
      orderBy: { title: 'asc' },
    }),
    prisma.resource.count({ where: { lessonId: { not: null, notIn: doneIds }, ...HAS_BODY } }),
    prisma.prompt.count({ where: { lessonId: { not: null, notIn: doneIds } } }),
    prisma.lesson.count({
      where: { id: { in: doneIds }, OR: [{ resources: { some: HAS_BODY } }, { prompts: { some: {} } }] },
    }),
    prisma.lesson.count({ where: { OR: [{ resources: { some: HAS_BODY } }, { prompts: { some: {} } }] } }),
  ]);

  const items: LibraryItem[] = [
    ...resources.map((r) => ({
      id: r.id,
      kind: r.kind as LibraryKind,
      title: r.title,
      summary: r.summary,
      body: r.body,
      lesson: {
        id: r.lesson!.id,
        slug: r.lesson!.slug,
        title: r.lesson!.title,
        moduleSlug: r.lesson!.module.slug,
        moduleTitle: r.lesson!.module.title,
      },
    })),
    ...prompts.map((p) => ({
      id: p.id,
      kind: 'PROMPT' as const,
      title: p.title,
      summary: p.useCase,
      body: p.body,
      copyCount: p.copyCount,
      lesson: {
        id: p.lesson!.id,
        slug: p.lesson!.slug,
        title: p.lesson!.title,
        moduleSlug: p.lesson!.module.slug,
        moduleTitle: p.lesson!.module.title,
      },
    })),
  ];

  const countsByKind = items.reduce<Partial<Record<LibraryKind, number>>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});

  return {
    items,
    lockedCount: lockedResources + lockedPrompts,
    unlockedLessons,
    totalTrophyLessons,
    countsByKind,
  };
}
