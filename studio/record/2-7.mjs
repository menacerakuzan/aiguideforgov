/**
 * Дубль уроку 2.7 — «Структура документа за 2 хвилини».
 *
 * Чотири кроки підряд, одним записом:
 *
 *   1. просимо структуру (не текст!) аналітичної записки;
 *   2. застосовуємо: копіюємо структуру в документ і одразу показуємо її
 *      як чек-лист — перший розділ позначено зробленим;
 *   3. тим самим чатом просимо ще два варіанти структури — і бачимо, що
 *      той самий документ можна побудувати зовсім по-різному;
 *   4. фінальний вигляд.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import {
  changeWordFontVisibly, cleanupPastedWord, closeWord, newWordDoc, pasteInWord, scrollToTop,
} from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  copyAnswer, newChat, readAnswer, send, typeMultiline, waitForAnswer,
} from '../lib/gemini.mjs';
import { PROMPT_STRUCTURE, PROMPT_VARIANTS } from './2-7.steps.mjs';

const DRY = process.argv.includes('--dry');

await recordLesson('2-7', {
  dry: DRY,
  lessonTitle: 'Урок 2.7 — Структура документа за 2 хвилини',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await bringToFront('Gemini');
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Просимо структуру ───────────────────────────────────────
    console.log('Крок 1: запит на структуру');
    mark('1-zapyt-pochatok');
    await typeMultiline(page, PROMPT_STRUCTURE, { cps: 20 });
    mark('1-zapyt-hotovyi');
    await hold();
    await shot('zapyt-hotovyi');

    mark('1-nadislano');
    await send(page);
    const structure = await waitForAnswer(page);
    transcript.push(['Структура записки', structure]);
    mark('1-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('1-prochytano');
    await shot('struktura');

    mark('1-kopiiuvannia');
    await copyAnswer(page);
    await pause(400);

    // ── Крок 2. Застосовуємо: структура як чек-лист ─────────────────────
    console.log('Крок 2: структура як чек-лист');
    mark('2-dokument-pochatok');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(600);
    await pasteInWord();
    await pause(700);
    mark('2-vstavleno');
    await shot('vstavleno-syrym');
    await hold();

    // Прибираємо сліди чату (подвійні абзаци, зайве жирне) — швидко,
    // непомітно; а от зміну шрифту показуємо: клік по стрічці, а не
    // миттєва команда, яку не встигнеш прочитати.
    await cleanupPastedWord();
    await pause(300);
    mark('2-shrift-pochatok');
    await changeWordFontVisibly(mouse, { name: 'Times New Roman', size: 12 });
    await scrollToTop();
    await pause(500);
    mark('2-vidformatovano');
    await shot('vidformatovano');
    await hold();

    // Перший розділ уже написано — позначаємо чек-листом, а не текстом.
    mark('2-poznachennia');
    await mouse.type('[зроблено] ', { cps: 14 });
    await pause(600);
    mark('2-hotovo');
    await shot('poznacheno');
    await hold();

    // ── Крок 3. Ще два варіанти структури ──────────────────────────────
    console.log('Крок 3: ще два варіанти');
    mark('3-povernennia');
    await bringToFront('Gemini');
    await sleep(600);
    mark('3-zapyt2-pochatok');
    await typeMultiline(page, PROMPT_VARIANTS, { cps: 20 });
    mark('3-zapyt2-hotovyi');
    await hold();

    mark('3-nadislano2');
    const before3 = await send(page);
    const variants = await waitForAnswer(page, { before: before3 });
    transcript.push(['Ще два варіанти', variants]);
    mark('3-vidpovid2-hotova');
    await hold();
    await readAnswer(page);
    mark('3-prochytano2');
    await shot('varianty');
    await hold();

    // ── Крок 4. Фінальний вигляд ─────────────────────────────────────────
    mark('4-final');
    await shot('final');
    await hold();
    await closeWord();
  },
});
