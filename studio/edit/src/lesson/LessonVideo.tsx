import { AbsoluteFill, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';

import { FPS, R } from '../theme';
import { Card, Focus, Progress, StepChip, SpeedBadge, Subtitle } from './ui';
import { SCREEN, STAGE, onScreen } from './layout';
import type { PlannedSegment } from './planBuilder';

const f = (sec: number) => Math.round(sec * FPS);

/** Момент у кадрі, коли треба обвести конкретну ділянку екрана. */
export type FocusMoment = {
  segmentId: string;
  /** Секунди від початку сегмента. */
  fromSec: number;
  durationSec: number;
  /** Координати на сирому 1920×1080 запису — onScreen() переведе їх сама. */
  box: { x: number; y: number; w: number; h: number };
  note?: string;
};

/**
 * Один сегмент дубля.
 *
 * Рухома частина — шматок сирого запису у своєму темпі. Якщо диктор говорить
 * довше, ніж триває дія, далі стоїть завмерлий кадр: людина дочитує екран,
 * поки їй пояснюють, що на ньому. Це краще, ніж розтягувати відео вдвічі —
 * сповільнений курсор виглядає несправжнім.
 */
export const Clip: React.FC<{
  src: string; from: number; to: number; speed: number; motion: number; duration: number;
}> = ({ src, from, to, speed, motion, duration }) => {
  const fill = { width: '100%', height: '100%', objectFit: 'contain' } as const;

  const clip = (
    <Video src={staticFile(src)} trimBefore={f(from)} trimAfter={f(to)} playbackRate={speed} style={fill} />
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: SCREEN.x,
        top: SCREEN.y,
        width: SCREEN.width,
        height: SCREEN.height,
        borderRadius: R.md,
        overflow: 'hidden',
        background: '#000',
        // На темному тлі тінь не читається — межу тримає тонкий світлий кант.
        boxShadow: '0 0 0 1px rgba(255,255,255,.10), 0 26px 60px -20px rgba(0,0,0,.75)',
      }}
    >
      <Sequence durationInFrames={motion} name="рух">{clip}</Sequence>

      {/*
        Хвіст, коли диктор говорить довше, ніж триває дія: тримаємо кадр запису
        трохи РАНІШЕ за кінець обрізки, а не рівно на межі.

        `Freeze` на останньому кадрі рухомої частини впирався рівно в межу
        trimAfter, а на ній відео іноді віддає чорне. Запас у 3 кадри знімає
        це на око непомітно.
      */}
      {duration > motion ? (
        <Sequence from={motion} durationInFrames={duration - motion} name="стоп-кадр">
          <Freeze frame={0}>
            <Video src={staticFile(src)} trimBefore={Math.max(0, f(to) - 3)} trimAfter={f(to)} style={fill} />
          </Freeze>
        </Sequence>
      ) : null}
    </div>
  );
};

/**
 * Титр, який м'яко йде з кадру (або з'являється в ньому).
 *
 * Розчинення тут доречне: титр і запис — різні сцени. Між кроками самого
 * запису його немає, бо там і різниці немає.
 */
const FadingCard: React.FC<{ mode: 'out' | 'in'; fadeSec: number; children: React.ReactNode }> = ({
  mode, fadeSec, children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fade = f(fadeSec);

  const opacity = mode === 'out'
    ? interpolate(frame, [durationInFrames - fade, durationInFrames], [1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : interpolate(frame, [0, fade], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export type LessonVideoProps = {
  /** Шлях до дубля у public/, напр. '2-2/take.mp4'. */
  src: string;
  voicePrefix: string; // напр. '2-2/voice' — озвучка лежить у public/<voicePrefix>/<key>.mp3
  plan: PlannedSegment[];
  total: number;
  fadeSec: number;
  titleSec: number;
  outroSec: number;
  title: { kicker: string; number: string; title: string };
  outro: { kicker: string; title: string; note: string };
  focusMoments?: FocusMoment[];
};

export const LessonVideo: React.FC<LessonVideoProps> = ({
  src, voicePrefix, plan, total, fadeSec, titleSec, outroSec, title, outro, focusMoments = [],
}) => {
  return (
    <AbsoluteFill style={{ background: STAGE.bottom }}>
      {/* Темна сцена: запис на ній читається як підсвічений екран. */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${STAGE.top} 0%, ${STAGE.bottom} 100%)` }} />

      {/* Титр */}
      <Sequence durationInFrames={f(titleSec) + f(fadeSec)} name="Титр">
        <FadingCard mode="out" fadeSec={fadeSec}>
          <Card kicker={title.kicker} number={title.number} title={title.title} />
        </FadingCard>
      </Sequence>

      {/* Кроки */}
      {plan.map((seg) => (
        <Sequence key={seg.id} from={seg.start} durationInFrames={seg.duration} name={seg.label || seg.id}>
          <Clip src={src} from={seg.from} to={seg.to} speed={seg.speed} motion={seg.motion} duration={seg.duration} />
          <StepChip label={seg.label} />
          <SpeedBadge speed={seg.speed} />

          {seg.lines.map((line) => (
            <Sequence key={line.key} from={line.from} durationInFrames={line.duration} name={line.key}>
              <Audio src={staticFile(`${voicePrefix}/${line.key}.mp3`)} />
              <Subtitle text={line.text} />
            </Sequence>
          ))}

          {focusMoments
            .filter((m) => m.segmentId === seg.id)
            .map((m, i) => (
              <Sequence key={i} from={f(m.fromSec)} durationInFrames={f(m.durationSec)} name="фокус">
                <Focus {...onScreen(m.box.x, m.box.y, m.box.w, m.box.h)} note={m.note} />
              </Sequence>
            ))}
        </Sequence>
      ))}

      {/* Кінцевий титр */}
      <Sequence from={total - f(outroSec) - f(fadeSec)} durationInFrames={f(outroSec) + f(fadeSec)} name="Кінець">
        <FadingCard mode="in" fadeSec={fadeSec}>
          <Card kicker={outro.kicker} title={outro.title} note={outro.note} />
        </FadingCard>
      </Sequence>

      <Progress total={total} />
    </AbsoluteFill>
  );
};
