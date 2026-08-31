/**
 * Дубль уроку 3.6 — «Налаштування приватності».
 *
 * На відміну від інших уроків, тут немає ні Word, ні запиту до чату — це
 * навігація по РЕАЛЬНИХ налаштуваннях demo-акаунта:
 *
 *   1. вимикаємо «Зберігати історію дій» (myactivity.google.com/product/gemini,
 *      відкривається новою вкладкою з меню Gemini) — заразом видно рядок
 *      про строк автоматичного видалення (18 місяців), його не клацаємо;
 *   2. показуємо кнопку тимчасового чату на головній сторінці.
 *
 * Строк автоматичного видалення (друге з трьох налаштувань уроку) свідомо
 * НЕ клацаємо тут наживо: підсторінка myactivity.google.com під час зйомки
 * раз по раз показувала застряглий тост "Дані про ваші дії не видалено" з
 * попередньої спроби, який перехоплював клік по рядку строку зберігання —
 * відтворено сім разів поспіль різними способами (координатний клік,
 * рідний Playwright-клік, клавіатурна навігація, примусовий клік). Рядок
 * усе одно ВИДНО в кадрі — на скріншоті `istoriya-diy` — і кроку присвячено
 * окремий текстовий блок в уроці, без відео-демонстрації підменю.
 *
 * УВАГА: крок 1 змінює СПРАВЖНІ налаштування demo-акаунта, а не якийсь
 * тимчасовий стан — на відміну від чату, тут немає «безкоштовного» дубля.
 * `--dry` тут вимикає лише запис екрана (як завжди), сама дія все одно
 * відбудеться по-справжньому. Перед реальним дублем стартовий стан
 * («Зберігати історію дій» = Увімкнено) має бути відновлений вручну, якщо
 * до цього вже репетирували.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { clearStage } from '../lib/stage.mjs';
import { closeWord } from '../lib/word.mjs';
import { hold, pause, pointAndClick, sleep } from '../lib/human.mjs';
import { frontGemini, newChat } from '../lib/gemini.mjs';

const DRY = process.argv.includes('--dry');

/** Клікнути, якщо елемент є, — без падіння скрипта, якщо його немає. */
async function clickIfPresent(locator, timeout = 3000) {
  const count = await locator.count().catch(() => 0);
  if (!count) return false;
  try {
    await locator.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

/** Клік із кількома повторами замість `force` — див. пояснення вгорі файлу. */
async function robustClick(locator, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await locator.click({ timeout: 8000 });
      return;
    } catch (e) {
      lastErr = e;
      await pause(1000);
    }
  }
  throw lastErr;
}

await recordLesson('3-6', {
  dry: DRY,
  lessonTitle: 'Урок 3.6 — Налаштування приватності',

  async setup({ page }) {
    await closeWord().catch(() => {});
    await newChat(page);
    await clearStage();
    await frontGemini();
    await sleep(1200);
  },

  async script({ page, mark, shot }) {
    const context = page.context();

    // ── Крок 1. Вимикаємо «Зберігати історію дій» ────────────────────────
    console.log('Крок 1: вимикаємо навчання на даних');
    mark('1-gear-pochatok');
    const gear = page.locator('button[aria-label="Налаштування"]').first();
    await pointAndClick(page, gear);
    mark('1-meniu-vidkryto');
    await hold();
    await shot('meniu-nalashtuvan');

    const activityItem = page.getByText('Історія дій', { exact: true }).first();
    const [activityTab] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      pointAndClick(page, activityItem),
    ]);
    await activityTab.waitForLoadState('domcontentloaded');
    await activityTab.bringToFront();
    // Захист: якщо на цій вкладці лишилось відкрите вікно з попередньої
    // спроби, прибрати його ДО того, як воно почне перехоплювати кліки.
    await activityTab.keyboard.press('Escape').catch(() => {});
    await clickIfPresent(activityTab.getByText('OK', { exact: true }).first(), 1500);
    mark('1-activity-vidkryto');
    await pause(1500);
    await hold();
    await hold();
    // Тут у кадрі видно й рядок "Дії видаляються після 18 місяців
    // зберігання" — саме його стосується друге налаштування уроку.
    await shot('istoriya-diy');
    await hold();

    const toggle = activityTab.getByText('Увімкнено', { exact: true }).first();
    await robustClick(toggle);
    mark('1-toggle-vidkryto');
    await hold();
    await shot('dropdown-vidkryto');

    // Клавіатурою, не мишею: спливаюча підказка "Безпечніше з Google" внизу
    // сторінки раз по раз перехоплює клік по пункту меню — клавіші її не
    // зачіпають узагалі.
    await activityTab.keyboard.press('ArrowDown');
    await pause(300);
    await activityTab.keyboard.press('Enter');
    mark('1-vymknuto');
    await pause(1200);
    await shot('vymknuto');
    await hold();
    await hold();

    // Після вимкнення Google показує підтвердження окремим вікном.
    await clickIfPresent(activityTab.getByText('OK', { exact: true }).first());
    mark('1-pidtverdzheno');
    await pause(800);

    // ── Крок 2. Тимчасовий чат ────────────────────────────────────────────
    console.log('Крок 2: тимчасовий чат');
    mark('2-povernennia');
    await page.bringToFront();
    await pause(600);

    const tempChat = page.locator('button[aria-label="Тимчасовий чат"]').first();
    await pointAndClick(page, tempChat);
    mark('2-tymchasovyi-chat');
    await pause(600);
    await shot('tymchasovyi-chat');
    await hold();
    await hold();

    // ── Крок 3. Фінальний вигляд ─────────────────────────────────────────
    mark('3-final');
    await pause(400);
    await shot('final');
    await hold();
  },
});
