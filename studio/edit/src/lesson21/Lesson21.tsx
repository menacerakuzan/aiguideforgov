import { AbsoluteFill, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';

import { C, FPS, R } from '../theme';
import { Card, Focus, Progress, StepChip, SpeedBadge, Subtitle } from './ui';
import { SCREEN, STAGE, onScreen } from './layout';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

const SRC = '2-1/take.mp4';
const f = (sec: number) => Math.round(sec * FPS);

/**
 * Один сегмент дубля.
 *
 * Рухома частина — шматок сирого запису у своєму темпі. Якщо диктор говорить
 * довше, ніж триває дія, далі стоїть завмерлий кадр: людина дочитує екран,
 * поки їй пояснюють, що на ньому. Це краще, ніж розтягувати відео вдвічі —
 * сповільнений курсор виглядає несправжнім.
 */
const Clip: React.FC<{
  from: number; to: number; speed: number; motion: number; duration: number;
}> = ({ from, to, speed, motion, duration }) => {
  const fill = { width: '100%', height: '100%', objectFit: 'contain' } as const;

  const clip = (
    <Video
      src={staticFile(SRC)}
      trimBefore={f(from)}
      trimAfter={f(to)}
      playbackRate={speed}
      style={fill}
    />
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
        Хвіст, коли диктор говорить довше, ніж триває дія: тримаємо останній
        кадр запису.

        Раніше сюди підкладався заздалегідь вирізаний PNG — і сегмент, якому
        такий файл забули прописати, показував чорний прямокутник по секунді-дві.
        Саме це й було «чорними переходами» на 40-й і 52-й секундах: не перехід,
        а порожнеча в кінці кроку.

        `Freeze` знімає цей клас помилок узагалі: він показує кадр самого відео,
        і забути про нього неможливо.
      */}
      {duration > motion ? (
        <Sequence from={motion} durationInFrames={duration - motion} name="стоп-кадр">
          {/*
            Окремий кадр із запасом від краю обрізки, а не «останній кадр
            рухомої частини»: рахунок останнього кадру впирається рівно в межу
            trimAfter, і на ній відео віддає чорне. Двома кадрами раніше межі
            такої проблеми немає, а на око різниці нуль.
          */}
          <Freeze frame={0}>
            <Video
              src={staticFile(SRC)}
              trimBefore={Math.max(0, f(to) - 3)}
              trimAfter={f(to)}
              style={fill}
            />
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
const FadingCard: React.FC<{ mode: 'out' | 'in'; children: React.ReactNode }> = ({ mode, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fade = f(FADE_SEC);

  const opacity = mode === 'out'
    ? interpolate(frame, [durationInFrames - fade, durationInFrames], [1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : interpolate(frame, [0, fade], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Lesson21: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: STAGE.bottom }}>
      {/* Темна сцена: запис на ній читається як підсвічений екран. */}
      <AbsoluteFill
        style={{ background: `linear-gradient(180deg, ${STAGE.top} 0%, ${STAGE.bottom} 100%)` }}
      />

      {/* Титр */}
      <Sequence durationInFrames={f(TITLE_SEC) + f(FADE_SEC)} name="Титр">
        <FadingCard mode="out">
          <Card
            kicker="Модуль 2 · Реальні задачі"
            number="2.1"
            title="Лист-відповідь на звернення"
          />
        </FadingCard>
      </Sequence>

      {/* Кроки */}
      {PLAN.map((seg) => (
        <Sequence key={seg.id} from={seg.start} durationInFrames={seg.duration} name={seg.label || seg.id}>
          <Clip
            from={seg.from}
            to={seg.to}
            speed={seg.speed}
            motion={seg.motion}
            duration={seg.duration}
          />
          <StepChip label={seg.label} />
          <SpeedBadge speed={seg.speed} />

          {seg.lines.map((line) => (
            <Sequence key={line.key} from={line.from} durationInFrames={line.duration} name={line.key}>
              <Audio src={staticFile(`2-1/voice/${line.key}.mp3`)} />
              <Subtitle text={line.text} />
            </Sequence>
          ))}

          {/* Рамка уваги на шапці звернення: саме її в чат не копіюють. */}
          {seg.id === 'zvernennia' ? (
            <Sequence from={f(11)} durationInFrames={f(9)} name="шапка">
              <Focus {...onScreen(1150, 255, 310, 330)} note="Це в чат не йде" />
            </Sequence>
          ) : null}
        </Sequence>
      ))}

      {/* Кінцевий титр */}
      <Sequence from={TOTAL - f(OUTRO_SEC) - f(FADE_SEC)} durationInFrames={f(OUTRO_SEC) + f(FADE_SEC)} name="Кінець">
        <FadingCard mode="in">
        <Card
          kicker="Коротко"
          title="П’ять хвилин замість сорока"
          note="Помічник склав чернетку, а рішення, реквізити й підпис лишились за вами. Саме тому останній крок — перевірка, а не відправлення."
        />
        </FadingCard>
      </Sequence>

      <Progress total={TOTAL} />
    </AbsoluteFill>
  );
};

export { TOTAL };
