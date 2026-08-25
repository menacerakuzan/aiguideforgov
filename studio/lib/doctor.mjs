/**
 * Перевірка готовності до зйомки. Запускати перед кожною зміною —
 * дешевше, ніж виявити брак посеред дубля.
 *
 *   node lib/doctor.mjs
 */
import { execFile } from 'node:child_process';
import https from 'node:https';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { CAPTURE } from './screen.mjs';
import { cdpAlive, CDP_PORT } from './chrome.mjs';
import { CHROME_PROFILE, STUDIO_DIR, chromeExe, env } from './paths.mjs';

const run = promisify(execFile);
const results = [];
const ok = (name, detail) => results.push(['✅', name, detail]);
const bad = (name, detail) => results.push(['❌', name, detail]);
const warn = (name, detail) => results.push(['⚠️ ', name, detail]);

// Node
ok('Node.js', process.version);

// ffmpeg + gdigrab: наявності мало, треба саме той формат, яким пишемо екран.
try {
  const { stdout } = await run('ffmpeg', ['-hide_banner', '-formats'], { maxBuffer: 8 << 20 });
  const version = (await run('ffmpeg', ['-version'])).stdout.split('\n')[0];
  if (stdout.includes('gdigrab')) ok('ffmpeg + gdigrab', version.slice(0, 60));
  else bad('ffmpeg', 'збірка без gdigrab — запис екрана неможливий');
} catch {
  bad('ffmpeg', 'не знайдено в PATH');
}

// ffprobe — ним міряємо тривалості озвучки, без нього монтажний план сліпий.
try {
  await run('ffprobe', ['-version']);
  ok('ffprobe', 'є');
} catch {
  bad('ffprobe', 'не знайдено в PATH');
}

// Chrome
try {
  ok('Chrome', chromeExe());
} catch (e) {
  bad('Chrome', e.message);
}

// Профіль для зйомки
if (existsSync(join(CHROME_PROFILE, 'Default'))) ok('Профіль зйомки', CHROME_PROFILE);
else warn('Профіль зйомки', `порожній — запустіть "npm run chrome" і увійдіть у демо-акаунт`);

// Порт налагодження
if (await cdpAlive()) ok('Chrome на CDP', `порт ${CDP_PORT} відповідає`);
else warn('Chrome на CDP', `порт ${CDP_PORT} мовчить — браузер для зйомки не відкрито`);

// Playwright
if (existsSync(join(STUDIO_DIR, 'node_modules', 'playwright-core'))) ok('playwright-core', 'встановлено');
else bad('playwright-core', 'немає — виконайте npm install у studio/');

// ElevenLabs.
// Навмисно node:https, а не fetch: fetch тримає з'єднання відкритим ще кілька
// секунд після відповіді, і скрипт або висить, або падає на виході з асертом
// libuv. Тут з'єднання закривається одразу.
try {
  const key = env('ELEVENLABS_KEY');
  const body = await new Promise((resolve, reject) => {
    const req = https.request(
      'https://api.elevenlabs.io/v1/voices',
      { headers: { 'xi-api-key': key }, agent: new https.Agent({ keepAlive: false }), timeout: 20000 },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, data }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('час вийшов')));
    req.on('error', reject);
    req.end();
  });
  if (body.status === 200) ok('ElevenLabs', `ключ живий, голосів: ${JSON.parse(body.data).voices.length}`);
  else bad('ElevenLabs', `${body.status} ${body.data.slice(0, 120)}`);
} catch (e) {
  bad('ElevenLabs', e.message);
}

// Кадр
ok('Ділянка запису', `${CAPTURE.width}×${CAPTURE.height} від (${CAPTURE.x}, ${CAPTURE.y})`);

const pad = Math.max(...results.map(([, name]) => name.length));
console.log();
for (const [mark, name, detail] of results) console.log(`${mark} ${name.padEnd(pad)}  ${detail}`);
console.log();

const failed = results.filter(([m]) => m === '❌').length;
process.exit(failed ? 1 : 0);
