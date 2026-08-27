/**
 * Дубль уроку 2.2 — «Скорочення великого тексту».
 *
 * Шість кроків підряд, одним записом:
 *
 *   0. показуємо сам звіт — 34 сторінки, гортаємо, щоб було видно розмах;
 *   1. прикріплюємо документ через «+» → «Додати файли» (справжній діалог,
 *      клік по ярлику теки в «Швидкому доступі», а тоді по файлу);
 *   2. пишемо запит: зведення на одну сторінку, для керівника, зі сторінками;
 *   3. генерація зведення, дочитуємо його до кінця;
 *   4. застосовуємо вивід: копіюємо в порожній документ, приводимо шрифт
 *      до стандарту — це і є «скористатись відповіддю ШІ», а не просто
 *      подивитись на неї в чаті;
 *   5. перевірка: відкриваємо джерело на процитованій сторінці — цифра та сама.
 *
 * Перетягування з провідника в кадрі немає навмисно: синтетичні події миші не
 * запускають справжній OLE drag-and-drop Windows Explorer (перевірено окремим
 * дослідом, див. STANDARD.md §6). Той самий результат — і чесніше показаний —
 * дає кнопка «+» → «Додати файли», яку ми й знімаємо.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { join } from 'node:path';

import { ASSETS_DIR } from '../lib/paths.mjs';
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import {
  closeWord, formatWord, highlightInWord, newWordDoc, openInWord,
  pasteInWord, scrollToTop, scrollWord, trimLeadInWord, zoomWord,
} from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  copyAnswer, newChat, readAnswer, send, typeMultiline, uploadFile, waitForAnswer,
} from '../lib/gemini.mjs';
import { PROMPT } from './2-2.steps.mjs';

const REPORT = join(ASSETS_DIR, 'zvit-3-kvartal.docx');
const DRY = process.argv.includes('--dry');

await recordLesson('2-2', {
  dry: DRY,
  lessonTitle: 'Урок 2.2 — Скорочення великого тексту',

  async setup({ page }) {
    // Word закриваємо начисто — у ньому міг лишитись звіт із минулого дубля,
    // прокручений і підсвічений не там, де треба.
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await bringToFront('Gemini');
    await sleep(1200);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    // ── Крок 0. Сам звіт: наскільки він великий ───────────────────────────
    console.log('Крок 0: сам звіт');
    mark('0-zvit-pochatok');
    await openInWord(REPORT);
    await scrollToTop();
    await bringToFront('zvit-3-kvartal');
    await sleep(1000);
    await hold();

    await zoomWord(55); // менший масштаб — видно розмах, а не окремі рядки
    await pause(500);
    await scrollWord(2600, { steps: 16, ms: 220 }); // гортаємо всі 34 сторінки
    await pause(700);
    mark('0-zvit-progortano');
    await shot('zvit-rozmir');

    await zoomWord(100);
    await scrollToTop();
    await pause(400);
    mark('0-zvit-hotovo');
    await hold();
    await closeWord();
    // Виміряно дослідом: після Word.Quit() Chrome на кілька секунд зникає з
    // переліку Get-Process (щось на рівні Windows перебудовує список вікон),
    // хоча саме вікно нікуди не ділося. bringToFront сам повторює спроби.
    await bringToFront('Gemini');
    await sleep(800);

    // ── Крок 1. Прикріплюємо документ ──────────────────────────────────────
    console.log('Крок 1: прикріплюємо документ');
    mark('1-dodavannya-pochatok');
    await uploadFile(page, mouse, REPORT);
    mark('1-dodavannya-hotovo');
    await hold();
    await shot('dodano-fail');

    // ── Крок 2. Пишемо запит ───────────────────────────────────────────────
    console.log('Крок 2: запит');
    mark('2-zapyt');
    await typeMultiline(page, PROMPT, { cps: 20 });
    await hold();
    await shot('zapyt-hotovyi');

    // ── Крок 3. Генерація зведення ─────────────────────────────────────────
    console.log('Крок 3: генерація');
    mark('3-nadislano');
    await send(page);
    const summary = await waitForAnswer(page);
    transcript.push(['Зведення для керівника', summary]);
    mark('3-zvedennya-hotove');
    await hold();
    await readAnswer(page); // дочитуємо зведення до кінця
    mark('3-prochytano');
    await shot('zvedennia');

    // ── Крок 4. Застосовуємо вивід: копіюємо в документ ────────────────────
    // Відповідь ШІ лишається на екрані — не в роботі, поки не потрапить у
    // документ. Копіюємо кнопкою під відповіддю (так це робить людина),
    // вставляємо в порожній Word і одразу приводимо шрифт до стандарту:
    // з чату він приходить шрифтом сайту, і це видно неозброєним оком.
    console.log('Крок 4: застосовуємо зведення');
    mark('4-kopiiuvannia-pochatok');
    await copyAnswer(page);
    await pause(400);

    await newWordDoc();
    await bringToFront('Document'); // Word тут з англійським інтерфейсом — "Document1 - Word"
    await sleep(600);
    await pasteInWord();
    await pause(700);
    mark('4-vstavleno');
    await shot('vstavleno-syrym-shryftom');
    await hold();

    // ШІ майже завжди починає зайвого вступного речення — прибираємо його
    // так само, як зробила б людина: не читаючи, одним рухом.
    await trimLeadInWord();
    await pause(500);
    mark('4-prybrano-zayve');
    await shot('prybrano-zayve');

    await formatWord('Times New Roman', 12);
    await pause(500);
    mark('4-vidformatovano');
    await shot('vidformatovano');
    await hold();
    await closeWord();

    // ── Крок 5. Перевірка: та сама цифра в джерелі ─────────────────────────
    // Зведення цитує сторінку 4 — відкриваємо звіт саме на ній і звіряємо
    // «87 % запланованих заходів» оком, а не переказом.
    console.log('Крок 5: перевірка джерела');
    mark('5-vidkryttia-dzherela');
    await openInWord(REPORT);
    await scrollToTop();
    await bringToFront('zvit-3-kvartal');
    await sleep(1200);
    await hold();

    mark('5-poshuk');
    await highlightInWord('87 % запланованих заходів');
    await pause(1800);
    await shot('perevirka');
    await hold();
  },
});
