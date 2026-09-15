/**
 * Проба перед дублем 1.1: чи впорається Gemini з аудіозаписом наради.
 *
 * Це найризикованіше місце всього уроку. Текст і PDF помічник опрацьовує в
 * десятках уже знятих уроків; п'ятихвилинний запис на чотири голоси
 * українською — жодного разу. Якщо не впорається, задачу 3 треба міняти, і
 * дізнатись про це треба ДО того, як забрано стіл на повний дубль.
 *
 * Тому проба навмисно не схожа на дубль: ані системної миші, ані запису
 * екрана, ані нативного діалогу «Відкрити». Файл підкладаємо через
 * перехоплення file chooser — швидко й нічого не займає. Питання проби одне:
 * ЩО поверне помічник, а не як це виглядатиме в кадрі.
 *
 *   node record/_probe-1-1-audio.mjs
 */
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

import { ASSETS_DIR, OUT_DIR, ensureDir } from '../lib/paths.mjs';
import { S, connect, freshApp, newChat, send, typeMultiline, waitForAnswer } from '../lib/gemini.mjs';
import { PROMPT_PROTOKOL } from './1-1.steps.mjs';

const NARADA = join(ASSETS_DIR, 'narada-04-10.m4a');
const OUT = ensureDir(join(OUT_DIR, '1-1'));

const { browser, page } = await connect();

// Спершу — чий це акаунт. Знімати можна тільки демонстраційним: у кадр іде
// весь екран, разом з ім'ям і листуванням (див. протокол приватності в
// studio/NUANCES.md). Перевіряємо ДО того, як щось надрукувати у вікно.
await freshApp(page);
const who = await page
  .locator('a[aria-label*="Google"], [aria-label*="Обліковий запис"]')
  .first()
  .getAttribute('aria-label')
  .catch(() => null);
console.log(`Акаунт у вікні зйомки: ${who ?? '(підпис не знайдено)'}`);
console.log(`URL: ${page.url()}`);

await newChat(page);

console.log('\nПрикріплюю аудіозапис…');
const chooser = page.waitForEvent('filechooser', { timeout: 30000 });
await page.locator(S.attach).click();
await page.locator('[role="menuitem"][aria-label*="Додати файли"]').first().click();
await (await chooser).setFiles(NARADA);

// Файл треба не лише віддати, а й дочекатись, доки сервіс його ПРИЙМЕ:
// поки мініатюра не з'явилась, кнопка «Надіслати» відправить порожній запит.
await page.waitForTimeout(4000);

await typeMultiline(page, PROMPT_PROTOKOL, { cps: 200 });
const before = await send(page);
console.log('Надіслано. Чекаю на відповідь (до 7 хв)…');

const started = Date.now();
const reply = await waitForAnswer(page, { before, timeout: 420000 });
const took = ((Date.now() - started) / 1000).toFixed(0);

const file = join(OUT, 'probe-protokol.md');
writeFileSync(file, `# Проба: протокол із аудіозапису\n\nЧас генерації: ${took} с\n\n---\n\n${reply}\n`, 'utf8');

console.log(`\nВідповідь за ${took} с, ${reply.length} символів → ${file}\n`);
console.log(reply.slice(0, 2600));

await browser.close();
