import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import { UpdateProfileInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

/** Самообслуговування: слухач редагує лише position/organizationId — роль тут ЗМІНИТИ НЕМОЖЛИВО. */
export async function PATCH(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = UpdateProfileInputSchema.parse(await request.json());

    const updated = await prisma.user.update({
      where: { id: me.id },
      data: { position: input.position, organizationId: input.organizationId },
    });

    return NextResponse.json({ id: updated.id, position: updated.position, organizationId: updated.organizationId });
  });
}
