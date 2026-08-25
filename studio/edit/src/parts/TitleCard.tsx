import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadComfortaa } from '@remotion/google-fonts/Comfortaa';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';
import { z } from 'zod';

import { C, R, SPRING, SPRING_SOFT, clay } from '../theme';

const SUBSETS: ('cyrillic' | 'latin')[] = ['cyrillic', 'latin'];

const { fontFamily: comfortaa } = loadComfortaa('normal', { subsets: SUBSETS, weights: ['600', '700'], ignoreTooManyRequestsWarning: true });
const { fontFamily: rubik } = loadRubik('normal', { subsets: SUBSETS, weights: ['400', '500', '600', '700'], ignoreTooManyRequestsWarning: true });

export const titleSchema = z.object({
  number: z.string(),
  title: z.string(),
  kicker: z.string(),
});

/**
 * Титр уроку.
 *
 * Тримається на трьох рухах, і всі — знизу вгору: спершу з'являється картка,
 * потім номер, потім назва. Один напрямок читається як одна дія; якби кожен
 * елемент летів зі свого боку, кадр розсипався б.
 */
export const TitleCard: React.FC<z.infer<typeof titleSchema>> = ({ number, title, kicker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rise = (delay: number, config = SPRING) =>
    spring({ frame: frame - delay, fps, config, durationInFrames: 30 });

  const card = rise(0, SPRING_SOFT);
  const badge = rise(6);
  const text = rise(10);

  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: rubik }}>
      {/* Тепла пляма за карткою: рівний фон на 1080p виглядає мертвим. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at 50% 42%, ${C.sunTint} 0%, ${C.paper} 70%)`,
          opacity: interpolate(card, [0, 1], [0, 1]),
        }}
      />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 1180,
            padding: '72px 88px',
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
              letterSpacing: 0.2,
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
              gap: 28,
              transform: `translateY(${interpolate(text, [0, 1], [22, 0])}px)`,
              opacity: text,
            }}
          >
            <span style={{ fontFamily: comfortaa, fontSize: 92, fontWeight: 700, color: C.blue }}>
              {number}
            </span>
            <span style={{ fontFamily: comfortaa, fontSize: 68, fontWeight: 700, color: C.ink, lineHeight: 1.15 }}>
              {title}
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
