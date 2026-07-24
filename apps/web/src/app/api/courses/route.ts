import { NextResponse } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import { getCourseOverview } from '@yasno/learning';
import { withApiErrors } from '@/lib/api-guard';

/** Список усіх курсів платформи з підсумковим прогресом слухача — для сторінки вибору курсу й адмін-CMS. */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const [list, user] = await Promise.all([
      prisma.course.findMany({ select: { id: true, slug: true }, orderBy: { title: 'asc' } }),
      prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { activeCourseId: true } }),
    ]);

    const courses = await Promise.all(
      list.map(async (c) => {
        const overview = await getCourseOverview(me.id, c.slug);
        return { ...overview!, isActive: c.id === user.activeCourseId };
      }),
    );

    return NextResponse.json({ courses });
  });
}
