/**
 * Курсор на рівні системи, а не сторінки.
 *
 * Навіщо: у модулі 2 треба показати, як людина перетягує файл із провідника у
 * вікно чату. Playwright такого не вміє — він живе всередині сторінки й про
 * провідник не знає. Тому рухаємо справжній курсор Windows через user32.dll.
 *
 * Один довгий процес PowerShell, який читає команди з stdin: піднімати окремий
 * PowerShell на кожен крок руху — це секунда на крок, і плавного руху не вийде.
 *
 * Координати — ФІЗИЧНІ пікселі екрана, ті самі, що бачить gdigrab. Тому в
 * PowerShell одразу вмикаємо DPI-обізнаність: без неї Windows перерахує
 * координати за масштабом 125 % і курсор поїде не туди.
 */
import { spawn } from 'node:child_process';

import { sleep } from './human.mjs';

const PS_BACKEND = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Cur {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, int e);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[Cur]::SetProcessDPIAware() | Out-Null
while ($line = [Console]::In.ReadLine()) {
  $p = $line.Split(' ')
  switch ($p[0]) {
    'move' { [Cur]::SetCursorPos([int]$p[1], [int]$p[2]) | Out-Null }
    'down' { [Cur]::mouse_event(0x0002, 0, 0, 0, 0) }
    'up'   { [Cur]::mouse_event(0x0004, 0, 0, 0, 0) }
    'bye'  { exit }
  }
  [Console]::Out.WriteLine('ok')
}
`;

export function openMouse() {
  const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  proc.stdin.write(PS_BACKEND + '\n');

  const send = (cmd) => new Promise((resolve) => {
    proc.stdout.once('data', () => resolve());
    proc.stdin.write(cmd + '\n');
  });

  let at = { x: 0, y: 0 };

  return {
    /** Миттєве перенесення — тільки коли курсор поза кадром. */
    async jump(x, y) { at = { x, y }; await send(`move ${Math.round(x)} ${Math.round(y)}`); },

    /**
     * Довести курсор до точки за час `ms`. Рух зі сповільненням наприкінці:
     * так людина й рухає мишею, і глядач встигає побачити ціль.
     */
    async glide(x, y, { ms = 700 } = {}) {
      const from = at;
      const steps = Math.max(8, Math.round(ms / 16));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const e = 1 - Math.pow(1 - t, 3);
        await send(`move ${Math.round(from.x + (x - from.x) * e)} ${Math.round(from.y + (y - from.y) * e)}`);
        await sleep(16);
      }
      at = { x, y };
    },

    async down() { await send('down'); },
    async up() { await send('up'); },

    /**
     * Перетягування: натиснути, довезти, відпустити.
     * Пауза після натискання обов'язкова — Windows має встигнути почати
     * перетягування, інакше вийде звичайний клац, і файл нікуди не поїде.
     */
    async dragTo(x, y, { ms = 1400 } = {}) {
      await this.down();
      await sleep(220);
      await this.glide(x, y, { ms });
      await sleep(320);
      await this.up();
    },

    async close() { proc.stdin.write('bye\n'); proc.stdin.end(); },
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
export async function elementOnScreen(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Елемент не видно на екрані.');
  return toScreen(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
}
