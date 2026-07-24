import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import { Award } from '@yasno/icons';
import { ClayCard, EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@yasno/ui';
import { requirePageAdmin } from '@/lib/page-guard';
import { AdminRevokeButton } from '@/components/admin/admin-revoke-button';

export default async function AdminCertificatesPage() {
  const me = await requireCurrentUser();
  requirePageAdmin(me);

  const certs = await prisma.certificate.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { issuedAt: 'desc' },
  });

  return (
    <div className="pt-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Усі сертифікати</h1>
        <p className="mt-1 text-ink-soft">Кожен сертифікат, виданий будь-якому користувачу платформи.</p>
      </header>

      {certs.length === 0 ? (
        <ClayCard>
          <EmptyState icon={<Award size={22} />} title="Сертифікатів ще не видано" />
        </ClayCard>
      ) : (
        <ClayCard padding="sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Отримувач</TableHead>
                <TableHead>Код</TableHead>
                <TableHead>Бал</TableHead>
                <TableHead>Виданий</TableHead>
                <TableHead>Чинний до</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((c) => {
                const expired = new Date(c.validUntil) < new Date();
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-semibold text-ink">{c.holderName}</p>
                      <p className="text-xs text-ink-mute">{c.user.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>
                      {c.score}% {c.withHonors && '· з відзнакою'}
                    </TableCell>
                    <TableCell className="text-ink-soft">{c.issuedAt.toLocaleDateString('uk-UA')}</TableCell>
                    <TableCell className="text-ink-soft">{c.validUntil.toLocaleDateString('uk-UA')}</TableCell>
                    <TableCell>
                      {c.revoked ? (
                        <span className="rounded-full bg-red-tint px-3 py-1 text-xs font-bold text-red-deep">Відкликано</span>
                      ) : expired ? (
                        <span className="rounded-full bg-amber-tint px-3 py-1 text-xs font-bold text-amber-deep">
                          Прострочений
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-tint px-3 py-1 text-xs font-bold text-green-deep">Чинний</span>
                      )}
                    </TableCell>
                    <TableCell>{!c.revoked && <AdminRevokeButton certificateId={c.id} />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ClayCard>
      )}
    </div>
  );
}
