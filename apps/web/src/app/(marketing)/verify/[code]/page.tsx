import { verifyCertificate } from '@proai/certificates';
import { Award, Check, TlCaution, TlForbid } from '@proai/icons';
import { ClayCard, Orb } from '@proai/ui';

export const metadata = { title: 'Перевірка сертифіката' };

const STATUS_COPY: Record<
  string,
  { title: string; color: 'green' | 'amber' | 'red'; icon: React.ReactNode; note: string }
> = {
  VALID: {
    title: 'Сертифікат чинний',
    color: 'green',
    icon: <Check size={22} />,
    note: 'Документ видано платформою «ПРО.ШІ» і його строк дії не минув.',
  },
  EXPIRED: {
    title: 'Термін дії сертифіката минув',
    color: 'amber',
    icon: <TlCaution size={22} />,
    note: 'Курс було пройдено, але сертифікат потребує оновлення — знання застарівають.',
  },
  REVOKED: {
    title: 'Сертифікат відкликано',
    color: 'red',
    icon: <TlForbid size={22} />,
    note: 'Документ скасовано адміністратором і не підтверджує проходження курсу.',
  },
  NOT_FOUND: {
    title: 'Сертифіката з таким кодом не знайдено',
    color: 'amber',
    icon: <TlCaution size={22} />,
    note: 'Перевірте код — його друкують великими літерами у форматі PROAI-РІК-XXXXXX.',
  },
};

/**
 * Публічна перевірка за кодом — без авторизації.
 *
 * Показує НАЗВУ КУРСУ: без неї сторінка підтверджує лише «якийсь сертифікат
 * існує», тоді як перевіряльнику треба знати, чи людина пройшла саме той курс,
 * про який каже. Курсів на платформі кілька, і сертифікат за кожен окремий.
 */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await verifyCertificate(decodeURIComponent(code));
  const copy = STATUS_COPY[result.status]!;
  const cert = result.certificate;

  return (
    <main className="mx-auto max-w-[620px] px-6 py-20">
      <div className="mb-8 text-center">
        <Orb color="gold" size="lg" className="mx-auto mb-4">
          <Award size={28} />
        </Orb>
        <h1 className="font-display text-2xl font-bold">Перевірка сертифіката</h1>
        <p className="mt-2 font-mono text-sm tracking-wide text-ink-mute">{decodeURIComponent(code)}</p>
      </div>

      <ClayCard variant={copy.color}>
        <div className="flex items-start gap-4">
          <Orb color={copy.color} size="sm" className="mt-0.5">
            {copy.icon}
          </Orb>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{copy.title}</p>
            <p className="mt-1 text-[14px] text-ink-soft">{copy.note}</p>
          </div>
        </div>

        {cert && (
          <dl className="mt-6 flex flex-col gap-3 border-t border-ink/10 pt-5 text-[15px]">
            <Row label="Курс" value={<span className="font-bold">{cert.courseTitle}</span>} />
            <Row label="Власник" value={cert.holderName} />
            {cert.holderPosition && <Row label="Посада" value={cert.holderPosition} />}
            {cert.organizationName && <Row label="Орган" value={cert.organizationName} />}
            <Row
              label="Результат атестації"
              value={
                <>
                  {cert.score}%{cert.withHonors && ' · з відзнакою'}
                </>
              }
            />
            <Row label="Видано" value={new Date(cert.issuedAt).toLocaleDateString('uk-UA')} />
            <Row label="Чинний до" value={new Date(cert.validUntil).toLocaleDateString('uk-UA')} />
          </dl>
        )}
      </ClayCard>

      <p className="mt-6 text-center text-[13px] text-ink-mute">
        Сертифікат засвідчує проходження курсу на платформі «ПРО.ШІ». Він не є документом, що підтверджує особу.
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
