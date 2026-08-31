/**
 * Дані уроку 4.4 для спільного будівника плану (`../lesson/planBuilder.ts`).
 *
 * Крок 2 (діалог «Знайти й замінити») навмисно без прискорення для першої
 * заміни — глядач має побачити, як саме заповнюються поля, перш ніж решта
 * замін пройде швидше.
 */
import marks from '../marks-4-4.json';
import voice from '../voice-4-4.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'zrazok', label: 'Крок 1. Типовий лист',
    from: at('1-dokument-pochatok'), to: at('1-dokument-hotovyi'), speed: 2.2,
    vo: ['k1-a'],
  },
  {
    id: 'dialoh-vidkryttia', label: 'Крок 2. Знайти й замінити',
    from: at('1-dokument-hotovyi'), to: at('2-polya-zapovneni'), speed: 1,
    vo: ['k2-a'],
  },
  {
    id: 'zaminy', label: 'Крок 2. Ще дві заміни',
    from: at('2-polya-zapovneni'), to: at('2-dialoh-zakryto'), speed: 1.3,
    vo: ['k2-b'],
  },
  {
    id: 'zberezhennia', label: 'Крок 3. Зберігаємо й прикріплюємо',
    from: at('2-dialoh-zakryto'), to: at('4-zapyt-pochatok'), speed: 1.3,
    vo: ['k3-a'],
  },
  {
    id: 'zapyt', label: 'Крок 4. Вхідні дані для нового листа',
    from: at('4-zapyt-pochatok'), to: at('4-nadislano'), speed: 2.5,
    vo: [],
  },
  {
    id: 'vidpovid', label: 'Крок 4. Новий лист за зразком',
    from: at('4-nadislano'), to: at('4-prochytano'), speed: 2.2,
    vo: ['k4-a'],
  },
  {
    id: 'final', label: 'Готово',
    from: at('4-prochytano'), to: at('kinets'), speed: 1,
    vo: [],
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
