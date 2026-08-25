/**
 * Запис справжнього екрана через ffmpeg gdigrab (Windows).
 *
 * Чому не recordVideo самого Playwright: він не малює курсор — на відео кнопки
 * натискаються самі собою. gdigrab пише реальний робочий стіл разом із курсором
 * (-draw_mouse 1), а це означає, що в кадр потрапляє й провідник, і перетягування
 * файлу у вікно чату — тобто саме те, що в уроці треба показати.
 *
 * Знімаємо ділянку робочого столу, а не вікно за заголовком: захоплення вікна
 * обрізає все, що поза ним, і перетягування з провідника в кадр не влізе.
 */
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';

import { ensureDir } from './paths.mjs';

/**
 * Фізичний розмір екрана. Масштаб Windows (125 %) на це не впливає: gdigrab
 * бачить пікселі, а не логічні одиниці. Тому 1920×1080 знімаємо як 1920×1080,
 * без перерахунку — і кадр виходить рівно 1080p без ресемплу.
 */
export const CAPTURE = {
  width: Number(process.env.YASNO_W ?? 1920),
  height: Number(process.env.YASNO_H ?? 1080),
  x: Number(process.env.YASNO_X ?? 0),
  y: Number(process.env.YASNO_Y ?? 0),
};

/**
 * Один кадр екрана у файл. Потрібен на репетиції: відео не пишемо, але подивитись,
 * що саме зараз на екрані, треба — і бажано тими самими пікселями, якими потім
 * писатиметься дубль.
 */
export async function grabFrame(outPath, box = {}) {
  const area = { ...CAPTURE, ...box };
  ensureDir(dirname(outPath));
  const args = [
    '-y', '-v', 'error',
    '-f', 'gdigrab',
    '-framerate', '1',
    '-offset_x', String(area.x),
    '-offset_y', String(area.y),
    '-video_size', `${area.width}x${area.height}`,
    '-i', 'desktop',
    '-frames:v', '1',
    outPath,
  ];
  await new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(outPath) : reject(new Error(err.slice(-500)))));
  });
  return outPath;
}

export function startRecording(outPath, { fps = 30, ...box } = {}) {
  const area = { ...CAPTURE, ...box };
  ensureDir(dirname(outPath));

  const args = [
    '-y',
    '-f', 'gdigrab',
    '-draw_mouse', '1',
    '-framerate', String(fps),
    // Для gdigrab ділянка задається ДО -i: після нього це вже параметри виводу.
    '-offset_x', String(area.x),
    '-offset_y', String(area.y),
    '-video_size', `${area.width}x${area.height}`,
    '-i', 'desktop',
    // Сирий дубль пишемо якісно й дешево по процесору: стискати будемо на монтажі,
    // а тут головне — не загубити кадри під час зйомки.
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    outPath,
  ];

  const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  const exited = new Promise((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', (code) => {
      // 255 — нормальний вихід після 'q'.
      if (code === 0 || code === 255) resolve(outPath);
      else reject(new Error(`ffmpeg вийшов з кодом ${code}:\n${stderr.slice(-2000)}`));
    });
  });

  return {
    outPath,
    /** Коректно закінчити запис: 'q' у stdin, щоб файл закрився з правильним індексом. */
    async stop() {
      proc.stdin.write('q');
      proc.stdin.end();
      return exited;
    },
  };
}
