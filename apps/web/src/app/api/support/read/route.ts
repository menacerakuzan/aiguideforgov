import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { markReadByLearner } from '@proai/support';
import { withApiErrors } from '@/lib/api-guard';

/** Людина відкрила чат — відповіді підтримки прочитані, лічильник біля кнопки гасне. */
export async function POST() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    await markReadByLearner(me.id);
    return NextResponse.json({ ok: true });
  });
}
