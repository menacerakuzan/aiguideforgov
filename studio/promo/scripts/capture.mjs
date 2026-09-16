/**
 * Знімає сторінки ПРО.ШІ як матеріал для промо-ролика.
 *
 * Це НЕ запис екрана. Промо будується не з відео інтерфейсу, а з нерухомих
 * знімків, по яких у монтажі возиться 2.5D-камера (`src/lib/PageCam.tsx`).
 * Через це в ролику немає ні повільних переходів localhost, ні випадкового
 * підвисання сторінки — рух авторський і повторюваний.
 *
 * Віддає три речі на кожен маршрут:
 *   1. `<ім'я>-full.png` — уся сторінка в 2x (текстура для камери);
 *   2. `<ім'я>-<елемент>.png` — окремі елементи з прозорим тлом (картки, що
 *      злітають у фіналі окремо від сторінки);
 *   3. `live-layout.json` — координати кожного елемента в системі координат
 *      сторінки, щоб анімація цілилась у справжню верстку, а не в підібрані
 *      на око числа.
 *
 * Чому playwright-core, а не puppeteer (як у шаблоні скіла): у `studio/`
 * playwright уже стоїть і вміє працювати з СИСТЕМНИМ Chrome. Puppeteer
 * притягнув би власний Chromium на сто з гаком мегабайтів заради того самого.
 *
 * Перед запуском:
 *   pnpm build && pnpm --filter @proai/web start    (продакшн, не dev:
 *                                                    у dev у кутку висить
 *                                                    значок Next.js)
 *   pnpm --filter @proai/db create-demo             (демо-слухачка з прогресом)
 *
 * Запуск: npm run capture   (із studio/promo)
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromeExe, env } from '../../lib/paths.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, '../public/textures');
const LAYOUT = path.resolve(HERE, '../src/live-layout.json');

const BASE = process.env.PROMO_BASE ?? 'http://localhost:3000';

/** 1920×1080 у 2x: текстура вдвічі більша за кадр, і текст під наїздом не сиплеться. */
const VIEWPORT = { width: 1920, height: 1080 };
const SCALE = 2;

/** Скільки чекати після завантаження — шрифти, клієнтські запити, анімації. */
const SETTLE_MS = 900;

/**
 * Усі «поверхні» платформи — це `ClayCard` із packages/ui, а він рендериться
 * як `div.clay*`. Прив'язуємось до цього класу, а не до утиліт Tailwind:
 * `clay` — частина матеріалу дизайн-системи й змінюється значно рідше за
 * розкладку. Оболонки `main` тут НЕ буває: layout застосунку
 * (apps/web/src/app/(app)/layout.tsx) загортає сторінку у звичайний div.
 */
const CLAY = '.clay, .clay-tint, .clay-blue, .clay-green, .clay-amber, .clay-red, .clay-sun, .clay-gold';

/*
 * Маршрути. `boxes` — координати, куди камера наводиться або куди щось
 * прилітає; `cutouts` — елементи, які в ролику літають окремо від сторінки;
 * `extra` — додаткові стани тієї самої сторінки (відкритий тест, обрана
 * відповідь).
 */

/** Картка з власним заголовком — так відсіюється навігаційна панель. */
const CLAY_CARD = '.clay:has(h2), .clay:has(h3), .clay-tint:has(h3), .clay-sun:has(h3), .clay-gold:has(h3)';

const PAGES = [
  {
    name: 'home',
    path: '/',
    boxes: [
      { key: 'hero', selector: 'header h1' },
      { key: 'svitlofor', selector: '#svitlofor' },
      { key: 'moduli', selector: '#moduli' },
    ],
    cutouts: [
      { name: 'tl-green', selector: '#svitlofor .clay-green' },
      { name: 'tl-amber', selector: '#svitlofor .clay-amber' },
      { name: 'tl-red', selector: '#svitlofor .clay-red' },
      { name: 'hero-card', selector: 'header .clay', all: true, max: 3 },
    ],
  },
  {
    name: 'dashboard',
    path: '/dashboard',
    waitMs: 1200, // дашборд добирає дані з API вже після рендера
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 12 }],
    cutouts: [{ name: 'card', selector: CLAY_CARD, all: true, max: 8 }],
  },
  {
    name: 'courses',
    path: '/courses',
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 8 }],
    cutouts: [{ name: 'course', selector: '.clay:has(h3)', all: true, max: 4 }],
    // Порожній планшет сторінки: картки ховаємо й знімаємо ще раз. Потрібен
    // для кадру, де три картки роздаються в сітку — вони мають прилітати НА
    // сторінку, а не проявлятися разом із нею.
    hideForEmptyPlate: '.clay:has(h3)',
  },
  {
    name: 'course',
    path: '/courses/shi-v-publichnii-sluzhbi',
    waitMs: 1200,
    boxes: [{ key: 'modules', selector: CLAY, all: true, max: 10 }],
    cutouts: [],
  },
  {
    // Урок 2.1 «Лист-відповідь на звернення» — найбагатший у курсі: відео,
    // блок-промпт із кнопкою «Копіювати», порівняння «до / після».
    name: 'lesson',
    path: '/lesson/cms30bu5j001ai5uad4d8m77i',
    waitMs: 1500,
    boxes: [
      { key: 'blocks', selector: CLAY, all: true, max: 14 },
      { key: 'video', selector: 'video' },
    ],
    cutouts: [],
  },
  {
    // Урок 3.2 «Класифікація інформації» — світлофор даних і сортувальник,
    // сигнатурна ідея платформи в живому вигляді.
    name: 'security',
    path: '/lesson/cms30bu5y001wi5uaf273tmb7',
    waitMs: 1500,
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 14 }],
    cutouts: [],
  },
  {
    // Тест модуля 4: він ще не складений, тому сторінка відкривається
    // стартовим екраном — питання з'являються лише після «Почати тест».
    name: 'quiz',
    path: '/quiz/osnovy-shi-4-promptynh',
    waitMs: 1500,
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 6 }],
    cutouts: [],
    extra: [
      {
        name: 'question',
        waitMs: 900,
        // Тільки відкриваємо тест. Відповідь НЕ надсилаємо: спроба записалась
        // би в базу й зіпсувала прогрес, який ми щойно склали.
        act: async (p) => {
          const btn = p.getByRole('button', { name: /Почати тест/i }).first();
          if (!(await btn.count())) return false;
          await btn.click();
          return true;
        },
      },
      {
        name: 'chosen',
        waitMs: 700,
        // Обираємо саме ПРАВИЛЬНУ відповідь, за текстом, а не за номером у
        // переліку кнопок: перший варіант скрипта клацав четверту кнопку на
        // сторінці й підсвічував хибний варіант — у промо це виглядало б як
        // помилка платформи. Текст питання прибитий сідом і не змінюється.
        act: async (p) => {
          const option = p.locator('button', { hasText: 'Роль, завдання, контекст' }).first();
          if (!(await option.count())) return false;
          await option.click();
          return true;
        },
      },
    ],
  },
  {
    // Тест модуля «Безпека»: саме тут видно прохідні 90 %.
    //
    // Питання беремо з ЦЬОГО ж модуля, а не з сусіднього. Перший монтаж
    // показував картку «12 питань, прохідний бал 90 %» від «Безпеки», а через
    // п'ять секунд — «ПИТАННЯ 1 З 10» від «Промптингу»: два різні числа підряд
    // читаються як помилка платформи, хоча кожне з них правильне.
    name: 'quizdone',
    path: '/quiz/osnovy-shi-3-bezpeka-ta-vidpovidalnist',
    waitMs: 1500,
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 6 }],
    cutouts: [{ name: 'gate', selector: '.clay', all: false }],
    extra: [
      {
        name: 'question',
        waitMs: 900,
        // Тест уже складено, тож це перескладання. У базу воно нічого не
        // пише: спроба записується лише при надсиланні, а ми не надсилаємо.
        act: async (p) => {
          const btn = p.getByRole('button', { name: /Почати тест/i }).first();
          if (!(await btn.count())) return false;
          await btn.click();
          return true;
        },
      },
      {
        name: 'chosen',
        waitMs: 700,
        // Варіант обираємо за номером у картці, а не за текстом: питання
        // «Безпеки» перегенеровуються сідом, і прив'язка до формулювання
        // зламалася б при першому ж оновленні тестів. Друга кнопка в списку
        // варіантів — правильна відповідь у сіді (див. prisma/src/content/quizzes.ts).
        act: async (p) => {
          const options = p.locator('.clay button, .clay-tint button');
          const count = await options.count();
          if (count < 2) return false;
          await options.nth(1).click();
          return true;
        },
      },
    ],
  },
  {
    name: 'library',
    path: '/library',
    waitMs: 1500,
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 14 }],
    cutouts: [{ name: 'prompt', selector: '.clay:has(h3)', all: true, max: 8 }],
  },
  {
    name: 'progress',
    path: '/progress',
    waitMs: 1200,
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 10 }],
    cutouts: [],
  },
  {
    name: 'certificates',
    path: '/certificates',
    waitMs: 1200,
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 6 }],
    cutouts: [],
  },
  {
    // Публічна перевірка сертифіката — сторінка відкрита, входу не потребує.
    name: 'verify',
    path: '/verify/PROAI-2026-4F19C7',
    waitMs: 1200,
    boxes: [{ key: 'cards', selector: CLAY, all: true, max: 6 }],
    cutouts: [],
  },
];

// Аргументи — імена сторінок: `npm run capture -- quiz verify` перезнімає
// тільки їх. Знімати всі одинадцять заради однієї виправленої дрібниці довго,
// а зайвий прохід ще й перезаписує решту без потреби.
const only = process.argv.slice(2);
const pages = only.length ? PAGES.filter((p) => only.includes(p.name)) : PAGES;
if (only.length && pages.length !== only.length) {
  const missing = only.filter((n) => !PAGES.some((p) => p.name === n));
  throw new Error(`Невідомі сторінки: ${missing.join(', ')}`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(LAYOUT), { recursive: true });

const browser = await chromium.launch({ executablePath: chromeExe() });
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
  locale: 'uk-UA',
  timezoneId: 'Europe/Kyiv',
  // Анімації появи на сайті зроблені на Motion, і він поважає системне
  // «менше руху»: елементи нижче згину одразу стоять у кінцевому стані.
  // Без цього половина сторінки знімалася б напівпрозорою.
  reducedMotion: 'reduce',
});

// Вітальний тур («Вітаємо в ПРО.ШІ!») показується всім, хто заходить уперше, і
// затуляє собою весь кабінет. Ставимо його прапорець ДО завантаження сторінки:
// закривати діалог клацанням довше й ненадійніше, ніж не показувати його зовсім.
await context.addInitScript(() => {
  try {
    localStorage.setItem('yasno-onboarded', '1');
  } catch {
    /* приватний режим — тур просто покажеться, побачимо це на знімку */
  }
});

const page = await context.newPage();

// ── вхід демо-слухачкою ─────────────────────────────────────────────────────
// Через API, а не через форму: форма — зайвий крок, який може зламатись на
// дрібниці верстки, а куки контексту й запиту в Playwright спільні.
const signIn = await context.request.post(`${BASE}/api/auth/sign-in/email`, {
  data: { email: env('DEMO_EMAIL'), password: env('DEMO_PASSWORD') },
});
if (!signIn.ok()) {
  throw new Error(`Вхід не вдався: ${signIn.status()} ${await signIn.text()}`);
}
console.log('увійшли як', env('DEMO_EMAIL'));

/**
 * Доводить сторінку до стану «все видно».
 *
 * Прокрутка донизу й назад потрібна навіть із reducedMotion: частина блоків
 * з'являється за IntersectionObserver, і без прокрутки вони лишаються порожніми.
 */
async function settle(waitMs = 0) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
  await page.waitForTimeout(SETTLE_MS + waitMs);
  // Курсор миші домальовується в монтажі, а не знімається — тож наведення
  // тут зайве: воно лишило б на знімку випадково підсвічену кнопку.
  await page.mouse.move(0, 0);
}

/** Координати елемента в системі координат УСІЄЇ сторінки, не вікна. */
const pageBox = (el) =>
  el.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height };
  });

// При частковому зніманні дочитуємо наявні координати: інакше файл із
// розмірами всіх сторінок звівся б до однієї щойно знятої.
const layout = fs.existsSync(LAYOUT)
  ? JSON.parse(fs.readFileSync(LAYOUT, 'utf8'))
  : {};
layout.pageW = VIEWPORT.width;
layout.scale = SCALE;

for (const pg of pages) {
  console.log(`\n── ${pg.name}  ${pg.path}`);
  await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle' });
  await settle(pg.waitMs ?? 0);

  const entry = { path: pg.path, pageH: await page.evaluate(() => document.documentElement.scrollHeight) };
  // Позначку про вирізану смугу (її ставить crop-bands.mjs) переносимо зі
  // старого запису. Без цього перезйомка однієї сторінки мовчки ламала збірку
  // монтажу, який на цю позначку спирається. Сам файл смуги все одно застарів —
  // про це нагадує рядок наприкінці.
  const previous = layout[pg.name];
  if (previous?.band) entry.band = previous.band;
  layout[pg.name] = entry;

  await page.screenshot({ path: `${OUT_DIR}/${pg.name}-full.png`, fullPage: true });
  console.log(`   ${pg.name}-full.png   висота сторінки ${entry.pageH}`);

  entry.boxes = {};
  for (const b of pg.boxes ?? []) {
    const els = await page.$$(b.selector);
    const picked = b.all ? els.slice(0, b.max ?? els.length) : els.slice(0, 1);
    const boxes = [];
    for (const el of picked) boxes.push(await pageBox(el));
    entry.boxes[b.key] = b.all ? boxes : (boxes[0] ?? null);
    if (boxes.length === 0) console.log(`   ⚠ boxes.${b.key}: нічого не збіглося (${b.selector})`);
    else console.log(`   boxes.${b.key}: ${boxes.length}`);
  }

  // Порожній планшет — ДО вирізок, поки тло сторінки ще на місці. Якщо зняти
  // його пізніше, він успадкує прозорість, увімкнену заради вирізок, і в кадрі
  // замість сторінки буде діра.
  if (pg.hideForEmptyPlate) {
    const hide = async (visibility) => {
      await page.evaluate(
        ({ sel, visibility: v }) => {
          document.querySelectorAll(sel).forEach((el) => {
            el.style.visibility = v;
          });
        },
        { sel: pg.hideForEmptyPlate, visibility },
      );
    };
    await hide('hidden');
    await page.screenshot({ path: `${OUT_DIR}/${pg.name}-empty.png`, fullPage: true });
    console.log(`   ${pg.name}-empty.png  (порожній планшет під роздачу карток)`);
    await hide('');
  }

  // Прозоре тло під вирізки. `omitBackground` сам по собі НЕ дає прозорості:
  // він прибирає тло браузера за замовчуванням, а не те, що малює сторінка.
  // Поки html і body мають свій колір, у кожної вирізки лишаються кремові кути
  // за межами округлення картки — на фірмовому тлі фіналу вони видно як рамку.
  if ((pg.cutouts ?? []).length > 0) {
    await page.addStyleTag({
      content: 'html,body{background:transparent !important;background-image:none !important}',
    });
  }

  entry.cutouts = [];
  for (const c of pg.cutouts ?? []) {
    const els = await page.$$(c.selector);
    const picked = c.all ? els.slice(0, c.max ?? els.length) : els.slice(0, 1);
    if (picked.length === 0) console.log(`   ⚠ вирізка ${c.name}: нічого не збіглося (${c.selector})`);

    for (let i = 0; i < picked.length; i += 1) {
      const file = c.all ? `${pg.name}-${c.name}${i + 1}.png` : `${pg.name}-${c.name}.png`;
      const bb = await pageBox(picked[i]);
      try {
        await picked[i].screenshot({ path: `${OUT_DIR}/${file}`, omitBackground: true });
      } catch (e) {
        console.log(`   ⚠ вирізка ${file} не знялась: ${e.message}`);
        continue;
      }
      entry.cutouts.push({ file, ...bb });
      console.log(`   ${file}  ${Math.round(bb.w)}×${Math.round(bb.h)} @ ${Math.round(bb.x)},${Math.round(bb.y)}`);
    }
  }

  // Додаткові стани тієї самої сторінки: відкритий тест, обрана відповідь.
  // Знімаються послідовно, кожен наступний — поверх попереднього стану.
  for (const step of pg.extra ?? []) {
    const did = await step.act(page);
    if (!did) {
      console.log(`   ⚠ крок ${step.name}: елемент не знайдено, пропускаємо`);
      continue;
    }
    await page.waitForTimeout(step.waitMs ?? 800);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${OUT_DIR}/${pg.name}-${step.name}.png`, fullPage: true });
    entry[`${step.name}PageH`] = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`   ${pg.name}-${step.name}.png   висота ${entry[`${step.name}PageH`]}`);
  }

}

fs.writeFileSync(LAYOUT, JSON.stringify(layout, null, 1), 'utf8');
console.log(`\nзаписано ${LAYOUT}`);

const stale = pages.filter((p) => layout[p.name]?.band).map((p) => p.name);
if (stale.length > 0) {
  console.log(`\n⚠ смуги застаріли — перерізати: npm run crop   (${stale.join(', ')})`);
}

await browser.close();
