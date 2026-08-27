import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import { UpdateProfileInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/** Самообслуговування: слухач редагує лише position/organizationId — роль тут ЗМІНИТИ НЕМОЖЛИВО. */
export async function PATCH(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = UpdateProfileInputSchema.parse(await request.json());

    // organizationId приходить із браузера. Без перевірки існування довільний
    // рядок доходить до бази й падає порушенням зовнішнього ключа — тобто
    // «Не вдалося зберегти» замість зрозумілої помилки поля.
    if (input.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json({ error: 'Такого органу влади немає у списку' }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: me.id },
      data: {
        position: input.position,
        // undefined — поле не надіслали, лишаємо як є; null — свідомо прибрали.
        organizationId: input.organizationId,
      },
    });

    return NextResponse.json({ id: updated.id, position: updated.position, organizationId: updated.organizationId });
  });
}
