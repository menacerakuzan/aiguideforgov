import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin, requireCurrentUser } from '@proai/auth';
import { getAdminThread, sendAdminMessage } from '@proai/support';
import { SendSupportMessageInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

type Params = { params: Promise<{ userId: string }> };

/** Розмова з конкретною людиною. Порожня, якщо ще ніхто не писав, — адміністратор може почати першим. */
export async function GET(_request: NextRequest, { params }: Params) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { userId } = await params;

    const thread = await getAdminThread(userId, me.id);
    if (!thread) return NextResponse.json({ error: 'Такого користувача немає' }, { status: 404 });
    return NextResponse.json(thread);
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { userId } = await params;

    // Контекст сторінки від адміністратора не приймаємо — він пише зі своєї адмінки.
    const { body } = SendSupportMessageInputSchema.parse(await request.json());
    const message = await sendAdminMessage(me.id, userId, body);
    return NextResponse.json({ message }, { status: 201 });
  });
}
