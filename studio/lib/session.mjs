/**
 * Спільний каркас запису уроку.
 *
 * Усе, що однакове в кожному дублі — версіонування, мітки часу, стенограма,
 * репетиція без запису, — живе тут. Раніше це було переписано в кожному
 * record/<урок>.mjs заново; на трьох уроках різниця вже почала розповзатись.
 *
 *   import { recordLesson } from '../lib/session.mjs';
 *
 *   await recordLesson('2-2', {
 *     dry: process.argv.includes('--dry'),
 *     // Поза кадром, до старту запису: підготувати документи, закрити Word.
 *     async setup({ page }) { ... },
 *     // Сам дубль. ctx.mark(name), ctx.shot(name), ctx.mouse, ctx.transcript.
 *     async script(ctx) { ... },
 *   });
 */
import { join } from 'node:path';
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';

import { OUT_DIR, ensureDir } from './paths.mjs';
import { connect, freshApp } from './gemini.mjs';
import { openMouse } from './mouse.mjs';
import { startRecording, grabFrame } from './screen.mjs';
import { sleep } from './human.mjs';

export async function recordLesson(lessonId, { dry = false, setup, script, lessonTitle } = {}) {
  const OUT = ensureDir(join(OUT_DIR, lessonId));
  const transcript = [];

  // Репетиція: ті самі кадри, але без ffmpeg. Замість відео на кожному кроці
  // лишається стоп-кадр — по них видно композицію, перш ніж витрачати час на
  // повний дубль.
  const shots = ensureDir(join(OUT, 'rehearsal'));
  let shotNo = 0;
  const shot = async (name) => {
    if (!dry) return;
    await grabFrame(join(shots, `${String(++shotNo).padStart(2, '0')}-${name}.png`));
  };

  console.log('Готую сцену…');
  const { browser, page } = await connect();
  await freshApp(page); // чистий стан застосунку, поза кадром

  const mouse = openMouse();

  if (setup) await setup({ page, mouse });

  /**
   * Дублі зберігаємо з номером, а не затираємо.
   *
   * Пересъемка може вийти гіршою за попередню — так уже було на 2.1. Якщо
   * номер не рахувати, а завжди перезаписувати take.mp4, повертатись немає
   * куди.
   */
  const takesDir = ensureDir(join(OUT, 'takes'));
  const takeNo = String(
    readdirSync(takesDir)
      .map((f) => Number((f.match(/^take-(\d+)\.mp4$/) ?? [])[1]))
      .filter((n) => !Number.isNaN(n))
      .reduce((a, b) => Math.max(a, b), 0) + 1,
  ).padStart(2, '0');
  const takePath = join(takesDir, `take-${takeNo}.mp4`);

  const rec = dry ? null : startRecording(takePath);
  await sleep(1500); // ffmpeg відкриває файл

  /**
   * Відмітки кадрів у секундах від початку запису.
   *
   * Без них монтаж перетворюється на вгадування: щоб прискорити саме набір
   * тексту й підписати саме потрібний крок, треба знати, де він починається.
   * Дубль сам і розповідає — тут, а не на око по таймлайну.
   */
  const startedAt = Date.now();
  const marks = [];
  const mark = (name) => {
    const t = (Date.now() - startedAt) / 1000;
    marks.push({ name, t });
    console.log(`   ${name.padEnd(24)} ${t.toFixed(1)} с`);
  };

  try {
    await script({ page, mouse, mark, shot, transcript, dry });
  } finally {
    await mouse.close();
    const file = rec ? await rec.stop() : '(репетиція без запису)';
    await browser.close();

    mark('kinets');
    if (!dry) writeFileSync(join(OUT, 'marks.json'), JSON.stringify(marks, null, 2) + '\n', 'utf8');

    const title = lessonTitle ?? `Урок ${lessonId}`;
    const md = transcript.map(([t, body]) => `## ${t}\n\n${body}\n`).join('\n');
    writeFileSync(join(OUT, 'take-transcript.md'), `# ${title} — стенограма дубля\n\n${md}`, 'utf8');

    // Зручна копія «останній дубль» — з нею працює монтаж.
    if (!dry) copyFileSync(takePath, join(OUT, 'take.mp4'));

    console.log(`\nДубль: ${file}`);
    console.log(`Стенограма: ${join(OUT, 'take-transcript.md')}`);
  }
}
