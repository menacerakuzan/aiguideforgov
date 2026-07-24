import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import type { LibraryResponse } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

/** Уся бібліотека — промпти й ресурси (чек-листи/правила/таблиці/шаблони) в одному запиті. */
export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';

    const [prompts, resources] = await Promise.all([
      prisma.prompt.findMany({
        where: q ? { OR: [{ title: { contains: q } }, { useCase: { contains: q } }, { body: { contains: q } }] } : undefined,
        include: { favorites: { where: { userId: me.id } } },
        orderBy: { copyCount: 'desc' },
      }),
      prisma.resource.findMany({
        where: q ? { OR: [{ title: { contains: q } }, { summary: { contains: q } }, { body: { contains: q } }] } : undefined,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const response: LibraryResponse = {
      prompts: prompts.map((p) => ({
        id: p.id,
        title: p.title,
        useCase: p.useCase,
        body: p.body,
        category: p.category,
        verified: p.verified,
        copyCount: p.copyCount,
        favorite: p.favorites.length > 0,
      })),
      resources: resources.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        body: r.body,
        kind: r.kind,
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  });
}
