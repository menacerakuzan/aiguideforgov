import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { CreateLessonInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = CreateLessonInputSchema.parse(await request.json());
    const { blocks, ...rest } = input;
    const lesson = await prisma.lesson.create({ data: { ...rest, content: JSON.stringify(blocks) } });
    return NextResponse.json({ lesson }, { status: 201 });
  });
}
