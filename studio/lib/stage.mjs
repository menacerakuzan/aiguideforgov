/**
 * Сцена: що видно на екрані під час дубля.
 *
 * Знімаємо весь робочий стіл, тому перед записом усе стороннє з нього
 * прибираємо, а потрібне вікно виводимо наперед. Windows за замовчуванням не
 * дає програмі забирати фокус — обхід у `stage.ps1`.
 */
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { STUDIO_DIR } from './paths.mjs';
import { pause } from './human.mjs';
import { CDP_PORT } from './chrome.mjs';

const run = promisify(execFile);
const PS1 = join(STUDIO_DIR, 'lib', 'stage.ps1');

async function ps(args) {
  const { stdout } = await run('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS1, ...args,
  ]);
  return stdout.trim();
}

/** Згорнути все: чистий стіл перед першим кадром. */
export async function clearStage() {
  const r = await ps(['-Action', 'clear']);
  await pause(800);
  return r;
}

/**
 * Вивести вікно наперед за частиною заголовка.
 *
 * З повторами: одразу після того, як інший застосунок (Word) завершує
 * роботу через `Quit()`, `Get-Process` ще секунду-дві може не бачити вікна,
 * які насправді вже на місці, — перевірено дослідом (`front: Gemini` кілька
 * разів поспіль не знаходив щойно живий Chrome одразу після `closeWord()`).
 */
export async function bringToFront(match, { attempts = 8, delayMs = 900 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await ps(['-Action', 'front', '-Match', match]);
      await pause(700);
      return r;
    } catch (e) {
      lastErr = e;
      await pause(delayMs);
    }
  }
  throw lastErr;
}

/**
 * PID нашого власного Chrome зйомки — процес, що слухає CDP-порт.
 *
 * Заголовок вікна для пошуку ненадійний: коли на машині одночасно відкрито
 * особистий Chrome користувача з чатом Gemini, обидва вікна містять слово
 * "Gemini" в заголовку, і `bringToFront('Gemini')` вибирає перше-ліпше з
 * них — випадково може вивести наперед чуже вікно (сталося на репетиції
 * уроку 2.9, 2026-08-26). PID процесу на CDP-порту однозначний: це саме
 * той Chrome, до якого підключений Playwright.
 */
let cachedChromePid;
async function chromePid() {
  if (cachedChromePid) return cachedChromePid;
  const { stdout } = await run('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    `(Get-NetTCPConnection -LocalPort ${CDP_PORT} -State Listen -ErrorAction Stop | Select-Object -First 1 -ExpandProperty OwningProcess)`,
  ]);
  const pid = Number(stdout.trim());
  if (!pid) throw new Error(`Не вдалося знайти процес Chrome на порту ${CDP_PORT}.`);
  cachedChromePid = pid;
  return pid;
}

/** Вивести наперед саме наш Chrome зйомки — за PID, а не за заголовком. */
export async function bringChromeToFront({ attempts = 8, delayMs = 900 } = {}) {
  const pid = await chromePid();
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await ps(['-Action', 'front', '-TargetPid', String(pid)]);
      await pause(700);
      return r;
    } catch (e) {
      lastErr = e;
      await pause(delayMs);
    }
  }
  throw lastErr;
}

/** Вставка з буфера обміну клавішами системи — для активного вікна. */
export async function osPaste() {
  const r = await ps(['-Action', 'paste']);
  await pause(600);
  return r;
}

/** Escape — прибрати плаваючу панель Word, не знімаючи виділення. */
export async function pressEscape() {
  const r = await ps(['-Action', 'esc']);
  await pause(500);
  return r;
}

/** Які вікна зараз відкриті — для перевірки перед дублем. */
export const listWindows = () => ps(['-Action', 'list']);
