import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { C, SPRING, SPRING_SOFT } from '../theme';

/**
 * Знак «ПРО.ШІ», який збирається в кадрі.
 *
 * Геометрія — один в один із сайту (`packages/ui/src/components/brand-mark.tsx`):
 * монограма «Ш» у синій clay-плашці, крапка над правою щоглою добирає «І».
 * Перемальовувати знак «красивіше для відео» не можна: глядач приходить із
 * платформи, і в ролику має бути рівно той знак, який щойно бачив у шапці.
 *
 * Рух — три такти, і кожен наступний починається, коли попередній уже
 * впізнаваний:
 *   1. плашка прилітає з невеликим поворотом і сідає (пружина з відскоком);
 *   2. монограма «Ш» ВИМАЛЬОВУЄТЬСЯ, а не проявляється — саме по обведенню
 *      видно, що це літера, а не абстрактна фігура;
 *   3. жовта крапка стрибає останньою: вона й перетворює «Ш» на «ШІ», тому
 *      мусить читатись окремою подією, а не з'явитись разом із рештою.
 *
 * Зсунуту тінь (`--toon-shadow` на сайті) анімуємо окремо: вона доїжджає на
 * своє місце трохи пізніше за плашку. Без цього знак виглядає пласким рівно в
 * той момент, коли на нього дивляться найуважніше.
 */
export const BrandMark: React.FC<{
  size: number;
  /** Затримка початку збирання, у кадрах. */
  delay?: number;
  /**
   * Розтягнення всієї дуги. 1 — темп уроків, більше — повільніше.
   *
   * У заставці промо знак збирався за вісім десятих секунди: для підпису в
   * кутку урока цього досить, а для головного героя відкриття — ні. Правило
   * жанру вимагає щонайменше трьох секунд на повну дугу руху, інакше глядач
   * не встигає її прочитати як подію.
   */
  pace?: number;
}> = ({ size, delay = 0, pace = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Уповільнюємо не кожну пружину окремо, а сам плин часу для цього знака:
  // так співвідношення між тактами лишається тим самим, що й в уроках.
  const local = (frame - delay) / pace;

  const at = (d: number, config = SPRING) =>
    spring({ frame: local - d, fps, config, durationInFrames: 26 });

  const plate = at(0, SPRING_SOFT);
  const shade = at(5, SPRING_SOFT);
  const dot = at(30);

  // Обведення монограми. `pathLength` НОРМУЄ довжину шляху до цього числа,
  // тому справжню довжину кривої міряти не треба: dasharray, що дорівнює LEN,
  // за побудовою вкриває весь штрих рівно. Саме число довільне — важливо лише,
  // щоб dasharray, dashoffset і pathLength були одним і тим самим LEN.
  const LEN = 44;
  const draw = interpolate(local, [14, 34], [LEN, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ overflow: 'visible', display: 'block' }}
      role="img"
      aria-label="ПРО.ШІ"
    >
      <rect
        x="5.5" y="5.5" width="31" height="31" rx="10.5"
        fill={C.ink}
        style={{
          opacity: shade,
          transform: `translate(${interpolate(shade, [0, 1], [-4, 0])}px, ${interpolate(shade, [0, 1], [-4, 0])}px)`,
        }}
      />
      <rect
        x="2.5" y="2" width="31" height="31" rx="10.5"
        fill={C.blue}
        stroke={C.ink}
        strokeWidth="3"
        style={{
          opacity: plate,
          transformBox: 'fill-box',
          transformOrigin: 'center',
          transform: `rotate(${interpolate(plate, [0, 1], [-9, 0])}deg) scale(${interpolate(plate, [0, 1], [0.82, 1])})`,
        }}
      />
      <path
        d="M11.2 11.4V23.2h13.6V11.4M18 11.4V23.2"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={LEN}
        strokeDasharray={LEN}
        strokeDashoffset={draw}
      />
      <circle
        cx="27.8" cy="8.9" r="2.4"
        fill={C.sun}
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'center',
          // Легкий перестрибом через 1: крапка «сідає» на місце, а не
          // проявляється. Це єдиний елемент знака, якому дозволено відскок.
          transform: `scale(${interpolate(dot, [0, 0.7, 1], [0, 1.35, 1])})`,
          opacity: dot > 0 ? 1 : 0,
        }}
      />
    </svg>
  );
};
