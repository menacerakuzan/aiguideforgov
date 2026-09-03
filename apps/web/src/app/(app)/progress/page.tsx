import Link from 'next/link';
import { Award, Book, Check, Flame, Play, Shield, Spark } from '@proai/icons';
import { Button, ClayCard, EmptyState, Orb, ProgressBar, ProgressRing, type ClayCardProps } from '@proai/ui';
import { dayStamp, getLearnerStats, resolveActiveCourseSlug } from '@proai/learning';
import type { ModuleProgressRow } from '@proai/types';
import { requirePageUser } from '@/lib/page-guard';
import { ActivityHeatmap } from '@/components/activity-heatmap';

export const metadata = { title: 'Прогрес' };

/**
 * Сторінка «Прогрес» — повна картина навчання одного слухача.
 *
 * Усе тут порахувано з історії (getLearnerStats), а не зі збережених
 * лічильників, тому цифри на цій сторінці, на дашборді й у сертифікаті не
 * можуть розійтися.
 */
export default async function ProgressPage() {
  const me = await requirePageUser();
  const courseSlug = await resolveActiveCourseSlug(me.id);
  const stats = await getLearnerStats(me.id, courseSlug);
  const today = dayStamp(new Date());

  const coursePct = stats.lessons.total
    ? Math.round((stats.lessons.completed / stats.lessons.total) * 100)
    : 0;

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Ваш прогрес</h1>
        <p className="mt-2 text-ink-soft">
          {stats.course
            ? `Курс «${stats.course.title}» — усе, що зараховано платформою.`
            : 'Курс ще не обрано, тому показано прогрес по всіх курсах платформи.'}
        </p>
      </header>

      {/* --- Чотири головні числа ------------------------------------------ */}
      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          color="blue"
          icon={<Book size={20} />}
          value={`${stats.lessons.completed} з ${stats.lessons.total}`}
          label="уроків пройдено"
          hint={`${stats.minutes} хв навчального часу`}
        />
        <StatTile
          color="green"
          icon={<Check size={20} />}
          value={`${stats.modules.completed} з ${stats.modules.total}`}
          label="модулів завершено"
          hint={`тестів складено: ${stats.quizzes.passed} з ${stats.quizzes.total}`}
        />
        <StatTile
          color="sun"
          variant="sun"
          icon={<Flame size={20} />}
          value={`${stats.streak.current}`}
          label={`${daysWord(stats.streak.current)} поспіль`}
          hint={`рекорд — ${stats.streak.longest} ${daysWord(stats.streak.longest)}`}
        />
        <StatTile
          color="gold"
          variant="gold"
          icon={<Spark size={20} />}
          value={`${stats.totalPoints}`}
          label="балів"
          hint={`днів навчання: ${stats.streak.activeDays}`}
        />
      </div>

      {/* --- Кільце курсу + календар активності ---------------------------- */}
      <div className="mb-5 grid gap-5 lg:grid-cols-[320px_1fr]">
        <ClayCard className="flex flex-col items-center gap-3 text-center">
          <ProgressRing value={coursePct} complete={coursePct === 100} size={168}>
            <span className="font-display text-4xl font-bold">{coursePct}%</span>
            <span className="block text-xs font-semibold text-ink-mute">курсу</span>
          </ProgressRing>
          <p className="text-sm text-ink-soft">
            {stats.startedAt
              ? `Навчаєтесь із ${new Date(stats.startedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : 'Перший урок ще попереду'}
          </p>
          <Button variant="blue" size="sm" asChild>
            <Link href={stats.course ? '/dashboard' : '/courses'}>
              <Play size={15} /> {stats.course ? 'Продовжити навчання' : 'Обрати курс'}
            </Link>
          </Button>
        </ClayCard>

        <ClayCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold">Активність по днях</h2>
            <p className="text-[13px] font-semibold text-ink-mute">
              {stats.streak.lastActiveDate
                ? `остання активність: ${stats.streak.lastActiveDate}`
                : 'активності ще не було'}
            </p>
          </div>
          <ActivityHeatmap days={stats.activity} today={today} />
          <p className="mt-3 text-[13px] text-ink-soft">
            {streakHint(stats.streak)}
          </p>
        </ClayCard>
      </div>

      {/* --- Розділи -------------------------------------------------------- */}
      {stats.sections.length > 0 && (
        <ClayCard className="mb-5">
          <h2 className="mb-4 text-[17px] font-bold">Розділи курсу</h2>
          <div className="flex flex-col gap-4">
            {stats.sections.map((section) => (
              <div key={section.slug}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold">
                    Розділ {section.order}. {section.title}
                  </span>
                  <span className="text-[13px] font-semibold text-ink-mute">
                    {section.completedLessons} з {section.lessonCount} уроків ·{' '}
                    {section.completedModules} з {section.moduleCount} модулів
                  </span>
                </div>
                <ProgressBar
                  color={
                    section.lessonCount > 0 && section.completedLessons === section.lessonCount ? 'green' : 'blue'
                  }
                  value={section.lessonCount ? (section.completedLessons / section.lessonCount) * 100 : 0}
                />
              </div>
            ))}
          </div>
        </ClayCard>
      )}

      {/* --- Модулі --------------------------------------------------------- */}
      <ClayCard className="mb-5">
        <h2 className="mb-4 text-[17px] font-bold">Модулі й тести</h2>
        {stats.moduleRows.length === 0 ? (
          <EmptyState
            icon={<Book size={22} />}
            title="Модулів поки немає"
            description="Тут з’явиться рядок на кожен модуль програми, щойно на платформі буде курс."
            action={
              <Button variant="blue" asChild>
                <Link href="/courses">Переглянути курси</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {stats.moduleRows.map((row) => (
              <ModuleRow key={row.slug} row={row} />
            ))}
          </div>
        )}
      </ClayCard>

      {/* --- Бали й атестація ----------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ClayCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Звідки бали</h2>
            <span className="rounded-full bg-gold-tint px-3.5 py-1 text-sm font-bold text-gold-deep">
              {stats.totalPoints}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {stats.points.map((entry) => (
              <div
                key={entry.label}
                className="flex items-center gap-3 rounded-[22px] px-3.5 py-2.5 odd:bg-paper-2"
              >
                <span className="flex-1 text-[15px] font-medium">{entry.label}</span>
                <span className="text-[13px] text-ink-mute">
                  {entry.count} × {entry.each}
                </span>
                <span className="w-14 text-right text-[15px] font-bold">{entry.points}</span>
              </div>
            ))}
          </div>
        </ClayCard>

        <ClayCard variant={stats.exam.passed ? 'gold' : undefined}>
          <h2 className="mb-4 text-[17px] font-bold">Атестація і сертифікат</h2>
          <dl className="flex flex-col gap-3 text-[15px]">
            <Row label="Спроб атестації" value={`${stats.exam.attempts}`} />
            <Row label="Найкращий бал" value={stats.exam.bestScore === null ? '—' : `${stats.exam.bestScore}%`} />
            <Row
              label="Середній бал за тести модулів"
              value={stats.quizzes.averageBest === null ? '—' : `${stats.quizzes.averageBest}%`}
            />
            <Row label="Чинних сертифікатів" value={`${stats.certificates}`} />
          </dl>
          <div className="mt-4">
            {stats.certificates > 0 ? (
              <Button variant="sun" asChild>
                <Link href="/certificates">
                  <Award size={17} /> Переглянути сертифікат
                </Link>
              </Button>
            ) : stats.modules.total > 0 && stats.modules.completed === stats.modules.total && stats.course ? (
              <Button variant="sun" asChild>
                <Link href={`/exam/${stats.course.slug}`}>
                  <Award size={17} /> Пройти фінальну атестацію
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-ink-soft">
                Атестація відкриється, коли всі модулі курсу будуть завершені — разом із тестами.
              </p>
            )}
          </div>
        </ClayCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  hint,
  color,
  variant,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint: string;
  color: 'blue' | 'green' | 'sun' | 'gold';
  variant?: ClayCardProps['variant'];
}) {
  return (
    <ClayCard variant={variant} className="flex items-center gap-3.5">
      <Orb color={color}>{icon}</Orb>
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold">{value}</p>
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="mt-0.5 text-[12px] text-ink-mute">{hint}</p>
      </div>
    </ClayCard>
  );
}

const STATUS_LABEL: Record<ModuleProgressRow['status'], string> = {
  DONE: 'Завершено',
  IN_PROGRESS: 'У процесі',
  NOT_STARTED: 'Не почато',
};

function ModuleRow({ row }: { row: ModuleProgressRow }) {
  const pct = row.lessonCount ? (row.completedLessons / row.lessonCount) * 100 : 0;

  return (
    <Link
      href={`/module/${row.slug}`}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[26px] px-4 py-3 transition-colors hover:bg-paper-2"
    >
      <Orb size="sm" color={row.status === 'DONE' ? 'green' : row.status === 'IN_PROGRESS' ? 'blue' : 'muted'}>
        {row.status === 'DONE' ? <Check size={15} strokeWidth={3} /> : row.isKey ? <Shield size={15} /> : row.order}
      </Orb>

      <div className="min-w-[180px] flex-1">
        <p className="text-[15px] font-bold">{row.title}</p>
        <p className="text-[12px] text-ink-mute">
          {row.sectionTitle} · {row.minutes} хв
          {row.isKey && ' · ключовий модуль'}
        </p>
      </div>

      <div className="w-[150px]">
        <ProgressBar
          color={row.status === 'DONE' ? 'green' : 'blue'}
          value={pct}
          valueLabel={`${row.completedLessons}/${row.lessonCount}`}
        />
      </div>

      <div className="w-[140px] text-[13px] font-semibold">
        {!row.hasQuiz ? (
          <span className="text-ink-mute">без тесту</span>
        ) : row.bestScore === null ? (
          <span className="text-ink-mute">тест не складали</span>
        ) : (
          <span className={row.quizPassed ? 'text-green-deep' : 'text-red-deep'}>
            тест {row.bestScore}% {row.quizPassed ? '· зараховано' : `· треба ${row.passScore}%`}
          </span>
        )}
      </div>

      <span
        className={`rounded-full px-3 py-1 text-[12px] font-bold ${
          row.status === 'DONE'
            ? 'bg-green-tint text-green-deep'
            : row.status === 'IN_PROGRESS'
              ? 'bg-blue-tint text-blue-deep'
              : 'bg-paper-2 text-ink-mute'
        }`}
      >
        {STATUS_LABEL[row.status]}
      </span>
    </Link>
  );
}

function streakHint(streak: { current: number; longest: number; activeToday: boolean; atRisk: boolean }): string {
  if (streak.current === 0 && streak.longest === 0) return 'Серія почнеться з першого пройденого уроку.';
  if (streak.current === 0) return `Серія згоріла через пропущений день. Рекорд — ${streak.longest} ${daysWord(streak.longest)}, і він лишається назавжди.`;
  if (streak.atRisk) return 'Сьогодні ще нічого не зараховано: без уроку чи тесту до кінця дня серія згорить.';
  return 'Серія рахує дні поспіль, у які ви завершили урок або проходили тест. Пропущений день гасить її повністю.';
}

function daysWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дні';
  return 'днів';
}
