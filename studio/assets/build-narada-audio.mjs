/**
 * Аудіозапис наради для уроку 1.1 — з вигаданої стенограми в один файл.
 *
 *   node studio/assets/build-narada-audio.mjs
 *
 * Кожну репліку озвучує свій голос ElevenLabs, між репліками — тиша, а вже
 * зведену доріжку ми навмисно ПСУЄМО: смуга частот телефонного диктофона,
 * кімнатна реверберація, тихий шумовий фон, компресія.
 *
 * Навіщо псувати. Чотири студійні голоси поспіль звучать як аудіокнига, а не
 * як нарада, записана телефоном на столі. Урок обіцяє «звичайний аудіозапис із
 * телефона» — і якщо в кадрі звучить студія, обіцянка неправдива. Заразом це
 * чесніша демонстрація: помічник розбирає саме такий запис, який буває
 * насправді, а не ідеальний.
 *
 * Результат: studio/assets/narada-04-10.m4a — його й прикріплюємо в кадрі.
 */
import { execFile } from 'node:child_process';
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { ASSETS_DIR, OUT_DIR, ensureDir } from '../lib/paths.mjs';
import { VOICES, duration, say } from '../voice/tts.mjs';
import { LINES, SPEAKERS } from './narada.script.mjs';

const run = promisify(execFile);

const WORK = ensureDir(join(OUT_DIR, '1-1', 'narada'));
const OUT = join(ASSETS_DIR, 'narada-04-10.m4a');

/**
 * Налаштування голосу для наради — не ті самі, що для диктора.
 *
 * У диктора stability 0.55: рівна, передбачувана подача. Тут навпаки —
 * нижча стабільність і вищий style дають живіші інтонації, паузи й затинання,
 * тобто те, чим жива нарада відрізняється від зачитаного тексту.
 */
const SETTINGS = { stability: 0.38, similarity: 0.72, style: 0.32 };

async function synth() {
  const files = [];
  for (const [i, line] of LINES.entries()) {
    const sp = SPEAKERS[line.who];
    if (!sp) throw new Error(`Невідомий доповідач "${line.who}" у репліці ${i + 1}`);

    const key = String(i + 1).padStart(2, '0');
    const file = join(WORK, `${key}-${line.who}.mp3`);
    await say(VOICES[sp.voice].id, line.text, file, SETTINGS);
    const sec = await duration(file);
    console.log(`  ${key}  ${sp.name.padEnd(14)} ${sec.toFixed(2)} с  ${line.text.slice(0, 52)}…`);
    files.push({ file, pause: line.pause });
  }
  return files;
}

/**
 * Склейка з паузами.
 *
 * Через список файлів для `concat`, а не фільтром: реплік три десятки, і
 * фільтрограф із такою кількістю входів упирається в довжину командного рядка
 * Windows. Тиша — це окремі згенеровані файли, які стають у той самий список.
 */
async function joinWithPauses(files) {
  const silences = new Map();
  for (const { pause } of files) {
    if (!pause || silences.has(pause)) continue;
    const p = join(WORK, `_sil-${String(pause).replace('.', '_')}.mp3`);
    await run('ffmpeg', [
      '-y', '-v', 'error',
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono',
      '-t', String(pause), '-b:a', '128k', p,
    ]);
    silences.set(pause, p);
  }

  const list = [];
  for (const { file, pause } of files) {
    list.push(`file '${file.replace(/\\/g, '/')}'`);
    if (pause) list.push(`file '${silences.get(pause).replace(/\\/g, '/')}'`);
  }
  const listFile = join(WORK, 'concat.txt');
  writeFileSync(listFile, list.join('\n') + '\n', 'utf8');

  const raw = join(WORK, 'raw.mp3');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', raw]);
  return raw;
}

/**
 * «Телефон на столі переговорної».
 *
 * highpass/lowpass  — смуга диктофона: без низу й без повітря згори;
 * aecho             — коротке відлуння кімнати з твердими стінами;
 * volume+amix шуму  — рівний тихий фон, який буває в будь-якому приміщенні;
 * acompressor       — вирівнює гучних і тихих, як це робить сам диктофон;
 * loudnorm          — щоб файл не був ані тихим, ані перевантаженим.
 */
async function roomify(raw) {
  const filter = [
    '[0:a]highpass=f=140,lowpass=f=7200,'
      + 'aecho=0.6:0.42:55|85:0.22|0.14,'
      + 'acompressor=threshold=0.09:ratio=4:attack=12:release=260,'
      + 'volume=1.6[voice]',
    '[1:a]volume=0.016[room]',
    '[voice][room]amix=inputs=2:duration=first:dropout_transition=0,'
      + 'loudnorm=I=-18:TP=-2:LRA=11',
  ].join(';');

  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-i', raw,
    '-f', 'lavfi', '-i', 'anoisesrc=r=44100:c=brown:a=0.9',
    '-filter_complex', filter,
    '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '1',
    '-shortest', OUT,
  ]);
  return OUT;
}

const files = await synth();
const raw = await joinWithPauses(files);
const out = await roomify(raw);
const sec = await duration(out);

const mm = Math.floor(sec / 60);
const ss = String(Math.round(sec % 60)).padStart(2, '0');
console.log(`\n  ${OUT}`);
console.log(`  Тривалість: ${mm}:${ss}  (${LINES.length} реплік, ${Object.keys(SPEAKERS).length} голоси)`);

// Проміжні mp3 більше не потрібні: файл зібрано й перевірено.
for (const f of readdirSync(WORK)) {
  if (f !== 'raw.mp3') rmSync(join(WORK, f), { force: true });
}
