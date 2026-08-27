/**
 * Дубль уроку 2.3 — «Службова записка».
 *
 * П'ять кроків підряд, одним записом:
 *
 *   1. показуємо кнопку мікрофона — диктування існує, але для надійного
 *      запису той самий текст просто набираємо;
 *   2. набираємо запит розмовною мовою: опис ситуації, кому, чого хочемо;
 *   3. генерація записки, дочитуємо до кінця;
 *   4. застосовуємо вивід: копіюємо в документ і форматуємо (той самий
 *      принцип, що в 2.2 — відповідь ШІ не залишається в чаті). Тут ШІ
 *      сам зібрав документ шапкою — на відміну від 2.2, зайвого вступного
 *      речення немає, тож прибирати першу репліку не треба (перевірено
 *      дослідом на реальній відповіді — див. STANDARD.md §6);
 *   5. кінець документа — та сама конкретна пропозиція, заради якої
 *      вся записка й пишеться.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import {
  closeWord, formatWord, newWordDoc, pasteInWord, scrollToBottom, scrollToTop,
} from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  copyAnswer, newChat, readAnswer, S, send, typeMultiline, waitForAnswer,
} from '../lib/gemini.mjs';
import { pointAndClick } from '../lib/human.mjs';
import { PROMPT } from './2-3.steps.mjs';

const DRY = process.argv.includes('--dry');

await recordLesson('2-3', {
  dry: DRY,
  lessonTitle: 'Урок 2.3 — Службова записка',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await bringToFront('Gemini');
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Ось де мікрофон ─────────────────────────────────────────
    console.log('Крок 1: мікрофон');
    mark('1-mikrofon-pochatok');
    await pointAndClick(page, page.locator(S.dictate));
    await pause(900);
    mark('1-mikrofon-hotovo');
    await shot('mikrofon');
    await pointAndClick(page, page.locator(S.dictate)); // вимикаємо той самий кнопкою
    await pause(500);

    // ── Крок 2. Набираємо запит розмовною мовою ────────────────────────
    console.log('Крок 2: запит');
    mark('2-zapyt-pochatok');
    await typeMultiline(page, PROMPT, { cps: 20 });
    mark('2-zapyt-hotovyi');
    await hold();
    await shot('zapyt-hotovyi');

    // ── Крок 3. Генерація записки ───────────────────────────────────────
    console.log('Крок 3: генерація');
    mark('3-nadislano');
    await send(page);
    const answer = await waitForAnswer(page);
    transcript.push(['Службова записка', answer]);
    mark('3-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('3-prochytano');
    await shot('zapyska');

    // ── Крок 4. Застосовуємо: копіюємо в документ ──────────────────────
    console.log('Крок 4: застосовуємо записку');
    mark('4-kopiiuvannia-pochatok');
    await copyAnswer(page);
    await pause(400);

    await newWordDoc();
    await bringToFront('Document');
    await sleep(600);
    await pasteInWord();
    await pause(700);
    await scrollToTop(); // курсор після вставки лишається в кінці — повертаємось на початок
    await pause(400);
    mark('4-vstavleno');
    await shot('vstavleno');
    await hold();

    await formatWord('Times New Roman', 12);
    await pause(500);
    mark('4-vidformatovano');
    await shot('vidformatovano');
    await hold();

    // ── Крок 5. Кінець документа — конкретна пропозиція ────────────────
    console.log('Крок 5: фінальний абзац');
    mark('5-final-pochatok');
    await scrollToBottom();
    await pause(1200);
    mark('5-final-abzac');
    await shot('final-abzac');
    await hold();
    await closeWord();
  },
});
