import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import { withApiErrors } from '@/lib/api-guard';

const SelectCourseInputSchema = z.object({ courseId: z.string() });

/** Позначає курс як активний для слухача — саме він відображається на дашборді. */
export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { courseId } = SelectCourseInputSchema.parse(await request.json());

    const course = await prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { slug: true, comingSoon: true },
    });

    // Сторінка закритого курсу кнопки «Розпочати» не показує, але POST сюди
    // можна надіслати й повз неї — і дашборд відкрив би курс без контенту.
    if (course.comingSoon) {
      return NextResponse.json({ error: 'Курс ще недоступний для навчання' }, { status: 403 });
    }

    await prisma.user.update({ where: { id: me.id }, data: { activeCourseId: courseId } });

    return NextResponse.json({ courseSlug: course.slug });
  });
}
