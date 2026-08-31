/**
 * Дані уроку 4.6 для спільного будівника плану (`../lesson/planBuilder.ts`).
 */
import marks from '../marks-4-6.json';
import voice from '../voice-4-6.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'odyn-fail', label: 'Частина 1. Один файл',
    from: at('1-fail-pochatok'), to: at('1-vidpovid-hotova'), speed: 1.8,
    vo: ['k1-a'],
  },
  {
    id: 'zvedennia', label: 'Зведення з посиланням на сторінку',
    from: at('1-vidpovid-hotova'), to: at('2-fail-1-pochatok'), speed: 1,
    vo: ['k1-b'],
  },
  {
    id: 'dva-faily', label: 'Частина 2. Два файли одночасно',
    from: at('2-fail-1-pochatok'), to: at('2-nadislano'), speed: 1.7,
    vo: ['k2-a'],
  },
  {
    id: 'porivniannia', label: 'Порівняння двох редакцій',
    from: at('2-nadislano'), to: at('kinets'), speed: 1,
    vo: [],
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
