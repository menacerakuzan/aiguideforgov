/**
 * Дубль уроку 2.8 — «Пояснити складне простою мовою».
 *
 * Чотири кроки підряд, одним записом:
 *
 *   1. просимо пояснити норму просто — для громадянина без юридичної освіти;
 *   2. застосовуємо: пояснення йде в лист, а під ним — сама норма. Просте
 *      пояснення доповнює її, а не замінює;
 *   3. тим самим чатом просимо інший варіант — для телефонної розмови,
 *      30 секунд. Той самий зміст, інший адресат;
 *   4. фінальний вигляд.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import {
  changeWordFontVisibly, cleanupPastedWord, closeWord, newWordDoc, pasteInWord, scrollToBottom,
} from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  copyAnswer, frontGemini, newChat, readAnswer, send, typeMultiline, waitForAnswer,
} from '../lib/gemini.mjs';
import { NORM, PROMPT_EXPLAIN, PROMPT_PHONE } from './2-8.steps.mjs';

const DRY = process.argv.includes('--dry');

await recordLesson('2-8', {
  dry: DRY,
  lessonTitle: 'Урок 2.8 — Пояснити складне простою мовою',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await frontGemini();
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Просимо пояснити норму просто ──────────────────────────
    console.log('Крок 1: запит на просте пояснення');
    mark('1-zapyt-pochatok');
    await typeMultiline(page, PROMPT_EXPLAIN, { cps: 20 });
    mark('1-zapyt-hotovyi');
    await hold();
    await shot('zapyt-hotovyi');

    mark('1-nadislano');
    await send(page);
    const explanation = await waitForAnswer(page);
    transcript.push(['Просте пояснення', explanation]);
    mark('1-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('1-prochytano');
    await shot('poiasnennia');

    mark('1-kopiiuvannia');
    await copyAnswer(page);
    await pause(400);

    // ── Крок 2. Застосовуємо: пояснення й норма поруч ──────────────────
    console.log('Крок 2: пояснення й норма в одному листі');
    mark('2-dokument-pochatok');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(600);

    await mouse.type('ПОЯСНЕННЯ ДЛЯ ГРОМАДЯНИНА\n', { cps: 18 });
    await pasteInWord();
    await pause(700);
    mark('2-vstavleno');
    await shot('vstavleno-syrym');
    await hold();
    await hold();

    await cleanupPastedWord();
    await pause(300);
    mark('2-shrift-pochatok');
    await changeWordFontVisibly(mouse, { name: 'Times New Roman', size: 12 });
    await pause(400);
    mark('2-vidformatovano');
    await shot('vidformatovano');
    await hold();
    await hold();

    // Просте пояснення доповнює норму, а не замінює її — дописуємо саму
    // норму нижче, тим самим шрифтом.
    //
    // 'format' (усередині changeWordFontVisibly) завершується HomeKey —
    // повертає курсор на початок документа. Без явного повернення в кінець
    // норма вписалась би поперед пояснення, а не після нього.
    await scrollToBottom();
    await pause(300);
    mark('2-norma-pochatok');
    await mouse.type('\n\nВідповідно до норми:\n', { cps: 16 });
    await mouse.type(NORM.replace(/\n/g, ' '), { cps: 16 });
    await pause(600);
    mark('2-norma-hotova');
    await shot('norma-dodana');
    await hold();
    await hold();

    // ── Крок 3. Інший адресат — тим самим чатом ─────────────────────────
    console.log('Крок 3: варіант для телефонної розмови');
    mark('3-povernennia');
    await frontGemini();
    await sleep(600);
    mark('3-zapyt2-pochatok');
    await typeMultiline(page, PROMPT_PHONE, { cps: 20 });
    mark('3-zapyt2-hotovyi');
    await hold();

    mark('3-nadislano2');
    const before2 = await send(page);
    const phone = await waitForAnswer(page, { before: before2 });
    transcript.push(['Варіант для телефону', phone]);
    mark('3-vidpovid2-hotova');
    await hold();
    await readAnswer(page);
    mark('3-prochytano2');
    await shot('dlya-telefonu');
    await hold();

    // ── Крок 4. Фінальний вигляд ─────────────────────────────────────────
    mark('4-final');
    await shot('final');
    await hold();
    await closeWord();
  },
});
