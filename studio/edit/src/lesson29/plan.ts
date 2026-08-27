/**
 * Дані уроку 2.9 для спільного будівника плану (`../lesson/planBuilder.ts`).
 *
 * Найпростіший урок циклу — суто чат, без Word: сама задача безпечна й не
 * потребує застосування результату в документі. Два кроки: 15 варіантів,
 * потім уточнення тим самим чатом.
 */
import marks from '../marks-2-9.json';
import voice from '../voice-2-9.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'zapyt', label: 'Крок 1. Просимо 15 варіантів',
    from: at('1-zapyt-pochatok'), to: at('1-nadislano'), speed: 2.5,
    vo: ['k1-a'],
  },
  {
    id: 'spysok-hotovyi', label: 'Крок 1. Список готовий',
    from: at('1-nadislano'), to: at('1-prochytano'), speed: 1,
    vo: ['k1-b'],
  },
  {
    id: 'utochnennia-zapyt', label: 'Крок 2. Кажемо, що сподобалось',
    from: at('1-prochytano'), to: at('2-nadislano2'), speed: 1.3,
    vo: ['k2-a'],
  },
  {
    id: 'utochnennia-vidpovid', label: 'Крок 2. Другий список',
    from: at('2-nadislano2'), to: at('2-prochytano2'), speed: 2.5,
    vo: [],
  },
  {
    id: 'final', label: 'Крок 2. Точніший за перший',
    from: at('2-prochytano2'), to: at('kinets'), speed: 1,
    vo: ['k2-b'],
  },
];

const GAP_AFTER: Record<string, number> = {};

export const TITLE_SEC = 3.6;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
