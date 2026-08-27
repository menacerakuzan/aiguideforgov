import { verifyCertificate } from '@proai/certificates';
import { Award, Check, TlCaution, TlForbid } from '@proai/icons';
import { ClayCard, Orb } from '@proai/ui';

const STATUS_COPY: Record<string, { title: string; color: 'green' | 'amber' | 'red'; icon: React.ReactNode }> = {
  VALID: { title: 'Сертифікат чинний', color: 'green', icon: <Check size={22} /> },
  EXPIRED: { title: 'Термін дії сертифіката минув', color: 'amber', icon: <TlCaution size={22} /> },
  REVOKED: { title: 'Сертифікат відкликано', color: 'red', icon: <TlForbid size={22} /> },
  NOT_FOUND: { title: 'Сертифікат із таким кодом не знайдено', color: 'amber', icon: <TlCaution size={22} /> },
};

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await verifyCertificate(decodeURIComponent(code));
  const copy = STATUS_COPY[result.status]!;

  return (
    <main className="mx-auto max-w-[560px] px-6 py-20">
      <div className="mb-8 text-center">
        <Orb color="gold" size="lg" className="mx-auto mb-4">
          <Award size={28} />
        </Orb>
        <h1 className="font-display text-2xl font-bold">Перевірка сертифіката</h1>
        <p className="mt-2 text-sm text-ink-mute">Код: {decodeURIComponent(code)}</p>
      </div>

      <ClayCard variant={copy.color}>
        <div className="flex items-start gap-4">
          <Orb color={copy.color} size="sm" className="mt-0.5">
            {copy.icon}
          </Orb>
          <div>
            <p className="font-display text-lg font-bold">{copy.title}</p>
            {result.certificate && (
              <p className="mt-2 text-[15px]">
                {result.certificate.holderName}
                {result.certificate.organizationName ? ` · ${result.certificate.organizationName}` : ''}
                <br />
                Видано {new Date(result.certificate.issuedAt).toLocaleDateString('uk-UA')} · чинний до{' '}
                {new Date(result.certificate.validUntil).toLocaleDateString('uk-UA')}
                {result.certificate.withHonors ? ' · складено з відзнакою' : ''}
              </p>
            )}
          </div>
        </div>
      </ClayCard>
    </main>
  );
}
