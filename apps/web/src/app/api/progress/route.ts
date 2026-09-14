import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { getMyProgress, resolveActiveCourseSlug } from '@proai/learning';
import { withApiErrors } from '@/lib/api-guard';

/**
 * ?course=slug — необов'язковий явний вибір. Інакше курс визначає
 * `resolveActiveCourseSlug`: обраний слухачем, а якщо не обрано і на платформі
 * рівно один ВІДКРИТИЙ курс — він. Логіка спільна з дашбордом навмисно: доки
 * вона була продубльована тут, закритий курс (`comingSoon`) не відсіювався, і
 * цей маршрут міг віддати прогрес по курсу, у який сторінка не пускає.
 * Якщо визначити курс не вдалося — ознака NO_ACTIVE_COURSE, і дашборд
 * пропонує вибір.
 */
export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { searchParams } = new URL(request.url);

    const courseSlug = searchParams.get('course') ?? (await resolveActiveCourseSlug(me.id));

    if (!courseSlug) {
      return NextResponse.json({ error: 'Курс не обрано', code: 'NO_ACTIVE_COURSE' }, { status: 404 });
    }

    const progress = await getMyProgress(me.id, courseSlug);
    if (!progress) return NextResponse.json({ error: 'Курс не знайдено' }, { status: 404 });
    return NextResponse.json(progress);
  });
}
