import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, requireCurrentUser } from '@proai/auth';
import { markReadByAdmin } from '@proai/support';
import { withApiErrors } from '@/lib/api-guard';

/** Адміністратор відкрив розмову — повідомлення людини прочитані (для всіх адміністраторів). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { userId } = await params;
    await markReadByAdmin(userId);
    return NextResponse.json({ ok: true });
  });
}
