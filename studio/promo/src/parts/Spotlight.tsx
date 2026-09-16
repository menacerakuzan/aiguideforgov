import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { C, R, SPRING_SOFT } from '../theme';

/**
 * Підсвітка ділянки кадру: рамка плюс затемнення всього іншого.
 *
 * Чому саме так, а не стрілка. Намальована стрілка миттєво перетворює
 * продуктовий кадр на рекламний банер — той самий висновок зафіксовано і в
 * оснастці уроків. Затемнення працює інакше: воно нічого не додає в кадр, а
 * прибирає зайве, і погляд сам іде туди, де лишилось світло.
 *
 * Затемнення робиться однією тінню розміром у пів екрана
 * (`box-shadow: 0 0 0 9999px`), а не чотирма прямокутниками навколо: так між
 * рамкою й тінню не буває щілини в один піксель, яка світиться на світлому тлі.
 */
export const Spotlight: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Поле між рамкою й предметом, у пікселях сторінки.
   *
   * Не косметика. Рамка, притиснута до картки впритул, читається як помилка
   * верстки, а не як підсвітка: у першій версії ролика зазор виходив у п'ять
   * пікселів з одного боку й нуль з іншого — кільце просто ховалось під
   * карткою.
   */
  pad?: number;
  /** Затримка появи, кадри. */
  delay?: number;
  /**
   * Скільки кадрів підсвітка живе після появи. Без цього вона гасне разом зі
   * сценою — а предмет може поїхати з кадру раніше, і тоді світло лишається
   * там, де світити вже нема що.
   */
  life?: number;
  /** Наскільки гасне решта кадру. */
  dim?: number;
  label?: string;
}> = ({ x, y, w, h, pad = 12, delay = 0, life, dim = 0.3, label }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame: frame - delay, fps, config: SPRING_SOFT, durationInFrames: 26 });

  // Гасне або наприкінці власного строку, або разом зі сценою — дивлячись що
  // настане раніше.
  const endsAt = life === undefined ? durationInFrames : Math.min(delay + life, durationInFrames);
  const leave = interpolate(frame, [endsAt - 12, endsAt], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const alpha = enter * leave;

  // Рамка «доїжджає» ззовні всередину: на старті вона трохи більша за ділянку
  // й стискається до неї. Так видно, що підсвітили саме цей блок, а не просто
  // намалювали прямокутник.
  const slack = pad + interpolate(enter, [0, 1], [26, 0]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: alpha }}>
      <div
        style={{
          position: 'absolute',
          left: x - slack,
          top: y - slack,
          width: w + slack * 2,
          height: h + slack * 2,
          borderRadius: R.lg,
          border: `4px solid ${C.blue}`,
          boxShadow: `0 0 0 9999px rgba(38,34,74,${dim * alpha})`,
        }}
      />
      {label ? (
        <div
          style={{
            position: 'absolute',
            left: x + w / 2,
            top: y + h + slack + 20,
            transform: 'translateX(-50%)',
            padding: '12px 28px',
            borderRadius: R.pill,
            background: C.blue,
            color: C.white,
            fontFamily: '"Comfortaa", "Rubik", system-ui, sans-serif',
            fontSize: 34,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
