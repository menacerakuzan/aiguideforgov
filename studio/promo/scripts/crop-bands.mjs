/**
 * Ріже з довгих знімків сторінок ті смуги, які справді потрапляють у кадр.
 *
 * Навіщо. Урок займає 14 707 пікселів сторінки, тобто 29 414 у знімку 2x. У
 * кадрі з нього буде секунд вісім подорожі — від сили третина. А платить за
 * повну висоту кожен кадр рендера: 3840×29414 це 113 мільйонів пікселів, які
 * Chromium тримає розпакованими в пам'яті, поки малює кожен із 2600 кадрів
 * ролика. Смуга замість повної сторінки знімає це без жодної втрати в кадрі.
 *
 * Координати смуг задані в пікселях СТОРІНКИ (CSS), а не знімка: так їх можна
 * звірити з `live-layout.json`, де в тій самій системі лежать усі елементи.
 * Перерахунок на подвійний масштаб — тут, один раз.
 *
 * Запуск: npm run crop   (після npm run capture)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '../public/textures');
const LAYOUT = path.resolve(HERE, '../src/live-layout.json');
const SCALE = 2;

/** `from`/`height` — у пікселях сторінки. Ім'я смуги стає `<name>-band.png`. */
const BANDS = [
  // Урок 2.1: від заголовка до готового промпту. Нижче йдуть ще вісім екранів
  // кроків — у ролику їх не видно, і в текстурі вони теж не потрібні.
  { name: 'lesson', from: 300, height: 4600 },
  // Урок 3.2: світлофор даних і сортувальник «можна / не можна».
  { name: 'security', from: 600, height: 3000 },
  // Бібліотека: шапка з лічильником матеріалів і перші ряди карток.
  { name: 'library', from: 0, height: 2100 },
];

const layout = JSON.parse(fs.readFileSync(LAYOUT, 'utf8'));

for (const band of BANDS) {
  const src = path.join(DIR, `${band.name}-full.png`);
  const out = path.join(DIR, `${band.name}-band.png`);
  if (!fs.existsSync(src)) throw new Error(`Немає ${src} — спершу npm run capture`);

  const entry = layout[band.name];
  if (!entry) throw new Error(`У live-layout.json немає сторінки ${band.name}`);
  if (band.from + band.height > entry.pageH) {
    throw new Error(`Смуга ${band.name} виходить за межі сторінки (${entry.pageH})`);
  }

  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', src, '-vf', `crop=${1920 * SCALE}:${band.height * SCALE}:0:${band.from * SCALE}`, out],
    { stdio: 'inherit' },
  );

  // Смуга — самостійна текстура зі своєю системою координат: її верх це нуль.
  // Записуємо і зсув, щоб у монтажі координати з `live-layout.json` можна було
  // перевести однією дією, не тримаючи число в голові.
  entry.band = { from: band.from, pageH: band.height };
  console.log(`  ${band.name}-band.png  сторінка ${band.from}…${band.from + band.height}`);
}

fs.writeFileSync(LAYOUT, JSON.stringify(layout, null, 1), 'utf8');
console.log(`записано ${LAYOUT}`);
