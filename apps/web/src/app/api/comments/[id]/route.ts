import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, isAdmin } from '@yasno/auth';
import { withApiErrors } from '@/lib/api-guard';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { id } = await params;

    const comment = await prisma.lessonComment.findUniqueOrThrow({ where: { id } });
    if (comment.userId !== me.id && !isAdmin(me.role)) {
      return NextResponse.json({ error: 'Можна видаляти лише свої коментарі' }, { status: 403 });
    }

    await prisma.lessonComment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
