import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { UpdateOrganizationInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    const parsed = UpdateOrganizationInputSchema.parse({ ...(await request.json()), id });
    const input = { ...parsed, id: undefined };
    const organization = await prisma.organization.update({ where: { id }, data: input });
    return NextResponse.json({ organization });
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    const userCount = await prisma.user.count({ where: { organizationId: id } });
    if (userCount > 0) {
      return NextResponse.json(
        { error: `Спочатку заберіть ${userCount} користувачів із цієї організації` },
        { status: 400 },
      );
    }

    await prisma.organization.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
