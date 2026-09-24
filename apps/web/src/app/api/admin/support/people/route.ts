import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, requireCurrentUser } from '@proai/auth';
import { findSupportPeople } from '@proai/support';
import type { SupportPeopleResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/** Пошук людини, якій адміністратор хоче написати першим. */
export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const query = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 100);
    return NextResponse.json({ people: await findSupportPeople(query) } satisfies SupportPeopleResponse);
  });
}
