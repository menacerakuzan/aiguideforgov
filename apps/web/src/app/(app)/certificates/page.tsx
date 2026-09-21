import Link from 'next/link';
import { prisma } from '@proai/db';
import { toCertificateDto } from '@proai/certificates';
import { getCoursesForUser } from '@proai/learning';
import type { Certificate } from '@proai/types';
import { Award, Book, Check, Lock, Play, Shield, TlCaution } from '@proai/icons';
import { Badge, Button, ClayCard, EmptyState, Orb, ProgressBar } from '@proai/ui';
import { CertificateActions } from '@/components/certificate-actions';
import { requirePageUser } from '@/lib/page-guard';

export const metadata = { title: 'Мої сертифікати' };

/**
 * Сертифікати слухача — по одному за кожен пройдений курс.
 *
 * Сторінка свідомо показує не лише здобуте, а й те, що лишилось: з одним
 * сертифікатом і трьома курсами попереду порожнє місце під карткою нічого не
 * пояснює, а рядок «ще два курси — ось на якому ви зупинились» пояснює все.
 */
export default async function CertificatesPage() {
  const user = await requirePageUser();

  const [rows, courses] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
      include: { course: { select: { slug: true } } },
    }),
    getCoursesForUser(user.id),
  ]);

  const certificates = rows.map(toCertificateDto);
  const certifiedSlugs = new Set(certificates.filter((c) => !c.revoked).map((c) => c.courseSlug));
  // Закриті курси до «ще можна отримати» не потрапляють: обіцяти сертифікат за
  // те, куди ще не пускають, — це обіцянка, яку сторінка не може виконати.
  const remaining = courses.filter((c) => !c.comingSoon && !certifiedSlugs.has(c.slug));
  const activeCount = certificates.filter((c) => !c.revoked && !isExpired(c)).length;

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Мої сертифікати</h1>
        <p className="mt-1.5 max-w-[62ch] text-ink-soft">
          Кожен курс має власний сертифікат зі своїм кодом перевірки. Пройдіть курс і складіть фінальну
          атестацію — документ з’явиться тут одразу.
        </p>
      </header>

      {certificates.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <Badge color="gold">
            <Award size={13} /> чинних: {activeCount}
          </Badge>
          {certificates.length > activeCount && (
            <Badge color="neutral">недійсних: {certificates.length - activeCount}</Badge>
          )}
          {remaining.length > 0 && <Badge color="blue">курсів попереду: {remaining.length}</Badge>}
        </div>
      )}

      {certificates.length === 0 ? (
        <ClayCard className="mb-6">
          <EmptyState
            icon={<Award size={22} />}
            title="Сертифікатів поки немає"
            description="Пройдіть усі модулі будь-якого курсу та складіть фінальну атестацію — сертифікат з’явиться тут."
            action={
              <Button variant="blue" asChild>
                <Link href="/courses">
                  <Book size={17} /> Обрати курс
                </Link>
              </Button>
            }
          />
        </ClayCard>
      ) : (
        <div className="mb-8 grid gap-5 xl:grid-cols-2">
          {certificates.map((cert) => (
            <CertificateCard key={cert.code} cert={cert} />
          ))}
        </div>
      )}

      {remaining.length > 0 && (
        <section>
          <h2 className="mb-1 font-display text-xl font-bold">Ще можна отримати</h2>
          <p className="mb-4 text-[15px] text-ink-soft">
            Курси, за які у вас ще немає сертифіката.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {remaining.map((course) => {
              const total = course.moduleCount ?? 0;
              const done = course.completedModules ?? 0;
              const ready = total > 0 && done === total;

              return (
                <ClayCard key={course.slug} padding="sm" className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <Orb size="sm" color={ready ? 'sun' : 'muted'}>
                      {ready ? <Award size={15} /> : <Book size={15} />}
                    </Orb>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[17px] font-bold">{course.title}</p>
                      <p className="text-[13px] text-ink-mute">
                        {done} з {total} модулів завершено
                      </p>
                    </div>
                  </div>

                  <ProgressBar
                    color={ready ? 'gold' : 'blue'}
                    value={total ? (done / total) * 100 : 0}
                    valueLabel={`${total ? Math.round((done / total) * 100) : 0}%`}
                  />

                  {ready ? (
                    <Button variant="sun" size="sm" asChild className="self-start">
                      <Link href={`/exam/${course.slug}`}>
                        <Award size={15} /> Скласти атестацію
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" asChild className="self-start">
                      <Link href={`/courses/${course.slug}`}>
                        <Play size={15} /> {done > 0 ? 'Продовжити курс' : 'Почати курс'}
                      </Link>
                    </Button>
                  )}
                </ClayCard>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function isExpired(cert: Certificate): boolean {
  return new Date(cert.validUntil) < new Date();
}

/**
 * Картка сертифіката. Заголовок — НАЗВА КУРСУ, а не ім'я власника: своє ім'я
 * людина й так знає, а відрізняє один свій сертифікат від іншого саме курс.
 * Недійсний документ втрачає золото й стає нейтральним — щоб «відкликано» не
 * доводилось вичитувати дрібним шрифтом на святковій картці.
 */
function CertificateCard({ cert }: { cert: Certificate }) {
  const expired = isExpired(cert);
  const valid = !cert.revoked && !expired;

  return (
    <ClayCard variant={valid ? 'gold' : undefined} className="relative flex flex-col p-7">
      {valid && (
        <div className="pointer-events-none absolute inset-2.5 rounded-[26px] border-2 border-dashed border-gold/35" />
      )}

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Orb color={valid ? 'gold' : 'muted'} size="sm">
              <Award size={16} />
            </Orb>
            <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">
              Сертифікат про проходження курсу
            </span>
          </div>

          {cert.revoked ? (
            <Badge color="red">
              <Lock size={12} /> Відкликано
            </Badge>
          ) : expired ? (
            <Badge color="amber">
              <TlCaution size={12} /> Прострочений
            </Badge>
          ) : (
            <Badge color="green">
              <Check size={12} /> Чинний
            </Badge>
          )}
        </div>

        <div>
          <h2 className="font-display text-xl leading-snug font-bold">{cert.courseTitle}</h2>
          <div className="mt-2 h-[3px] w-[52px] rounded-full bg-gold" />
        </div>

        <div>
          <p className="text-[17px] font-bold">{cert.holderName}</p>
          {cert.holderPosition && <p className="text-[14px] text-ink-soft">{cert.holderPosition}</p>}
          {cert.organizationName && <p className="text-[13px] text-ink-mute">{cert.organizationName}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-paper-2 px-3.5 py-1.5 text-xs font-bold">
            Результат {cert.score}%
          </span>
          {cert.withHonors && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-tint px-3.5 py-1.5 text-xs font-bold text-sun-deep">
              <Shield size={12} /> З відзнакою
            </span>
          )}
          <span className="text-xs text-ink-mute">
            {new Date(cert.issuedAt).toLocaleDateString('uk-UA')} —{' '}
            {new Date(cert.validUntil).toLocaleDateString('uk-UA')}
          </span>
        </div>

        {cert.revoked && (
          <p className="rounded-[18px] bg-red-tint px-4 py-2.5 text-[13px] text-red-deep">
            Документ відкликано адміністратором і не підтверджує проходження курсу.
          </p>
        )}

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-ink/8 pt-4">
          <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">Код перевірки</span>
          <span className="font-mono text-sm font-bold tracking-wide">{cert.code}</span>
        </div>

        <p className="text-xs text-ink-mute">
          Засвідчує проходження курсу. Не є документом, що підтверджує особу.
        </p>

        <CertificateActions code={cert.code} />
      </div>
    </ClayCard>
  );
}
