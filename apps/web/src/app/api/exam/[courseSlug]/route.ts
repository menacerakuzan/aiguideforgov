import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { getFinalExam } from '@proai/learning';
import { withApiErrors } from '@/lib/api-guard';

export async function GET(_request: Request, { params }: { params: Promise<{ courseSlug: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { courseSlug } = await params;
    const exam = await getFinalExam(me.id, courseSlug);
    if (!exam) return NextResponse.json({ error: 'Фінальна атестація для цього курсу відсутня' }, { status: 404 });
    return NextResponse.json({ exam });
  });
}
