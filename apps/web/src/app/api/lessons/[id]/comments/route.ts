import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import { CreateCommentInputSchema, type CommentsResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { id: lessonId } = await params;

    const comments = await prisma.lessonComment.findMany({
      where: { lessonId },
      include: { user: { select: { name: true } }, reactions: true },
      orderBy: { createdAt: 'desc' },
    });

    const response: CommentsResponse = {
      comments: comments.map((c) => ({
        id: c.id,
        lessonId: c.lessonId,
        body: c.body,
        authorName: c.user.name,
        isOwn: c.userId === me.id,
        likes: c.reactions.filter((r) => r.value === 1).length,
        dislikes: c.reactions.filter((r) => r.value === -1).length,
        myReaction: (c.reactions.find((r) => r.userId === me.id)?.value ?? null) as 1 | -1 | null,
        createdAt: c.createdAt.toISOString(),
      })),
    };
    return NextResponse.json(response);
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { id: lessonId } = await params;

    const { body } = CreateCommentInputSchema.parse({ ...(await request.json()), lessonId });
    const comment = await prisma.lessonComment.create({
      data: { lessonId, userId: me.id, body },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          lessonId: comment.lessonId,
          body: comment.body,
          authorName: comment.user.name,
          isOwn: true,
          likes: 0,
          dislikes: 0,
          myReaction: null,
          createdAt: comment.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  });
}
