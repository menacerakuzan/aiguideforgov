import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { UpdateSectionInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    const parsed = UpdateSectionInputSchema.parse({ ...(await request.json()), id });
    const input = { ...parsed, id: undefined };
    const section = await prisma.section.update({ where: { id }, data: input });
    return NextResponse.json({ section });
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    await prisma.section.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
