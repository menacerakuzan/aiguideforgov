import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { CreateCourseInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = CreateCourseInputSchema.parse(await request.json());
    const course = await prisma.course.create({ data: input });
    return NextResponse.json({ course }, { status: 201 });
  });
}
