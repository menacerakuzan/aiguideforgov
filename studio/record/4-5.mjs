/**
 * Дубль уроку 4.5 — «Ітерації: як довести чернетку до потрібного».
 *
 * Один чат, сім реплік підряд: початковий запит на лист-відповідь, п'ять
 * коротких уточнень (кожне — готова фраза з таблиці уроку), і насамкінець —
 * навмисно невдала правка з відкатом («поверни попередній варіант»), щоб
 * показати, що відкат справді працює.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { clearStage } from '../lib/stage.mjs';
import { hold, pause } from '../lib/human.mjs';
import { frontGemini, newChat, readAnswer, send, typeMultiline, waitForAnswer } from '../lib/gemini.mjs';
import { EDIT_BAD, EDIT_REVERT, EDITS, PROMPT_INIT } from './4-5.steps.mjs';

const DRY = process.argv.includes('--dry');

/** Одна репліка в чаті, що вже відкритий: друк → відправлення → відповідь. */
async function turn({ page, mark, id, text, cps = 20 }) {
  mark(`${id}-pochatok`);
  await typeMultiline(page, text, { cps });
  mark(`${id}-nadrukovano`);
  await pause(400);
  const before = await send(page);
  mark(`${id}-nadislano`);
  const reply = await waitForAnswer(page, { before });
  mark(`${id}-vidpovid`);
  return reply;
}

await recordLesson('4-5', {
  dry: DRY,
  lessonTitle: 'Урок 4.5 — Ітерації: як довести чернетку до потрібного',

  async setup({ page }) {
    await newChat(page);
    await clearStage();
    await frontGemini();
    await pause(1200);
  },

  async script({ page, mark, shot, transcript }) {
    // ── Початковий запит ──────────────────────────────────────────────────
    console.log('Початковий запит');
    const r0 = await turn({ page, mark, id: '0-pochatkovyi', text: PROMPT_INIT });
    transcript.push(['Початковий запит', r0]);
    await hold();
    await readAnswer(page);
    await shot('chernetka-persha');
    await hold();

    // ── П'ять коротких уточнень ───────────────────────────────────────────
    for (const [i, { id, text }] of EDITS.entries()) {
      console.log(`Уточнення ${i + 1}/5: ${text}`);
      const reply = await turn({ page, mark, id: `1-${id}`, text, cps: 26 });
      transcript.push([text, reply]);
      await pause(500);
      await readAnswer(page);
      if (i === EDITS.length - 1) {
        await shot('pyat-utochnen');
        await hold();
        await hold();
      }
    }

    // ── Невдала правка й відкат ───────────────────────────────────────────
    console.log('Невдала правка');
    const rBad = await turn({ page, mark, id: '2-nevdala-pravka', text: EDIT_BAD, cps: 26 });
    transcript.push([EDIT_BAD, rBad]);
    await pause(400);
    await readAnswer(page);
    await shot('stalo-hirshe');
    await hold();

    console.log('Відкат');
    const rRevert = await turn({ page, mark, id: '3-vidkat', text: EDIT_REVERT, cps: 26 });
    transcript.push([EDIT_REVERT, rRevert]);
    await pause(400);
    await readAnswer(page);
    mark('4-final');
    await shot('final');
    await hold();
  },
});
