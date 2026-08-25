/**
 * Chrome для зйомки: запускаємо звичайний браузер із відкритим портом
 * налагодження, а Playwright потім ПІД'ЄДНУЄТЬСЯ до нього (connectOverCDP).
 *
 * Чому не launch() самого Playwright: він піднімає Chrome із прапорцями
 * автоматизації, і Google на екрані входу відповідає «цей веб-переглядач
 * небезпечний». Перевірка спрацьовує саме в момент входу, тому в демо-акаунт
 * входимо руками в цьому ж вікні — сесія лишається живою й далі.
 *
 * Запуск:  node lib/chrome.mjs
 * Вікно не закривати, поки триває зйомка.
 */
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { CHROME_PROFILE, chromeExe, ensureDir } from './paths.mjs';

export const CDP_PORT = Number(process.env.YASNO_CDP_PORT ?? 9222);

export function launchChrome({ url = 'https://gemini.google.com/app', wait = false } = {}) {
  ensureDir(CHROME_PROFILE);

  const args = [
    `--user-data-dir=${CHROME_PROFILE}`,
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--lang=uk',
    // Вікно на весь екран: знімаємо робочий стіл 1920×1080 цілком, і сміття
    // на краях у кадр не потрапляє.
    '--start-maximized',
    '--disable-features=Translate,TranslateUI',
    url,
  ];

  const proc = spawn(chromeExe(), args, { detached: !wait, stdio: 'ignore' });
  if (!wait) proc.unref();
  return proc;
}

/** Чи відповідає вже відкритий Chrome на порту налагодження. */
export async function cdpAlive() {
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (await cdpAlive()) {
    console.log(`Chrome із портом ${CDP_PORT} уже відкрито — використовуємо його.`);
  } else {
    launchChrome();
    console.log(`Chrome відкривається з портом налагодження ${CDP_PORT}.`);
    console.log(`Профіль: ${CHROME_PROFILE}`);
    console.log('Увійдіть у ДЕМО-акаунт Google, пройдіть привітальні екрани Gemini.');
    console.log('Вікно НЕ закривайте — саме в ньому зніматимемо.');
  }
}
