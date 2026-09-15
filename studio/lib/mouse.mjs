/**
 * Миша, клавіатура й вікна Windows — клієнт до `lib/win.py`.
 *
 * Сам механізм живе в Python (pywinauto): там UI Automation, і те, на що в
 * PowerShell ішло по сто рядків, робиться в один. Тут лишається тонкий
 * клієнт: підняти процес, слати JSON по рядку, чекати відповідь.
 *
 * Протокол — JSON, а не пробіли, як було: шлях «C:\\...\\Рабочий стол\\...»
 * містить пробіли, і в рядковому протоколі його доводилось паковати в
 * base64. Тепер це просто значення поля.
 *
 * Рухи інтерполює Python. Раніше Node слав по команді на кожен крок у 16 мс
 * — сорок із гаком обмінів на один рух, і курсор від цього смикався.
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

import { STUDIO_DIR } from './paths.mjs';
import { sleep } from './human.mjs';

const WIN_PY = join(STUDIO_DIR, 'lib', 'win.py');

export function openMouse() {
  const proc = spawn('python', [WIN_PY, 'serve'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
  });

  /**
   * Черга обіцянок по рядках stdout: одна відповідь — один resolve.
   *
   * Не `.once('data')`: Windows складає кілька відповідей в один chunk, і
   * `.once` бачить лише перший рядок — решта тихо губиться, а всі наступні
   * команди починають чекати вже не своєї відповіді.
   */
  const pending = [];
  createInterface({ input: proc.stdout }).on('line', (line) => {
    const next = pending.shift();
    if (!next) return;
    try {
      const msg = JSON.parse(line);
      msg.ok ? next.resolve(msg) : next.reject(new Error(msg.error));
    } catch {
      next.reject(new Error(`Незрозуміла відповідь: ${line.slice(0, 200)}`));
    }
  });

  // stderr читаємо завжди, навіть якщо він нікому не потрібен: досить одного
  // попередження, щоб забити буфер каналу, — тоді дочірній процес блокується
  // на записі назавжди, а разом з ним і весь дубль. Симптом підступний —
  // скрипт просто зависає без жодної помилки.
  let stderrBuf = '';
  proc.stderr.on('data', (d) => { stderrBuf += d.toString(); });

  const exited = new Promise((resolve) => proc.on('exit', resolve));

  const send = (msg, { timeoutMs = 15000 } = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(
        `Немає відповіді на ${msg.cmd} за ${timeoutMs} мс. `
        + `stderr: ${stderrBuf.slice(-500) || '(порожньо)'}`,
      ));
    }, timeoutMs);
    pending.push({
      resolve: (r) => { clearTimeout(timer); resolve(r); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    proc.stdin.write(JSON.stringify(msg) + '\n');
  });

  return {
    /** Миттєве перенесення — тільки коли курсор поза кадром. */
    jump: (x, y) => send({ cmd: 'jump', x: Math.round(x), y: Math.round(y) }),

    /** Довести курсор до точки: рух зі сповільненням наприкінці, як рукою. */
    glide: (x, y, { ms = 700 } = {}) => send(
      { cmd: 'glide', x: Math.round(x), y: Math.round(y), ms },
      { timeoutMs: ms + 15000 },
    ),

    down: () => send({ cmd: 'down' }),
    up: () => send({ cmd: 'up' }),
    click: () => send({ cmd: 'click' }),
    doubleClick: () => send({ cmd: 'doubleclick' }),

    /** Перетягнути: натиснути, довезти, відпустити. */
    dragTo: (x, y, { ms = 1400 } = {}) => send(
      { cmd: 'drag', x: Math.round(x), y: Math.round(y), ms },
      { timeoutMs: ms + 15000 },
    ),

    /** Друк у кадрі — по символу, людським темпом. */
    type: (text, { cps = 14 } = {}) => send(
      { cmd: 'type', text, cps },
      { timeoutMs: (text.length / cps) * 1000 + 20000 },
    ),

    /** Спеціальна клавіша в нотації pywinauto, напр. '{ENTER}'. */
    key: (name) => send({ cmd: 'key', name }),

    /**
     * Сполучення з Ctrl/Alt/Shift — 'ctrl+f', 'ctrl+end', 'ctrl+shift+home'.
     *
     * Саме воно, а не `key('^f')`, скрізь, де в сполученні є ЛІТЕРА.
     * `key` набирає символ через поточну розкладку клавіатури, і якщо
     * активна українська чи російська, латинської літери в ній просто немає
     * — натискання не відбувається, причому мовчки, без помилки. `hotkey`
     * тисне фізичну клавішу за віртуальним кодом і від розкладки не
     * залежить (докладно — в lib/win.py, cmd_hotkey).
     */
    hotkey: (keys) => send({ cmd: 'hotkey', keys }),
    enter: () => send({ cmd: 'key', name: '{ENTER}' }),
    escape: () => send({ cmd: 'key', name: '{ESC}' }),

    /** Що зараз відкрито — звірити сцену перед дублем. */
    windows: () => send({ cmd: 'windows' }),

    /** Згорнути все: чистий стіл перед першим кадром. */
    clear: () => send({ cmd: 'clear' }, { timeoutMs: 20000 }),

    /**
     * Вивести вікно наперед — за підрядком заголовка або за класом.
     * Нативний діалог «Відкрити» шукається тільки за класом `#32770`:
     * він дочірнє вікно chrome.exe й власного запису серед процесів не має.
     */
    front: (opts) => send({ cmd: 'front', ...opts }, { timeoutMs: 25000 }),

    /** Координати центру елемента в діалозі «Відкрити» (підрядок імені). */
    dialogFind: (name) => send({ cmd: 'dialog_find', name }, { timeoutMs: 25000 }),

    /**
     * Прибрати діалог, якщо лишився відкритим.
     * Забутий модальний діалог з'їдає ВСІ наступні кліки — вони йдуть йому,
     * а не сторінці, і виглядає це так, ніби зламались кнопки на сайті.
     */
    dialogClose: () => send({ cmd: 'dialog_close' }, { timeoutMs: 10000 }),

    async close() {
      proc.stdin.write(JSON.stringify({ cmd: 'bye' }) + '\n');
      proc.stdin.end();
      // Чекаємо справжнього виходу: інакше наступний openMouse() у тому ж
      // дублі може зіткнутися з ще живим попереднім процесом.
      await Promise.race([exited, sleep(3000)]);
    },
  };
}

/**
 * Точка сторінки (CSS-пікселі) → фізична точка екрана.
 *
 * Між ними два перетворення: зсув вікна на робочому столі й масштаб Windows.
 * Питаємо про них саму сторінку, щоб не зашивати ні 125 %, ні висоту панелі
 * вкладок — на іншій машині вони інші.
 */
export async function toScreen(page, { x, y }) {
  const m = await page.evaluate(() => ({
    ox: window.screenX + (window.outerWidth - window.innerWidth),
    oy: window.screenY + (window.outerHeight - window.innerHeight),
    dpr: window.devicePixelRatio,
  }));
  return { x: Math.round((m.ox + x) * m.dpr), y: Math.round((m.oy + y) * m.dpr) };
}

/** Центр елемента сторінки у фізичних координатах екрана. */
export async function elementOnScreen(page, locator, opts) {
  const box = await locator.boundingBox(opts);
  if (!box) throw new Error('Елемент не видно на екрані.');
  return toScreen(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
}
