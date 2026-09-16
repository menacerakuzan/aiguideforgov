/**
 * Збирає субтитри до промо: `.srt` і `.vtt`.
 *
 * У кадр субтитри НЕ вшиті — свідомо. Смуга тексту внизу з'їдає частину екрана
 * саме там, де в ролику працює інтерфейс, а промо дивляться зі звуком. Тому
 * текст їде окремим файлом: захочете — увімкнете в плеєрі або підключите до
 * сторінки, не захочете — кадр лишається цілим.
 *
 * Таймкоди не набиваються руками. Початок кожної репліки лежить у
 * `src/voice-plan.json` (те саме джерело, що читає монтаж), тривалість —
 * у `src/voice.json`, куди її записав `ffprobe` під час синтезу. Тобто
 * субтитри не можуть розійтися з озвучкою: обидві сторони беруть ті самі числа.
 *
 * Запуск: npm run subs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(fs.readFileSync(path.resolve(HERE, '../src/voice-plan.json'), 'utf8'));
const voice = JSON.parse(fs.readFileSync(path.resolve(HERE, '../src/voice.json'), 'utf8'));
const OUT = path.resolve(HERE, '../out');

/** Скільки символів у рядку субтитра. Більше — око не встигає за один погляд. */
const MAX_LINE = 42;

/**
 * Написане й сказане — не одне й те саме.
 *
 * У тексті для синтезу назва записана як «ПРО ШІ» без крапки: з крапкою голос
 * читає «про крапка ші». Але на екрані має стояти справжня назва платформи.
 * Тому перед виведенням повертаємо письмову форму.
 */
// Межі слова (\b) тут НЕ ставимо: у JavaScript вони визначені через латиницю,
// і біля кириличних літер спрацьовують навпаки — заміна мовчки не відбувається.
const SPOKEN_TO_WRITTEN = [[/ПРО ШІ/g, 'ПРО.ШІ']];

const written = (text) => SPOKEN_TO_WRITTEN.reduce((acc, [from, to]) => acc.replace(from, to), text);

/** Розбиває репліку на один-два рядки по межах слів. */
function wrap(text) {
  if (text.length <= MAX_LINE) return [text];

  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > MAX_LINE) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);

  // Три рядки на екрані — це вже стіна тексту. Якщо репліка не влізла у два,
  // краще залишити довший другий рядок, ніж додавати третій.
  if (lines.length > 2) {
    return [lines[0], lines.slice(1).join(' ')];
  }
  return lines;
}

const stamp = (sec, sep) => {
  const ms = Math.round(sec * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const rest = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s}${sep}${rest}`;
};

const cues = Object.entries(plan)
  .filter(([key, at]) => typeof at === 'number' && voice[key])
  .sort((a, b) => a[1] - b[1])
  .map(([key, at], i) => {
    const { seconds, text } = voice[key];
    return { index: i + 1, from: at, to: at + seconds, lines: wrap(written(text)) };
  });

const srt = cues
  .map((c) => `${c.index}\n${stamp(c.from, ',')} --> ${stamp(c.to, ',')}\n${c.lines.join('\n')}\n`)
  .join('\n');

const vtt = `WEBVTT\n\n${cues
  .map((c) => `${c.index}\n${stamp(c.from, '.')} --> ${stamp(c.to, '.')}\n${c.lines.join('\n')}\n`)
  .join('\n')}`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'promo.srt'), srt, 'utf8');
fs.writeFileSync(path.join(OUT, 'promo.vtt'), vtt, 'utf8');

console.log(`субтитрів: ${cues.length}`);
console.log(`  ${path.join(OUT, 'promo.srt')}`);
console.log(`  ${path.join(OUT, 'promo.vtt')}`);
