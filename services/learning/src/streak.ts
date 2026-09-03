import { prisma } from '@proai/db';
import type { ActivityDayDto, StreakState } from '@proai/types';

/**
 * Серія днів навчання.
 *
 * Раніше серія жила окремим числом у User.streak, яке зростало лише в момент
 * завершення уроку і ніколи не зменшувалось. Тобто людина, яка не заходила
 * місяць, і далі бачила «5 днів поспіль» — серія не значила нічого.
 *
 * Тепер серія РАХУЄТЬСЯ з історії активності при кожному читанні: пропустив
 * день — серія згоріла й починається з нуля. User.streak лишається кешем для
 * адмінських списків, його оновлює completeLesson тим самим розрахунком.
 *
 * День — київський, а не UTC: урок, завершений о 01:00 в Києві, має рахуватися
 * сьогоднішнім, а не вчорашнім.
 */

const TZ = 'Europe/Kyiv';

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Дата події як 'РРРР-ММ-ДД' за київським часом. */
export function dayStamp(date: Date): string {
  return DAY_FORMAT.format(date);
}

/** Порядковий номер доби — щоб рахувати «скільки днів між». */
export function dayNumber(stamp: string): number {
  const [y, m, d] = stamp.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

/** Зворотне перетворення — номер доби у 'РРРР-ММ-ДД'. */
export function stampFromNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/** Один день з активністю: скільки уроків завершено і скільки спроб тестів. */
export type ActivityDay = ActivityDayDto;
export type { StreakState };

/**
 * Дні, у які слухач щось робив: завершив урок або проходив тест.
 * Перегляд уже пройденого уроку активністю не рахується — інакше серію
 * можна було б тримати відкриванням старої сторінки.
 */
export async function getActivityDays(userId: string): Promise<ActivityDay[]> {
  const [progress, attempts, examAttempts] = await Promise.all([
    prisma.progress.findMany({ where: { userId }, select: { completedAt: true } }),
    prisma.attempt.findMany({ where: { userId }, select: { createdAt: true } }),
    prisma.examAttempt.findMany({ where: { userId }, select: { createdAt: true } }),
  ]);

  const byDay = new Map<string, ActivityDay>();
  const bump = (date: Date, field: 'lessons' | 'quizzes') => {
    const key = dayStamp(date);
    const day = byDay.get(key) ?? { date: key, lessons: 0, quizzes: 0, total: 0 };
    day[field] += 1;
    day.total += 1;
    byDay.set(key, day);
  };

  for (const p of progress) bump(p.completedAt, 'lessons');
  for (const a of attempts) bump(a.createdAt, 'quizzes');
  for (const a of examAttempts) bump(a.createdAt, 'quizzes');

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Серія з історії днів.
 *
 * Сьогоднішній день без активності серію ще не гасить — доба не скінчилась,
 * і людина цілком може сісти за урок увечері. Гасне вона тоді, коли між
 * останнім днем активності й сьогодні є хоч одна повністю пропущена доба.
 */
export function computeStreak(days: ActivityDay[], now = new Date()): StreakState {
  if (days.length === 0) {
    return { current: 0, longest: 0, activeDays: 0, lastActiveDate: null, activeToday: false, atRisk: false };
  }

  const numbers = days.map((d) => dayNumber(d.date)).sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < numbers.length; i++) {
    run = numbers[i]! - numbers[i - 1]! === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const today = dayNumber(dayStamp(now));
  const last = numbers[numbers.length - 1]!;
  const gap = today - last;

  let current = 0;
  if (gap === 0 || gap === 1) {
    current = 1;
    for (let i = numbers.length - 1; i > 0; i--) {
      if (numbers[i]! - numbers[i - 1]! !== 1) break;
      current++;
    }
  }

  return {
    current,
    longest: Math.max(longest, current),
    activeDays: numbers.length,
    lastActiveDate: days[days.length - 1]!.date,
    activeToday: gap === 0,
    atRisk: gap === 1,
  };
}

/** Серія слухача просто зараз — разом із рекордом і днями активності. */
export async function getStreak(userId: string): Promise<StreakState> {
  return computeStreak(await getActivityDays(userId));
}

/**
 * Перераховує серію з історії й зберігає її в User.
 *
 * User.streak — кеш для адмінських списків і аналітики: правдою лишається
 * розрахунок з історії, тому тут ми не «збільшуємо на одиницю», а записуємо
 * те саме число, яке побачить слухач на дашборді.
 */
export async function refreshStreak(userId: string): Promise<StreakState> {
  const streak = computeStreak(await getActivityDays(userId));

  await prisma.user.update({
    where: { id: userId },
    data: { streak: streak.current, lastActiveAt: new Date() },
  });

  return streak;
}

/**
 * Серія за кешованим значенням — для списків, де рахувати історію кожного
 * користувача було б окремим запитом на рядок.
 *
 * User.streak був правильний станом на lastActiveAt, тому для «зараз» лишається
 * одне уточнення: якщо між останньою активністю й сьогодні є хоч одна повністю
 * пропущена доба, серія згоріла. Без цього адмінка показувала б давно згорілі
 * серії тих, хто не заходив місяцями.
 */
export function cachedStreak(streak: number, lastActiveAt: Date | null, now = new Date()): number {
  if (!lastActiveAt) return 0;
  const gap = dayNumber(dayStamp(now)) - dayNumber(dayStamp(lastActiveAt));
  return gap <= 1 ? streak : 0;
}
