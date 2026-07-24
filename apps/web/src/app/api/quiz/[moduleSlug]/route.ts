import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { getQuizByModuleSlug } from '@yasno/learning';
import { withApiErrors } from '@/lib/api-guard';

export async function GET(_request: Request, { params }: { params: Promise<{ moduleSlug: string }> }) {
  return withApiErrors(async () => {
    await requireCurrentUser();
    const { moduleSlug } = await params;
    const quiz = await getQuizByModuleSlug(moduleSlug);
    if (!quiz) return NextResponse.json({ error: 'Тест для цього модуля відсутній' }, { status: 404 });
    return NextResponse.json({ quiz });
  });
}
