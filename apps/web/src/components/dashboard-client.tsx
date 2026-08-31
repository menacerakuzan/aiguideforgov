'use client';

import Link from 'next/link';
import { Award, Book, Check, Clock, Flame, Info, Play, Shield, Spark, TlSafe } from '@proai/icons';
import {
  Button,
  ClayCard,
  CountUp,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Orb,
  ProgressBar,
  Reveal,
} from '@proai/ui';
import type { Module, MyProgressResponse } from '@proai/types';
import { OnboardingTour } from '@/components/onboarding-tour';

interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  earned: (ctx: { progress: MyProgressResponse | null }) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'safety',
    label: 'Безпеку освоєно',
    description: 'Складіть тест ключового модуля з безпеки даних.',
    icon: <TlSafe size={20} />,
    earned: ({ progress }) =>
      (progress?.course.sections ?? []).flatMap((s) => s.modules ?? []).some((m) => m.isKey && (m.quizPassed ?? false)),
  },
  {
    id: 'streak',
    label: 'Тиждень поспіль',
    description: 'Заходьте й проходьте уроки 7 днів поспіль.',
    icon: <Flame size={20} />,
    earned: ({ progress }) => (progress?.streak ?? 0) >= 7,
  },
  {
    id: 'first-module',
    label: 'Перший модуль',
    description: 'Повністю пройдіть перший модуль курсу.',
    icon: <Book size={20} />,
    earned: ({ progress }) => (progress?.completedModules ?? 0) > 0,
  },
  {
    id: 'certified',
    label: 'Атестовано',
    description: 'Складіть фінальну атестацію й отримайте сертифікат.',
    icon: <Award size={20} />,
    earned: ({ progress }) => !!progress?.hasCertificate,
  },
];

/**
 * Дашборд. Дані готує серверний компонент сторінки (getDashboard) і передає
 * сюди готовими — цей компонент лишається клієнтським лише заради інтерактиву:
 * діалог досягнень, вітальний тур, анімовані лічильники.
 */
export function DashboardClient({
  progress,
  currentModule,
  noActiveCourse,
}: {
  progress: MyProgressResponse | null;
  currentModule: Module | null;
  noActiveCourse: boolean;
}) {
  const allModules: Module[] = (progress?.course.sections ?? []).flatMap((s) => s.modules ?? []);
  const current = allModules.find((m) => (m.completedLessons ?? 0) < (m.lessonCount ?? 0));

  const todayTasks = (currentModule?.lessons ?? []).filter((l) => !l.completed).slice(0, 3);

  if (noActiveCourse) {
    return (
      <div className="pt-8">
        <ClayCard>
          <EmptyState
            icon={<Book size={22} />}
            title="Оберіть курс, щоб почати"
            description="На платформі кілька курсів — виберіть той, який хочете проходити зараз."
            action={
              <Button variant="blue" asChild>
                <Link href="/courses">Переглянути курси</Link>
              </Button>
            }
          />
        </ClayCard>
      </div>
    );
  }

  return (
    <div className="pt-8">
      <OnboardingTour />
      <header className="mb-6">
        <p className="text-sm font-bold text-ink-mute uppercase">
          {new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          Привіт! {progress ? `${progress.streak} ${daysWord(progress.streak)} поспіль` : ''}
        </h1>
      </header>

      {/* Резюме + серія */}
      <div className="mb-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <ClayCard className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-ink-mute uppercase">Продовжити навчання</p>
              <h2 className="mt-1.5 font-display text-xl font-bold">
                {current ? current.title : 'Усі модулі пройдено'}
              </h2>
              {current && (
                <p className="mt-1 text-sm text-ink-soft">
                  урок {(current.completedLessons ?? 0) + 1} з {current.lessonCount}
                </p>
              )}
            </div>
            <Orb color="red">
              <Shield size={24} />
            </Orb>
          </div>
          {current && (
            <ProgressBar
              value={((current.completedLessons ?? 0) / (current.lessonCount || 1)) * 100}
              label="Прогрес модуля"
              valueLabel={`${current.completedLessons ?? 0} з ${current.lessonCount}`}
            />
          )}
          {current && (
            <Button asChild variant="blue" className="self-start">
              <Link href={`/module/${current.slug}`}>
                Продовжити <Spark size={17} />
              </Link>
            </Button>
          )}
        </ClayCard>

        <ClayCard variant="sun" className="flex flex-col items-center justify-center gap-2 text-center">
          <Orb color="sun" size="lg">
            <Flame size={29} />
          </Orb>
          <p className="font-display text-4xl font-bold">
            <CountUp value={progress?.streak ?? 0} />
          </p>
          <p className="text-sm font-semibold">днів поспіль</p>
          <p className="text-[13px] opacity-80">Пропустите день — серія призупиниться, а не згорить</p>
        </ClayCard>
      </div>

      {/* Шлях до сертифіката — модулі активного курсу, кожен клікабельний */}
      <Reveal className="mb-6">
        <ClayCard variant={progress?.hasCertificate ? 'gold' : undefined}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold">Шлях до сертифіката</h2>
            <span className="group inline-block cursor-default rounded-full bg-blue-tint px-4 py-1.5 text-sm font-bold text-blue-deep transition-transform hover:scale-110">
              <span className="inline-block transition-transform group-hover:-translate-y-0.5">
                {progress?.completedModules ?? 0}
              </span>{' '}
              з {progress?.moduleCount ?? allModules.length} модулів
            </span>
          </div>
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
            {allModules.map((m, i) => {
              const done = (m.completedLessons ?? 0) === (m.lessonCount ?? 0) && (m.hasQuiz ? (m.quizPassed ?? false) : true);
              const isCurrent = m.slug === current?.slug;
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <Link
                    href={`/module/${m.slug}`}
                    title={done ? `${m.title} — виконано` : m.title}
                    className={`group rounded-full ${done ? 'ring-[3px] ring-green/35' : ''}`}
                  >
                    <Orb size={isCurrent ? 'default' : 'sm'} color={done ? 'green' : isCurrent ? 'blue' : 'muted'}>
                      {done ? <Check size={16} strokeWidth={3} /> : isCurrent ? <Shield size={18} /> : i + 1}
                    </Orb>
                  </Link>
                  {i < allModules.length - 1 && (
                    <span className={`h-2 w-6 flex-none rounded-full ${done ? 'bg-green' : 'bg-paper-2'}`} />
                  )}
                </div>
              );
            })}
            <span className="h-2 w-6 flex-none rounded-full bg-paper-2" />
            <span className="group" title="Атестація">
              <Orb color="gold">
                <Award size={20} />
              </Orb>
            </span>
          </div>

          {progress?.hasCertificate ? (
            <Button variant="sun" asChild>
              <Link href="/certificates">
                <Award size={17} /> Переглянути сертифікат
              </Link>
            </Button>
          ) : progress?.examEligible ? (
            <Button variant="sun" asChild>
              <Link href={`/exam/${progress.course.slug}`}>
                <Award size={17} /> Пройти фінальну атестацію
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-ink-soft">Завершіть усі модулі й тести курсу, щоб відкрити фінальну атестацію.</p>
          )}
        </ClayCard>
      </Reveal>

      {/* Дві колонки */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ClayCard>
          <h2 className="mb-4 text-[17px] font-bold">План на сьогодні</h2>
          <div className="flex flex-col gap-1">
            {todayTasks.length === 0 && <p className="text-sm text-ink-soft">Усі уроки цього модуля пройдено.</p>}
            {todayTasks.map((lesson, i) => (
              <Link
                key={lesson.id}
                href={`/lesson/${lesson.id}`}
                className="flex items-center gap-3.5 rounded-[26px] px-4 py-3 text-left transition-colors hover:bg-paper-2"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-blue-tint text-blue-deep">
                  {i === 0 ? <Play size={15} /> : <Clock size={14} />}
                </span>
                <span className="flex-1 text-base font-medium">{lesson.title}</span>
                <span className="text-[13.5px] font-semibold text-ink-mute">{lesson.minutes} хв</span>
              </Link>
            ))}
          </div>
        </ClayCard>

        <ClayCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Досягнення</h2>
            <AchievementsDialog progress={progress} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            {ACHIEVEMENTS.map((a) => (
              <AchievementBadge key={a.id} earned={a.earned({ progress })} icon={a.icon} label={a.label} />
            ))}
          </div>
        </ClayCard>
      </div>
    </div>
  );
}

function daysWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дні';
  return 'днів';
}

function AchievementBadge({ earned, icon, label }: { earned: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className={`group flex flex-col items-center gap-1.5 transition-opacity ${earned ? '' : 'opacity-40'}`}>
      <Orb size="sm" color={earned ? 'green' : 'muted'}>
        {icon}
      </Orb>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function AchievementsDialog({ progress }: { progress: MyProgressResponse | null }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Усі досягнення й умови отримання"
          className="grid h-8 w-8 place-items-center rounded-full text-ink-mute transition-colors hover:bg-paper-2"
        >
          <Info size={16} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Усі досягнення</DialogTitle>
          <DialogDescription>За що вони видаються і як їх отримати.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {ACHIEVEMENTS.map((a) => {
            const earned = a.earned({ progress });
            return (
              <div key={a.id} className={`flex items-center gap-3 rounded-2xl bg-paper-2 p-3.5 ${earned ? '' : 'opacity-70'}`}>
                <Orb size="sm" color={earned ? 'green' : 'muted'}>
                  {a.icon}
                </Orb>
                <div>
                  <p className="text-sm font-bold">{a.label}</p>
                  <p className="text-xs text-ink-soft">{a.description}</p>
                </div>
                {earned && <Check size={16} className="ml-auto flex-none text-green" />}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
