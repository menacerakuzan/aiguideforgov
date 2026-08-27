/**
 * Дубль уроку 2.9 — «Мозковий штурм».
 *
 * Три кроки підряд, одним записом, без Word — це найбезпечніша задача
 * курсу (жодних чутливих даних, жодного документа):
 *
 *   1. просимо 15 варіантів назви семінару — офіційні й простіші, без
 *      пафосу й англіцизмів;
 *   2. тим самим чатом кажемо, які саме варіанти сподобались, і просимо
 *      ще 10 у тому ж дусі — найкорисніша фраза уроку;
 *   3. фінальний вигляд другого списку.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { clearStage } from '../lib/stage.mjs';
import { closeWord } from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  frontGemini, newChat, readAnswer, send, typeMultiline, waitForAnswer,
} from '../lib/gemini.mjs';
import { PROMPT_BRAINSTORM, PROMPT_REFINE } from './2-9.steps.mjs';

const DRY = process.argv.includes('--dry');

await recordLesson('2-9', {
  dry: DRY,
  lessonTitle: 'Урок 2.9 — Мозковий штурм',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await frontGemini();
    await sleep(1200);
  },

  async script({ page, mark, shot, transcript }) {
    // ── Крок 1. Просимо 15 варіантів ─────────────────────────────────────
    console.log('Крок 1: запит на 15 варіантів');
    mark('1-zapyt-pochatok');
    await typeMultiline(page, PROMPT_BRAINSTORM, { cps: 20 });
    mark('1-zapyt-hotovyi');
    await hold();

    mark('1-nadislano');
    await send(page);
    const list15 = await waitForAnswer(page);
    transcript.push(['15 варіантів', list15]);
    mark('1-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('1-prochytano');
    await shot('15-variantiv');
    await hold();

    // ── Крок 2. Уточнення — тим самим чатом ─────────────────────────────
    console.log('Крок 2: "варіанти 6 і 11 — те, що треба"');
    mark('2-zapyt2-pochatok');
    await typeMultiline(page, PROMPT_REFINE, { cps: 20 });
    mark('2-zapyt2-hotovyi');
    await hold();

    mark('2-nadislano2');
    const before2 = await send(page);
    const list10 = await waitForAnswer(page, { before: before2 });
    transcript.push(['Ще 10 у тому ж дусі', list10]);
    mark('2-vidpovid2-hotova');
    await hold();
    await readAnswer(page);
    mark('2-prochytano2');
    await shot('shche-10');
    await hold();
    await hold();

    // ── Крок 3. Фінальний вигляд ─────────────────────────────────────────
    mark('3-final');
    await pause(400);
    await shot('final');
    await hold();
  },
});
