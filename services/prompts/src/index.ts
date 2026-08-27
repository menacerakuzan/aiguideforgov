import { prisma } from '@proai/db';
import type { Prompt, PromptsQuery } from '@proai/types';

function toDto(p: {
  id: string;
  title: string;
  useCase: string;
  body: string;
  category: string;
  verified: boolean;
  copyCount: number;
  favorites?: Array<{ userId: string }>;
}): Prompt {
  return {
    id: p.id,
    title: p.title,
    useCase: p.useCase,
    body: p.body,
    category: p.category as Prompt['category'],
    verified: p.verified,
    copyCount: p.copyCount,
    favorite: p.favorites ? p.favorites.length > 0 : undefined,
  };
}

/** Список промптів із пошуком, фільтром за категорією та обраними користувача. */
export async function listPrompts(userId: string, query: PromptsQuery): Promise<Prompt[]> {
  const prompts = await prisma.prompt.findMany({
    where: {
      category: query.category,
      ...(query.q
        ? { OR: [{ title: { contains: query.q } }, { useCase: { contains: query.q } }] }
        : {}),
      ...(query.favorites ? { favorites: { some: { userId } } } : {}),
    },
    include: { favorites: { where: { userId } } },
    orderBy: { copyCount: 'desc' },
  });
  return prompts.map(toDto);
}

/** Перемикає обране; повертає новий стан (true = додано). */
export async function toggleFavorite(userId: string, promptId: string): Promise<boolean> {
  const existing = await prisma.favorite.findUnique({
    where: { userId_promptId: { userId, promptId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.favorite.create({ data: { userId, promptId } });
  return true;
}

/** Лічильник копіювань — довідкова метрика «Скопійовано N разів» на картці. */
export async function incrementCopyCount(promptId: string): Promise<number> {
  const updated = await prisma.prompt.update({
    where: { id: promptId },
    data: { copyCount: { increment: 1 } },
  });
  return updated.copyCount;
}
