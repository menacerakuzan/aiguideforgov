/**
 * Дані уроку 3.4 для спільного будівника плану (`../lesson/planBuilder.ts`).
 *
 * Крок 2 (чотири заміни) навмисно без прискорення й з подвійним `hold()` у
 * дублі на кожній заміні — це і є суть уроку, глядач має встигнути побачити
 * кожен крок окремо, а не одним розмитим монтажем.
 */
import marks from '../marks-3-4.json';
import voice from '../voice-3-4.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'dokument-typing', label: 'Крок 1. Документ зі зверненням',
    from: at('1-dokument-pochatok'), to: at('1-dokument-hotovyi'), speed: 2.5,
    vo: ['k1-a'],
  },
  {
    id: 'dokument-chytayemo', label: 'Крок 1. Ось так виглядає насправді',
    from: at('1-dokument-hotovyi'), to: at('2-pib-pochatok'), speed: 1,
    vo: ['k1-b'],
  },
  {
    id: 'pib', label: 'Крок 2. Прізвище та ім’я',
    from: at('2-pib-pochatok'), to: at('2-adresa-pochatok'), speed: 1,
    vo: ['k2-pib'],
  },
  {
    id: 'adresa', label: 'Крок 2. Адреса',
    from: at('2-adresa-pochatok'), to: at('2-telefon-pochatok'), speed: 1,
    vo: ['k2-adresa'],
  },
  {
    id: 'telefon', label: 'Крок 2. Телефон',
    from: at('2-telefon-pochatok'), to: at('2-sprava-pochatok'), speed: 1,
    vo: ['k2-telefon'],
  },
  {
    id: 'sprava', label: 'Крок 2. Номер справи',
    from: at('2-sprava-pochatok'), to: at('3-kopiiuvannia'), speed: 1,
    vo: ['k2-sprava'],
  },
  {
    id: 'kopiiuvannia', label: 'Крок 3. Копіюємо знеособлений текст',
    from: at('3-kopiiuvannia'), to: at('3-vstavleno-pochatok'), speed: 1.5,
    vo: [],
  },
  {
    id: 'prompt', label: 'Крок 3. Просимо підготувати відповідь',
    from: at('3-vstavleno-pochatok'), to: at('3-nadislano'), speed: 1.3,
    vo: ['k3-a'],
  },
  {
    id: 'vidpovid-generatsiya', label: 'Крок 3. Відповідь генерується',
    from: at('3-nadislano'), to: at('3-prochytano'), speed: 3,
    vo: [],
  },
  {
    id: 'final', label: 'Крок 4. Позначки лишились на місці',
    from: at('3-prochytano'), to: at('kinets'), speed: 1,
    vo: ['k3-b'],
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
