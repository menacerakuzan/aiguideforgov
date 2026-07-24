import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { getLesson } from '@yasno/learning';
import { withApiErrors } from '@/lib/api-guard';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { id } = await params;
    const lesson = await getLesson(me.id, id);
    if (!lesson) return NextResponse.json({ error: 'Урок не знайдено' }, { status: 404 });
    return NextResponse.json({ lesson });
  });
}
