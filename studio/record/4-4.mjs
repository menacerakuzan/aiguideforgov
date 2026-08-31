/**
 * Дубль уроку 4.4 — «Приклад як інструмент».
 *
 * Чотири кроки підряд, одним записом:
 *
 *   1. пишемо типовий лист із реальними на вигляд персональними даними;
 *   2. знеособлюємо через діалог «Знайти й замінити» (Ctrl+H — точніше,
 *      кнопку «Replace» на стрічці: синтетичний Ctrl+H ярлик не відкриває);
 *   3. зберігаємо як .docx і прикріплюємо в чат як зразок стилю;
 *   4. просимо новий лист за іншими вхідними даними — той самий стиль.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { join } from 'node:path';

import { ASSETS_DIR } from '../lib/paths.mjs';
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import {
  clearAndType, closeReplaceDialog, closeWord, FIND_FIELD, newWordDoc,
  openReplaceDialog, REPLACE_FIELD, replaceInWordDialog, saveWordAs, scrollWord,
} from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  frontGemini, newChat, readAnswer, send, typeMultiline, uploadFile, waitForAnswer,
} from '../lib/gemini.mjs';
import { PROMPT_PREFIX, REPLACEMENTS, SAMPLE_RAW } from './4-4.steps.mjs';

const SAMPLE_PATH = join(ASSETS_DIR, 'zrazok-lyst.docx');
const DRY = process.argv.includes('--dry');

await recordLesson('4-4', {
  dry: DRY,
  lessonTitle: 'Урок 4.4 — Приклад як інструмент',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await frontGemini();
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Типовий лист — як він виглядає насправді ─────────────────
    console.log('Крок 1: пишемо зразок листа');
    mark('1-dokument-pochatok');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(600);
    await mouse.type(SAMPLE_RAW, { cps: 26 });
    mark('1-dokument-hotovyi');
    await shot('zrazok-z-danymy');
    await hold();
    await hold();

    // ── Крок 2. Знеособлюємо через «Знайти й замінити» ───────────────────
    console.log('Крок 2: знеособлюємо через Ctrl+H');
    mark('2-dialoh-pochatok');
    await openReplaceDialog(mouse);
    mark('2-dialoh-vidkryto');
    await hold();

    // Перша заміна лишається видимою в полях діалогу — саме цей кадр і
    // потрібен для скриншота уроку («у полі Знайти — прізвище...»).
    const first = REPLACEMENTS[0];
    await clearAndType(mouse, FIND_FIELD, first.find, 28);
    await sleep(250);
    await clearAndType(mouse, REPLACE_FIELD, first.replace, 24);
    mark('2-polya-zapovneni');
    await shot('dialoh-zamina');
    await hold();
    await hold();

    await mouse.glide(1469, 828, { ms: 400 });
    await mouse.click();
    await sleep(700);
    await mouse.glide(966, 600, { ms: 350 });
    await mouse.click();
    await sleep(400);
    mark(`2-zamina-${first.id}`);

    for (const { id, find, replace } of REPLACEMENTS.slice(1)) {
      await replaceInWordDialog(mouse, find, replace);
      mark(`2-zamina-${id}`);
      await pause(300);
    }
    await closeReplaceDialog(mouse);
    mark('2-dialoh-zakryto');
    // «Знайти й замінити» гортає документ до кожного знайденого збігу — після
    // закриття діалогу видима частина лишається там, де був ОСТАННІЙ збіг
    // (найчастіше кінець листа), а не початок. Повертаємо на початок, щоб
    // глядач бачив увесь знеособлений лист, а не один рядок унизу — плавно,
    // не одним стрибком: миттєве перескакування губить глядача.
    await scrollWord(-40, { steps: 12, ms: 80 });
    await pause(400);
    await shot('zrazok-znebosoblenyi');
    await hold();
    await hold();

    // ── Крок 3. Зберігаємо й прикріплюємо як зразок ──────────────────────
    console.log('Крок 3: зберігаємо й прикріплюємо');
    mark('3-zberezhennia');
    await saveWordAs(SAMPLE_PATH);
    await pause(600);
    await closeWord();
    await pause(600);

    mark('3-povernennia');
    await page.bringToFront();
    await pause(600);
    mark('3-dodavannia-pochatok');
    await uploadFile(page, mouse, SAMPLE_PATH);
    mark('3-dodavannia-hotovo');
    await hold();
    await shot('zrazok-dodano');

    // ── Крок 4. Просимо новий лист за зразком ────────────────────────────
    console.log('Крок 4: новий лист за зразком');
    mark('4-zapyt-pochatok');
    await typeMultiline(page, PROMPT_PREFIX, { cps: 20 });
    mark('4-zapyt-hotovyi');
    await hold();
    // Прикріплений файл валідується на сервері ще секунду-дві після появи
    // в кадрі — клік по «Надіслати» одразу після друку раз не спрацював
    // (кнопка виглядала активною, але повідомлення лишилось у полі).
    await pause(2000);

    mark('4-nadislano');
    const before = await send(page);
    // Захист: якщо поле вводу все ще не порожнє за секунду — повідомлення
    // не пішло (сталося на репетиції), тиснемо ще раз.
    await pause(1000);
    const stillTyped = await page.locator('rich-textarea .ql-editor').innerText().catch(() => '');
    if (stillTyped.trim().length > 0) {
      console.log('Повідомлення не пішло з першого разу — надсилаємо ще раз.');
      await send(page);
    }
    const reply = await waitForAnswer(page, { before });
    transcript.push(['Новий лист за зразком', reply]);
    mark('4-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('4-prochytano');
    await shot('novyi-lyst');
    await hold();
    await hold();

    // ── Крок 5. Фінальний вигляд ──────────────────────────────────────────
    mark('5-final');
    await pause(400);
    await shot('final');
    await hold();
  },
});
