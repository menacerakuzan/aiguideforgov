import Link from 'next/link';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import { getPlatformStats } from '@proai/analytics';
import { Award, Chart, Check, Doc, Spark, TlSafe, Users } from '@proai/icons';
import { Button, ClayCard, Orb } from '@proai/ui';
import { UsersTable } from '@/components/admin/users-table';
import { requirePageAdmin } from '@/lib/page-guard';

export default async function AdminOverviewPage() {
  const me = await requireCurrentUser();
  requirePageAdmin(me);

  const [stats, users, totalModules, organizations] = await Promise.all([
    getPlatformStats(),
    prisma.user.findMany({
      include: { organization: true, certificates: { where: { revoked: false }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.module.count(),
    prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  const completedModuleCounts = await Promise.all(
    users.map((u) =>
      prisma.module.count({
        where: { lessons: { some: {} }, AND: { lessons: { every: { progress: { some: { userId: u.id } } } } } },
      }),
    ),
  );

  return (
    <div className="pt-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Адміністрування</h1>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/admin/content">
              <Doc size={17} /> Контент курсу
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/certificates">
              <Award size={17} /> Усі сертифікати
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/library">
              <Spark size={17} /> Бібліотека
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/organizations">
              <Users size={17} /> Організації
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin/analytics">
              <Chart size={17} /> Відвал по уроках
            </Link>
          </Button>
        </div>
      </header>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ClayCard>
          <Orb size="sm" color="blue" className="mb-3">
            <TlSafe size={16} />
          </Orb>
          <p className="font-display text-3xl font-bold">{stats.totalUsers}</p>
          <p className="text-sm font-semibold text-ink-soft">Зареєстровано</p>
        </ClayCard>
        <ClayCard>
          <Orb size="sm" color="green" className="mb-3">
            <Check size={16} />
          </Orb>
          <p className="font-display text-3xl font-bold">{stats.activeLast7Days}</p>
          <p className="text-sm font-semibold text-ink-soft">Активні за 7 днів</p>
        </ClayCard>
        <ClayCard variant="gold">
          <Orb size="sm" color="gold" className="mb-3">
            <Award size={16} />
          </Orb>
          <p className="font-display text-3xl font-bold">{stats.certificatesIssued}</p>
          <p className="text-sm font-semibold">Сертифікатів видано</p>
        </ClayCard>
        <ClayCard>
          <Orb size="sm" color="amber" className="mb-3">
            <Chart size={16} />
          </Orb>
          <p className="font-display text-3xl font-bold">{stats.averageQuizScore}%</p>
          <p className="text-sm font-semibold text-ink-soft">Середній бал тестів</p>
        </ClayCard>
      </div>

      <ClayCard padding="sm">
        <h2 className="mb-4 px-2 text-lg font-bold">Користувачі</h2>
        <UsersTable
          organizations={organizations}
          users={users.map((u, i) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            organizationId: u.organizationId,
            organizationName: u.organization?.name ?? null,
            progressPct: totalModules > 0 ? Math.round((completedModuleCounts[i]! / totalModules) * 100) : 0,
            certified: u.certificates.length > 0,
            lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
          }))}
        />
      </ClayCard>
    </div>
  );
}
