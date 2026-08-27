import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { sanitizeRichHtml } from '@proai/infra';
import { UpdateResourceInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    const parsed = UpdateResourceInputSchema.parse({ ...(await request.json()), id });
    const input = {
      ...parsed,
      id: undefined,
      ...(parsed.body !== undefined ? { body: sanitizeRichHtml(parsed.body) } : {}),
    };
    const resource = await prisma.resource.update({ where: { id }, data: input });
    return NextResponse.json({ resource });
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    await prisma.resource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
