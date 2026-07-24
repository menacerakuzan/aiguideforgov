import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import { ClayCard } from '@yasno/ui';
import { SettingsForm } from '@/components/settings-form';

export default async function SettingsPage() {
  const me = await requireCurrentUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  const organizations = await prisma.organization.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="pt-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Налаштування</h1>
      </header>

      <ClayCard className="max-w-[560px]">
        <SettingsForm
          initialPosition={user.position ?? ''}
          initialOrganizationId={user.organizationId ?? ''}
          organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
        />
      </ClayCard>
    </div>
  );
}
