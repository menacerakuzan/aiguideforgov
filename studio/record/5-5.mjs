/**
 * Дубль уроку 5.5 — «Цифри та статистика».
 *
 * Справжній документ у Word (зведення видатків, дев'ять статей) — не три
 * числа, які й так порахуєш в умі: підсумок навмисно неправильний, але
 * розбіжність не видно оком, доки Gemini не розкладе доданки по одному.
 * Службовець копіює зведення з Word і вставляє в чат для перевірки — так,
 * як і робив би насправді, а не вручну передруковує таблицю в чат.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import { closeWord, copyAllInWord, newWordDoc } from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import { frontGemini, newChat, pressPaste, readAnswer, send, typeMultiline, waitForAnswer } from '../lib/gemini.mjs';
import { PROMPT_PREFIX, PROMPT_SUFFIX, REPORT } from './5-5.steps.mjs';

const DRY = process.argv.includes('--dry');

await recordLesson('5-5', {
  dry: DRY,
  lessonTitle: 'Урок 5.5 — Цифри та статистика',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await frontGemini();
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Зведення видатків — справжній документ ───────────────────
    console.log('Крок 1: пишемо зведення');
    mark('1-dokument-pochatok');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(600);
    await mouse.type(REPORT, { cps: 26 });
    mark('1-dokument-hotovyi');
    await shot('zvedennia');
    await hold();
    await hold();

    // ── Крок 2. Копіюємо і віддаємо на перевірку ──────────────────────────
    console.log('Крок 2: віддаємо на перевірку');
    mark('2-kopiiuvannia');
    await copyAllInWord();
    await pause(400);

    mark('2-povernennia');
    await frontGemini();
    await sleep(600);

    mark('2-prefix-pochatok');
    await typeMultiline(page, PROMPT_PREFIX, { cps: 22 });
    mark('2-vstavleno-pochatok');
    await pressPaste(page);
    mark('2-vstavleno');
    await pause(300);
    await typeMultiline(page, PROMPT_SUFFIX, { cps: 22 });
    mark('2-zapyt-hotovyi');
    await hold();
    await shot('zapyt');

    const before = await send(page);
    mark('2-nadislano');
    const reply = await waitForAnswer(page, { before });
    transcript.push(['Перевірка підсумку', reply]);
    mark('3-vidpovid-hotova');
    await hold();
    await hold();
    await readAnswer(page);
    mark('3-prochytano');
    await shot('dodanky');

    mark('4-final');
    await pause(400);
    await shot('final');
    await hold();
  },
});
