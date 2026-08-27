/**
 * Механічна половина чек-листа готовності уроку (`lessons/README.md` §2).
 *
 * Перевіряє те, що можна перевірити машиною: структуру уроку, розстановку медіа,
 * приховані підказки в мікроперевірках і дублікати питань між уроками. Змістовну
 * половину (проблема на початку, прийом названо до демонстрації, тон) машина не бачить —
 * її читають очима.
 *
 * Навіщо: помилки, які тут ловляться, повторювались із уроку в урок. Найдорожча —
 * правильна відповідь довша за решту варіантів: людина обирає найдовший рядок, не
 * читаючи питання. Знадобиться ще раз, коли переробимо 80 питань підсумкових тестів
 * (див. README §5).
 *
 * Запуск: pnpm --filter @proai/db audit-lessons
 *         pnpm --filter @proai/db audit-lessons 4 5   — лише вказані модулі
 */
import type { LessonBlock } from '@proai/types';
import { module1Lessons } from './content/lessons-module-1';
import { module2Lessons } from './content/lessons-module-2';
import { module3Lessons } from './content/lessons-module-3';
import { module4Lessons } from './content/lessons-module-4';
import { module5Lessons } from './content/lessons-module-5';

/** Блоки, які блокують кнопку «Завершити урок» (див. GATED_TYPES у рендерері). */
const GATED = new Set<LessonBlock['type']>(['check', 'sort', 'pick', 'builder', 'spot']);

const MODULES = [
  ['1', module1Lessons],
  ['2', module2Lessons],
  ['3', module3Lessons],
  ['4', module4Lessons],
  ['5', module5Lessons],
] as const;

const only = process.argv.slice(2);
const seenQuestions = new Map<string, string>();
let problems = 0;

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^а-яїієґёa-z ]/gi, ' ').replace(/\s+/g, ' ').trim();
}

for (const [num, lessons] of MODULES) {
  const skip = only.length > 0 && !only.includes(num);
  let minutes = 0;
  const positions: Record<number, number> = {};
  const lines: string[] = [];

  for (const lesson of lessons) {
    minutes += lesson.minutes;
    const found: string[] = [];
    const html = lesson.blocks
      .filter((b): b is Extract<LessonBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.html)
      .join('\n');

    /* --- Структура (README §2, «Структура») ------------------------------- */
    const goalList = html.match(/goal-list"[\s\S]*?<\/ul>/)?.[0] ?? '';
    if (!html.includes('class="goal"')) found.push('немає картки «Про що цей урок»');
    else {
      const items = (goalList.match(/<li>/g) ?? []).length;
      if (items !== 3) found.push(`у картці мети ${items} пунктів замість трьох`);
    }
    if (!html.includes('class="task"')) found.push('немає «Спробуйте самі» — має бути пояснення в зоні 🎯');
    if (!html.includes('ul class="summary"')) found.push('немає підсумку');
    if (!html.includes('class="takeaway"')) found.push('немає «Забрати з собою» — має бути пояснення в зоні 🎯');

    /* Питання йдуть підряд наприкінці — інакше роздільник «Перевірте себе»
       опиниться посеред уроку. */
    const firstCheck = lesson.blocks.findIndex((b) => b.type === 'check');
    if (firstCheck !== -1 && !lesson.blocks.slice(firstCheck).every((b) => b.type === 'check')) {
      found.push('питання не йдуть підряд наприкінці уроку');
    }

    /* --- Медіа (README §1.13, §1.17) -------------------------------------- */
    const videos = lesson.blocks.filter((b): b is Extract<LessonBlock, { type: 'video' }> => b.type === 'video');
    const images = lesson.blocks.filter((b): b is Extract<LessonBlock, { type: 'image' }> => b.type === 'image');
    for (const v of videos) if (!v.url && !v.note) found.push('відео-заглушка без опису майбутнього кадру');
    for (const i of images) if (!i.src && !i.note) found.push(`заглушка «${i.alt}» без опису майбутнього кадру`);
    const videoIndex = lesson.blocks.findIndex((b) => b.type === 'video');
    if (videoIndex > 3) found.push(`відео аж на позиції ${videoIndex + 1} — має стояти одразу після постановки задачі`);

    /* --- Мікроперевірки (README §1.15) ------------------------------------ */
    const checks = lesson.blocks.filter((b): b is Extract<LessonBlock, { type: 'check' }> => b.type === 'check');
    checks.forEach((c, n) => {
      positions[c.correctIndex] = (positions[c.correctIndex] ?? 0) + 1;

      const lengths = c.options.map((o) => o.length);
      const max = Math.max(...lengths);
      const min = Math.min(...lengths);
      const correct = c.options[c.correctIndex]?.length ?? 0;
      /* Найпоширеніша прихована підказка: правильна відповідь довша, бо вона ще й
         пояснює. Пояснення живе в explainCorrect, а не у варіанті. Короткі варіанти
         (назви-мітки на кшталт «Логіка» / «Повнота») під це правило не підпадають. */
      if (max > 20 && correct === max && max > min * 1.6) {
        found.push(`питання ${n + 1}: правильний варіант найдовший (${max} проти ${min} знаків)`);
      }
      if (c.correctIndex >= c.options.length) found.push(`питання ${n + 1}: correctIndex поза межами варіантів`);
      if (!c.explainWrong.trim() || !c.explainCorrect.trim()) {
        found.push(`питання ${n + 1}: пояснення має бути на обидва випадки`);
      }

      const key = normalize(c.question);
      const previous = seenQuestions.get(key);
      if (previous) found.push(`питання ${n + 1} дублює урок ${previous}`);
      else seenQuestions.set(key, `${num}/${lesson.slug}`);
    });

    const gated = lesson.blocks.filter((b) => GATED.has(b.type)).length;
    lines.push(
      `  ${lesson.slug.padEnd(44)} ${String(lesson.minutes).padStart(2)} хв · ` +
        `питань ${checks.length} · блокують завершення ${gated} · відео ${videos.length} · скрін ${images.length}`,
    );
    if (found.length && !skip) {
      problems += found.length;
      lines.push(...found.map((f) => `      ⚠️  ${f}`));
    }
  }

  if (skip) continue;
  const total = Object.values(positions).reduce((a, b) => a + b, 0);
  console.log(`\n=== Модуль ${num} · ${lessons.length} уроків · ${minutes} хв ===`);
  console.log(lines.join('\n'));
  /* Позиції правильних відповідей мають бути розкидані: до 2026-08-10 всі 84 питання
     курсу мали правильний варіант другим. */
  const spread = [0, 1, 2, 3].map((i) => `${i + 1}-й: ${positions[i] ?? 0}`).join(' · ');
  console.log(`  Правильні відповіді по позиціях (${total} питань): ${spread}`);
  if ((positions[1] ?? 0) > total * 0.5) console.log('      ⚠️  більшість правильних відповідей — другий варіант');
}

console.log(problems === 0 ? '\nПроблем не знайдено.' : `\nЗнайдено зауважень: ${problems}.`);
