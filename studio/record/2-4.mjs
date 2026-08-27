/**
 * Дубль уроку 2.4 — «Вичитка й редагування».
 *
 * П'ять кроків підряд, одним записом:
 *
 *   1. показуємо саму чернетку листа — з дефектами, які нижче й ловитимемо;
 *   2. копіюємо лист із Word і вставляємо в чат разом із запитом на
 *      потрійну перевірку (орфографія → канцелярит → логіка);
 *   3. генерація переліку правок, дочитуємо до кінця;
 *   4. застосовуємо: повертаємось до чернетки й вносимо дві конкретні
 *      правки самі, рукою — так, як показує головний прийом уроку
 *      («приймаєте кожну свідомо», а не мовчки переписуєте);
 *   5. фінальний вигляд листа — обидві правки на місці.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { join } from 'node:path';

import { ASSETS_DIR } from '../lib/paths.mjs';
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage, pressEscape } from '../lib/stage.mjs';
import {
  closeWord, copyAllInWord, openInWord, reselectInWord, scrollToTop,
} from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  newChat, pressPaste, readAnswer, send, typeMultiline, waitForAnswer,
} from '../lib/gemini.mjs';
import { AFTER_PASTE, BEFORE_PASTE } from './2-4.steps.mjs';

const LETTER = join(ASSETS_DIR, 'lyst-chernetka.docx');
const DRY = process.argv.includes('--dry');

await recordLesson('2-4', {
  dry: DRY,
  lessonTitle: 'Урок 2.4 — Вичитка й редагування',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await bringToFront('Gemini');
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 1. Сама чернетка ───────────────────────────────────────────
    console.log('Крок 1: чернетка');
    mark('1-chernetka-pochatok');
    await openInWord(LETTER);
    await scrollToTop();
    await bringToFront('lyst-chernetka');
    await sleep(1000);
    mark('1-chernetka-hotova');
    await shot('chernetka');
    await hold();

    // ── Крок 2. Копіюємо лист і формулюємо запит ───────────────────────
    console.log('Крок 2: копіюємо й пишемо запит');
    mark('2-kopiiuvannia');
    await copyAllInWord();
    await pause(400);

    await bringToFront('Gemini');
    await sleep(600);
    await typeMultiline(page, BEFORE_PASTE, { cps: 22 });
    mark('2-vstavka');
    await pressPaste(page);
    await pause(500);
    await typeMultiline(page, AFTER_PASTE, { cps: 22 });
    mark('2-zapyt-hotovyi');
    await hold();
    await shot('zapyt-hotovyi');

    // ── Крок 3. Генерація переліку правок ──────────────────────────────
    console.log('Крок 3: генерація');
    mark('3-nadislano');
    await send(page);
    const answer = await waitForAnswer(page);
    transcript.push(['Перелік правок', answer]);
    mark('3-vidpovid-hotova');
    await hold();
    await readAnswer(page);
    mark('3-prochytano');
    await shot('pravky');

    // ── Крок 4. Застосовуємо: вносимо дві правки самі ──────────────────
    // Не мовчки переписуємо — приймаємо кожну правку рукою, дивлячись
    // на перелік. Тут дві: виправлена помилка й узгоджений строк.
    console.log('Крок 4: вносимо правки в чернетку');
    mark('4-povernennia-pochatok');
    await bringToFront('lyst-chernetka');
    await sleep(600);
    await hold();

    mark('4-pravka-1');
    await reselectInWord('Очікуванний', 'Очікуванний');
    await pause(400);
    await pressEscape();
    await mouse.type('Очікуваний', { cps: 12 });
    await pause(600);
    await shot('pravka-1');

    mark('4-pravka-2');
    await reselectInWord('місяця', 'місяця');
    await pause(400);
    await pressEscape();
    await mouse.type("п'яти робочих днів", { cps: 12 });
    await pause(600);
    await shot('pravka-2');
    mark('4-pravky-hotovi');
    await hold();

    // ── Крок 5. Готовий лист ────────────────────────────────────────────
    console.log('Крок 5: готовий лист');
    mark('5-final-pochatok');
    await scrollToTop();
    await pause(800);
    mark('5-final');
    await shot('final');
    await hold();
    await closeWord();
  },
});
