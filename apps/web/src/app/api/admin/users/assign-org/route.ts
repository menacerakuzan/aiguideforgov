import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { AssignUserOrgInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const { userId, organizationId } = AssignUserOrgInputSchema.parse(await request.json());
    const updated = await prisma.user.update({ where: { id: userId }, data: { organizationId } });
    return NextResponse.json({ id: updated.id, organizationId: updated.organizationId });
  });
}
