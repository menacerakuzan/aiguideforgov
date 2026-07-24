import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import { withApiErrors } from '@/lib/api-guard';

const ReactSchema = z.object({ value: z.union([z.literal(1), z.literal(-1)]) });

/** Перемикач лайк/дизлайк: повторний клік того самого значення прибирає реакцію. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { id: commentId } = await params;
    const { value } = ReactSchema.parse(await request.json());

    const existing = await prisma.commentReaction.findUnique({
      where: { commentId_userId: { commentId, userId: me.id } },
    });

    if (existing && existing.value === value) {
      await prisma.commentReaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.commentReaction.update({ where: { id: existing.id }, data: { value } });
    } else {
      await prisma.commentReaction.create({ data: { commentId, userId: me.id, value } });
    }

    const [likes, dislikes] = await Promise.all([
      prisma.commentReaction.count({ where: { commentId, value: 1 } }),
      prisma.commentReaction.count({ where: { commentId, value: -1 } }),
    ]);
    const myReaction = existing && existing.value === value ? null : value;

    return NextResponse.json({ likes, dislikes, myReaction });
  });
}
