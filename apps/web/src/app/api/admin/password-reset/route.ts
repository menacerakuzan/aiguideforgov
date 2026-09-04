import { NextResponse, type NextRequest } from 'next/server';
import {
  dismissPasswordResetRequest,
  requireAdmin,
  requireCurrentUser,
  resetPasswordByRequest,
} from '@proai/auth';
import { HandlePasswordResetInputSchema, type HandlePasswordResetResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Опрацювання заявки на відновлення пароля — лише ADMIN.
 *
 * RESET повертає новий пароль РІВНО ОДИН РАЗ: у базі лишається тільки хеш,
 * тож показати його вдруге неможливо. Адміністратор копіює пароль і надсилає
 * людині на пошту сам — поштового провайдера в платформі поки немає.
 */
export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const { requestId, action } = HandlePasswordResetInputSchema.parse(await request.json());

    if (action === 'DISMISS') {
      await dismissPasswordResetRequest(requestId, me.id);
      return NextResponse.json({ password: null } satisfies HandlePasswordResetResponse);
    }

    const password = await resetPasswordByRequest(requestId, me.id);
    return NextResponse.json({ password } satisfies HandlePasswordResetResponse);
  });
}
