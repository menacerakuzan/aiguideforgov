import Link from 'next/link';
import type { AdminDailyPoint, AdminFunnelStep } from '@proai/types';
import { ClayCard, Orb, type ClayCardProps } from '@proai/ui';

/**
 * Спільні цеглинки сторінок аналітики.
 *
 * Усі — серверні: на сторінках аналітики немає жодної інтерактивності, крім
 * таблиці людей, тож нести цей код у браузер немає за що.
 */

/* --- Навігація між розрізами --------------------------------------------- */

const TABS = [
  { href: '/admin/analytics', label: 'Люди' },
  { href: '/admin/analytics/course', label: 'Курс' },
] as const;

export function AnalyticsTabs({ active }: { active: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2.5">
      {TABS.map((tab) => {
        const selected = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={selected ? 'page' : undefined}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
              selected
                ? 'bg-blue text-white shadow-[0_12px_22px_-9px_rgba(62,109,245,0.32),inset_0_-5px_10px_rgba(20,45,130,0.32),inset_0_6px_13px_rgba(255,255,255,0.22)]'
                : 'bg-surface text-ink-soft shadow-[0_9px_18px_-10px_rgba(38,34,74,0.14),inset_0_6px_12px_rgba(255,255,255,0.9)] hover:-translate-y-0.5'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

/* --- Плитка з одним числом ------------------------------------------------ */

export function StatTile({
  icon,
  value,
  label,
  hint,
  color = 'blue',
  variant,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint?: string;
  color?: 'blue' | 'green' | 'sun' | 'gold' | 'amber' | 'red' | 'muted';
  variant?: ClayCardProps['variant'];
}) {
  return (
    <ClayCard variant={variant} padding="sm" className="flex items-center gap-3.5">
      <Orb size="sm" color={color}>
        {icon}
      </Orb>
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold">{value}</p>
        <p className="text-[13px] font-semibold">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-ink-mute">{hint}</p>}
      </div>
    </ClayCard>
  );
}

/** Підпис «що це число означає» — заголовок секції з поясненням під ним. */
export function SectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold">{title}</h2>
      <p className="mt-1 text-[13px] text-ink-soft">{hint}</p>
    </div>
  );
}

export function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[15px]">
      <span className="text-ink-soft">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

/* --- Воронка -------------------------------------------------------------- */

/**
 * Сходинки воронки з підписом «скільки з попередньої сходинки дійшли сюди».
 * Саме ця різниця і є відповіддю на «де ми втрачаємо людей», тож вона стоїть
 * поруч із числом, а не лишається читачеві на усний рахунок.
 */
export function Funnel({ steps }: { steps: AdminFunnelStep[] }) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => {
        const prev = i === 0 ? null : steps[i - 1]!;
        const fromPrev = prev && prev.count > 0 ? Math.round((step.count / prev.count) * 100) : null;
        const lost = prev ? prev.count - step.count : 0;

        return (
          <div key={step.key}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[15px] font-bold">{step.label}</span>
              <span className="text-[13px] font-semibold text-ink-mute">
                {step.count} ({step.pct}% усіх)
                {fromPrev !== null && ` · ${fromPrev}% від попереднього кроку`}
                {lost > 0 && ` · тут відпало ${lost}`}
              </span>
            </div>
            <div className="h-7 overflow-hidden rounded-full bg-paper-2">
              <div
                className="flex h-full items-center rounded-full bg-blue px-3 text-[12px] font-bold text-white"
                style={{ width: `${Math.max(step.pct, step.count > 0 ? 6 : 0)}%` }}
              >
                {step.count > 0 && step.pct >= 12 ? step.count : ''}
              </div>
            </div>
            <p className="mt-1 text-[12px] text-ink-mute">{step.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

/* --- Графік активності ---------------------------------------------------- */

const MONTHS = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];

function shortDate(stamp: string): string {
  const [, m, d] = stamp.split('-').map(Number);
  return `${d} ${MONTHS[m! - 1]}`;
}

/**
 * Стовпчики по днях: уроки й спроби тестів одним стосом.
 * Висота — від найбільшого дня вікна, бо абсолютні числа на платформі малі й
 * фіксована шкала перетворила б графік на рівну лінію.
 */
export function DailyChart({ days }: { days: AdminDailyPoint[] }) {
  const max = Math.max(1, ...days.map((d) => d.lessons + d.quizzes));
  const totalLessons = days.reduce((s, d) => s + d.lessons, 0);
  const totalQuizzes = days.reduce((s, d) => s + d.quizzes, 0);

  return (
    <div>
      <div className="flex h-[140px] items-end gap-[3px]">
        {days.map((d) => {
          const total = d.lessons + d.quizzes;
          const height = total === 0 ? 2 : Math.max(6, Math.round((total / max) * 132));
          return (
            <div
              key={d.date}
              title={`${shortDate(d.date)}: ${d.lessons} уроків, ${d.quizzes} спроб тестів, ${d.learners} людей`}
              className="flex flex-1 flex-col justify-end"
              style={{ height: `${height}px` }}
            >
              {d.quizzes > 0 && (
                <div
                  className="w-full rounded-t-[4px] bg-amber"
                  style={{ height: `${Math.round((d.quizzes / Math.max(total, 1)) * 100)}%` }}
                />
              )}
              <div
                className={`w-full ${d.quizzes > 0 ? '' : 'rounded-t-[4px]'} ${
                  total === 0 ? 'rounded-full bg-paper-2' : 'bg-blue'
                }`}
                style={{ height: total === 0 ? '100%' : `${Math.round((d.lessons / Math.max(total, 1)) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-mute">
        <span>{shortDate(days[0]?.date ?? '')}</span>
        <span>{shortDate(days[days.length - 1]?.date ?? '')}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-blue" /> уроки — {totalLessons}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-amber" /> спроби тестів — {totalQuizzes}
        </span>
      </div>
    </div>
  );
}

/* --- Дрібні форматувальники ---------------------------------------------- */

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дні';
  return 'днів';
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} хв`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} год ${rest} хв` : `${hours} год`;
}
