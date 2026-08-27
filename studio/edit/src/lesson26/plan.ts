/**
 * Дані уроку 2.6 для спільного будівника плану (`../lesson/planBuilder.ts`).
 */
import marks from '../marks-2-6.json';
import voice from '../voice-2-6.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'zapyt', label: 'Крок 1. Переклад із глосарієм',
    from: at('1-zapyt-pochatok'), to: at('2-nadislano'), speed: 3,
    vo: ['k1-a', 'k1-b'],
  },
  {
    id: 'ochikuvannia', label: 'Крок 2. Переклад готовий',
    from: at('2-nadislano'), to: at('2-vidpovid-hotova'), speed: 1.8,
    vo: ['k2-a'],
  },
  {
    id: 'chytannia', label: 'Крок 2. Переклад готовий',
    from: at('2-vidpovid-hotova'), to: at('2-kopiiuvannia'), speed: 1,
    vo: ['k2-b'],
  },
  {
    id: 'zapyt-zvorotnii', label: 'Крок 3. Просимо зворотний переклад',
    from: at('3-zapyt2-pochatok'), to: at('3-nadislano2'), speed: 1.4,
    vo: ['k3-a'],
  },
  {
    id: 'zvorotnii-hotovyi', label: 'Крок 3. Просимо зворотний переклад',
    from: at('3-nadislano2'), to: at('3-prochytano2'), speed: 1.6,
    vo: ['k3-b'],
  },
  {
    id: 'dokument-translated', label: 'Крок 4. Складаємо порівняння',
    from: at('4-dokument-pochatok'), to: at('4-translated-vstavleno'), speed: 1.6,
    vo: ['k4-a'],
  },
  {
    id: 'dokument-back', label: 'Крок 4. Складаємо порівняння',
    from: at('4-translated-vstavleno'), to: at('4-vidformatovano'), speed: 1.5,
    vo: ['k4-b'],
  },
  {
    id: 'final', label: 'Крок 5. Порівняння готове',
    from: at('4-vidformatovano'), to: at('kinets'), speed: 1,
    vo: ['k5-a'],
  },
];

const GAP_AFTER: Record<string, number> = {
  'k1-b': 0.8, 'k2-b': 0.8, 'k3-b': 0.8, 'k4-a': 0.5,
};

export const TITLE_SEC = 3.6;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
