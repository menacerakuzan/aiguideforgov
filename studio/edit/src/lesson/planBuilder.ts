/**
 * Побудова монтажного плану з дубля. Спільна для всіх уроків.
 *
 * Тримається на двох файлах, які виробив сам дубль: `marks-*.json` (де на
 * плівці починається кожен крок) і `voice-*.json` (скільки насправді звучить
 * кожна репліка). Нічого не вигадано на око — і тому картинка не розходиться
 * з голосом.
 *
 * Правило довжини сегмента: скільки триває мовлення, стільки триває й сегмент.
 * Якщо відео коротше — останній кадр завмирає, і глядач дочитує те, про що
 * говорить диктор. Якщо довше — сегмент триває стільки, скільки відео, а голос
 * просто закінчується раніше.
 */
import { FPS } from '../theme';

export type VoiceLine = { file: string; seconds: number; text: string };
export type Mark = { name: string; t: number };

export type Segment = {
  id: string;
  /** Підпис кроку в кадрі. Порожній — підпису немає. */
  label: string;
  /** Межі на сирому дублі, у секундах. */
  from: number;
  to: number;
  /** Прискорення. 1 — чесний темп. */
  speed: number;
  /** Репліки, які звучать над цим сегментом, по черзі. */
  vo: string[];
};

export type PlannedSegment = Segment & {
  /** Кадр початку сегмента в готовому ролику. */
  start: number;
  /** Скільки кадрів триває сегмент. */
  duration: number;
  /** Скільки кадрів займає рухома частина (решта — завмерлий кадр). */
  motion: number;
  /** Репліки з кадром початку кожної, від початку сегмента. */
  lines: { key: string; text: string; file: string; from: number; duration: number }[];
};

export type BuildPlanOptions = {
  segments: Segment[];
  voice: Record<string, VoiceLine>;
  marks: Mark[];
  /** Довша пауза після конкретної репліки — на межі тем. Ключ не знайдено — типовий подих. */
  gapAfter?: Record<string, number>;
  titleSec?: number;
  outroSec?: number;
  /** Розчинення — тільки на титрах, не між кроками (див. LessonVideo.tsx). */
  fadeSec?: number;
};

/** Знайти позначку на плівці за назвою. Немає — падаємо одразу: мовчазний 0 ламає весь план. */
export function markAt(marks: Mark[], name: string): number {
  const m = marks.find((x) => x.name === name);
  if (!m) throw new Error(`Мітку "${name}" не знайдено в marks.json — перевір запис`);
  return m.t;
}

export function buildPlan(opts: BuildPlanOptions): { plan: PlannedSegment[]; total: number } {
  const { segments, voice: V, gapAfter = {}, titleSec = 3.6, outroSec = 4.4 } = opts;

  const LEAD_SEC = 0.35;
  const GAP_SEC = 0.18;
  /** Хвіст після останньої репліки: без нього кінець фрази зрізає межа сегмента. */
  const TAIL_SEC = 0.45;

  const gap = (key: string) => gapAfter[key] ?? GAP_SEC;

  /**
   * Скільки насправді займає мовлення в сегменті.
   *
   * Рахуємо не суму реплік, а всю доріжку разом із паузами й хвостом. Перша
   * версія рахувала лише суму — і остання фраза кожного кроку обривалася на
   * останньому складі, бо сегмент закінчувався раніше за неї.
   */
  const speechSec = (keys: string[]) =>
    LEAD_SEC +
    keys.reduce((s, k, i) => {
      if (!V[k]) throw new Error(`Репліку "${k}" не знайдено в voice.json — перевір озвучку`);
      return s + V[k].seconds + (i < keys.length - 1 ? gap(k) : 0);
    }, 0) +
    TAIL_SEC;

  const plan: PlannedSegment[] = [];
  let cursor = Math.round(titleSec * FPS);

  for (const seg of segments) {
    // Рахуємо з КАДРІВ, а не з секунд.
    //
    // Обрізка відео задається кадрами: trimBefore = round(from×fps),
    // trimAfter = round(to×fps). Якщо довжину рухомої частини рахувати окремо,
    // із секунд, округлення можуть розійтись на один кадр — і останній кадр
    // сегмента випадає за межу обрізки. У кадрі це один чорний спалах на
    // тридцяту частку секунди: помітити оком можна, знайти — важко.
    const srcFrames = Math.round(seg.to * FPS) - Math.round(seg.from * FPS);
    const motion = Math.floor(srcFrames / seg.speed);
    const speech = Math.round(speechSec(seg.vo) * FPS);
    const duration = Math.max(motion, speech);

    let voCursor = Math.round(LEAD_SEC * FPS);
    const lines = seg.vo.map((key) => {
      const from = voCursor;
      const d = Math.round(V[key].seconds * FPS);
      voCursor += d + Math.round(gap(key) * FPS);
      return { key, text: V[key].text, file: V[key].file, from, duration: d };
    });

    plan.push({ ...seg, start: cursor, duration, motion, lines });
    cursor += duration; // впритул: запис іде без розривів, розчинення між кроками немає
  }

  const last = plan[plan.length - 1];
  const total = last.start + last.duration + Math.round(outroSec * FPS);

  return { plan, total };
}
