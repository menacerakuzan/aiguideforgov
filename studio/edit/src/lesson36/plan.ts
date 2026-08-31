/**
 * Дані уроку 3.6 для спільного будівника плану (`../lesson/planBuilder.ts`).
 *
 * На відміну від інших уроків, тут немає ні Word, ні запиту до чату — це
 * навігація по РЕАЛЬНИХ налаштуваннях demo-акаунта (myactivity.google.com).
 * Строк автоматичного видалення історії (друге з трьох налаштувань уроку)
 * навмисно НЕ клацається наживо в цьому дублі — підсторінка Google під час
 * зйомки виявилась надто нестабільною для надійної автоматизації (див.
 * коментар у `record/3-6.mjs`). Рядок про строк зберігання все одно
 * потрапляє в кадр і в репліку диктора.
 */
import marks from '../marks-3-6.json';
import voice from '../voice-3-6.json';
import { buildPlan, markAt, type Segment, type VoiceLine } from '../lesson/planBuilder';

const V = voice as Record<string, VoiceLine>;
const at = (name: string) => markAt(marks, name);

const SEGMENTS: Segment[] = [
  {
    id: 'meniu', label: 'Крок 1. Налаштування → Історія дій',
    from: at('1-gear-pochatok'), to: at('1-activity-vidkryto'), speed: 1.3,
    vo: [],
  },
  {
    id: 'istoriya-diy', label: 'Крок 1. Вимикаємо навчання на даних',
    from: at('1-activity-vidkryto'), to: at('1-toggle-vidkryto'), speed: 1,
    vo: ['k1-a', 'k1-b'],
  },
  {
    id: 'vymykannia', label: 'Крок 1. Вимкнено',
    from: at('1-toggle-vidkryto'), to: at('2-povernennia'), speed: 1,
    vo: ['k1-c'],
  },
  {
    id: 'tymchasovyi-chat', label: 'Крок 2. Тимчасовий чат',
    from: at('2-povernennia'), to: at('3-final'), speed: 1,
    vo: ['k2-a'],
  },
  {
    id: 'final', label: 'Готово',
    from: at('3-final'), to: at('kinets'), speed: 1,
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
