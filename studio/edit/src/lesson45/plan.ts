/**
 * Дані уроку 4.5 для спільного будівника плану (`../lesson/planBuilder.ts`).
 */
import marks from '../marks-4-5.json';
import voice from '../voice-4-5.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'pochatkovyi', label: 'Перша чернетка',
    from: at('0-pochatkovyi-pochatok'), to: at('0-pochatkovyi-vidpovid'), speed: 2.2,
    vo: ['k1-a'],
  },
  {
    id: 'pyat-utochnen', label: "П'ять коротких реплік",
    from: at('0-pochatkovyi-vidpovid'), to: at('1-try-varianty-vidpovid'), speed: 2.8,
    vo: ['k2-a', 'k2-b'],
  },
  {
    id: 'nevdala-pravka', label: 'Невдала правка',
    from: at('1-try-varianty-vidpovid'), to: at('2-nevdala-pravka-vidpovid'), speed: 1.6,
    vo: ['k3-a'],
  },
  {
    id: 'vidkat', label: 'Відкат',
    from: at('2-nevdala-pravka-vidpovid'), to: at('kinets'), speed: 1,
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
