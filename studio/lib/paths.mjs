/**
 * Усі шляхи оснастки в одному місці.
 *
 * Правило: скрипти лежать у репозиторії й версіонуються, а важкі результати —
 * ні. Сирий дубль 1080p важить близько 35 МБ за хвилину; на десятках дублів це
 * гігабайти, яким у git робити нічого.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

export const STUDIO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_DIR = resolve(STUDIO_DIR, '..');

/** Сирі дублі та проміжні файли. Поза git (див. .gitignore). */
export const OUT_DIR = process.env.YASNO_OUT
  ? resolve(process.env.YASNO_OUT)
  : join(STUDIO_DIR, 'out');

/** Матеріали, які потрапляють у кадр: документи, які перетягуємо у чат. */
export const ASSETS_DIR = join(STUDIO_DIR, 'assets');

/**
 * Профіль Chrome для зйомки — окремий від робочого браузера людини.
 *
 * Шлях через LOCALAPPDATA брали беззастережно, і поза Windows це створювало в
 * корені репозиторію теку з буквальною назвою «C:\Users\...\chrome-profile»:
 * на POSIX зворотний слеш — звичайний символ імені, а не роздільник. Тому
 * windows-гілка лишається тільки для самої Windows, а решта отримує теку
 * всередині studio/ (вона в .gitignore).
 */
export const CHROME_PROFILE = process.env.YASNO_PROFILE
  ? resolve(process.env.YASNO_PROFILE)
  : process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? '', 'AppData', 'Local'), 'yasno-media', 'chrome-profile')
    : join(STUDIO_DIR, '.chrome-profile');

export function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

/**
 * Значення з .env репозиторію.
 *
 * Лапки навколо значення знімаємо вручну: bash робить це сам, а Node читає
 * файл як текст — інакше ключ поїде в API разом із лапками.
 */
export function env(name) {
  const file = join(REPO_DIR, '.env');
  if (!existsSync(file)) throw new Error(`Не знайдено ${file}`);
  const m = readFileSync(file, 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'));
  if (!m) throw new Error(`${name} не знайдено в .env`);
  return m[1].trim().replace(/^["']|["']$/g, '');
}

/** Пошук chrome.exe у звичайних місцях встановлення. */
export function chromeExe() {
  const candidates = [
    process.env.YASNO_CHROME,
    join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('chrome.exe не знайдено. Вкажіть шлях у YASNO_CHROME.');
  return found;
}
