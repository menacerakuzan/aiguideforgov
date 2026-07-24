import Link from 'next/link';
import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import { Award, Book } from '@yasno/icons';
import { Button, ClayCard, EmptyState, Orb } from '@yasno/ui';
import { CertificateActions } from '@/components/certificate-actions';

export default async function CertificatesPage() {
  const user = await requireCurrentUser();
  const certs = await prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { issuedAt: 'desc' } });

  return (
    <div className="pt-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Мої сертифікати</h1>
      </header>

      {certs.length === 0 ? (
        <ClayCard>
          <EmptyState
            icon={<Award size={22} />}
            title="Сертифікатів поки немає"
            description="Пройдіть усі обов'язкові модулі та складіть фінальну атестацію — сертифікат з'явиться тут."
            action={
              <Button variant="blue" asChild>
                <Link href="/courses">
                  <Book size={17} /> Продовжити навчання
                </Link>
              </Button>
            }
          />
        </ClayCard>
      ) : (
        <div className="flex flex-col gap-5">
          {certs.map((cert) => (
            <ClayCard key={cert.id} variant="gold" className="relative p-9 text-center">
              <div className="pointer-events-none absolute inset-2.5 rounded-[26px] border-2 border-dashed border-gold/35" />

              <Orb color="gold" size="lg" className="mx-auto mb-4">
                <Award size={28} />
              </Orb>
              <p className="text-xs font-bold tracking-wide text-gold-deep/80 uppercase">
                Сертифікат про проходження курсу
              </p>
              <h2 className="mt-2.5 font-display text-2xl font-bold">{cert.holderName}</h2>
              {cert.holderPosition && <p className="mt-1 text-[15px] text-gold-deep">{cert.holderPosition}</p>}
              {cert.organizationName && <p className="text-sm text-gold-deep/80">{cert.organizationName}</p>}

              <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                <span
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                    cert.revoked
                      ? 'bg-red-tint text-red-deep'
                      : new Date(cert.validUntil) < new Date()
                        ? 'bg-amber-tint text-amber-deep'
                        : 'bg-green-tint text-green-deep'
                  }`}
                >
                  {cert.revoked
                    ? 'Відкликано'
                    : new Date(cert.validUntil) < new Date()
                      ? 'Прострочений'
                      : `Чинний до ${cert.validUntil.toLocaleDateString('uk-UA')}`}
                </span>
                {cert.withHonors && (
                  <span className="rounded-full bg-sun-tint px-3.5 py-1.5 text-xs font-bold text-sun-deep">
                    Складено з відзнакою
                  </span>
                )}
              </div>

              <p className="mt-5 font-mono text-sm tracking-wide text-gold-deep/85">{cert.code}</p>
              <p className="mt-4 text-xs text-gold-deep/70">
                Засвідчує проходження курсу. Не є документом, що підтверджує особу.
              </p>

              <CertificateActions code={cert.code} />
            </ClayCard>
          ))}
        </div>
      )}
    </div>
  );
}
