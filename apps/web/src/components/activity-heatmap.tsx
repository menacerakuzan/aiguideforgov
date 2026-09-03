import type { ActivityDayDto } from '@proai/types';

/**
 * Календар активності: тиждень — колонка, день — клітинка.
 *
 * Серверний компонент без стану: усі дати приходять готовими рядками
 * 'РРРР-ММ-ДД' за київським часом, тож у браузері нічого не перераховується
 * і календар не «стрибає» між часовими поясами сервера й читача.
 */

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTHS = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];

/** Чотири рівні насиченості — більше відтінків око вже не розрізняє. */
const LEVELS = [
  'bg-paper-2',
  'bg-green-tint',
  'bg-green/45',
  'bg-green/75',
  'bg-green',
] as const;

function dayNumber(stamp: string): number {
  const [y, m, d] = stamp.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

function stamp(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/** 0 — понеділок: тиждень у календарі починається з нього, як звикли читачі. */
function weekday(n: number): number {
  return (((n + 3) % 7) + 7) % 7;
}

function level(total: number): number {
  if (total <= 0) return 0;
  if (total === 1) return 1;
  if (total <= 3) return 2;
  if (total <= 5) return 3;
  return 4;
}

export function ActivityHeatmap({
  days,
  today,
  weeks = 26,
}: {
  days: ActivityDayDto[];
  /** Сьогоднішня дата за київським часом, 'РРРР-ММ-ДД'. */
  today: string;
  weeks?: number;
}) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const todayNum = dayNumber(today);

  // Останній стовпчик — поточний тиждень цілком, щоб «сьогодні» не опинялось
  // посеред обрізаної колонки.
  const lastSunday = todayNum + (6 - weekday(todayNum));
  const firstMonday = lastSunday - weeks * 7 + 1;

  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => firstMonday + w * 7 + d),
  );

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-1.5">
        <div className="flex flex-col gap-[3px] pt-[18px] pr-1">
          {WEEKDAYS.map((label, i) => (
            <span key={label} className="h-[14px] text-[10px] leading-[14px] font-semibold text-ink-mute">
              {i % 2 === 0 ? label : ''}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {columns.map((column, w) => {
            const first = column[0]!;
            const month = new Date(first * 86_400_000).getUTCMonth();
            const prevMonth = w === 0 ? -1 : new Date(columns[w - 1]![0]! * 86_400_000).getUTCMonth();

            return (
              <div key={first} className="flex flex-col gap-[3px]">
                <span className="h-[15px] text-[10px] font-semibold text-ink-mute">
                  {month !== prevMonth ? MONTHS[month] : ''}
                </span>
                {column.map((n) => {
                  const date = stamp(n);
                  const day = byDate.get(date);
                  const future = n > todayNum;

                  return (
                    <span
                      key={n}
                      title={
                        future
                          ? ''
                          : `${date}: ${day ? `${day.lessons} уроків, ${day.quizzes} спроб тестів` : 'без активності'}`
                      }
                      aria-hidden={future}
                      className={`h-[14px] w-[14px] rounded-[4px] ${
                        future ? 'bg-transparent' : LEVELS[level(day?.total ?? 0)]
                      } ${n === todayNum ? 'ring-2 ring-blue ring-offset-1' : ''}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-ink-mute">
        <span>менше</span>
        {LEVELS.map((c) => (
          <span key={c} className={`h-[12px] w-[12px] rounded-[4px] ${c}`} />
        ))}
        <span>більше</span>
      </div>
    </div>
  );
}
