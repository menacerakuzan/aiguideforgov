import { interpolate, Easing, useCurrentFrame } from 'remotion';

import { C, R } from '../theme';

/**
 * Курсор і клац — намальовані, а не зняті.
 *
 * Системний курсор Windows на 1080p завбільшки з двадцять пікселів: у кадрі,
 * який дивляться з телефона, його просто не видно, а сам клац узагалі не має
 * жодного вигляду. Тому курсор малюємо крупнішим за справжній і додаємо до
 * нього хвилю — саме вона, а не рух стрілки, читається як натискання.
 *
 * Побічна вигода: траєкторія не залежить від того, як швидко відгукується
 * сторінка. Ми не знімаємо клацання, ми його ставимо.
 */

export type CursorMove = {
  /** Кадр, на якому курсор виходить із точки. */
  from: number;
  /** Кадр, на якому він приходить у точку. */
  to: number;
  x: number;
  y: number;
};

/**
 * Рука не стартує ривком і не гальмує різко — і не летить строго по прямій:
 * пряма лінія читається як машина. Невелика дуга дає живий рух без метушні.
 */
const HAND = Easing.bezier(0.42, 0, 0.18, 1);

export const Cursor: React.FC<{
  path: CursorMove[];
  /** Кадри, на яких відбувається натискання. */
  clicks?: number[];
  hidden?: boolean;
}> = ({ path, clicks = [], hidden }) => {
  const frame = useCurrentFrame();
  if (hidden || path.length === 0) return null;

  const first = path[0];
  if (!first) return null;

  let x = first.x;
  let y = first.y;
  let prev = first;

  for (const move of path) {
    if (frame >= move.to) {
      x = move.x;
      y = move.y;
      prev = move;
      continue;
    }
    if (frame >= move.from) {
      const t = interpolate(frame, [move.from, move.to], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: HAND,
      });
      x = interpolate(t, [0, 1], [prev.x, move.x]);
      y = interpolate(t, [0, 1], [prev.y, move.y]);
      // Дуга: середина шляху трохи піднята. Амплітуда залежить від довжини —
      // на коротких переходах вигин непомітний, на довгих не перетворюється на
      // петлю.
      const lift = Math.min(70, Math.hypot(move.x - prev.x, move.y - prev.y) * 0.12);
      y -= Math.sin(t * Math.PI) * lift;
      break;
    }
    break;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {clicks.map((at) => {
        const age = frame - at;
        if (age < 0 || age > 26) return null;
        const t = age / 26;
        return (
          <div
            key={at}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 34,
              height: 34,
              marginLeft: -17,
              marginTop: -17,
              borderRadius: R.pill,
              border: `3px solid ${C.blue}`,
              transform: `scale(${interpolate(t, [0, 1], [0.5, 3.4])})`,
              opacity: interpolate(t, [0, 0.25, 1], [0.9, 0.7, 0]),
            }}
          />
        );
      })}

      <svg
        width="46"
        height="52"
        viewBox="0 0 24 28"
        style={{ position: 'absolute', left: x, top: y, filter: 'drop-shadow(0 4px 7px rgba(26,23,48,.45))' }}
        aria-hidden
      >
        <path d="M3 2.2 L3 22.4 L8.1 17.6 L11.6 25.2 L14.9 23.7 L11.5 16.3 L18.6 16.1 Z" fill={C.white} />
        <path
          d="M3 2.2 L3 22.4 L8.1 17.6 L11.6 25.2 L14.9 23.7 L11.5 16.3 L18.6 16.1 Z"
          fill="none"
          stroke={C.ink}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
