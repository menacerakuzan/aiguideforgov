import { describe, expect, it } from 'vitest';
import { computeModuleLocks, type ModuleCompletion, type ModuleLockInput } from './completion';

/** Модуль із N уроків: id уроку — «<slug>-<номер>», щоб його було видно в тесті. */
function mod(slug: string, lessons: number, withQuiz = true): ModuleLockInput {
  return {
    id: slug,
    slug,
    title: slug.toUpperCase(),
    lessons: Array.from({ length: lessons }, (_, i) => ({ id: `${slug}-${i + 1}` })),
    quiz: withQuiz ? { id: `quiz-${slug}` } : null,
  };
}

function completion(completedModules: string[], completedLessons: string[]): ModuleCompletion {
  return {
    completedModuleIds: new Set(completedModules),
    completedLessonIds: new Set(completedLessons),
    passedQuizIds: new Set(),
  };
}

const course = [mod('m1', 2), mod('m2', 2), mod('m3', 2)];

describe('computeModuleLocks', () => {
  it('новачок бачить відкритим лише перший модуль', () => {
    const locks = computeModuleLocks(course, completion([], []));

    expect(locks.get('m1')!.locked).toBe(false);
    expect(locks.get('m2')!.locked).toBe(true);
    expect(locks.get('m3')!.locked).toBe(true);
  });

  it('замок називає перший незавершений модуль, а не просто попередній', () => {
    const locks = computeModuleLocks(course, completion([], []));

    expect(locks.get('m3')!.lockedBy).toEqual({ slug: 'm1', title: 'M1' });
  });

  it('завершений модуль відкриває наступний — і лише наступний', () => {
    const locks = computeModuleLocks(course, completion(['m1'], ['m1-1', 'm1-2']));

    expect(locks.get('m2')!.locked).toBe(false);
    expect(locks.get('m3')!.locked).toBe(true);
  });

  it('пройдений модуль лишається відкритим для повторного читання', () => {
    // m1 пройдено, m2 ще ні — але m1 однаково не закривається.
    const locks = computeModuleLocks(course, completion(['m1'], ['m1-1', 'm1-2']));

    expect(locks.get('m1')!.locked).toBe(false);
    expect(locks.get('m1')!.lockedBy).toBeNull();
  });

  it('розпочатий модуль не закривається заднім числом', () => {
    // Слухач устиг зайти в m3 до появи правила: уроки m1 не завершені, але
    // в m3 вже є прогрес — закрити його означало б відібрати почате.
    const locks = computeModuleLocks(course, completion([], ['m3-1']));

    expect(locks.get('m3')!.locked).toBe(false);
    // Незачеплений m2 при цьому лишається закритим.
    expect(locks.get('m2')!.locked).toBe(true);
  });

  it('уроки пройдені, але тест не складено — модуль не відкриває наступний', () => {
    // Саме тут і живе сенс правила: без зарахованого тесту модуль незавершений,
    // тож ключовий модуль (напр. «Безпека») неможливо перестрибнути.
    const locks = computeModuleLocks(course, completion([], ['m1-1', 'm1-2']));

    expect(locks.get('m2')!.locked).toBe(true);
    expect(locks.get('m2')!.lockedBy).toEqual({ slug: 'm1', title: 'M1' });
  });

  it('повністю пройдений курс не має замків', () => {
    const all = completion(['m1', 'm2', 'm3'], ['m1-1', 'm1-2', 'm2-1', 'm2-2', 'm3-1', 'm3-2']);
    const locks = computeModuleLocks(course, all);

    expect([...locks.values()].every((l) => !l.locked)).toBe(true);
  });

  it('порожній курс не ламає розрахунок', () => {
    expect(computeModuleLocks([], completion([], [])).size).toBe(0);
  });
});
