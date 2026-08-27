/**
 * Дані уроку 2.4 для спільного будівника плану (`../lesson/planBuilder.ts`).
 */
import marks from '../marks-2-4.json';
import voice from '../voice-2-4.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'chernetka', label: 'Крок 1. Чернетка листа',
    from: at('1-chernetka-pochatok'), to: at('1-chernetka-hotova'), speed: 1,
    vo: ['k1-a', 'k1-b'],
  },
  {
    id: 'kopiiuvannia-zapyt', label: 'Крок 2. Копіюємо й формулюємо запит',
    from: at('2-kopiiuvannia'), to: at('3-nadislano'), speed: 1.7,
    vo: ['k2-a', 'k2-b'],
  },
  {
    id: 'ochikuvannia', label: 'Крок 3. Перелік правок',
    from: at('3-nadislano'), to: at('3-vidpovid-hotova'), speed: 2.2,
    vo: ['k3-a'],
  },
  {
    id: 'chytannia', label: 'Крок 3. Перелік правок',
    from: at('3-vidpovid-hotova'), to: at('3-prochytano'), speed: 1,
    vo: ['k3-b'],
  },
  {
    id: 'povernennia', label: 'Крок 4. Вносимо правки самі',
    from: at('4-povernennia-pochatok'), to: at('4-pravka-1'), speed: 1,
    vo: ['k4-a'],
  },
  {
    id: 'pravka-1', label: 'Крок 4. Вносимо правки самі',
    from: at('4-pravka-1'), to: at('4-pravka-2'), speed: 1,
    vo: ['k4-b'],
  },
  {
    id: 'pravka-2', label: 'Крок 4. Вносимо правки самі',
    from: at('4-pravka-2'), to: at('4-pravky-hotovi'), speed: 1,
    vo: ['k4-c'],
  },
  {
    id: 'final', label: 'Крок 5. Готовий лист',
    from: at('5-final-pochatok'), to: at('kinets'), speed: 1,
    vo: ['k5-a'],
  },
];

const GAP_AFTER: Record<string, number> = {
  'k1-b': 0.8, 'k2-b': 0.8, 'k3-b': 0.8, 'k4-a': 0.5, 'k4-b': 0.5,
};

export const TITLE_SEC = 3.6;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
