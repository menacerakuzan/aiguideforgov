/**
 * Дії в Gemini — одним місцем на всі уроки.
 *
 * Селектори живуть тут і тільки тут: інтерфейс міняється, і коли він зміниться,
 * правити доведеться один файл, а не дев'ять сценаріїв зйомки.
 *
 * Перевірено на українському інтерфейсі 2026-08-20.
 */
import { chromium } from 'playwright-core';

import { CDP_PORT, cdpAlive } from './chrome.mjs';
import { beat, focusEnd, hold, pause, pointAndClick, sleep, typeText } from './human.mjs';

export const S = {
  editor: 'rich-textarea .ql-editor',
  send: 'button[aria-label="Надіслати повідомлення"]',
  attach: 'button[aria-label="Додавання файлів і інструменти"]',
  // data-test-id, а не aria-label: під тим самим підписом у DOM є ще одна
  // прихована копія в згорнутій бічній панелі, і клац по ній нічого не робить.
  newChat: '[data-test-id="new-chat-button"] a',
  answer: 'model-response',
  /** Кнопки під відповіддю з'являються, коли на неї наводять курсор. */
  copy: 'button[aria-label="Копіювати"]',
};

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
}

/**
 * Дочекатись, поки відповідь допишеться.
 *
 * Ознаки «готово» в інтерфейсі ненадійні — кнопки міняються місцями між
 * версіями. Тому дивимось на сам текст: коли він перестав рости на дві з
 * половиною секунди, генерація закінчилась.
 */
export async function waitForAnswer(page, { timeout = 180000, quiet = 2500 } = {}) {
  const started = Date.now();
  let last = '';
  let stableSince = 0;

  while (Date.now() - started < timeout) {
    const blocks = page.locator(S.answer);
    const n = await blocks.count();
    const text = n ? await blocks.nth(n - 1).innerText().catch(() => '') : '';

    if (text && text === last) {
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
