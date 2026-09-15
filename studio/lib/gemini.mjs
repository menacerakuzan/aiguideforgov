/**
 * Дії в Gemini — одним місцем на всі уроки.
 *
 * Селектори живуть тут і тільки тут: інтерфейс міняється, і коли він зміниться,
 * правити доведеться один файл, а не дев'ять сценаріїв зйомки.
 *
 * Перевірено на українському інтерфейсі 2026-08-20.
 */
import { basename, dirname, extname } from 'node:path';

import { chromium } from 'playwright-core';

import { CDP_PORT, cdpAlive } from './chrome.mjs';
import { beat, focusEnd, hold, pause, pointAndClick, sleep, typeText } from './human.mjs';
import { elementOnScreen } from './mouse.mjs';
import { bringChromeToFront } from './stage.mjs';

export const S = {
  editor: 'rich-textarea .ql-editor',
  send: 'button[aria-label="Надіслати повідомлення"]',
  attach: 'button[aria-label="Додавання файлів і інструменти"]',
  // data-test-id, а не aria-label: під тим самим підписом у DOM є ще одна
  // прихована копія в згорнутій бічній панелі, і клац по ній нічого не робить.
  newChat: '[data-test-id="new-chat-button"] a',
  answer: 'model-response',
  /** Мікрофон у композері — лише щоб показати, де він, без реального диктування. */
  dictate: 'button[aria-label^="Диктувати"]',
  /** Кнопки під відповіддю з'являються, коли на неї наводять курсор. */
  copy: 'button[aria-label="Копіювати"]',
};

/**
 * Вивести вікно демо-Chrome наперед — за PID процесу на CDP-порту, не за
 * заголовком.
 *
 * Заголовок ненадійний навіть коли він "повний, унікальний": одразу після
 * `newChat()`, до першого повідомлення, заголовок сторінки ще загальний
 * ("Gemini") — а якщо на столі одночасно відкритий особистий акаунт Gemini
 * користувача (теж "Gemini" в заголовку), пошук за підрядком на рівні ОС
 * бере перше-ліпше вікно з таким заголовком і може вивести наперед чуже —
 * сталося на репетиції уроку 2.9 (2026-08-26): фізичні кліки миші й
 * набраний текст пішли б у чуже вікно. PID процесу на CDP-порту завжди
 * однозначний — саме той Chrome, до якого підключений Playwright.
 */
export async function frontGemini() {
  return bringChromeToFront();
}

/** Під'єднатись до вже відкритого браузера (у ньому людина входила руками). */
export async function connect() {
  if (!(await cdpAlive())) {
    throw new Error(`Chrome на порту ${CDP_PORT} не відповідає. Спершу: node lib/chrome.mjs`);
  }
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.newPage());
  return { browser, page };
}

/**
 * Свіже завантаження застосунку — перед дублем, поза кадром.
 *
 * Після кількох автоматичних прогонів сторінка перестає помічати введений
 * текст: символи в полі є, а кнопки «Надіслати» немає, бо застосунок вважає
 * поле порожнім. Перезавантаження це знімає, і дубль починається з чистого
 * стану, а не з наслідків попередніх спроб.
 */
export async function freshApp(page) {
  await page.goto('https://gemini.google.com/app');
  await page.locator(S.editor).waitFor({ state: 'visible', timeout: 60000 });
  await pause(2500);
}

/** Нова задача — новий чат. Саме цього вчить крок 1 уроку 2.1. */
export async function newChat(page) {
  const btn = page.locator(S.newChat).first();
  if (await btn.count()) {
    await pointAndClick(page, btn);
  } else {
    await page.goto('https://gemini.google.com/app');
  }
  await page.locator(S.editor).waitFor({ state: 'visible', timeout: 30000 });
  await hold();
}

/** Набрати запит у людському темпі. */
export async function typePrompt(page, text, opts = {}) {
  await focusEnd(page, page.locator(S.editor));
  await typeText(page, text, opts);
}

/**
 * Вставити довгий текст так, як це робить людина: Ctrl+V.
 *
 * Набирати сорок рядків звернення посимвольно — це чотири хвилини кадру, яких
 * урок не витримає. Та й насправді ніхто не набирає: копіюють і вставляють.
 */
export async function pasteInto(page, text) {
  await focusEnd(page, page.locator(S.editor));
  // insertText, а не буфер обміну: вставка через clipboard упирається в дозволи
  // сторінки, а виглядає точно так само — текст з'являється миттєво.
  await page.keyboard.insertText(text);
  await beat();
}

/**
 * Справжня вставка з буфера — для дубля, де перед цим у кадрі копіювали текст
 * із Word. Тут важливо, що це той самий Ctrl+V, який натискає людина.
 */
export async function pressPaste(page) {
  await focusEnd(page, page.locator(S.editor));
  await page.keyboard.press('Control+V');
  await beat();
}

/**
 * Багаторядковий текст у полі чату.
 *
 * Enter у Gemini відправляє повідомлення, тому переведення рядка — це
 * Shift+Enter. Якби typeText набирав символ переведення рядка як звичайний,
 * запит поїхав би недописаним після першого ж рядка.
 */
export async function typeMultiline(page, text, { cps = 18 } = {}) {
  await focusEnd(page, page.locator(S.editor));

  const lines = text.split('\n');
  for (const [i, line] of lines.entries()) {
    if (i) await page.keyboard.press('Shift+Enter');
    if (line) await typeText(page, line, { cps });
  }
}

/** Копіювати відповідь її ж кнопкою — так це робить людина. */
export async function copyAnswer(page) {
  const blocks = page.locator(S.answer);
  const last = blocks.nth((await blocks.count()) - 1);
  await last.hover();
  await pause(700);
  await pointAndClick(page, last.locator(S.copy).first());
  await beat();
}

/**
 * Додати файл через кнопку «+» → «Додати файли».
 *
 * Не перетягування з провідника: справжній OLE drag-and-drop між вікнами
 * синтетичні події миші не запускають — Explorer ініціює перетягування
 * інакше, ніж клацання. Перевірено окремим дослідом: та сама дія рукою
 * працює, автоматизована — ні. Це обмеження платформи, не наш баг.
 *
 * Клацання — справжньою системною мишею (`mouse`), не синтетичним
 * `page.mouse`: на живій сторінці клац CDP іноді не відкривав меню взагалі.
 *
 * Діалог «Відкрити» тут СПРАВЖНІЙ і видимий у кадрі — навмисно без
 * `page.waitForEvent('filechooser')`. Перехоплення діалогу до появи додало б
 * файл миттєво й непомітно, а мета відео — показати кожен крок. Діалог є
 * дочірнім вікном chrome.exe й власного запису серед процесів не має, тому
 * шукається за класом Windows `#32770`.
 *
 * Шлях НЕ набирається текстом: перевірено дослідом — клавіші одразу після
 * зміни фокуса гублять перші символи («C:\Users\...» приходило як
 * «:\Users\...»). Клікаємо по ярлику теки в «Швидкому доступі», а тоді по
 * самому файлу — і надійніше, і чесніше: живі люди шляхи руками не набирають.
 *
 * Тека з матеріалами (`studio/assets`) має бути закріплена в «Швидкому
 * доступі» заздалегідь — разова ручна дія в Провіднику.
 */
export async function uploadFile(page, mouse, filePath) {
  const clickAt = async ({ x, y }, { ms = 500 } = {}) => {
    await mouse.glide(x, y, { ms });
    await pause(250);
    await mouse.click();
  };
  const clickEl = async (locator, opts) => clickAt(await elementOnScreen(page, locator, opts));

  // Клац по кнопці «Додавання файлів» не завжди відкриває меню з першого
  // разу (перевірено дослідом — реальний дубль уроку 4.4 впав тут із
  // 30-секундним таймаутом). Замість одного довгого очікування — кілька
  // спроб клацнути кнопку заново, кожна з коротким очікуванням меню.
  const menuItem = page.locator('[role="menuitem"][aria-label*="Додати файли"]').first();
  let opened = false;
  for (let attempt = 1; attempt <= 3 && !opened; attempt++) {
    await clickEl(page.locator(S.attach));
    await pause(500);
    try {
      await elementOnScreen(page, menuItem, { timeout: 5000 });
      opened = true;
    } catch {
      console.log(`Меню «Додати файли» не з'явилось (спроба ${attempt}/3) — пробуємо ще раз.`);
      await pause(400);
    }
  }
  if (!opened) throw new Error('Меню «Додавання файлів» не відкрилось після 3 спроб.');
  await clickEl(menuItem);

  // Діалог тут СПРАВЖНІЙ і видимий у кадрі — навмисно без
  // page.waitForEvent('filechooser'): перехоплення додало б файл миттєво й
  // непомітно, а глядач має побачити кожен крок.
  await mouse.front({ class_name: '#32770', title: 'Open', timeout: 12 });
  await pause(700);

  const folder = basename(dirname(filePath));
  await clickAt(await mouse.dialogFind(folder), { ms: 700 });
  await pause(900); // вміст теки промальовується не миттєво

  const stem = basename(filePath, extname(filePath));
  const file = await mouse.dialogFind(stem);
  await clickAt(file, { ms: 600 });
  await pause(400);
  await mouse.doubleClick(); // відкриває файл і закриває діалог
  await pause(1500); // мініатюра файлу з'являється із затримкою
}

/**
 * Надіслати запит.
 *
 * Перед натисканням «будимо» поле справжнім натисканням клавіші. Після вставки
 * з буфера Gemini іноді вважає поле порожнім і взагалі не показує кнопку
 * «Надіслати» — текст у полі є, а надіслати його нічим. Пробіл і Backspace
 * повертають застосунок до тями й на екрані непомітні.
 *
 * Якщо кнопки все одно немає — надсилаємо Enter. Так це робить і людина.
 */
export async function send(page) {
  // Скільки відповідей уже є в чаті ДО цього повідомлення. Повертаємо —
  // `waitForAnswer` має знати, з якого блока починати чекати: інакше на
  // повторний запит у тому самому чаті він ловить стабільний текст
  // ПОПЕРЕДНЬОЇ, уже завершеної відповіді, і повертається миттєво з чужим
  // текстом (перевірено дослідом на уроці 2.8 — другий запит повернув
  // дослівно перший, а справжня друга відповідь так і не встигла
  // домалюватись до кінця дубля).
  const before = await page.locator(S.answer).count();

  await page.keyboard.type(' ');
  await page.keyboard.press('Backspace');
  await pause(600);

  const btn = page.locator(S.send);
  try {
    await btn.waitFor({ state: 'visible', timeout: 8000 });
    await pointAndClick(page, btn);
  } catch {
    await page.keyboard.press('Enter');
  }

  // Курсор відводимо від кнопки: інакше Gemini показує підказку «Диктувати»,
  // і вона висить у кадрі всю генерацію.
  await page.mouse.move(1500, 300, { steps: 12 });
  await beat();
  return before;
}

/**
 * Дочекатись, поки відповідь допишеться.
 *
 * Ознаки «готово» в інтерфейсі ненадійні — кнопки міняються місцями між
 * версіями. Тому дивимось на сам текст: коли він перестав рости на дві з
 * половиною секунди, генерація закінчилась.
 *
 * `minLength` — запобіжник для запитів із файлом. Розбираючи PDF чи аудіо,
 * Gemini спершу малює в блоці відповіді проміжний стан («Аналіз») і завмирає
 * на ньому на кілька секунд, поки читає документ. Для перевірки «текст не
 * росте» це виглядає точнісінько як завершена відповідь — і на пробі
 * 2026-09-04 функція повернула рядок «Аналіз» замість зведення на 48
 * сторінок. Мінімальна довжина відсікає такі заглушки: справжня відповідь
 * помічника ніколи не буває на два десятки символів.
 *
 * Типове значення — 0: для запитів без файлу проміжного стану не буває, і
 * поведінка решти уроків не змінюється.
 */
export async function waitForAnswer(page, { timeout = 180000, quiet = 2500, before = 0, minLength = 0 } = {}) {
  const started = Date.now();

  // Спершу дочекатись НОВОГО блока відповіді. Без цього кроку стабільність
  // тексту перевіряється на тому, що вже є в DOM просто зараз, — а на
  // повторний запит там ще лежить стара, вже стабільна відповідь.
  while (Date.now() - started < timeout) {
    if ((await page.locator(S.answer).count()) > before) break;
    await sleep(300);
  }

  let last = '';
  let stableSince = 0;

  while (Date.now() - started < timeout) {
    const blocks = page.locator(S.answer);
    const n = await blocks.count();
    const text = n > before ? await blocks.nth(n - 1).innerText().catch(() => '') : '';

    if (text && text.length >= minLength && text === last) {
      if (!stableSince) stableSince = Date.now();
      if (Date.now() - stableSince >= quiet) return text;
    } else {
      last = text;
      stableSince = 0;
    }
    await sleep(400);
  }
  throw new Error('Відповідь не завершилась за відведений час.');
}

/**
 * Прогорнути відповідь до кінця.
 *
 * Gemini не тягне чат донизу, поки друкує: після надсилання кадр лишається
 * там, де був, а відповідь росте нижче за екран. Тому нікуди не піднімаємось —
 * просто ведемо сторінку вниз у темпі читання.
 *
 * Скільки кроків, рахуємо з висоти самої відповіді: у кожному дублі вона інша.
 * Позицію прокрутки не опитуємо — у Gemini прокручується вкладений контейнер,
 * і `document.scrollingElement.scrollTop` завжди нуль. Саме на цьому попередня
 * версія й спинялася після першого кроку.
 */
export async function readAnswer(page, { step = 150, ms = 240 } = {}) {
  const blocks = page.locator(S.answer);
  const n = await blocks.count();
  if (!n) return;

  const height = await blocks.nth(n - 1).evaluate((el) => el.getBoundingClientRect().height);
  const steps = Math.min(40, Math.ceil(height / step) + 2);

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step);
    await sleep(ms);
  }
  await hold();
}

/**
 * Дочекатись, поки вставка з буфера справді доїде в поле.
 *
 * Ctrl+V рівня системи не миттєвий: браузер отримує подію, Quill перебудовує
 * вміст — на це йде до секунди. Якщо перевірити результат одразу, здається, що
 * вставка не спрацювала. Саме через це страхувальний `insertText` вписував
 * текст удруге, і в кадрі він мигав: з'явився, зник, з'явився знову.
 *
 * Повертає true, якщо вставка дійсно сталася.
 */
export async function waitForPaste(page, minLength, { timeout = 6000 } = {}) {
  try {
    await page.waitForFunction(
      ({ sel, n }) => (document.querySelector(sel)?.innerText.length ?? 0) > n,
      { sel: S.editor, n: minLength },
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

/** Текст останньої відповіді — для звірки з тим, що написано в уроці. */
export async function lastAnswer(page) {
  const blocks = page.locator(S.answer);
  const n = await blocks.count();
  return n ? blocks.nth(n - 1).innerText() : '';
}

/** Один крок діалогу: набрати → надіслати → дочекатись. */
export async function ask(page, text, opts = {}) {
  if (opts.paste) await pasteInto(page, text);
  else await typePrompt(page, text, opts);
  await beat();
  await send(page);
  return waitForAnswer(page, opts);
}
