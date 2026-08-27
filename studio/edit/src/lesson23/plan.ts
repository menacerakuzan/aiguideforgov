/**
 * Дані уроку 2.3 для спільного будівника плану (`../lesson/planBuilder.ts`).
 */
import marks from '../marks-2-3.json';
import voice from '../voice-2-3.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

/**
 * Набір довгого розмовного опису (майже хвилина) прискорюємо помітно —
 * глядач має впізнати структуру («опис ситуації», «кому», «чого хочу»),
 * а не спостерігати хвилину друку. Очікування генерації — так само, як і в
 * 2.2. Фінальний абзац і мікрофон навмисно тримаємо довше стоп-кадром: це
 * і є момент, заради якого урок дивляться.
 */
const SEGMENTS: Segment[] = [
  {
    id: 'mikrofon', label: 'Тут можна говорити',
    from: at('1-mikrofon-pochatok'), to: at('1-mikrofon-hotovo'), speed: 1,
    vo: ['k1-a', 'k1-b'],
  },
  {
    id: 'zapyt', label: 'Крок 1. Описуємо ситуацію',
    from: at('2-zapyt-pochatok'), to: at('3-nadislano'), speed: 3.5,
    vo: ['k2-a', 'k2-b', 'k2-c'],
  },
  {
    id: 'ochikuvannia', label: 'Крок 2. Записка готова',
    from: at('3-nadislano'), to: at('3-vidpovid-hotova'), speed: 2.5,
    vo: ['k3-a'],
  },
  {
    id: 'chytannia', label: 'Крок 2. Записка готова',
    from: at('3-vidpovid-hotova'), to: at('3-prochytano'), speed: 1,
    vo: ['k3-b'],
  },
  {
    id: 'kopiiuvannia-vstavka', label: 'Крок 3. Застосовуємо записку',
    from: at('4-kopiiuvannia-pochatok'), to: at('4-vstavleno'), speed: 1.7,
    vo: ['k4-a'],
  },
  {
    id: 'formatuvannia', label: 'Крок 3. Застосовуємо записку',
    from: at('4-vstavleno'), to: at('4-vidformatovano'), speed: 1,
    vo: ['k4-b'],
  },
  {
    id: 'final', label: 'Крок 4. Конкретна пропозиція',
    from: at('5-final-pochatok'), to: at('kinets'), speed: 1,
    vo: ['k5-a', 'k5-b'],
  },
];

const GAP_AFTER: Record<string, number> = {
  'k1-b': 0.8, 'k2-c': 0.8, 'k3-b': 0.8, 'k4-b': 0.8, 'k5-a': 0.6,
};

export const TITLE_SEC = 3.6;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
