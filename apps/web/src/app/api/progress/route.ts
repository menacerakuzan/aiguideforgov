import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import { getMyProgress } from '@proai/learning';
import { withApiErrors } from '@/lib/api-guard';

/**
 * ?course=slug — необов'язковий явний вибір. Інакше береться курс, який
 * слухач обрав активним (User.activeCourseId). Якщо жодного не обрано і на
 * платформі рівно один курс — він береться автоматично (єдиний можливий
 * вибір, а не довільне припущення). Якщо курсів кілька і жоден не обрано —
 * повертаємо ознаку NO_ACTIVE_COURSE, щоб дашборд запропонував вибір.
 */
export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { searchParams } = new URL(request.url);

    let courseSlug = searchParams.get('course');

    if (!courseSlug) {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: me.id },
        select: { activeCourse: { select: { slug: true } } },
      });
      courseSlug = user.activeCourse?.slug ?? null;
    }

    if (!courseSlug) {
      const courses = await prisma.course.findMany({ select: { slug: true }, take: 2 });
      if (courses.length === 1) courseSlug = courses[0]!.slug;
    }

    if (!courseSlug) {
      return NextResponse.json({ error: 'Курс не обрано', code: 'NO_ACTIVE_COURSE' }, { status: 404 });
    }

    const progress = await getMyProgress(me.id, courseSlug);
    if (!progress) return NextResponse.json({ error: 'Курс не знайдено' }, { status: 404 });
    return NextResponse.json(progress);
  });
}
