/**
 * Дубль уроку 3.4 — «Знеособлення: як підготувати текст для ШІ».
 *
 * Чотири кроки підряд, одним записом:
 *
 *   1. пишемо документ зі звернення громадянки — з реальними на вигляд
 *      персональними даними (ПІБ, адреса, телефон, номер справи);
 *   2. знеособлюємо: чотири рази підряд виділяємо справжньою мишею фрагмент
 *      і замінюємо його на позначку — прямо на очах, без пропусків кроку;
 *   3. копіюємо знеособлений текст і віддаємо помічнику — суть лишилась,
 *      відповідь виходить робоча;
 *   4. фінальний вигляд.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import {
  closeWord, copyAllInWord, newWordDoc, selectInWord,
} from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  frontGemini, newChat, pressPaste, readAnswer, send, typeMultiline, waitForAnswer,
} from '../lib/gemini.mjs';
import { PROMPT_PREFIX, PROMPT_SUFFIX, RAW_DOC, REPLACEMENTS } from './3-4.steps.mjs';

const DRY = process.argv.includes('--dry');

await recordLesson('3-4', {
  dry: DRY,
  lessonTitle: 'Урок 3.4 — Знеособлення: як підготувати текст для ШІ',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await frontGemini();
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Документ зі зверненням — як він виглядає насправді ──────
    console.log('Крок 1: пишемо документ');
    mark('1-dokument-pochatok');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(600);
    await mouse.type(RAW_DOC, { cps: 22 });
    mark('1-dokument-hotovyi');
    await shot('dokument-z-danymy');
    await hold();
    await hold();

    // ── Крок 2. Знеособлюємо: чотири заміни підряд ──────────────────────
    console.log('Крок 2: знеособлюємо');
    for (const { id, find, mark: markText, label } of REPLACEMENTS) {
      mark(`2-${id}-pochatok`);
      await selectInWord(mouse, find, find);
      mark(`2-${id}-vydileno`);
      await hold();

      await mouse.type(markText, { cps: 14 });
      mark(`2-${id}-zamineno`);
      await shot(`zamineno-${label}`);
      await hold();
      await hold();
    }

    // ── Крок 3. Копіюємо знеособлений текст і віддаємо помічнику ────────
    console.log('Крок 3: віддаємо помічнику');
    mark('3-kopiiuvannia');
    await copyAllInWord();
    await pause(400);

    mark('3-povernennia');
    await frontGemini();
    await sleep(600);

    mark('3-prefix-pochatok');
    await typeMultiline(page, PROMPT_PREFIX, { cps: 22 });
    mark('3-vstavleno-pochatok');
    await pressPaste(page);
    mark('3-vstavleno');
    await pause(300);
    await typeMultiline(page, PROMPT_SUFFIX, { cps: 22 });
    mark('3-zapyt-hotovyi');
    await hold();

    mark('3-nadislano');
    await send(page);
    const reply = await waitForAnswer(page);
    transcript.push(['Відповідь на знеособлене звернення', reply]);
    mark('3-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('3-prochytano');
    await shot('vidpovid');
    await hold();
    await hold();

    // ── Крок 4. Фінальний вигляд ─────────────────────────────────────────
    mark('4-final');
    await pause(400);
    await shot('final');
    await hold();
    await closeWord();
  },
});
