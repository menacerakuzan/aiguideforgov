/**
 * Людський темп.
 *
 * Урок дивиться людина, яка вперше бачить цей інтерфейс. Тому в кадрі не має
 * бути ані миттєвих стрибків (незрозуміло, що сталося), ані мертвих пауз.
 * Усе, що тут є, — це набір затримок і рухів, які роблять дію читабельною:
 * курсор доїжджає до кнопки, текст набирається з нерівним ритмом, після
 * важливого кроку кадр «дихає» пів секунди.
 *
 * Прискорення на монтажі. Тут темп чесний: краще зняти повільніше й прибрати
 * зайве в Remotion, ніж поспішати в кадрі й отримати незрозумілий ролик.
 */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Пауза з невеликим розкидом: рівні інтервали читаються як робота машини. */
export const pause = (ms, spread = 0.25) =>
  sleep(Math.round(ms * (1 - spread / 2 + Math.random() * spread)));

/** Пауза після дії, щоб глядач устиг помітити результат. */
export const beat = () => pause(700);

/** Довша пауза: щойно сталося щось важливе — даємо роздивитись. */
export const hold = () => pause(1600);

/**
 * Набір тексту в живому ритмі.
 *
 * Постійна затримка на символ виглядає як робот. Люди набирають ривками:
 * швидше всередині слова, повільніше на розділових знаках, із зупинкою після
 * крапки. `cps` — приблизна швидкість, символів на секунду.
 *
 * Друкуємо через клавіатуру сторінки, а не через locator.type: locator перед
 * кожним викликом клацає по елементу, а клацання переносить курсор туди, де
 * опинилась миша. Саме через це перший дубль дав запит, у якому рядки
 * перемішались між собою.
 */
export async function typeText(page, text, { cps = 14 } = {}) {
  const base = 1000 / cps;

  for (const ch of text) {
    await page.keyboard.type(ch, { delay: 0 });
    let d = base * (0.6 + Math.random() * 0.8);
    if (',;:'.includes(ch)) d += base * 3;
    if ('.!?'.includes(ch)) d += base * 6;
    await sleep(Math.round(d));
  }
}

/** Поставити курсор у поле й перевести його в кінець тексту. */
export async function focusEnd(page, locator) {
  await locator.click();
  await pause(350);
  await page.keyboard.press('Control+End');
  await pause(200);
}

/**
 * Плавна прокрутка. Одним стрибком сторінка «телепортується» — глядач губить
 * місце, на яке дивився.
 */
export async function scrollBy(page, dy, { steps = 24, ms = 16 } = {}) {
  const step = dy / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step);
    await sleep(ms);
  }
}

/** Підвести курсор до елемента й лише потім клацнути — видно, куди саме. */
export async function pointAndClick(page, locator, { settle = 450 } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Елемент не видно на екрані — клацати нема по чому.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
  await pause(settle);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
}
