import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { getCourseOverview } from '@proai/learning';
import { withApiErrors } from '@/lib/api-guard';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { slug } = await params;
    const course = await getCourseOverview(me.id, slug);
    if (!course) return NextResponse.json({ error: 'Курс не знайдено' }, { status: 404 });
    return NextResponse.json({ course });
  });
}
