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

/** Вивести вікно наперед за частиною заголовка. */
export async function bringToFront(match) {
  const r = await ps(['-Action', 'front', '-Match', match]);
  await pause(700);
  return r;
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
