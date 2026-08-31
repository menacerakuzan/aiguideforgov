import { prisma } from '@proai/db';
import { requirePageAdmin, requirePageUser } from '@/lib/page-guard';
import { AdminOrganizationsClient } from '@/components/admin/admin-organizations-client';

export default async function AdminOrganizationsPage() {
  const me = await requirePageUser();
  requirePageAdmin(me);

  const organizations = await prisma.organization.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <AdminOrganizationsClient
      organizations={organizations.map((o) => ({ id: o.id, name: o.name, kind: o.kind, userCount: o._count.users }))}
    />
  );
}
