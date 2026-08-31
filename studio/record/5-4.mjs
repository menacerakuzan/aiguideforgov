/**
 * Дубль уроку 5.4 — «Перевірка посилань на нормативні акти».
 *
 * Три пошуки поспіль на СПРАВЖНЬОМУ офіційному порталі zakon.rada.gov.ua
 * (нова вкладка того самого Chrome, не Gemini): вигаданий номер, реальна
 * нечинна постанова, і реальний чинний закон, у якому конкретна стаття —
 * не про те. Реквізити — реальні, перевірені заздалегідь (див. 5-4.steps.mjs).
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт (сам логін тут не
 *   потрібен, але Chrome має бути піднятий на CDP-порту)
 *   npm run check
 */
import { recordLesson } from '../lib/session.mjs';
import { clearStage } from '../lib/stage.mjs';
import { hold, pause, pointAndClick, scrollBy, typeText } from '../lib/human.mjs';
import { CURRENT_WRONG_CLAUSE, FAKE, REPEALED } from './5-4.steps.mjs';

const DRY = process.argv.includes('--dry');
// «Пошук за реквізитами» — саме той режим, який учить урок: за номером
// документа, не за назвою чи вільним текстом.
const FIND_URL = 'https://zakon.rada.gov.ua/laws/find/a?text=&textl=1&bool=and';

/**
 * Банер cookies з'являється на кожній новій вкладці й перекриває посилання
 * внизу списку результатів — реальний клік по посиланню під ним просто
 * влучає в банер і нічого не робить (перевірено дослідом). Тиснемо
 * «Погоджуюсь», якщо банер видно.
 */
async function dismissCookies(zpage) {
  const btn = zpage.getByRole('button', { name: /^погоджуюсь/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await pointAndClick(zpage, btn);
    await pause(300);
  }
}

async function openZakon(page) {
  const zpage = await page.context().newPage();
  await zpage.goto(FIND_URL, { waitUntil: 'domcontentloaded' });
  await zpage.waitForTimeout(1500);
  await dismissCookies(zpage);
  return zpage;
}

/**
 * Пошук за номером документа (і, за потреби, роком). Номер постанов КМУ в
 * реєстрі індексується БЕЗ суфікса «-п» — перевірено дослідом: якщо в
 * `opts.year` є значення, режим пошуку — «дорівнює» (номер повторюється в
 * інших відомствах того самого року), інакше — «починається».
 *
 * Поля на цьому сайті трапляються продубльовані (прихована копія й видима)
 * — усюди `.first()`. І після відправлення форми перевіряємо, що жовтий
 * рядок «Параметри пошуку» справді містить наш номер: без цього одного разу
 * форма мовчки лишила старий запит із попереднього пошуку.
 */
async function searchOnZakon(zpage, num, { year } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await zpage.goto(FIND_URL, { waitUntil: 'domcontentloaded' });
    await zpage.waitForTimeout(1000);
    await dismissCookies(zpage);

    if (year) {
      await zpage.locator('select[name="numl"]').first().selectOption({ label: 'дорівнює' });
      await zpage.locator('select[name="yer"]').first().selectOption({ label: String(year) });
    }

    const field = zpage.locator('#find-num').first();
    await field.click();
    await field.fill('');
    await typeText(zpage, num, { cps: 12 });
    await pause(300);
    const btn = zpage.getByRole('button', { name: /шукати/i }).first();
    await pointAndClick(zpage, btn);
    await zpage.waitForTimeout(2000);
    await dismissCookies(zpage);

    const params = await zpage.locator('body').innerText().catch(() => '');
    if (params.includes(num)) return;
    console.log(`Пошук «${num}» — параметри пошуку не підтвердились (спроба ${attempt}/3), пробуємо ще раз.`);
    await pause(500);
  }
  throw new Error(`Пошук «${num}» не вдався після 3 спроб.`);
}

/**
 * Відкрити сам документ зі списку результатів за впізнаваним фрагментом
 * тексту. Посилання результату відкриває документ у НОВІЙ вкладці (не в
 * тій самій сторінці) — перевірено дослідом: `zpage.url()` після кліку не
 * змінювався НІКОЛИ, хоча документ справді відкривався, просто в іншій
 * вкладці, поки скрипт далі дивився на стару. Тому тут ловимо подію
 * `page` на контексті браузера, а не порівнюємо URL, і повертаємо саме
 * НОВУ вкладку — виклик має підмінити нею свою змінну `zpage`.
 */
async function openResult(zpage, resultText) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await dismissCookies(zpage);
    const link = zpage.getByRole('link', { name: new RegExp(resultText.slice(0, 30)) }).first();

    // Потрібний результат часто нижче за видиму частину списку (перевірено
    // дослідом — `pointAndClick` клацає за екранними координатами
    // `boundingBox()`, а без прокрутки елемент лишається за межами того,
    // що справді намальовано). Гортаємо плавно до нього, як і всюди тут.
    const box = await link.boundingBox().catch(() => null);
    if (box && (box.y < 0 || box.y > 700)) {
      await scrollBy(zpage, box.y - 260, { steps: 20, ms: 20 });
      await pause(300);
    }

    const [newPage] = await Promise.all([
      zpage.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
      pointAndClick(zpage, link),
    ]);
    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded').catch(() => {});
      await newPage.waitForTimeout(1200);
      return newPage;
    }

    await zpage.waitForTimeout(1200);
    console.log(`Клік по результату «${resultText.slice(0, 30)}…» не відкрив нову вкладку (спроба ${attempt}/3).`);
    await dismissCookies(zpage);
    await pause(500);
  }
  throw new Error(`Не вдалось відкрити результат «${resultText}» після 3 спроб.`);
}

await recordLesson('5-4', {
  dry: DRY,
  lessonTitle: 'Урок 5.4 — Перевірка посилань на нормативні акти',

  async setup() {
    await clearStage();
  },

  async script({ page, mark, shot }) {
    let zpage = await openZakon(page);
    await zpage.bringToFront();
    await pause(500);

    // ── Пошук 1. Вигаданий номер — документа немає ────────────────────────
    console.log('Пошук 1: вигаданий номер');
    mark('1-pochatok');
    await searchOnZakon(zpage, FAKE.num);
    mark('1-rezultat');
    await hold();
    await shot('ne-znaideno');
    await hold();

    // ── Пошук 2. Реальна нечинна постанова ────────────────────────────────
    console.log('Пошук 2: нечинна редакція');
    mark('2-pochatok');
    await searchOnZakon(zpage, REPEALED.num, { year: REPEALED.year });
    mark('2-spysok');
    await hold();
    const resultsTab1 = zpage;
    zpage = await openResult(zpage, REPEALED.resultText);
    await zpage.bringToFront();
    if (zpage !== resultsTab1) await resultsTab1.close().catch(() => {});
    mark('2-rezultat');
    await hold();
    await shot('vtratyv-chynnist');
    await hold();
    await hold();

    // ── Пошук 3. Реальний чинний закон, стаття про інше ───────────────────
    console.log('Пошук 3: чинний закон, стаття не про те');
    mark('3-pochatok');
    await searchOnZakon(zpage, CURRENT_WRONG_CLAUSE.num);
    mark('3-znaideno');
    await hold();
    const resultsTab2 = zpage;
    zpage = await openResult(zpage, CURRENT_WRONG_CLAUSE.resultText);
    await zpage.bringToFront();
    if (zpage !== resultsTab2) await resultsTab2.close().catch(() => {});
    mark('3-dokument');
    await shot('zakon-chynnyi');

    await dismissCookies(zpage);
    // Той самий текст на цій сторінці трапляється ДВІЧІ (перевірено
    // дослідом — `getByText` дає count=2): один запис справжній, другий —
    // прихована копія (той самий клас багів, що й дубльовані поля пошуку).
    // `.first()` не гарантує видиму копію, тому шукаємо серед усіх
    // збігів саме видиму. Гортаємо ПЛАВНО невеликими кроками, після
    // КОЖНОГО перевіряючи, чи вона вже у видимій області.
    const matches = zpage.getByText(CURRENT_WRONG_CLAUSE.article, { exact: false });
    const matchCount = await matches.count().catch(() => 0);
    let found = false;
    for (let i = 0; i < 12 && !found; i++) {
      for (let j = 0; j < matchCount; j++) {
        const el = matches.nth(j);
        if (!(await el.isVisible().catch(() => false))) continue;
        const box = await el.boundingBox().catch(() => null);
        if (box && box.y >= 0 && box.y <= 700) { found = true; break; }
      }
      if (found) break;
      await scrollBy(zpage, 300, { steps: 10, ms: 20 });
      await pause(150);
    }
    if (!found) {
      console.log('Стаття не потрапила у видиму область за 12 кроків прокрутки.');
    }
    await pause(400);
    mark('3-stattya');
    await hold();
    await shot('stattya-ne-pro-te');
    await hold();

    mark('4-final');
    await pause(400);
    await shot('final');
    await hold();

    await zpage.close();
  },
});
