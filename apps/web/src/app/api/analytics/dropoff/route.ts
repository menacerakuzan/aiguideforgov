import { NextResponse } from 'next/server';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { getLessonDropoff } from '@yasno/analytics';
import { withApiErrors } from '@/lib/api-guard';

export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const stats = await getLessonDropoff();
    return NextResponse.json(stats);
  });
}
