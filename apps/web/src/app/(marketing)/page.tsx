import Link from 'next/link';
import { Award, Spark, TlCaution, TlForbid, TlSafe } from '@yasno/icons';
import { Button, ClayCard, Orb, Reveal } from '@yasno/ui';
import { LandingStats } from '@/components/landing-stats';
import { LandingSectionsPreview } from '@/components/landing-sections-preview';

export default function LandingPage() {
  return (
    <main id="main">
      {/* ============================ ГЕРОЙ ============================ */}
      <header className="relative [overflow-x:clip] px-6 pt-12 pb-24">
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-[620px] w-[620px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,214,255,0.55) 0%, rgba(200,214,255,0.28) 40%, rgba(200,214,255,0) 72%)' }}
        />
        <div
          className="pointer-events-none absolute top-10 -right-32 h-[520px] w-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,230,166,0.5) 0%, rgba(255,230,166,0.24) 40%, rgba(255,230,166,0) 72%)' }}
        />

        <div className="relative z-10 mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface px-4 py-2 text-sm font-semibold text-ink-soft shadow-[3px_3px_0_0_var(--color-ink)]">
              <Orb size="sm" color="blue" className="h-6 w-6">
                <Award size={13} />
              </Orb>
              Для працівників органів влади України
            </span>

            <h1 className="mt-5 font-display text-[38px] leading-[1.15] font-bold sm:text-[52px]">
              ШІ в роботі? Тепер усе <span className="text-blue">ясно</span>
            </h1>

            <p className="mt-4 max-w-[46ch] text-lg text-ink-soft">
              Навчіться готувати документи вдвічі швидше і жодного разу не передати зайвого. Уроки по 10 хвилин,
              правила без занудства, сертифікат наприкінці.
            </p>

            <div className="mt-8 flex flex-wrap gap-3.5">
              <Button asChild variant="blue" size="lg">
                <Link href="/register">Почати урок</Link>
              </Button>
            </div>

            <LandingStats />
          </div>

          <div className="relative grid justify-items-center gap-4">
            <div className="pointer-events-none absolute -top-5 -right-3 z-20 grid h-14 w-14 rotate-[10deg] place-items-center rounded-2xl border-[2.5px] border-ink bg-red-tint text-red-deep shadow-[3px_4px_0_0_var(--color-ink)] sm:-right-6">
              <Award size={24} />
            </div>
            <div className="pointer-events-none absolute -bottom-4 -left-3 z-20 grid h-11 w-11 -rotate-[12deg] place-items-center rounded-full border-[2.5px] border-ink bg-sun-tint text-sun-deep shadow-[3px_3px_0_0_var(--color-ink)] sm:-left-6">
              <Spark size={18} />
            </div>
            <ClayCard
              className="animate-floaty flex w-full max-w-[360px] items-center gap-4 !p-6"
              style={{ animationDelay: '0s' }}
            >
              <Orb color="green">
                <TlSafe size={25} />
              </Orb>
              <div>
                <p className="font-display text-[17px] font-bold">Відкриті дані</p>
                <p className="text-sm text-ink-soft">Працюйте вільно</p>
              </div>
            </ClayCard>
            <ClayCard
              className="animate-floaty ml-10 flex w-full max-w-[360px] items-center gap-4 !p-6"
              style={{ animationDelay: '1.2s' }}
            >
              <Orb color="amber">
                <TlCaution size={25} />
              </Orb>
              <div>
                <p className="font-display text-[17px] font-bold">Службові дані</p>
                <p className="text-sm text-ink-soft">Тільки знеособлено</p>
              </div>
            </ClayCard>
            <ClayCard
              className="animate-floaty flex w-full max-w-[360px] items-center gap-4 !p-6"
              style={{ animationDelay: '2.4s' }}
            >
              <Orb color="red">
                <TlForbid size={25} />
              </Orb>
              <div>
                <p className="font-display text-[17px] font-bold">Заборонені дані</p>
                <p className="text-sm text-ink-soft">Ніколи і нікуди</p>
              </div>
            </ClayCard>
          </div>
        </div>
      </header>

      {/* ============================ СВІТЛОФОР ============================ */}
      <section id="svitlofor" className="px-6 py-20">
        <div className="mx-auto max-w-[1160px]">
          <Reveal className="mx-auto mb-11 max-w-[62ch] text-center">
            <h2 className="font-display text-[34px] font-bold sm:text-[42px]">Одне правило замість ста інструкцій</h2>
            <p className="mt-3.5 text-lg text-ink-soft">
              Перш ніж щось написати в чат зі ШІ, визначте колір даних. Три кольори, три форми, нуль винятків.
            </p>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-3">
            <Reveal index={0}>
              <ClayCard variant="green" className="animate-floaty h-full" style={{ animationDelay: '0.3s' }}>
                <Orb color="green" className="mb-4">
                  <TlSafe size={22} />
                </Orb>
                <h3 className="font-display text-xl font-bold">Відкриті дані</h3>
                <p className="mt-2 text-[15px]">Уже оприлюднені або призначені для оприлюднення.</p>
              </ClayCard>
            </Reveal>
            <Reveal index={1}>
              <ClayCard variant="amber" className="animate-floaty h-full" style={{ animationDelay: '1.5s' }}>
                <Orb color="amber" className="mb-4">
                  <TlCaution size={22} />
                </Orb>
                <h3 className="font-display text-xl font-bold">Службові дані</h3>
                <p className="mt-2 text-[15px]">Можна використовувати, але тільки знеособлено.</p>
              </ClayCard>
            </Reveal>
            <Reveal index={2}>
              <ClayCard variant="red" className="animate-floaty h-full" style={{ animationDelay: '2.7s' }}>
                <Orb color="red" className="mb-4">
                  <TlForbid size={22} />
                </Orb>
                <h3 className="font-display text-xl font-bold">Заборонені дані</h3>
                <p className="mt-2 text-[15px]">Не передаються зовнішнім сервісам за жодних умов.</p>
              </ClayCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================ ПРОГРАМА ============================ */}
      <section id="moduli" className="bg-paper-2 px-6 py-20">
        <div className="mx-auto max-w-[1160px]">
          <Reveal className="mb-11 max-w-[62ch]">
            <h2 className="font-display text-[34px] font-bold sm:text-[42px]">Розділи курсу. Кожен по ділу</h2>
            <p className="mt-3.5 text-lg text-ink-soft">
              Від основ до впевненої щоденної роботи. Уроки короткі, приклади з реальних кабінетів.
            </p>
          </Reveal>

          <LandingSectionsPreview />
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1160px]">
          <Reveal>
            <ClayCard variant="blue" className="relative overflow-hidden !p-12 text-center">
              <h2 className="font-display text-[32px] font-bold text-white sm:text-[42px]">
                Ваш перший крок до впевненої роботи зі ШІ
              </h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-lg text-white/90">
                Безкоштовно для всіх працівників органів влади. Реєстрація займає хвилину — за робочою поштою.
              </p>
              <Button variant="sun" size="lg" className="mt-7" asChild>
                <Link href="/register">Почати навчання</Link>
              </Button>
            </ClayCard>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
