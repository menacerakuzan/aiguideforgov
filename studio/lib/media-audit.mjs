/**
 * Звірка: чи лежить на диску все медіа, на яке посилаються уроки.
 *
 *   node lib/media-audit.mjs
 *
 * Навіщо. Готове відео й скріншоти поза git — на свіжій машині їх просто немає.
 * Без цієї перевірки бракуючий файл виявляється як порожній прямокутник на
 * платформі, і шукати доводиться очима по всьому курсу. Тут те саме видно
 * списком за секунду.
 *
 * Заглушки (`videoSoon`, `image` без `src`) — не помилка: урок ще не знімали.
 * Їх рахуємо окремо, щоб було видно обсяг роботи, що лишилась.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_DIR } from './paths.mjs';

const CONTENT = join(REPO_DIR, 'prisma', 'src', 'content');
const PUBLIC = join(REPO_DIR, 'apps', 'web', 'public');

const found = [];
const missing = [];
let placeholders = 0;

for (const file of readdirSync(CONTENT).filter((f) => /^lessons-module-\d+\.ts$/.test(f))) {
  const src = readFileSync(join(CONTENT, file), 'utf8');
  const module = file.match(/module-(\d+)/)[1];

  // Усі посилання на власні файли: video('/…'), src: '/…', file('/…').
  for (const m of src.matchAll(/'(\/(?:media\/)?lessons\/[^']+)'/g)) {
    const url = m[1];
    const disk = join(PUBLIC, url.replace(/\//g, '\\'));
    (existsSync(disk) ? found : missing).push({ module, url, disk });
  }

  placeholders += (src.match(/videoSoon\(/g) ?? []).length;
  placeholders += (src.match(/image\('(?:[^']|\\')*',\s*\{\s*note:/g) ?? []).length;
}

const size = (p) => `${(statSync(p).size / 1024 / 1024).toFixed(1)} МБ`;

console.log();
for (const f of found) console.log(`✅ ${f.url}  (${size(f.disk)})`);
for (const f of missing) console.log(`❌ ${f.url}  — файлу немає`);

// Зворотний бік: файли, що лежать, але на них ніхто не посилається. Найчастіше
// це залишки після пересъемки або скрін, який зняли й забули поставити в урок.
const referenced = new Set(found.map((f) => f.url));
const orphans = [];
const mediaRoot = join(PUBLIC, 'media', 'lessons');
if (existsSync(mediaRoot)) {
  for (const lesson of readdirSync(mediaRoot)) {
    const dir = join(mediaRoot, lesson);
    if (!statSync(dir).isDirectory()) continue;
    for (const name of readdirSync(dir)) {
      const url = `/media/lessons/${lesson}/${name}`;
      if (!referenced.has(url)) orphans.push(url);
    }
  }
}
for (const o of orphans) console.log(`⚪ ${o}  — лежить, але в уроці не використано`);

console.log();
console.log(`На місці: ${found.length} · Бракує: ${missing.length} · Без посилання: ${orphans.length} · Заглушок у контенті: ${placeholders}`);

if (missing.length) {
  console.log('\nБракуючі файли треба скопіювати з studio/out або зняти заново.');
  process.exit(1);
}
