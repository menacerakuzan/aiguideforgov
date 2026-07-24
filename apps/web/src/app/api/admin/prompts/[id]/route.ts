import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { UpdatePromptInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    const parsed = UpdatePromptInputSchema.parse({ ...(await request.json()), id });
    const input = { ...parsed, id: undefined };
    const prompt = await prisma.prompt.update({ where: { id }, data: input });
    return NextResponse.json({ prompt });
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    await prisma.prompt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
