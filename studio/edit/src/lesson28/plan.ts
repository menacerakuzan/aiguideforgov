/**
 * Дані уроку 2.8 для спільного будівника плану (`../lesson/planBuilder.ts`).
 *
 * Кроки «зміна шрифту» (`shrift-zmina`) і «норма під поясненням»
 * (`norma-dodana`) навмисно без прискорення й з подвійним `hold()` у
 * дублі — глядач має встигнути прочитати, що саме вставилось і змінилось,
 * а не просто помітити рух.
 */
import marks from '../marks-2-8.json';
import voice from '../voice-2-8.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'zapyt', label: 'Крок 1. Просимо просте пояснення',
    from: at('1-zapyt-pochatok'), to: at('1-nadislano'), speed: 2.5,
    vo: ['k1-a', 'k1-b'],
  },
  {
    id: 'poiasnennia-hotove', label: 'Крок 1. Пояснення готове',
    from: at('1-nadislano'), to: at('1-prochytano'), speed: 4,
    vo: [],
  },
  {
    id: 'dokument-vstavka', label: 'Крок 2. Переносимо в лист',
    from: at('1-prochytano'), to: at('2-vstavleno'), speed: 1.3,
    vo: ['k2-a'],
  },
  {
    id: 'shrift-zmina', label: 'Крок 2. Приводимо шрифт до стандарту',
    from: at('2-vstavleno'), to: at('2-vidformatovano'), speed: 1,
    vo: ['k2-b'],
  },
  {
    id: 'norma-dodana', label: 'Крок 2. Під пояснення дописуємо норму',
    from: at('2-vidformatovano'), to: at('3-povernennia'), speed: 1,
    vo: ['k2-c'],
  },
  {
    id: 'variant-zapyt', label: 'Крок 3. Інший адресат — тим самим чатом',
    from: at('3-povernennia'), to: at('3-nadislano2'), speed: 1.3,
    vo: ['k3-a'],
  },
  {
    id: 'variant-vidpovid', label: 'Крок 3. Варіант для телефону',
    from: at('3-nadislano2'), to: at('3-prochytano2'), speed: 3,
    vo: ['k3-b'],
  },
  {
    id: 'final', label: 'Крок 4. Один зміст, різні адресати',
    from: at('3-prochytano2'), to: at('kinets'), speed: 1,
    vo: ['k4-a'],
  },
];

const GAP_AFTER: Record<string, number> = {
  'k1-a': 0.6,
};

export const TITLE_SEC = 3.6;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
