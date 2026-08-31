/**
 * Дубль уроку 4.6 — «Робота з файлами».
 *
 * Дві частини поспіль, в одному чаті:
 *   1. прикріпити один файл (службова записка на двох сторінках) і попросити
 *      зведення з посиланням на сторінку для кожної цифри;
 *   2. прикріпити одразу два файли (стара й нова редакція положення) і
 *      попросити порівняти.
 *
 * Файли вже готові заздалегідь (`_prep-4-6-assets.mjs`) — глядач бачить
 * прикріплення готового документа, а не його написання, так само як зразок
 * листа в уроці 4.4.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { join } from 'node:path';
import { ASSETS_DIR } from '../lib/paths.mjs';
import { recordLesson } from '../lib/session.mjs';
import { clearStage } from '../lib/stage.mjs';
import { closeWord } from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import { frontGemini, newChat, readAnswer, send, typeMultiline, uploadFile, waitForAnswer } from '../lib/gemini.mjs';
import { PROMPT_PORIVNYATY, PROMPT_ZVEDENNIA } from './4-6.steps.mjs';

const ZAPYSKA = join(ASSETS_DIR, 'sluzhbova-zapyska.docx');
const STARE = join(ASSETS_DIR, 'polozhennya-stare.docx');
const NOVE = join(ASSETS_DIR, 'polozhennya-nove.docx');

const DRY = process.argv.includes('--dry');

await recordLesson('4-6', {
  dry: DRY,
  lessonTitle: 'Урок 4.6 — Робота з файлами',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await frontGemini();
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Частина 1. Один файл — зведення з посиланням на сторінку ─────────
    console.log('Частина 1: один файл');
    mark('1-fail-pochatok');
    await uploadFile(page, mouse, ZAPYSKA);
    mark('1-fail-dodano');
    await hold();
    await shot('odyn-fail');
    await hold();

    await typeMultiline(page, PROMPT_ZVEDENNIA, { cps: 22 });
    mark('1-zapyt-hotovyi');
    await pause(500);

    const before1 = await send(page);
    mark('1-nadislano');
    const reply1 = await waitForAnswer(page, { before: before1 });
    transcript.push(['Зведення з посиланням на сторінку', reply1]);
    mark('1-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('1-prochytano');
    await shot('zvedennia-vidpovid');
    await hold();

    // ── Частина 2. Два файли одночасно — порівняння ───────────────────────
    console.log('Частина 2: два файли');
    mark('2-fail-1-pochatok');
    await uploadFile(page, mouse, STARE);
    mark('2-fail-1-dodano');
    await pause(400);
    await uploadFile(page, mouse, NOVE);
    mark('2-fail-2-dodano');
    await hold();
    await shot('dva-faily');
    await hold();

    await typeMultiline(page, PROMPT_PORIVNYATY, { cps: 22 });
    mark('2-zapyt-hotovyi');
    await pause(500);

    const before2 = await send(page);
    mark('2-nadislano');
    const reply2 = await waitForAnswer(page, { before: before2 });
    transcript.push(['Порівняння двох редакцій', reply2]);
    mark('2-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('2-prochytano');
    await shot('porivniannia-vidpovid');
    await hold();

    mark('3-final');
    await pause(400);
    await shot('final');
    await hold();
  },
});
