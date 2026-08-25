/**
 * Перевірка конвеєра без Gemini й без входу в акаунт.
 *
 * Що доводить цей дубль: ffmpeg пише екран разом із курсором, Playwright
 * керує вже відкритим Chrome, справжній курсор Windows їздить по екрану,
 * текст набирається в людському темпі. Якщо смоук пройшов — брак у зйомці
 * шукаємо в сценарії уроку, а не в оснастці.
 *
 *   node lib/chrome.mjs      (один раз, вікно лишити відкритим)
 *   node record/smoke.mjs
 */
import { join } from 'node:path';
import { chromium } from 'playwright-core';

import { CDP_PORT, cdpAlive } from '../lib/chrome.mjs';
import { OUT_DIR, ensureDir } from '../lib/paths.mjs';
import { beat, hold, pause, typeText } from '../lib/human.mjs';
import { elementOnScreen, openMouse } from '../lib/mouse.mjs';
import { startRecording } from '../lib/screen.mjs';

if (!(await cdpAlive())) {
  console.error(`Chrome на порту ${CDP_PORT} не відповідає. Спершу: node lib/chrome.mjs`);
  process.exit(1);
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());

const out = join(ensureDir(join(OUT_DIR, 'smoke')), 'smoke.mp4');
const rec = startRecording(out);
const mouse = openMouse();

try {
  await pause(1200); // ffmpeg має встигнути відкрити файл

  // Проста сторінка з полем вводу — жодних зовнішніх сервісів.
  await page.goto('data:text/html,' + encodeURIComponent(`
    <meta charset="utf-8">
    <style>
      body { margin:0; height:100vh; display:grid; place-items:center;
             background:#0e1116; color:#e8ecf3;
             font:400 20px/1.5 "Segoe UI", system-ui, sans-serif; }
      .card { width:min(760px,80vw); padding:40px; border-radius:18px;
              background:#161b22; border:1px solid #263041; }
      h1 { margin:0 0 18px; font-size:26px; font-weight:600; }
      p  { margin:0 0 22px; color:#9aa6b8; }
      textarea { width:100%; height:120px; padding:16px; border-radius:12px;
                 border:1px solid #2d3a4d; background:#0e1116; color:#e8ecf3;
                 font:inherit; resize:none; }
      textarea:focus { outline:2px solid #3763e8; }
    </style>
    <div class="card">
      <h1>Перевірка знімального конвеєра</h1>
      <p>Курсор має доїхати до поля, текст — набратися в людському темпі.</p>
      <textarea id="t" placeholder="Тут з'явиться текст…"></textarea>
    </div>
  `));
  await hold();

  // Справжній курсор Windows — той, що видно в кадрі.
  const field = page.locator('#t');
  const target = await elementOnScreen(page, field);
  await mouse.jump(target.x + 420, target.y + 260);
  await beat();
  await mouse.glide(target.x, target.y, { ms: 900 });
  await beat();

  await typeText(field, 'Підготуй проєкт офіційної відповіді на звернення громадянина.', { cps: 16 });
  await hold();
} finally {
  await mouse.close();
  await rec.stop();
  await browser.close();
}

console.log(`Готово: ${out}`);
