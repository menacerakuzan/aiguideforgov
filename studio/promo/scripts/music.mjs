/**
 * Генерує музичне тло промо через ElevenLabs Music.
 *
 * Навіщо генерувати, а не взяти готове. У студії вже є трек — але це той самий
 * хаус, під який змонтовано трейлер курсу: біт, що тягне увагу на себе. Для
 * презентації, де весь сенс несе голос, потрібне протилежне — рівний тихий
 * фон, який не помічають. У бібліотеці скіла всі п'ять доступних треків так
 * само бітові.
 *
 * Довжина замовляється під ГОТОВИЙ хронометраж ролика (`TOTAL_SEC` у
 * `src/Main.tsx`): так природне загасання треку припадає на фінальний кадр, і
 * зациклювати нічого не треба — а стик циклу чути завжди.
 *
 * Ключ у `.env` називається `ELEVENLABS_KEY` — той самий, що для озвучки.
 *
 * Запуск: npm run music
 * Результат: public/audio/music.mp3. У git не потрапляє (як і решта public).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { env } from '../../lib/paths.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../public/audio/music.mp3');

/**
 * Довжина ролика в секундах. Тримається тут, а не читається з `Main.tsx`:
 * той файл на TypeScript і з JSX, і тягти заради одного числа складання
 * проєкту — дорожче, ніж звірити число руками при зміні хронометражу.
 */
const TOTAL_SEC = Number(process.argv[2] ?? 113.6);

/**
 * Опис треку.
 *
 * Дві групи вимог, і обидві доводилося задавати явно.
 *
 * ЩО НЕ ТРЕБА: ударних, вокалу, наростань і спадів. Перші спроби без цих
 * заперечень давали музику з «кінематографічним» підйомом, який під голосом
 * читається як тривога.
 *
 * ЯКИЙ НАСТРІЙ: світлий і теплий. Перший готовий трек користувач відхилив —
 * «якась вона сумна»: модель за замовчуванням тяжіє до мінору, і спокій
 * виходить меланхолійним. Мажор, доброзичливість і відсутність смутку
 * доводиться називати так само прямо, як і відсутність барабанів.
 */
const PROMPT = [
  'Calm, warm and quietly optimistic corporate presentation background music.',
  'Bright major key, friendly and light, gently uplifting.',
  'Soft piano with warm pads and light plucks underneath.',
  'Absolutely no drums, no percussion, no vocals, no build-ups and no drops.',
  'Not sad, not melancholic, no minor key, no tension, no dramatic mood.',
  'Steady, even dynamics from start to finish, designed to sit quietly under a',
  'narrator voice and never pull attention.',
].join(' ');

const key = env('ELEVENLABS_KEY');

console.log(`замовляємо ${TOTAL_SEC.toFixed(1)} с музики…`);

const res = await fetch('https://api.elevenlabs.io/v1/music', {
  method: 'POST',
  headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: PROMPT, music_length_ms: Math.round(TOTAL_SEC * 1000) }),
});

if (!res.ok) {
  throw new Error(`ElevenLabs Music: ${res.status} ${await res.text()}`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(await res.arrayBuffer()));

const seconds = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT])
    .toString()
    .trim(),
);

// Рівність важливіша за гучність: під голосом помітний не рівень, а перепади.
// LRA понад 6 LU означає, що в треку є наростання, і його чутно як хвилю.
// ffmpeg пише вимір у stderr, а не в stdout — execFileSync повернув би порожньо.
const report = spawnSync('ffmpeg', ['-i', OUT, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], {
  encoding: 'utf8',
});
const lra = (report.stderr ?? '').match(/LRA:\s+([\d.]+) LU/);

console.log(`  ${OUT}`);
console.log(`  ${seconds.toFixed(1)} с, розмах гучності ${lra ? lra[1] : '?'} LU`);
if (lra && Number(lra[1]) > 6) {
  console.log('  ⚠ розмах великий — у треку є наростання, послухайте перед рендером');
}
