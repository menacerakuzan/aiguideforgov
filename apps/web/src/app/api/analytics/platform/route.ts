import { NextResponse } from 'next/server';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { getPlatformStats } from '@proai/analytics';
import { withApiErrors } from '@/lib/api-guard';

export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const stats = await getPlatformStats();
    return NextResponse.json(stats);
  });
}
