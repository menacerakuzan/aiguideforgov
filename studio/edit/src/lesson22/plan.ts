/**
 * Дані уроку 2.2 для спільного будівника плану (`../lesson/planBuilder.ts`).
 * Сам розрахунок кадрів — там; тут лише сегменти, паузи й межі, специфічні
 * для цього дубля.
 */
import marks from '../marks-2-2.json';
import voice from '../voice-2-2.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

/**
 * Де прискорюємо і чому.
 *
 * Гортання звіту (крок 0) і очікування генерації (частина кроку 3) — це
 * той самий випадок, що й у 2.1: чесний темп тут нічого не пояснює, лише
 * випробовує терпіння. Прискорюємо і показуємо це значком у кадрі.
 *
 * Набір запиту прискорюємо помірно (×1,7) — глядач має встигнути впізнати
 * структуру («для кого», «що включити», «сторінки»), а не просто побачити
 * миготіння символів.
 *
 * Перевірку джерела (крок 5) не прискорюємо навмисно — це і є момент
 * довіри до результату, і він має виглядати вагомо.
 */
const SEGMENTS: Segment[] = [
  {
    id: 'zvit-rozmir', label: 'Сам звіт: 34 сторінки',
    from: at('0-zvit-pochatok'), to: at('0-zvit-hotovo'), speed: 4,
    vo: ['k0-a', 'k0-b'],
  },
  {
    id: 'prykriplennia', label: 'Крок 1. Прикріплюємо файл',
    from: at('1-dodavannya-pochatok'), to: at('1-dodavannya-hotovo'), speed: 1,
    vo: ['k1-a', 'k1-b'],
  },
  {
    id: 'zapyt', label: 'Крок 2. Складаємо запит',
    from: at('2-zapyt'), to: at('3-nadislano'), speed: 1.7,
    vo: ['k2-a', 'k2-b', 'k2-c'],
  },
  {
    id: 'ochikuvannia', label: 'Крок 3. Зведення готове',
    from: at('3-nadislano'), to: at('3-zvedennya-hotove'), speed: 3,
    vo: ['k3-a'],
  },
  {
    id: 'chytannia', label: 'Крок 3. Зведення готове',
    from: at('3-zvedennya-hotove'), to: at('3-prochytano'), speed: 1,
    vo: ['k3-b'],
  },
  {
    id: 'kopiiuvannia-vstavka', label: 'Крок 4. Застосовуємо зведення',
    from: at('4-kopiiuvannia-pochatok'), to: at('4-vstavleno'), speed: 2.2,
    vo: ['k4-a'],
  },
  {
    id: 'prybrannia-zayvoho', label: 'Крок 4. Застосовуємо зведення',
    from: at('4-vstavleno'), to: at('4-prybrano-zayve'), speed: 1,
    vo: ['k4-b'],
  },
  {
    id: 'formatuvannia', label: 'Крок 4. Застосовуємо зведення',
    from: at('4-prybrano-zayve'), to: at('4-vidformatovano'), speed: 1,
    vo: ['k4-c'],
  },
  {
    id: 'gotovo', label: 'Крок 4. Застосовуємо зведення',
    from: at('4-vidformatovano'), to: at('5-vidkryttia-dzherela'), speed: 1,
    vo: ['k4-d'],
  },
  {
    id: 'vidkryttia-dzherela', label: 'Крок 5. Перевірка джерела',
    from: at('5-vidkryttia-dzherela'), to: at('5-poshuk'), speed: 1,
    vo: ['k5-a'],
  },
  {
    id: 'perevirka', label: 'Крок 5. Перевірка джерела',
    from: at('5-poshuk'), to: at('kinets'), speed: 1,
    vo: ['k5-b', 'k5-c'],
  },
];

/**
 * Довша пауза після конкретної репліки — там, де змінюється тема.
 * Рівний ритм без зупинок читається як суцільний потік.
 */
const GAP_AFTER: Record<string, number> = {
  'k0-b': 0.8, 'k1-b': 0.8, 'k2-c': 0.8, 'k3-b': 0.8,
  'k4-a': 0.5, 'k4-b': 0.5, 'k4-c': 0.5, 'k4-d': 0.8,
  'k5-a': 0.6, 'k5-b': 0.6,
};

export const TITLE_SEC = 3.6;
export const OUTRO_SEC = 4.4;
export const FADE_SEC = 0.4;

export const { plan: PLAN, total: TOTAL } = buildPlan({
  segments: SEGMENTS, voice: V, marks, gapAfter: GAP_AFTER,
  titleSec: TITLE_SEC, outroSec: OUTRO_SEC,
});
