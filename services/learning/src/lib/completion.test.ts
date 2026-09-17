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

/**
 * Чотири модулі, а не три: перші два відкриті з початку, тож перевірити сам
 * ланцюжок можна лише на тих, що йдуть далі.
 */
const course = [mod('m1', 2), mod('m2', 2), mod('m3', 2), mod('m4', 2)];

/** Усі уроки перелічених модулів — щоб не набивати їх у кожному тесті. */
const lessonsOf = (...slugs: string[]) => slugs.flatMap((s) => [`${s}-1`, `${s}-2`]);

describe('computeModuleLocks', () => {
  it('новачок бачить відкритими перші два модулі', () => {
    const locks = computeModuleLocks(course, completion([], []));

    expect(locks.get('m1')!.locked).toBe(false);
    expect(locks.get('m2')!.locked).toBe(false);
    expect(locks.get('m3')!.locked).toBe(true);
  });

  it('практика відкрита, навіть якщо знайомство не починали', () => {
    // Сенс правила: людина приходить подивитись, що курс дає, і може одразу
    // зайти в практику, не проходячи модуль реєстрації.
    const locks = computeModuleLocks(course, completion([], []));

    expect(locks.get('m2')!.lockedBy).toBeNull();
  });

  it('ланцюжок починається з другого модуля, а не з першого', () => {
    // Третій чекає на ПРАКТИКУ. Якби він чекав на знайомство, вільний вхід у
    // практику нічого б не дав: усе після неї однаково впиралося б у пропущене.
    const locks = computeModuleLocks(course, completion(['m2'], lessonsOf('m2')));

    expect(locks.get('m3')!.locked).toBe(false);
    // Знайомство так і не пройдено — і це не заважає.
    expect(locks.get('m1')!.locked).toBe(false);
  });

  it('замок називає перший незавершений модуль, а не просто попередній', () => {
    const locks = computeModuleLocks(course, completion([], []));

    expect(locks.get('m4')!.lockedBy).toEqual({ slug: 'm2', title: 'M2' });
  });

  it('завершений модуль відкриває наступний — і лише наступний', () => {
    const locks = computeModuleLocks(course, completion(['m2'], lessonsOf('m2')));

    expect(locks.get('m3')!.locked).toBe(false);
    expect(locks.get('m4')!.locked).toBe(true);
  });

  it('пройдений модуль лишається відкритим для повторного читання', () => {
    // m3 пройдено, m4 ще ні — але m3 однаково не закривається.
    const locks = computeModuleLocks(course, completion(['m2', 'm3'], lessonsOf('m2', 'm3')));

    expect(locks.get('m3')!.locked).toBe(false);
    expect(locks.get('m3')!.lockedBy).toBeNull();
  });

  it('розпочатий модуль не закривається заднім числом', () => {
    // Слухач устиг зайти в m4 до появи правила: попередні не завершені, але
    // в m4 вже є прогрес — закрити його означало б відібрати почате.
    const locks = computeModuleLocks(course, completion([], ['m4-1']));

    expect(locks.get('m4')!.locked).toBe(false);
    // Незачеплений m3 при цьому лишається закритим.
    expect(locks.get('m3')!.locked).toBe(true);
  });

  it('уроки пройдені, але тест не складено — модуль не відкриває наступний', () => {
    // Саме тут і живе сенс правила: без зарахованого тесту модуль незавершений,
    // тож ключовий модуль («Безпека») неможливо перестрибнути.
    const locks = computeModuleLocks(course, completion([], lessonsOf('m2')));

    expect(locks.get('m3')!.locked).toBe(true);
    expect(locks.get('m3')!.lockedBy).toEqual({ slug: 'm2', title: 'M2' });
  });

  it('повністю пройдений курс не має замків', () => {
    const all = completion(['m1', 'm2', 'm3', 'm4'], lessonsOf('m1', 'm2', 'm3', 'm4'));
    const locks = computeModuleLocks(course, all);

    expect([...locks.values()].every((l) => !l.locked)).toBe(true);
  });

  it('порожній курс не ламає розрахунок', () => {
    expect(computeModuleLocks([], completion([], [])).size).toBe(0);
  });

  it('курс з одного модуля відкритий цілком', () => {
    // Відкритих із початку більше, ніж модулів у курсі, — розрахунок не мусить
    // від цього ламатись.
    const locks = computeModuleLocks([mod('only', 2)], completion([], []));

    expect(locks.get('only')!.locked).toBe(false);
  });
});
