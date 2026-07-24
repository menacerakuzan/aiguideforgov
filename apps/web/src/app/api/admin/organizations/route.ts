import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { CreateOrganizationInputSchema, type OrganizationsResponse } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const organizations = await prisma.organization.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });

    const response: OrganizationsResponse = {
      organizations: organizations.map((o) => ({ id: o.id, name: o.name, kind: o.kind, userCount: o._count.users })),
    };
    return NextResponse.json(response);
  });
}

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = CreateOrganizationInputSchema.parse(await request.json());
    const created = await prisma.organization.create({ data: input });
    return NextResponse.json({ organization: created }, { status: 201 });
  });
}
