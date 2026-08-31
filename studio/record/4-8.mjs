/**
 * Дубль уроку 4.8 — «Голос і фото замість набору».
 *
 * Курсор доїжджає до значка мікрофона в композері (показуємо, ДЕ він) —
 * БЕЗ кліку: реальне диктування без віртуального аудіопристрою чесно не
 * зняти, а вмикати живий мікрофон без нагляду (сесія лишена на ніч) — це
 * реальний ризик приватності, той самий клас, що й випадкові скріншоти
 * чужих вікон (див. [[video-recording-desktop-safety]]), тільки гірше:
 * мікрофон пише звук із кімнати, а не кадр екрана. Замість цього одразу
 * друкуємо текст, який реально видало б розпізнавання, — сценарій і
 * так чесно позначений голосом диктора як ілюстрація результату, не
 * наживо записане мовлення.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { clearStage } from '../lib/stage.mjs';
import { hold, pause } from '../lib/human.mjs';
import { S, frontGemini, newChat, readAnswer, send, typeMultiline, waitForAnswer } from '../lib/gemini.mjs';
import { DICTATION_TEXT } from './4-8.steps.mjs';

const DRY = process.argv.includes('--dry');

/** Підвести курсор до елемента — БЕЗ кліку. Лише показати, де він. */
async function pointAt(page, locator, { settle = 900 } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Елемент не видно на екрані — показати нема що.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 });
  await pause(settle);
}

await recordLesson('4-8', {
  dry: DRY,
  lessonTitle: 'Урок 4.8 — Голос і фото замість набору',

  async setup({ page }) {
    // Закрити будь-які СТРАЙ-вкладки (з попередніх уроків/діагностики) в
    // тому самому Chrome і вивести саме вкладку Gemini на передній план УСЕРЕДИНІ
    // вікна — `frontGemini()` виводить наперед лише саме ВІКНО Chrome (за PID),
    // а яка вкладка активна всередині нього, це не змінює. Якщо стороння
    // вкладка лишилась активною (типово після діагностики попереднього
    // уроку), знімок і сам дубль показують ЇЇ, а не Gemini — перевірено
    // дослідом на репетиції 4.8.
    for (const p of page.context().pages()) {
      if (p !== page) await p.close().catch(() => {});
    }
    await page.bringToFront();
    await newChat(page);
    await clearStage();
    await frontGemini();
    await pause(1200);
  },

  async script({ page, mark, shot, transcript }) {
    // ── Де мікрофон ────────────────────────────────────────────────────────
    console.log('Показуємо значок мікрофона (без кліку)');
    mark('1-mikrofon-pochatok');
    const dictateBtn = page.locator(S.dictate).first();
    await pointAt(page, dictateBtn);
    mark('1-mikrofon-pokazano');
    await hold();
    await hold();

    // ── Диктант — сумбурний текст, як його видало б розпізнавання ──────────
    console.log('Друкуємо текст диктанту');
    mark('2-dyktant-pochatok');
    await typeMultiline(page, DICTATION_TEXT, { cps: 22 });
    mark('2-dyktant-nadrukovano');
    await hold();
    await hold();
    await shot('dyktant');

    // ── Надсилаємо й чекаємо чернетку ───────────────────────────────────────
    console.log('Надсилаємо');
    await pause(400);
    const before = await send(page);
    mark('3-nadislano');
    const reply = await waitForAnswer(page, { before });
    transcript.push([DICTATION_TEXT, reply]);
    mark('3-vidpovid');
    await readAnswer(page);
    await shot('chernetka');
    await hold();
    await hold();
  },
});
