import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadComfortaa } from '@remotion/google-fonts/Comfortaa';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

import { C, FPS, R, SPRING, SPRING_SOFT, clay } from '../theme';
import { CAPTION_BAND, SCREEN, STAGE } from './layout';

// Вантажимо тільки те, що справді в кадрі: кирилицю й чотири накреслення.
// Без цього Remotion тягне всі підмножини всіх ваг — сотня зайвих запитів
// на кожен кадр рендера.
const SUBSETS: ('cyrillic' | 'latin')[] = ['cyrillic', 'latin'];

const { fontFamily: comfortaa } = loadComfortaa('normal', { subsets: SUBSETS, weights: ['600', '700'], ignoreTooManyRequestsWarning: true });
const { fontFamily: rubik } = loadRubik('normal', { subsets: SUBSETS, weights: ['400', '500', '600', '700'], ignoreTooManyRequestsWarning: true });

export const HEAD = comfortaa;
export const TEXT = rubik;

/** Спільна пружинка: усе з'являється однаково, тому кадр не смикається. */
const rise = (frame: number, fps: number, delay = 0, config = SPRING) =>
  spring({ frame: frame - delay, fps, config, durationInFrames: 24 });

/**
 * Підпис кроку.
 *
 * Стоїть в одному місці весь ролик — угорі ліворуч, поверх інтерфейсу. Глядач
 * у будь-який момент бачить, на якому він кроці, і не мусить тримати це в
 * голові. З'їжджає збоку, а не вигулькує: різкий рух ловить око сильніше, ніж
 * сам підпис.
 */
export const StepChip: React.FC<{ label: string; out?: number }> = ({ label, out }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (!label) return null;

  const enter = rise(frame, fps, 6, SPRING_SOFT);
  const leaveAt = out ?? durationInFrames - 12;
  const leave = interpolate(frame, [leaveAt, leaveAt + 12], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: SCREEN.y + 26,
        left: SCREEN.x + 26,
        padding: '16px 32px',
        borderRadius: R.pill,
        background: C.white,
        boxShadow: clay(0.8),
        fontFamily: HEAD,
        fontSize: 34,
        fontWeight: 700,
        color: C.ink,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transform: `translateX(${interpolate(enter, [0, 1], [-40, 0])}px)`,
        opacity: enter * leave,
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: R.pill, background: C.blue }} />
      {label}
    </div>
  );
};

/**
 * Значок прискорення.
 *
 * Показуємо завжди, коли час у кадрі стиснуто. Мовчазне прискорення читається
 * як «у мене вийшло миттєво» — і людина потім дивується, чому в неї не так.
 */
export const SpeedBadge: React.FC<{ speed: number }> = ({ speed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (speed <= 1) return null;

  const enter = rise(frame, fps, 10);
  const label = `×${String(speed).replace('.', ',')}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: SCREEN.y + 26,
        right: SCREEN.x + 26,
        padding: '12px 26px',
        borderRadius: R.pill,
        background: C.sunTint,
        border: `2px solid ${C.sun}`,
        color: C.sunDeep,
        fontFamily: HEAD,
        fontSize: 30,
        fontWeight: 700,
        transform: `scale(${interpolate(enter, [0, 1], [0.8, 1])})`,
        opacity: enter,
      }}
    >
      {label} прискорено
    </div>
  );
};

/**
 * Субтитр.
 *
 * Не прикраса: частину курсу дивитимуться без звуку — з відкритого кабінету,
 * з телефона в дорозі. Тому текст диктора завжди є і на екрані.
 */
export const Subtitle: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = rise(frame, fps, 0, SPRING_SOFT);
  const leave = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        // Своя смуга під екраном запису: нічого не перекриває за побудовою.
        top: SCREEN.y + SCREEN.height,
        height: CAPTION_BAND,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 110px',
        opacity: enter * leave,
        transform: `translateY(${interpolate(enter, [0, 1], [10, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: TEXT,
          fontSize: 32,
          lineHeight: 1.34,
          fontWeight: 500,
          // Білий із ледь теплим відтінком: чистий #fff на темному ріже око.
          color: '#F2EFFA',
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/**
 * Смужка поступу — тонка лінія внизу кадру.
 *
 * Дрібниця, яка знімає головне питання глядача: скільки ще залишилось.
 */
export const Progress: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: 'rgba(255,255,255,.12)' }}>
      <div
        style={{
          width: `${Math.min(100, (frame / total) * 100)}%`,
          height: '100%',
          background: C.blue,
          borderTopRightRadius: R.pill,
          borderBottomRightRadius: R.pill,
        }}
      />
    </div>
  );
};

/**
 * Рамка уваги: обводить ділянку екрана, про яку зараз говорить диктор.
 *
 * Стрілок і кіл навмисно немає — вони перетворюють урок на рекламний ролик.
 * Тонка рамка кольору акценту показує місце й не перекриває вміст.
 */
export const Focus: React.FC<{
  x: number; y: number; w: number; h: number; note?: string; delay?: number;
}> = ({ x, y, w, h, note, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = rise(frame, fps, delay, SPRING_SOFT);
  const leave = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const alpha = enter * leave;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x, top: y, width: w, height: h,
          border: `4px solid ${C.blue}`,
          borderRadius: R.md,
          boxShadow: `0 0 0 9999px rgba(38, 34, 74, ${0.28 * alpha})`,
          opacity: alpha,
          transform: `scale(${interpolate(enter, [0, 1], [1.04, 1])})`,
        }}
      />
      {note ? (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y + h + 18,
            padding: '12px 24px',
            borderRadius: R.pill,
            background: C.blue,
            color: C.white,
            fontFamily: TEXT,
            fontSize: 28,
            fontWeight: 500,
            opacity: alpha,
          }}
        >
          {note}
        </div>
      ) : null}
    </>
  );
};

/** Титр на початку й наприкінці — той самий, що й на платформі. */
export const Card: React.FC<{
  kicker: string; number?: string; title: string; note?: string;
}> = ({ kicker, number, title, note }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const card = rise(frame, fps, 0, SPRING_SOFT);
  const badge = rise(frame, fps, 6);
  const text = rise(frame, fps, 10);

  return (
    <AbsoluteFill style={{ background: STAGE.bottom, fontFamily: TEXT }}>
      {/* Та сама темна сцена, що й під записом: титр не перемикає стиль, а
          лишається тим самим кадром, де просто немає екрана. */}
      <AbsoluteFill
        style={{ background: `linear-gradient(180deg, ${STAGE.top} 0%, ${STAGE.bottom} 100%)` }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 42% at 50% 46%, rgba(255, 201, 61, .16) 0%, rgba(0,0,0,0) 70%)`,
          opacity: card,
        }}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 1240,
            padding: '76px 92px',
            borderRadius: R.xl,
            background: C.white,
            boxShadow: clay(1.4),
            transform: `translateY(${interpolate(card, [0, 1], [40, 0])}px) scale(${interpolate(card, [0, 1], [0.96, 1])})`,
            opacity: card,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '10px 26px',
              borderRadius: R.pill,
              background: C.blueTint,
              color: C.blueDeep,
              fontSize: 30,
              fontWeight: 600,
              transform: `translateY(${interpolate(badge, [0, 1], [18, 0])}px)`,
              opacity: badge,
            }}
          >
            {kicker}
          </div>

          <div
            style={{
              marginTop: 34,
              display: 'flex',
              alignItems: 'baseline',
              gap: 26,
              transform: `translateY(${interpolate(text, [0, 1], [22, 0])}px)`,
              opacity: text,
            }}
          >
            {number ? (
              <span style={{ fontFamily: HEAD, fontSize: 88, fontWeight: 700, color: C.blue }}>{number}</span>
            ) : null}
            <span style={{ fontFamily: HEAD, fontSize: 64, fontWeight: 700, color: C.ink, lineHeight: 1.15 }}>
              {title}
            </span>
          </div>

          {note ? (
            <p
              style={{
                marginTop: 28,
                fontSize: 34,
                lineHeight: 1.5,
                color: C.inkSoft,
                opacity: text,
              }}
            >
              {note}
            </p>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const secToFrames = (sec: number) => Math.round(sec * FPS);
