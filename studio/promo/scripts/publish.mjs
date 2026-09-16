/**
 * Кладе версію з архіву туди, звідки ролик бере платформа.
 *
 * Окремо від `archive.mjs` і свідомо. Скласти версію в архів — дія без
 * наслідків: копія лягає в теку поза git. А покласти файл у
 * `apps/web/public/media/` означає, що його віддаватиме застосунок, і це вже
 * рішення, а не технічний крок. Поки обидва робила одна команда, «поки не
 * викладаймо» блокувало й архівування — свіжий рендер лишався безіменним.
 *
 * Береться ВЕРСІЯ з архіву, а не поточний `out/promo.mp4`: між рендером і
 * викладанням файл устигає перерендеритись, і тоді на платформу поїхало б не
 * те, що дивилися.
 *
 * Запуск: npm run publish -- v04
 *         npm run publish          (остання версія в архіві)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMO = path.resolve(HERE, '..');
const REPO = path.resolve(PROMO, '../..');

const ARCHIVE = path.join(PROMO, 'out', 'renders');
const PUBLIC = path.join(REPO, 'apps', 'web', 'public', 'media', 'promo');
const NAME = 'proai-prezentatsiia';

if (!fs.existsSync(ARCHIVE)) {
  throw new Error(`Немає ${ARCHIVE} — спершу npm run archive`);
}

const versions = fs
  .readdirSync(ARCHIVE)
  .map((name) => name.match(/^promo-(v\d+)\.mp4$/))
  .filter((m) => m !== null)
  .map((m) => m[1]);

if (versions.length === 0) {
  throw new Error('В архіві немає жодної версії — спершу npm run archive');
}

const asked = process.argv[2]?.trim();
const tag = asked ?? versions.sort().at(-1);

if (!versions.includes(tag)) {
  throw new Error(`Версії ${tag} в архіві немає. Є: ${versions.join(', ')}`);
}

fs.mkdirSync(PUBLIC, { recursive: true });

const source = path.join(ARCHIVE, `promo-${tag}.mp4`);
const target = path.join(PUBLIC, `${NAME}.mp4`);
fs.copyFileSync(source, target);

// Субтитри їдуть разом із роликом: відео без них втрачає доступність для тих,
// хто дивиться без звуку, а окремий файл субтитрів без відео нікому не
// потрібен.
for (const ext of ['srt', 'vtt']) {
  const subs = path.join(ARCHIVE, `promo-${tag}.${ext}`);
  if (fs.existsSync(subs)) fs.copyFileSync(subs, path.join(PUBLIC, `${NAME}.${ext}`));
}

console.log(`на платформі тепер ${tag}:`);
console.log(`  ${target}`);
