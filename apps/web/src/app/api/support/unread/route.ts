import { NextResponse } from 'next/server';
import { isAdmin, requireCurrentUser } from '@proai/auth';
import { countUnreadForAdmins, countUnreadForLearner } from '@proai/support';
import type { SupportUnreadResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Число біля круглої кнопки підтримки. Опитується раз на пів хвилини, тому
 * навмисно легке — лише COUNT.
 *
 * Одна адреса для обох ролей: слухачу — непрочитані відповіді підтримки,
 * адміністратору — непрочитані повідомлення від усіх людей.
 */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const unread = isAdmin(me.role) ? await countUnreadForAdmins() : await countUnreadForLearner(me.id);
    return NextResponse.json({ unread } satisfies SupportUnreadResponse);
  });
}
