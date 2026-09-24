import { NextResponse } from 'next/server';
import { requireAdmin, requireCurrentUser } from '@proai/auth';
import { listSupportThreads } from '@proai/support';
import type { SupportThreadsResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/** Список розмов підтримки — лише ADMIN. */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    return NextResponse.json({ threads: await listSupportThreads() } satisfies SupportThreadsResponse);
  });
}
