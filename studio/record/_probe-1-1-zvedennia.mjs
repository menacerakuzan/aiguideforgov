/**
 * Проба перед дублем 1.1: чи назве помічник номери сторінок у зведенні PDF.
 *
 * На репетиції не назвав жодного — до PDF він вмикає власне цитування
 * («значок PDF» під пунктом) і вважає джерело вказаним. Але вся задача 2
 * уроку тримається на тому, що службовець відкриває НАЗВАНУ сторінку.
 * Тут перевіряємо посилений промпт, не витрачаючи повний дубль.
 *
 *   node record/_probe-1-1-zvedennia.mjs
 */
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

import { ASSETS_DIR, OUT_DIR, ensureDir } from '../lib/paths.mjs';
import { S, connect, freshApp, newChat, send, typeMultiline, waitForAnswer } from '../lib/gemini.mjs';
import { PROMPT_ZVEDENNIA, pickVerifiedPage } from './1-1.steps.mjs';

const PDF = join(ASSETS_DIR, 'zvit-prohrama-9-misyatsiv.pdf');
const SRC = join(ASSETS_DIR, '..', '..', 'apps', 'web', 'public', 'lessons', '1-1', 'zvit-prohrama-9-misyatsiv.md');

const { browser, page } = await connect();
await freshApp(page);
await newChat(page);

const chooser = page.waitForEvent('filechooser', { timeout: 30000 });
await page.locator(S.attach).click();
await page.locator('[role="menuitem"][aria-label*="Додати файли"]').first().click();
await (await chooser).setFiles(PDF);
await page.waitForTimeout(6000);

await typeMultiline(page, PROMPT_ZVEDENNIA, { cps: 300 });
const before = await send(page);
console.log('Надіслано, чекаю…');
const reply = await waitForAnswer(page, { before, timeout: 300000, quiet: 4000, minLength: 400 });

const refs = reply.match(/\(с\.\s*\d{1,3}\)/g) ?? [];
const cited = pickVerifiedPage(reply, readFileSync(SRC, 'utf8'));

const out = join(ensureDir(join(OUT_DIR, '1-1')), 'probe-zvedennia.md');
writeFileSync(out, reply, 'utf8');

console.log(`\nПосилань на сторінки: ${refs.length}  ${refs.slice(0, 8).join(' ')}`);
console.log(`Підтверджена джерелом пара: ${JSON.stringify(cited)}`);
console.log(`Повний текст: ${out}`);

await browser.close();
