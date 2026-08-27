/**
 * Дані уроку 2.1 для спільного будівника плану (`../lesson/planBuilder.ts`).
 * Сам розрахунок кадрів — там; тут лише сегменти, паузи й межі, специфічні
 * для цього дубля.
 */
import marks from '../marks-2-1.json';
import voice from '../voice-2-1.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

/**
 * Де прискорюємо і чому.
 *
 * Набір довгого запиту (33 с) і три уточнення поспіль (58 с) — це той випадок,
 * коли чесний темп нічого не пояснює, а лише випробовує терпіння. Прискорюємо
 * і показуємо це значком у кадрі: глядач має бачити, що час стиснуто.
 *
 * Перевірку перед підписом не прискорюємо навмисно — саме вона має виглядати
 * вагомо (стандарт уроків, §1.17 і розкадровка 2.1).
 */
const SEGMENTS: Segment[] = [
  {
    id: 'zvernennia', label: 'Звернення на столі',
    from: at('1-zvernennia'), to: at('2-novyi-chat'), speed: 1,
    vo: ['k1-a', 'k1-b', 'k1-c', 'k1-d', 'k1-e'],
  },
  {
    id: 'novyi-chat', label: 'Крок 1. Новий чат',
    from: at('2-novyi-chat'), to: at('3-zapyt-pochatok'), speed: 1,
    vo: ['k2-a', 'k2-b'],
  },
  {
    id: 'zapyt-pochatok', label: 'Крок 2. Складаємо запит',
    from: at('3-zapyt-pochatok'), to: at('3-zapyt-hvist'), speed: 1,
    vo: ['k3-a', 'k3-b'],
  },
  {
    id: 'zapyt-hvist', label: 'Крок 2. Складаємо запит',
    from: at('3-zapyt-hvist'), to: at('4-nadislano'), speed: 1.25,
    vo: ['k3-c', 'k3-d', 'k3-e', 'k3-f'],
  },
  {
    id: 'chernetka', label: 'Крок 3. Що ми отримали',
    from: at('4-nadislano'), to: at('4-prochytano'), speed: 1,
    vo: ['k4-a', 'k4-b', 'k4-c'],
  },
  {
    // Репліка k4-d («доводимо до розуму») звучить уже над уточненнями: вона їх
    // і оголошує, а сегмент із чернеткою без неї точно збігається з відео.
    id: 'utochnennia', label: 'Крок 4. Уточнюємо',
    from: at('5-utochnennia-1'), to: at('6-kopiyuvannia'),
    // Було ×2, але з паузами між уточненнями мовлення стало довшим за відео —
    // і в кінці кроку висів довгий стоп-кадр. ×1,7 зводить їх майже впритул.
    speed: 1.7,
    vo: ['k4-d', 'k5-a', 'k5-b', 'k5-c', 'k5-d', 'k5-e'],
  },
  {
    id: 'perevirka', label: 'Крок 5. Перевірка перед підписом',
    from: at('6-kopiyuvannia'), to: at('kinets'), speed: 1,
    vo: ['k6-a', 'k6-b', 'k6-c', 'k6-d', 'k6-e'],
  },
];

/**
 * Довша пауза після конкретної репліки — там, де змінюється тема.
 *
 * Рівний ритм без зупинок читається як суцільний потік: слухач не помічає, що
 * мова перейшла з «копіюємо текст» на «а шапку не беремо, це персональні
 * дані». Пауза й є той розділовий знак, якого в мовленні інакше немає.
 */
const GAP_AFTER: Record<string, number> = {
  'k1-c': 0.9, 'k1-d': 0.9, 'k2-a': 0.8, 'k3-a': 0.8, 'k3-b': 0.8, 'k3-c': 0.8,
  'k3-d': 0.8, 'k3-e': 0.5, 'k4-a': 0.8, 'k4-b': 0.8, 'k4-d': 0.8, 'k5-a': 0.8,
  'k5-b': 0.6, 'k5-c': 0.6, 'k5-d': 0.6, 'k6-a': 0.8, 'k6-b': 0.8, 'k6-c': 0.6, 'k6-d': 0.8,
};

export const TITLE_SEC = 3.6;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
