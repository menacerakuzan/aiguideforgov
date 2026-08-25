/**
 * Розвідка живого Gemini: чи є сесія і які селектори працюють сьогодні.
 *
 * Інтерфейс змінюється без попередження, і дізнатись про це посеред дубля —
 * найдорожчий спосіб. Тому перед зйомкою питаємо саму сторінку.
 *
 *   node lib/probe.mjs
 */
import { chromium } from 'playwright-core';

import { CDP_PORT, cdpAlive } from './chrome.mjs';

if (!(await cdpAlive())) {
  console.error(`Chrome на порту ${CDP_PORT} не відповідає. Спершу: node lib/chrome.mjs`);
  process.exit(1);
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
const page = browser.contexts()[0].pages()[0];

/** Кандидати на кожен елемент: перший, що знайшовся, і буде робочим. */
const WANTED = {
  'поле вводу': [
    'rich-textarea .ql-editor',
    'div[contenteditable="true"][role="textbox"]',
    'textarea[aria-label]',
  ],
  'кнопка «Надіслати»': [
    'button[aria-label*="Надісл"]',
    'button[aria-label*="Send"]',
    'button[mattooltip*="Надісл"]',
  ],
  'новий чат': [
    'a[aria-label*="Новий чат"], button[aria-label*="Новий чат"]',
    'a[aria-label*="New chat"], button[aria-label*="New chat"]',
    'side-nav-action-button',
  ],
  'додати файл': [
    'button[aria-label*="Відкрити меню завантаження"]',
    'button[aria-label*="дода"]',
    'uploader-button button',
    'input[type="file"]',
  ],
  'вхід у акаунт': ['a[href*="accounts.google.com"]', 'a[aria-label*="Увійти"]'],
};

console.log(`\nСторінка: ${page.url()}\n`);

for (const [name, selectors] of Object.entries(WANTED)) {
  let found = null;
  for (const sel of selectors) {
    const n = await page.locator(sel).count().catch(() => 0);
    if (n > 0) { found = { sel, n }; break; }
  }
  console.log(found ? `✅ ${name.padEnd(20)} ${found.sel}  (×${found.n})` : `❌ ${name.padEnd(20)} не знайдено`);
}

// Ознака входу: аватар акаунта в шапці.
const avatar = await page.locator('img[alt*="Обліковий запис"], img[alt*="Account"], a[aria-label*="Google Account"]').count().catch(() => 0);
console.log(`\n${avatar ? '✅' : '⚠️ '} Сесія: ${avatar ? 'акаунт активний' : 'аватар не видно — схоже, вхід не виконано'}`);

await browser.close();
