import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { getCoursesForUser } from '@proai/learning';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Список курсів із прогресом слухача — для адмін-CMS і оновлення після вибору
 * курсу. Сторінка /courses цей маршрут не смикає: вона серверна й кличе
 * getCoursesForUser напряму.
 */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    return NextResponse.json({ courses: await getCoursesForUser(me.id) });
  });
}
