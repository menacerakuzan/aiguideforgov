/**
 * Дані уроку 4.8 для спільного будівника плану (`../lesson/planBuilder.ts`).
 */
import marks from '../marks-4-8.json';
import voice from '../voice-4-8.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'mikrofon', label: 'Де мікрофон',
    from: at('1-mikrofon-pochatok'), to: at('2-dyktant-pochatok'), speed: 1,
    vo: ['k1-a'],
  },
  {
    id: 'dyktant', label: 'Диктант',
    from: at('2-dyktant-pochatok'), to: at('3-nadislano'), speed: 2.2,
    vo: ['k2-a'],
  },
  {
    id: 'vidpovid', label: 'Чернетка',
    from: at('3-nadislano'), to: at('kinets'), speed: 1.6,
    vo: ['k3-a'],
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
