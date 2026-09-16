/**
 * Складає готовий рендер в архів під наступним номером версії.
 *
 * Нічого не затирається. Новий монтаж може вийти ГІРШИМ за попередній — на
 * уроці 2.1 так і сталось: дубль, знятий заради дрібного виправлення, отримав
 * шестисекундну паузу й програв попередньому. Повернутись було куди лише тому,
 * що старий файл випадково вцілів.
 *
 * Чому окремо від `publish.mjs`. Спершу це була одна команда: вона і
 * нумерувала версію, і клала копію туди, звідки файл бере платформа. Через це
 * «поки не викладаймо» означало й «не зберігаймо версію» — і свіжий рендер
 * лишався безіменним `promo.mp4`, який наступний рендер просто затер би.
 *
 * Скласти версію в архів безпечно завжди: це копія у теку поза git. А от
 * покласти файл на платформу — окреме рішення, і воно лишилось у `publish`.
 *
 * Запуск: npm run archive -- "чим ця версія відрізняється"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMO = path.resolve(HERE, '..');

const RENDER = path.join(PROMO, 'out', 'promo.mp4');
const ARCHIVE = path.join(PROMO, 'out', 'renders');

const note = process.argv.slice(2).join(' ').trim();

if (!fs.existsSync(RENDER)) {
  throw new Error(`Немає ${RENDER} — спершу npm run render`);
}

fs.mkdirSync(ARCHIVE, { recursive: true });

/** Наступний вільний номер. Рахується з того, що вже лежить в архіві. */
export function nextTag() {
  const used = fs
    .readdirSync(ARCHIVE)
    .map((name) => name.match(/^promo-v(\d+)\.mp4$/))
    .filter((m) => m !== null)
    .map((m) => Number(m[1]));
  const version = (used.length ? Math.max(...used) : 0) + 1;
  return `v${String(version).padStart(2, '0')}`;
}

const tag = nextTag();
const archived = path.join(ARCHIVE, `promo-${tag}.mp4`);
fs.copyFileSync(RENDER, archived);

// Субтитри складаються поруч із тим самим номером: текст правлять разом із
// монтажем, і версія без свого тексту згодом ні про що не скаже.
for (const ext of ['srt', 'vtt']) {
  const subs = path.join(PROMO, 'out', `promo.${ext}`);
  if (fs.existsSync(subs)) fs.copyFileSync(subs, path.join(ARCHIVE, `promo-${tag}.${ext}`));
}

const log = path.join(ARCHIVE, 'versions.md');
const size = (fs.statSync(archived).size / 1024 / 1024).toFixed(1);
const date = new Date().toISOString().slice(0, 10);

if (!fs.existsSync(log)) {
  fs.writeFileSync(log, '# Версії промо-ролика\n\nЩо змінилось у кожній. Нічого не затирається.\n\n', 'utf8');
}
fs.appendFileSync(log, `- **${tag}** · ${date} · ${size} МБ — ${note || 'без опису'}\n`, 'utf8');

console.log(`архів:  ${archived}`);
console.log(`журнал: ${log}`);
console.log(`\nНа платформу НЕ копіювалось. Для цього — npm run publish -- ${tag}`);
