import { prisma } from '@proai/db';
import { Award } from '@proai/icons';
import { ClayCard, EmptyState } from '@proai/ui';
import { requirePageAdmin, requirePageUser } from '@/lib/page-guard';
import { AdminCertificatesTable } from '@/components/admin/admin-certificates-table';

export const metadata = { title: 'Усі сертифікати' };

export default async function AdminCertificatesPage() {
  const me = await requirePageUser();
  requirePageAdmin(me);

  const certs = await prisma.certificate.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { issuedAt: 'desc' },
  });

  const now = Date.now();
  const active = certs.filter((c) => !c.revoked && c.validUntil.getTime() >= now).length;
  const byCourse = new Map<string, number>();
  for (const c of certs) byCourse.set(c.courseTitle, (byCourse.get(c.courseTitle) ?? 0) + 1);

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Усі сертифікати</h1>
        <p className="mt-1 max-w-[70ch] text-ink-soft">
          Кожен сертифікат видано за конкретний курс: людина, яка пройшла два курси, має два документи з
          різними кодами. Назва курсу — знімок на день видачі, перейменування курсу її не змінює.
        </p>
      </header>

      {certs.length === 0 ? (
        <ClayCard>
          <EmptyState
            icon={<Award size={22} />}
            title="Сертифікатів ще не видано"
            description="Перший з’явиться тут, щойно хтось складе фінальну атестацію курсу."
          />
        </ClayCard>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-4">
            <ClayCard padding="sm" className="min-w-[180px]">
              <p className="font-display text-2xl font-bold">{certs.length}</p>
              <p className="text-[13px] font-semibold text-ink-soft">видано всього</p>
            </ClayCard>
            <ClayCard padding="sm" variant="gold" className="min-w-[180px]">
              <p className="font-display text-2xl font-bold">{active}</p>
              <p className="text-[13px] font-semibold">чинних зараз</p>
            </ClayCard>
            {[...byCourse.entries()].map(([title, count]) => (
              <ClayCard key={title} padding="sm" className="min-w-[180px]">
                <p className="font-display text-2xl font-bold">{count}</p>
                <p className="text-[13px] font-semibold text-ink-soft">{title}</p>
              </ClayCard>
            ))}
          </div>

          <ClayCard padding="sm">
            <AdminCertificatesTable
              now={now}
              certificates={certs.map((c) => ({
                id: c.id,
                code: c.code,
                userId: c.userId,
                holderName: c.holderName,
                holderEmail: c.user.email,
                holderPosition: c.holderPosition,
                organizationName: c.organizationName,
                courseTitle: c.courseTitle,
                score: c.score,
                withHonors: c.withHonors,
                issuedAt: c.issuedAt.toISOString(),
                validUntil: c.validUntil.toISOString(),
                revoked: c.revoked,
              }))}
            />
          </ClayCard>
        </>
      )}
    </div>
  );
}
