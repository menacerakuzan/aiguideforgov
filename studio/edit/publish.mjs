/**
 * Рендер із версіями.
 *
 * Раніше кожен рендер затирав попередній, і повернутись до варіанта, який
 * подобався більше, не було з чого. Тепер кожен рендер лягає окремим файлом
 * із номером, а на платформу копіюється останній.
 *
 *   node publish.mjs Lesson21 2-1
 *
 * Куди що лягає:
 *   studio/out/renders/2-1/2-1-v03.mp4   — усі версії, поза git
 *   apps/web/public/media/lessons/2-1/lyst-vidpovid.mp4 — та, що йде в урок
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [composition = 'Lesson21', lesson = '2-1', outName = 'lyst-vidpovid'] = process.argv.slice(2);

const EDIT_DIR = resolve(import.meta.dirname);
const STUDIO_DIR = resolve(EDIT_DIR, '..');
const REPO_DIR = resolve(STUDIO_DIR, '..');

const renders = join(STUDIO_DIR, 'out', 'renders', lesson);
mkdirSync(renders, { recursive: true });

/** Наступний номер: рахуємо по вже наявних файлах, а не по даті. */
const used = readdirSync(renders)
  .map((f) => f.match(new RegExp(`^${lesson}-v(\\d+)\\.mp4$`)))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const version = String((used.length ? Math.max(...used) : 0) + 1).padStart(2, '0');

const target = join(renders, `${lesson}-v${version}.mp4`);

/**
 * Рендеримо у відносний шлях усередині studio/edit, а розкладаємо вже засобами
 * Node. Причина: шлях проєкту містить пробіл («Рабочий стол»), і аргумент,
 * переданий через оболонку Windows, розривається на цьому пробілі — рендер
 * тихо йде в неіснуючу теку, а скрипт вважає, що все добре.
 */
const tmp = join('out', `_render-${lesson}-v${version}.mp4`);

console.log(`Рендер ${composition} → версія ${version}`);
// Через оболонку — інакше Windows не знаходить npx.cmd у PATH. Тепер це
// безпечно: єдиний шлях в аргументах відносний і без пробілів.
execFileSync('npx', ['remotion', 'render', composition, tmp, '--log=error'], {
  cwd: EDIT_DIR,
  stdio: 'inherit',
  shell: true,
});

const rendered = join(EDIT_DIR, tmp);
if (!existsSync(rendered)) throw new Error(`Рендер не створив файл: ${rendered}`);
renameSync(rendered, target);

// Копія, яку бачить платформа. Перезаписується щоразу — але оригінал версії
// лишається в renders/, і повернутись є куди.
const publicDir = join(REPO_DIR, 'apps', 'web', 'public', 'media', 'lessons', lesson);
mkdirSync(publicDir, { recursive: true });
copyFileSync(target, join(publicDir, `${outName}.mp4`));

// Журнал: коли яку версію зробили. Знадобиться через місяць, коли треба буде
// зрозуміти, чим v05 відрізнялась від v04.
const log = join(renders, 'versions.md');
if (!existsSync(log)) writeFileSync(log, `# Версії ролика ${lesson}\n\n`, 'utf8');
appendFileSync(log, `- **v${version}** — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n`, 'utf8');

console.log(`\nВерсія:    ${target}`);
console.log(`У курсі:   ${join(publicDir, `${outName}.mp4`)}`);
console.log(`Журнал:    ${log}`);
