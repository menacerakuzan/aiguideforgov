import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import { withApiErrors } from '@/lib/api-guard';

const SelectCourseInputSchema = z.object({ courseId: z.string() });

/** Позначає курс як активний для слухача — саме він відображається на дашборді. */
export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { courseId } = SelectCourseInputSchema.parse(await request.json());

    const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId }, select: { slug: true } });
    await prisma.user.update({ where: { id: me.id }, data: { activeCourseId: courseId } });

    return NextResponse.json({ courseSlug: course.slug });
  });
}
