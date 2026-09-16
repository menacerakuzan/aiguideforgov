import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BrandMark } from '../parts/BrandMark';
import { PaperGround } from '../parts/DeviceFrame';
import { C, F, SPRING, SPRING_SOFT, s } from '../theme';

/**
 * Сцена 13 — фінал: «спільне фото» платформи.
 *
 * Будова свідомо максимальна за енергією: це найвища точка ролика, і вона має
 * бути помітно сильнішою за все попереднє. Кожен показаний розділ віддає сюди
 * свій елемент — картки світлофора даних, картку курсу, картку з бібліотеки, —
 * і всі вони злітаються навколо знака.
 *
 * Чому саме вирізані елементи, а не нові намальовані іконки. Глядач щойно бачив
 * ці картки в кадрі. Коли вони повертаються, фінал читається як підсумок
 * побаченого, а не як окрема заставка, приклеєна в кінці.
 *
 * Прильоти рознесені в часі й прискорюються: рівні інтервали читаються як
 * механіка, наростання — як рух до фіналу. Після того, як усе стало на місця,
 * кадр СТОЇТЬ — цілу секунду, і лише потім гасне.
 */

export const OUTRO_SEC = 13;

type Flyer = {
  src: string;
  /** Кінцеве місце відносно центру кадру. */
  x: number;
  y: number;
  w: number;
  rot: number;
  /** Звідки прилітає, у пікселях від кінцевої позиції. */
  from: { x: number; y: number };
  delay: number;
  /** Скільки кадрів триває сам політ. Коротший — швидший. */
  fly: number;
};

/**
 * Хто прилітає у фінал.
 *
 * Правило одне: кожен показаний розділ мусить мати тут свого представника.
 * У першій версії бракувало тесту й сертифіката — тобто рівно того, на чому
 * тримається довіра до платформи й на що витрачено дванадцять секунд ролика.
 * Тепер є і картка порога «90 %», і шлях до сертифіката.
 *
 * Затримки скорочуються (0 → 4 → 9 → 13 → 16 → 18 → 20 → 22), а час польоту
 * разом із ними: останні картки доганяють одна одну. Рівні інтервали читаються
 * як механіка, наростання — як рух до фіналу.
 */
const FLYERS: Flyer[] = [
  { src: 'textures/library-prompt1.png', x: -700, y: 246, w: 330, rot: -7, from: { x: -1180, y: 700 }, delay: 0, fly: 36 },
  { src: 'textures/quizdone-gate.png', x: 690, y: 250, w: 380, rot: 7, from: { x: 1220, y: 720 }, delay: 4, fly: 34 },
  { src: 'textures/courses-course1.png', x: -650, y: -215, w: 330, rot: -5, from: { x: -1260, y: -700 }, delay: 9, fly: 32 },
  { src: 'textures/dashboard-card1.png', x: 660, y: -225, w: 400, rot: 6, from: { x: 1300, y: -740 }, delay: 13, fly: 30 },
  { src: 'textures/home-tl-green.png', x: -300, y: 336, w: 300, rot: -3, from: { x: -700, y: 980 }, delay: 16, fly: 28 },
  { src: 'textures/home-tl-amber.png', x: 36, y: 372, w: 300, rot: 1, from: { x: 36, y: 1020 }, delay: 18, fly: 25 },
  { src: 'textures/home-tl-red.png', x: 372, y: 336, w: 300, rot: 4, from: { x: 760, y: 980 }, delay: 20, fly: 22 },
  { src: 'textures/dashboard-card2.png', x: 0, y: -400, w: 640, rot: -1, from: { x: 0, y: -940 }, delay: 22, fly: 24 },
];

/**
 * Фінал починається одразу. У першій версії перші вісім десятих секунди після
 * склейки кадр був порожній, і сцена відкривалася дірою — рівно там, де мав би
 * бути пік енергії ролика.
 */
const START = s(0.2);

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mark = spring({ frame: frame - s(2.2), fps, config: SPRING, durationInFrames: 30 });
  const line = spring({ frame: frame - s(3.4), fps, config: SPRING_SOFT, durationInFrames: 30 });
  const url = spring({ frame: frame - s(4.2), fps, config: SPRING_SOFT, durationInFrames: 26 });

  // Згасання наприкінці НЕМАЄ навмисно. Перша версія гасила фінал у порожній
  // папір, і останній кадр ролика — той самий, що стає обкладинкою в плеєрі й
  // у стрічці — виходив майже порожнім. Ролик закінчується на знаку.
  return (
    <AbsoluteFill>
      <PaperGround />

      {FLYERS.map((f) => {
        const t = spring({ frame: frame - START - f.delay, fps, config: SPRING, durationInFrames: f.fly });
        return (
          <Img
            key={f.src}
            src={staticFile(f.src)}
            style={{
              position: 'absolute',
              left: 960 + interpolate(t, [0, 1], [f.from.x, f.x]),
              top: 540 + interpolate(t, [0, 1], [f.from.y, f.y]),
              width: f.w,
              transform: `translate(-50%, -50%) rotate(${interpolate(t, [0, 1], [f.rot * 3, f.rot])}deg) scale(${interpolate(t, [0, 1], [0.7, 1])})`,
              opacity: Math.min(1, t * 2.2),
              filter: 'drop-shadow(0 26px 40px rgba(38,34,74,.22))',
            }}
          />
        );
      })}

      {/* Знак сідає ПОВЕРХ карток і в центрі: усе, що прилетіло, стає його
          оточенням, а не сусідами. */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 26 }}>
        <div style={{ opacity: mark, transform: `scale(${interpolate(mark, [0, 1], [0.8, 1])})` }}>
          <BrandMark size={150} delay={s(2.2)} pace={1.5} />
        </div>

        <div
          style={{
            fontFamily: F.head,
            fontSize: 104,
            fontWeight: 700,
            color: C.ink,
            opacity: line,
            transform: `translateY(${interpolate(line, [0, 1], [22, 0])}px)`,
          }}
        >
          ПРО.ШІ
        </div>

        <div
          style={{
            fontFamily: F.text,
            fontSize: 42,
            fontWeight: 500,
            color: C.inkSoft,
            opacity: url,
            transform: `translateY(${interpolate(url, [0, 1], [16, 0])}px)`,
            textAlign: 'center',
          }}
        >
          Безкоштовне навчання для органів влади
        </div>

        <div
          style={{
            marginTop: 8,
            padding: '14px 40px',
            borderRadius: 999,
            background: C.blue,
            color: C.white,
            fontFamily: F.head,
            fontSize: 44,
            fontWeight: 700,
            opacity: url,
            transform: `translateY(${interpolate(url, [0, 1], [16, 0])}px)`,
          }}
        >
          proai.od.gov.ua
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
