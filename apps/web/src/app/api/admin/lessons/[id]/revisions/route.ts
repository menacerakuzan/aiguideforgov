import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import type { LessonRevisionsResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id: lessonId } = await params;

    const revisions = await prisma.lessonRevision.findMany({
      where: { lessonId },
      include: { editedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const response: LessonRevisionsResponse = {
      revisions: revisions.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        editedByName: r.editedBy.name,
      })),
    };
    return NextResponse.json(response);
  });
}
