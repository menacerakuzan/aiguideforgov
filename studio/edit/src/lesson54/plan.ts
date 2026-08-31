/**
 * Дані уроку 5.4 для спільного будівника плану (`../lesson/planBuilder.ts`).
 */
import marks from '../marks-5-4.json';
import voice from '../voice-5-4.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'ne-znaideno', label: 'Приклад 1. Вигаданий номер',
    from: at('1-pochatok'), to: at('1-rezultat'), speed: 1,
    vo: ['k1-a'],
  },
  {
    id: 'vtratyv-chynnist', label: 'Приклад 2. Втрата чинності',
    from: at('1-rezultat'), to: at('2-rezultat'), speed: 1,
    vo: ['k2-a'],
  },
  {
    id: 'zakon-chynnyi', label: 'Приклад 3. Чинний закон',
    from: at('2-rezultat'), to: at('3-dokument'), speed: 1.3,
    vo: ['k3-a'],
  },
  {
    id: 'stattya', label: 'Стаття не про те',
    from: at('3-dokument'), to: at('kinets'), speed: 6,
    vo: ['k3-b'],
  },
];

const GAP_AFTER: Record<string, number> = {};

export const TITLE_SEC = 3.4;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
