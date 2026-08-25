/**
 * Озвучка через ElevenLabs.
 *
 * REST напряму, а не через MCP: реплік на курс будуть сотні, і гнати їх пакетом
 * зі скрипта надійніше — та й переспівати одну репліку після правки тексту тоді
 * коштує один рядок, а не новий діалог.
 *
 *   node voice/tts.mjs samples                     — зразки голосів на вибір
 *   node voice/tts.mjs say <voice> <out.mp3> "текст"
 *   node voice/tts.mjs batch <script.json>         — увесь урок + voice.json
 *
 * Про `batch`. На виході, крім mp3, з'являється voice.json із РЕАЛЬНИМИ
 * тривалостями кожної репліки. З них потім рахується монтажний план: сцена
 * триває стільки, скільки звучить її фраза. Вигадані тривалості — головна
 * причина, чому озвучка не збігається з картинкою.
 */
import { execFile } from 'node:child_process';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

import { OUT_DIR, ensureDir, env } from '../lib/paths.mjs';

const run = promisify(execFile);

export const VOICES = {
  // Голоси з питомою вимовою — для української вони й потрібні. Англомовні
  // голоси кладуть на українські слова англійський наголос, і це чути з
  // першої фрази.
  alex: { id: '9Sj8ugvpK1DmcAXyvi3a', note: 'чоловічий, впевнений, лекторський' },
  anna: { id: '2o2uQnlGaNuV3ObRpxXt', note: 'жіночий, яскравий, оповідний' },
  vev: { id: 'ZwwNZP0QbNaQsoNgkPWr', note: 'чоловічий, глибокий, м’який' },
  torri: { id: 'a30ekmfK56EKHR341YaO', note: 'жіночий, молодий, київська вимова' },

  // Англомовні — лишаємо для порівняння, у курсі не використовуємо.
  sarah: { id: 'EXAVITQu4vr4xnSDxMaL', note: 'жіночий, спокійний (американський)' },
  george: { id: 'JBFqnCBsd6RMkjVDRZzb', note: 'чоловічий, оповідач (британський)' },
  daniel: { id: 'onwK4e9ZLuTAKqWW03F9', note: 'чоловічий, диктор (британський)' },
};

/** Українську тримає саме multilingual_v2; інші моделі ставлять наголоси навмання. */
const MODEL = 'eleven_multilingual_v2';

/**
 * З'єднання з ElevenLabs час від часу не піднімається з першого разу —
 * і без повтору через це падає весь прогін озвучки на двадцять реплік.
 */
async function withRetry(what, tries = 4) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try {
      return await what();
    } catch (e) {
      last = e;
      if (i < tries) {
        const wait = 1500 * i;
        console.log(`   спроба ${i} не вдалась (${e.cause?.code ?? e.message}), повтор через ${wait / 1000} с`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw last;
}

export async function say(voiceId, text, outPath, opts = {}) {
  return withRetry(() => sayOnce(voiceId, text, outPath, opts));
}

async function sayOnce(voiceId, text, outPath, opts = {}) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': env('ELEVENLABS_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: {
        stability: opts.stability ?? 0.5,
        similarity_boost: opts.similarity ?? 0.75,
        style: opts.style ?? 0.0,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  ensureDir(dirname(outPath));
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

/**
 * Вирівнювання гучності.
 *
 * Різні голоси ElevenLabs віддають різний рівень: один звучить на -17 дБ,
 * інший на -23. У ролику це чути як «тихе відео», а між уроками — як стрибок
 * гучності. Тому кожну репліку приводимо до -16 LUFS: це звичайний рівень
 * мовлення для веб-відео.
 */
export async function normalize(file) {
  const tmp = file.replace(/\.mp3$/, '.norm.mp3');
  await run('ffmpeg', [
    '-y', '-v', 'error', '-i', file,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '44100', '-b:a', '128k', tmp,
  ]);
  renameSync(tmp, file);
  return file;
}

/** Тривалість готового файлу — питаємо ffprobe, а не рахуємо за кількістю слів. */
export async function duration(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ]);
  return Number(stdout.trim());
}

/**
 * Пакетна озвучка уроку.
 *
 * Вхід — JSON: { "voice": "sarah", "lines": { "s1-a": "текст", ... } }
 * Вихід — mp3 поруч зі скриптом (тека `audio/`) і `voice.json` із тривалостями.
 */
export async function batch(scriptPath, outDir) {
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const voiceId = VOICES[script.voice]?.id ?? script.voice;
  // Голос важить мегабайти й переспівується будь-коли — тримаємо його поза git,
  // поруч із сирими дублями.
  const base = ensureDir(outDir ?? dirname(scriptPath));
  const audioDir = ensureDir(join(base, 'audio'));

  const out = {};
  for (const [key, text] of Object.entries(script.lines)) {
    const file = join(audioDir, `${key}.mp3`);
    await say(voiceId, text, file, script.settings);
    await normalize(file);
    const seconds = await duration(file);
    out[key] = { file: `audio/${key}.mp3`, seconds, text };
    console.log(`  ${key.padEnd(8)} ${seconds.toFixed(2)} с  ${text.slice(0, 60)}…`);
  }

  const voiceJson = join(base, 'voice.json');
  writeFileSync(voiceJson, JSON.stringify(out, null, 2) + '\n', 'utf8');
  const total = Object.values(out).reduce((s, v) => s + v.seconds, 0);
  console.log(`\nРазом мовлення: ${total.toFixed(1)} с → ${voiceJson}`);
  return out;
}

// --- CLI -------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === 'samples') {
    const line = 'Звичайне звернення громадянина. Подивимось, як відповісти на нього за п’ять хвилин.';
    const dir = ensureDir(join(OUT_DIR, 'voice-samples'));
    for (const [name, v] of Object.entries(VOICES)) {
      const p = await say(v.id, line, join(dir, `${name}.mp3`));
      console.log(`  ${name.padEnd(8)} ${v.note.padEnd(34)} → ${basename(p)}`);
    }
    console.log(`\nПрослухайте: ${dir}`);
  } else if (cmd === 'say') {
    const [voice, out, ...textParts] = rest;
    console.log(await say(VOICES[voice]?.id ?? voice, textParts.join(' '), out));
  } else if (cmd === 'normalize') {
    // Вирівняти вже згенеровані репліки й перерахувати voice.json.
    const dir = rest[0];
    const voiceJson = join(dir, 'voice.json');
    const data = JSON.parse(readFileSync(voiceJson, 'utf8'));
    for (const [key, line] of Object.entries(data)) {
      const file = join(dir, line.file);
      await normalize(file);
      line.seconds = await duration(file);
      console.log(`  ${key.padEnd(8)} ${line.seconds.toFixed(2)} с`);
    }
    writeFileSync(voiceJson, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`
Оновлено: ${voiceJson}`);
  } else if (cmd === 'batch') {
    await batch(rest[0], rest[1]);
  } else {
    console.log('Команди: samples | say <voice> <out.mp3> "текст" | batch <script.json> [тека]');
  }
}
