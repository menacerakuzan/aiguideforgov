/**
 * Візуальна мова відео — та сама, що на платформі.
 *
 * Ролик відкривають із уроку, і він не має виглядати гостем з іншого сайту:
 * ті самі кольори, ті самі круглі форми, той самий пружний рух. Джерело —
 * `docs/design-reference/styles.css`; тут лише те, що справді потрібне відео.
 *
 * Одна свідома відмінність від сайту: у відео більше повітря й крупніший
 * кегль. Сторінку читають з півметра, ролик часто дивляться з телефона.
 */

export const FPS = 30;

/** Секунди → кадри. Монтажний план пишемо в секундах, Remotion рахує в кадрах. */
export const s = (sec: number) => Math.round(sec * FPS);

export const C = {
  paper: '#FFF9F0',
  paper2: '#FBF2E4',
  white: '#FFFFFF',
  ink: '#26224A',
  inkSoft: '#5D5880',
  inkMute: '#6E6992',

  blue: '#3763E8',
  blueDeep: '#2749B8',
  blueTint: '#E7EDFE',
  sun: '#FFC93D',
  sunDeep: '#6B4A00',
  sunTint: '#FFF3D4',

  green: '#0C8455',
  greenTint: '#DEF7EC',
  amber: '#F5A31A',
  amberTint: '#FDF0D7',
  red: '#CC3E27',
  redTint: '#FDE7E2',

  glow: 'rgba(38, 34, 74, .14)',
  glowBlue: 'rgba(62, 109, 245, .32)',
  glowSun: 'rgba(255, 201, 61, .36)',
} as const;

/** Мінімальний радіус у системі — 18. Нічого гострого в кадрі немає. */
export const R = { sm: 18, md: 26, lg: 34, xl: 44, pill: 999 } as const;

export const F = {
  head: '"Comfortaa", "Rubik", system-ui, sans-serif',
  text: '"Rubik", system-ui, sans-serif',
} as const;

/** Тінь clay: м'яка, знизу, без чорноти. */
export const clay = (lift = 1) =>
  `0 ${18 * lift}px ${36 * lift}px -${14 * lift}px ${C.glow}, 0 2px 0 rgba(255,255,255,.9) inset`;

/**
 * Рух. Сайт пружинить — відео теж, але стриманіше: сильний відскок на кожному
 * елементі за десять хвилин уроку втомлює.
 */
type Spring = { damping: number; mass: number; stiffness: number };

export const SPRING: Spring = { damping: 200, mass: 0.6, stiffness: 140 };
export const SPRING_SOFT: Spring = { damping: 200, mass: 0.9, stiffness: 90 };
