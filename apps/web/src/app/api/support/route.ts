import { NextResponse, type NextRequest } from 'next/server';
import { ForbiddenError, isAdmin, requireCurrentUser } from '@proai/auth';
import { getLearnerThread, sendLearnerMessage } from '@proai/support';
import { SendSupportMessageInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Чат підтримки з боку слухача: власна розмова з адміністраторами.
 *
 * Адміністратор сюди не пише — він сам і є підтримка, а його розмова з
 * собою лягла б у загальний список як звернення слухача. Його кнопка чату
 * веде в /admin/support.
 */
async function requireLearner() {
  const me = await requireCurrentUser();
  if (isAdmin(me.role)) throw new ForbiddenError('Адміністратор відповідає людям у розділі «Підтримка»');
  return me;
}

export async function GET() {
  return withApiErrors(async () => {
    const me = await requireLearner();
    return NextResponse.json(await getLearnerThread(me.id));
  });
}

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireLearner();
    const input = SendSupportMessageInputSchema.parse(await request.json());
    const message = await sendLearnerMessage(me.id, input);
    return NextResponse.json({ message }, { status: 201 });
  });
}
