import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { getModuleBySlug } from '@yasno/learning';
import { withApiErrors } from '@/lib/api-guard';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { slug } = await params;
    const module_ = await getModuleBySlug(me.id, slug);
    if (!module_) return NextResponse.json({ error: 'Модуль не знайдено' }, { status: 404 });
    return NextResponse.json({ module: module_ });
  });
}
