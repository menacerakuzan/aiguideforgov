/**
 * Дубль уроку 2.5 — «Зміна тону».
 *
 * П'ять кроків підряд, одним записом:
 *
 *   1. пишемо запит: нейтральний текст + потрібний тон (м'якший);
 *   2. генерація м'якшого варіанта, дочитуємо;
 *   3. тим самим чатом просимо твердіший варіант — без нового запиту;
 *   4. застосовуємо: складаємо порівняльний документ — оригінал і обидва
 *      варіанти поруч, щоб побачити додані обіцянки на власні очі;
 *   5. фінальний вигляд порівняння.
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
import { NEUTRAL, PROMPT_FIRMER, PROMPT_SOFTER } from './2-5.steps.mjs';

const DRY = process.argv.includes('--dry');

await recordLesson('2-5', {
  dry: DRY,
  lessonTitle: 'Урок 2.5 — Зміна тону',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await bringToFront('Gemini');
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Просимо м'якший тон ─────────────────────────────────────
    console.log('Крок 1: запит на м\'якший тон');
    mark('1-zapyt-pochatok');
    await typeMultiline(page, PROMPT_SOFTER, { cps: 20 });
    mark('1-zapyt-hotovyi');
    await hold();
    await shot('zapyt-myakshyi');

    // ── Крок 2. М'якший варіант ──────────────────────────────────────────
    console.log('Крок 2: м\'якший варіант');
    mark('2-nadislano');
    await send(page);
    const softer = await waitForAnswer(page);
    transcript.push(['М\'якший варіант', softer]);
    mark('2-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('2-prochytano');
    await shot('myakshyi');

    // Копіюємо м'якший варіант одразу — поки він єдина відповідь у чаті.
    mark('2-kopiiuvannia');
    await copyAnswer(page);
    await pause(400);

    // ── Крок 3. Твердіший варіант — тим самим чатом ────────────────────
    console.log('Крок 3: твердіший варіант, уточненням');
    mark('3-zapyt2-pochatok');
    await typeMultiline(page, PROMPT_FIRMER, { cps: 20 });
    mark('3-zapyt2-hotovyi');
    await hold();

    mark('3-nadislano2');
    const before3 = await send(page);
    const firmer = await waitForAnswer(page, { before: before3 });
    transcript.push(['Твердіший варіант', firmer]);
    mark('3-vidpovid2-hotova');
    await hold();
    await readAnswer(page);
    mark('3-prochytano2');
    await shot('tverdishyi');

    // ── Крок 4. Застосовуємо: складаємо порівняння ─────────────────────
    console.log('Крок 4: складаємо порівняльний документ');
    mark('4-dokument-pochatok');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(600);

    await mouse.type('ОРИГІНАЛ (нейтрально)\n', { cps: 18 });
    await mouse.type(NEUTRAL + '\n\n', { cps: 22 });
    await mouse.type("М'ЯКШИЙ ВАРІАНТ\n", { cps: 18 });
    await pasteInWord();
    await pause(500);
    mark('4-myakshyi-vstavleno');
    await shot('poriv-myakshyi');

    // Курсор після вставки лишається в кінці вставленого — просто
    // продовжуємо друкувати далі, нічого прокручувати не треба.
    await mouse.type('\n\n', { cps: 18 });
    await mouse.type('ТВЕРДІШИЙ ВАРІАНТ\n', { cps: 18 });
    await bringToFront('Gemini');
    await sleep(500);
    await copyAnswer(page); // тепер останню (твердішу) відповідь
    await pause(400);
    await bringToFront('Document');
    await sleep(500);
    await pasteInWord();
    await pause(500);
    mark('4-tverdishyi-vstavleno');

    await formatWord('Times New Roman', 12);
    await pause(500);
    mark('4-vidformatovano');
    await scrollToTop();
    await pause(600);
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
