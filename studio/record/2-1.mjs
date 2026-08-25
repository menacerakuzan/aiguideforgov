/**
 * Дубль уроку 2.1 — «Лист-відповідь на звернення громадянина».
 *
 * Шість кадрів із розкадровки уроку, підряд, одним записом:
 *
 *   1. звернення у Word: видно шапку з реквізитами, копіюємо ЛИШЕ текст;
 *   2. новий чат;
 *   3. запит: початок набирається руками, звернення вставляється з буфера;
 *   4. генерація чернетки;
 *   5. три уточнення підряд;
 *   6. лист у бланку, позначки під маркером.
 *
 * Темп чесний: нічого не прискорюємо в кадрі. Де вийде довго — прискоримо на
 * монтажі, і глядач бачитиме, що це прискорення, а не магія.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 *
 * Під час запису екран зайнятий: пишеться весь робочий стіл разом із курсором.
 */
import { join } from 'node:path';
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';

import { ASSETS_DIR, OUT_DIR, ensureDir } from '../lib/paths.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import {
  closeWord, copyInWord, highlightAllInWord, openInWord, pasteInWord, scrollToTop, scrollWord, selectInWord,
} from '../lib/word.mjs';
import { openMouse } from '../lib/mouse.mjs';
import { startRecording } from '../lib/screen.mjs';
import { beat, focusEnd, hold, pause, sleep, typeText } from '../lib/human.mjs';
import { grabFrame } from '../lib/screen.mjs';
import {
  S, connect, copyAnswer, freshApp, newChat, readAnswer, send, typeMultiline, waitForAnswer, waitForPaste,
} from '../lib/gemini.mjs';
import { APPEAL, PROMPT_HEAD, PROMPT_TAIL, REFINEMENTS } from './2-1.steps.mjs';

const OUT = ensureDir(join(OUT_DIR, '2-1'));
const transcript = [];

/**
 * Репетиція: ті самі шість кадрів, але без ffmpeg. Замість відео на кожному
 * кроці лишається стоп-кадр — по них видно композицію й те, чи нічого зайвого
 * не влізло в кут екрана.
 */
const DRY = process.argv.includes('--dry');
const shots = ensureDir(join(OUT, 'rehearsal'));
let shotNo = 0;
const shot = async (name) => {
  if (!DRY) return;
  await grabFrame(join(shots, `${String(++shotNo).padStart(2, '0')}-${name}.png`));
};

// ── Підготовка поза кадром ──────────────────────────────────────────────────
console.log('Готую сцену…');
const { browser, page } = await connect();
await freshApp(page);                                  // чистий стан застосунку, поза кадром

// Word закриваємо начисто: у ньому міг лишитись бланк із минулого дубля —
// із вставленим листом і жовтими позначками. Quit(0) не зберігає нічого.
await closeWord().catch(() => {});

// Відкриваємо ЛИШЕ звернення. Два документи одночасно — і Word сам вирішує,
// який із них активний; тоді пошук тексту йде не в тому файлі. Бланк відкриємо
// у шостому кадрі, коли він знадобиться, — це й виглядає природніше.
await openInWord(join(ASSETS_DIR, 'zvernennia-1247.docx'));
await scrollToTop();
await clearStage();
await bringToFront('Word');
await sleep(1500);

const mouse = openMouse();
/**
 * Дублі зберігаємо з номером, а не затираємо.
 *
 * Минулого разу попередній дубль уцілів лише тому, що монтажна копія ще не була
 * оновлена. Покладатись на таке не можна: пересъемка може вийти гіршою за
 * попередню, і тоді повертатись немає куди.
 */
const takesDir = join(OUT, 'takes');
mkdirSync(takesDir, { recursive: true });
const takeNo = String(
  readdirSync(takesDir)
    .map((f) => Number((f.match(/^take-(\d+)\.mp4$/) ?? [])[1]))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0) + 1,
).padStart(2, '0');
const takePath = join(takesDir, `take-${takeNo}.mp4`);

const rec = DRY ? null : startRecording(takePath);
await sleep(1500);                                     // ffmpeg відкриває файл

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
  console.log(`   ${name.padEnd(22)} ${t.toFixed(1)} с`);
};

try {
  // ── Кадр 1. Звернення на екрані ───────────────────────────────────────────
  // Спершу дивимось на папір цілком: угорі шапка з прізвищем, адресою й
  // телефоном — саме те, що в чат не піде. Прокрутка повільна, щоб глядач
  // устиг це побачити, а не здогадатись.
  console.log('Кадр 1: звернення');
  mark('1-zvernennia');
  await mouse.jump(1500, 300);
  await hold();
  await shot('zvernennia-top');
  await scrollWord(9, { steps: 7, ms: 420 });
  await hold();

  mark('1-vydilennia');
  await selectInWord(mouse, 'Прошу вжити заходів', 'ремонт майданчика.');
  await pause(900);
  // Курсор відводимо далеко вбік і чекаємо: Word показує біля виділення
  // плаваючу панельку форматування, і вона ховається, лише коли миша поїхала.
  await mouse.glide(1700, 300, { ms: 700 });
  await pause(1600);

  await shot('vydilennia');
  await copyInWord();
  await hold();

  // ── Кадр 2. Новий чат ─────────────────────────────────────────────────────
  // Натискання видно в кадрі: «нова задача — новий чат» це те, чого вчить
  // крок 1 уроку, і воно має відбутися на очах, а не за лаштунками.
  console.log('Кадр 2: новий чат');
  mark('2-novyi-chat');
  await bringToFront('Gemini');
  await sleep(1200);
  await hold();
  await newChat(page);
  await hold();
  await shot('novyi-chat');

  // ── Кадр 3. Складаємо запит ───────────────────────────────────────────────
  console.log('Кадр 3: запит');
  mark('3-zapyt-pochatok');
  await typeMultiline(page, PROMPT_HEAD, { cps: 20 });
  await beat();
  await page.keyboard.press('Shift+Enter');
  // Вставка справжня: Ctrl+V у вікні браузера, буфер — той, що набрався у Word.
  // Якщо система з якоїсь причини не вставила, дописуємо текст самі, щоб дубль
  // не зупинявся на порожньому місці.
  await focusEnd(page, page.locator(S.editor));
  const before = await page.locator(S.editor).innerText();
  mark('3-vstavka');

  // Ctrl+V шлемо самим браузером, а не SendKeys.
  //
  // Перевірено окремим дослідом: звичайні клавіші SendKeys до Chrome доходять
  // («abc» з'являється в полі), а поєднання з Ctrl — ні, вставка мовчки не
  // відбувається. Браузер же обробляє Ctrl+V сам і читає справжній буфер
  // Windows — той, у який Word поклав текст справжнім Ctrl+C. Тобто вставка
  // в кадрі чесна, а не імітована.
  await page.keyboard.press('Control+V');

  if (!(await waitForPaste(page, before.length + 100))) {
    console.log('   вставка з буфера не спрацювала — вписуємо текстом');
    await page.keyboard.insertText(APPEAL);
  }
  await hold();
  await shot('vstavleno-zvernennia');
  await page.keyboard.press('Shift+Enter');
  mark('3-zapyt-hvist');
  await typeMultiline(page, PROMPT_TAIL, { cps: 22 });
  await hold();
  await shot('zapyt-hotovyi');

  // ── Кадр 4. Чернетка ──────────────────────────────────────────────────────
  console.log('Кадр 4: генерація');
  mark('4-nadislano');
  await send(page);
  const draft = await waitForAnswer(page);
  transcript.push(['Чернетка', draft]);
  mark('4-chernetka-hotova');
  await hold();
  await readAnswer(page);                              // прокручуємо чернетку до кінця
  mark('4-prochytano');
  await shot('chernetka');

  // ── Кадр 5. Три уточнення ─────────────────────────────────────────────────
  console.log('Кадр 5: уточнення');
  for (const [i, refinement] of REFINEMENTS.entries()) {
    mark(`5-utochnennia-${i + 1}`);
    await focusEnd(page, page.locator(S.editor));
    await typeText(page, refinement, { cps: 20 });
    await beat();
    await send(page);
    const answer = await waitForAnswer(page);
    transcript.push([`Уточнення ${i + 1}: ${refinement}`, answer]);
    mark(`5-vidpovid-${i + 1}`);
    await hold();
    // Кожну нову редакцію теж дочитуємо: саме в ній видно, що змінилось.
    await readAnswer(page, { step: 170, ms: 200 });
    await shot(`utochnennia-${i + 1}`);
  }

  // ── Кадр 6. Перевірка перед підписом ──────────────────────────────────────
  // Найважливіший кадр уроку, і єдиний, який на монтажі не прискорюємо:
  // саме тут видно, що готовий лист — це ще не підписаний лист.
  console.log('Кадр 6: перевірка');
  mark('6-kopiyuvannia');
  await copyAnswer(page);
  await hold();

  await openInWord(join(ASSETS_DIR, 'blank-vidpovid.docx'));
  await bringToFront('blank-vidpovid');
  await sleep(1200);
  await hold();

  mark('6-blank');
  await pasteInWord();
  await hold();
  await scrollToTop();                                 // читаємо лист із початку
  await hold();
  await shot('lyst-u-blanku');
  await scrollWord(8, { steps: 6, ms: 450 });
  await pause(1200);

  // Позначки під маркером: рівно ті місця, які людина заповнює руками.
  // Шукаємо за початком «[ЗАПОВНИТИ» — формулювання підказок у кожному дублі
  // свої, а дужка стоїть завжди.
  mark('6-marker');
  console.log(await highlightAllInWord('[ЗАПОВНИТИ'));
  await hold();
  await shot('marker');
  await hold();
} finally {
  await mouse.close();
  const file = rec ? await rec.stop() : '(репетиція без запису)';
  await browser.close();

  mark('kinets');
  if (!DRY) writeFileSync(join(OUT, 'marks.json'), JSON.stringify(marks, null, 2) + '\n', 'utf8');

  const md = transcript.map(([title, body]) => `## ${title}\n\n${body}\n`).join('\n');
  writeFileSync(join(OUT, 'take-transcript.md'), `# Урок 2.1 — стенограма дубля\n\n${md}`, 'utf8');
  // Зручна копія «останній дубль» — з нею працює монтаж.
  if (!DRY) copyFileSync(takePath, join(OUT, 'take.mp4'));

  console.log(`\nДубль: ${file}`);
  console.log(`Стенограма: ${join(OUT, 'take-transcript.md')}`);
}
