/**
 * Дані уроку 5.5 для спільного будівника плану (`../lesson/planBuilder.ts`).
 */
import marks from '../marks-5-5.json';
import voice from '../voice-5-5.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'dokument', label: 'Крок 1. Зведення видатків',
    from: at('1-dokument-pochatok'), to: at('1-dokument-hotovyi'), speed: 2.2,
    vo: ['k1-a'],
  },
  {
    id: 'kopiiuvannia', label: 'Крок 2. Копіюємо в чат',
    from: at('1-dokument-hotovyi'), to: at('2-zapyt-hotovyi'), speed: 1.4,
    vo: ['k2-a'],
  },
  {
    id: 'ochikuvannia', label: 'Крок 2. Надсилаємо',
    from: at('2-zapyt-hotovyi'), to: at('3-vidpovid-hotova'), speed: 2.5,
    vo: [],
  },
  {
    id: 'vidpovid', label: 'Розбіжність видно',
    from: at('3-vidpovid-hotova'), to: at('kinets'), speed: 1,
    vo: ['k3-a'],
  },
];

const GAP_AFTER: Record<string, number> = {};

export const TITLE_SEC = 3.2;
export const OUTRO_SEC = 4.2;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
