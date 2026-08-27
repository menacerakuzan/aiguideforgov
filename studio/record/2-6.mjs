/**
 * Дубль уроку 2.6 — «Швидкий переклад».
 *
 * П'ять кроків підряд, одним записом:
 *
 *   1. пишемо запит: переклад з глосарієм термінів прямо в тексті;
 *   2. генерація перекладу, дочитуємо;
 *   3. тим самим чатом просимо зворотний переклад — самоперевірка;
 *   4. застосовуємо: складаємо документ «оригінал → переклад → зворотний
 *      переклад» поруч, щоб звірити зміст рядок за рядком;
 *   5. готове порівняння.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import { closeWord, formatWord, newWordDoc, pasteInWord, scrollToTop } from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  copyAnswer, newChat, readAnswer, send, typeMultiline, waitForAnswer,
} from '../lib/gemini.mjs';
import { ORIGINAL, PROMPT_BACK, PROMPT_TRANSLATE } from './2-6.steps.mjs';

const DRY = process.argv.includes('--dry');

await recordLesson('2-6', {
  dry: DRY,
  lessonTitle: 'Урок 2.6 — Швидкий переклад',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await bringToFront('Gemini');
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Переклад із глосарієм ───────────────────────────────────
    console.log('Крок 1: запит на переклад');
    mark('1-zapyt-pochatok');
    await typeMultiline(page, PROMPT_TRANSLATE, { cps: 20 });
    mark('1-zapyt-hotovyi');
    await hold();
    await shot('zapyt-hotovyi');

    // ── Крок 2. Переклад ─────────────────────────────────────────────────
    console.log('Крок 2: переклад');
    mark('2-nadislano');
    await send(page);
    const translated = await waitForAnswer(page);
    transcript.push(['Переклад', translated]);
    mark('2-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('2-prochytano');
    await shot('translated');

    mark('2-kopiiuvannia');
    await copyAnswer(page);
    await pause(400);

    // ── Крок 3. Зворотний переклад — тим самим чатом ───────────────────
    console.log('Крок 3: зворотний переклад, уточненням');
    mark('3-zapyt2-pochatok');
    await typeMultiline(page, PROMPT_BACK, { cps: 20 });
    mark('3-zapyt2-hotovyi');
    await hold();

    mark('3-nadislano2');
    const before3 = await send(page);
    const back = await waitForAnswer(page, { before: before3 });
    transcript.push(['Зворотний переклад', back]);
    mark('3-vidpovid2-hotova');
    await hold();
    await readAnswer(page);
    mark('3-prochytano2');
    await shot('back-translated');

    // ── Крок 4. Застосовуємо: складаємо порівняння ─────────────────────
    console.log('Крок 4: складаємо порівняння');
    mark('4-dokument-pochatok');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(600);

    await mouse.type('ОРИГІНАЛ\n', { cps: 18 });
    await mouse.type(ORIGINAL + '\n\n', { cps: 22 });
    await mouse.type('ПЕРЕКЛАД\n', { cps: 18 });
    await pasteInWord();
    await pause(500);
    mark('4-translated-vstavleno');
    await shot('poriv-translated');

    await mouse.type('\n\n', { cps: 18 });
    await mouse.type('ЗВОРОТНИЙ ПЕРЕКЛАД\n', { cps: 18 });
    await bringToFront('Gemini');
    await sleep(500);
    await copyAnswer(page); // тепер остання відповідь — зворотний переклад
    await pause(400);
    await bringToFront('Document');
    await sleep(500);
    await pasteInWord();
    await pause(500);
    mark('4-back-vstavleno');

    await formatWord('Times New Roman', 12);
    await pause(500);
    await scrollToTop();
    await pause(600);
    mark('4-vidformatovano');
    await shot('poriv-vidformatovano');
    await hold();

    // ── Крок 5. Порівняння цілком ────────────────────────────────────────
    console.log('Крок 5: порівняння цілком');
    mark('5-final');
    await pause(1000);
    await shot('final');
    await hold();
    await closeWord();
  },
});
