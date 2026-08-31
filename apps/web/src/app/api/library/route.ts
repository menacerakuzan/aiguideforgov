import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { getLibrary } from '@proai/learning';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Бібліотека слухача. Уся логіка — у getLibrary (@proai/learning): цей маршрут
 * потрібен лише для пошуку й оновлення без перезавантаження сторінки, а перший
 * показ збирає серверний компонент сторінки тим самим викликом, без HTTP.
 */
export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    return NextResponse.json(await getLibrary(me.id, q));
  });
}
