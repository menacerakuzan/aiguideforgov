import { describe, expect, it } from 'vitest';
import { computeStreak, dayStamp, type ActivityDay } from './streak';

/** Дні активності з рівною одиницею уроку — деталі лічильників тут не важливі. */
function days(...dates: string[]): ActivityDay[] {
  return dates.map((date) => ({ date, lessons: 1, quizzes: 0, total: 1 }));
}

const NOW = new Date('2026-09-03T09:00:00Z');

describe('computeStreak', () => {
  it('без активності серії немає', () => {
    expect(computeStreak([], NOW)).toMatchObject({ current: 0, longest: 0, activeDays: 0 });
  });

  it('рахує дні поспіль, що закінчуються сьогодні', () => {
    const s = computeStreak(days('2026-09-01', '2026-09-02', '2026-09-03'), NOW);
    expect(s.current).toBe(3);
    expect(s.activeToday).toBe(true);
    expect(s.atRisk).toBe(false);
  });

  it('вчорашній день серію ще тримає, але позначає під загрозою', () => {
    const s = computeStreak(days('2026-09-01', '2026-09-02'), NOW);
    expect(s.current).toBe(2);
    expect(s.activeToday).toBe(false);
    expect(s.atRisk).toBe(true);
  });

  it('пропущений день гасить серію повністю', () => {
    const s = computeStreak(days('2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31'), NOW);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(4);
  });

  it('рекорд лишається після згорілої серії', () => {
    const s = computeStreak(days('2026-08-01', '2026-08-02', '2026-08-03', '2026-09-03'), NOW);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(3);
    expect(s.activeDays).toBe(4);
  });

  it('день рахується за київським часом, а не за UTC', () => {
    // 22:30 UTC 3 вересня — це вже 01:30 4 вересня в Києві.
    expect(dayStamp(new Date('2026-09-03T22:30:00Z'))).toBe('2026-09-04');
    expect(dayStamp(new Date('2026-09-03T20:30:00Z'))).toBe('2026-09-03');
  });
});
