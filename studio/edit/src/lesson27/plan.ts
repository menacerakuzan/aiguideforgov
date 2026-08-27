/**
 * Дані уроку 2.7 для спільного будівника плану (`../lesson/planBuilder.ts`).
 *
 * Крок «зміна шрифту» (`shrift-zmina`) навмисно без прискорення: це і є
 * виправлення, заради якого курсор іде до стрічки, перш ніж застосувати
 * зміну, — прискорювати саме цей момент означало б повторити ту саму
 * помилку, яку виправляли.
 */
import marks from '../marks-2-7.json';
import voice from '../voice-2-7.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'zapyt', label: 'Крок 1. Просимо структуру',
    from: at('1-zapyt-pochatok'), to: at('1-nadislano'), speed: 2.5,
    vo: ['k1-a', 'k1-b'],
  },
  {
    id: 'struktura-hotova', label: 'Крок 1. Структура готова',
    from: at('1-nadislano'), to: at('1-prochytano'), speed: 4,
    vo: ['k2-a'],
  },
  {
    id: 'dokument-vstavka', label: 'Крок 2. Переносимо в документ',
    from: at('1-prochytano'), to: at('2-vstavleno'), speed: 1.3,
    vo: ['k2-b'],
  },
  {
    id: 'shrift-zmina', label: 'Крок 2. Приводимо шрифт до стандарту',
    from: at('2-vstavleno'), to: at('2-vidformatovano'), speed: 1,
    vo: ['k2-b2'],
  },
  {
    id: 'poznachennia', label: 'Крок 2. Структура як чек-лист',
    from: at('2-vidformatovano'), to: at('3-povernennia'), speed: 1,
    vo: ['k2-c'],
  },
  {
    id: 'variant-zapyt', label: 'Крок 3. Ще два варіанти',
    from: at('3-povernennia'), to: at('3-nadislano2'), speed: 1.3,
    vo: ['k3-a'],
  },
  {
    id: 'variant-vidpovid', label: 'Крок 3. Ще два варіанти',
    from: at('3-nadislano2'), to: at('3-prochytano2'), speed: 3,
    vo: ['k3-b'],
  },
  {
    id: 'final', label: 'Крок 4. Три структури',
    from: at('3-prochytano2'), to: at('kinets'), speed: 1,
    vo: ['k4-a'],
  },
];

const GAP_AFTER: Record<string, number> = {
  'k1-b': 0.8, 'k2-b2': 0.6, 'k2-c': 0.8, 'k3-b': 0.8,
};

export const TITLE_SEC = 3.6;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
