import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';

import { C, FPS, R, SPRING, SPRING_SOFT, clay } from '../theme';
import { HEAD, TEXT } from '../lesson/ui';
import { CAPTION_BAND } from '../lesson/layout';
import { BrandMark } from './BrandMark';

const f = (sec: number) => Math.round(sec * FPS);

/**
 * Заставка курсу.
 *
 * Один герой у кадрі — знак. Не знак плюс назва плюс підпис плюс візерунок:
 * усе разом читалось би як титульний слайд презентації, а не як заставка
 * (aesthetic-rules Q5 — «на початку тільки один головний елемент і одна
 * повна дуга руху»).
 *
 * Порядок такий: знак збирається → назва «стискається» з розрідженого
 * трекінгу → підпис підіймається → і всі троє СТОЯТЬ нерухомо повну секунду.
 * Ця секунда не запас часу, а сама суть заставки: те, що має запам'ятатись,
 * мусить постояти (aesthetic-rules R1).
 *
 * Назву робимо стисканням трекінгу, а не проявленням: літери приїжджають одна
 * до одної й «клацають» у слово. Проявлення дало б ту саму інформацію, але
 * без події — а заставці потрібна саме подія.
 */
export const BrandIntro: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const word = spring({ frame: frame - 22, fps, config: SPRING_SOFT, durationInFrames: 30 });
  const tag = spring({ frame: frame - 40, fps, config: SPRING, durationInFrames: 26 });

  // Тепла пляма за знаком дихає: рівний фон на 1080p виглядає мертвим, а
  // «дихання» помітне тільки підсвідомо — воно й потрібне лише для цього.
  const breathe = 1 + Math.sin(frame / 26) * 0.03;

  /*
   * Затухання наприкінці смуги НЕМАЄ — навмисно.
   *
   * Спершу кожна смуга гасила себе за пів секунди до кінця. Але під нею в
   * цей момент немає наступної сцени: запис екрана починається рівно там,
   * де смуга закінчується. Тому крізь напівпрозору картку прозирала темна
   * сцена, і на стику виходив провал у чорне — на готовому рендері це
   * видно як три помітні кліпи (5, 8 і 26 секунда, яскравість падала до
   * 23 із 255).
   *
   * Стик встик виглядає як зміна кадру, а не як збій, і саме його вимагає
   * стандарт (STANDARD.md §3, «Провал у чорне на стику кроків»).
   */

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(${52 * breathe}% ${46 * breathe}% at 50% 46%, ${C.sunTint} 0%, ${C.paper} 72%)`,
        }}
      />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: CAPTION_BAND }}>
        <BrandMark size={210} />

        <div
          style={{
            marginTop: 46,
            fontFamily: HEAD,
            fontSize: 118,
            fontWeight: 700,
            color: C.ink,
            // Трекінг їде з 0,34em у майже нуль — літери зсуваються до слова.
            letterSpacing: `${interpolate(word, [0, 1], [0.34, 0.005])}em`,
            // Компенсуємо трекінг останньої літери, інакше слово візуально
            // зміщене ліворуч від центру рівно на цей проміжок.
            marginLeft: `${interpolate(word, [0, 1], [0.34, 0.005])}em`,
            opacity: word,
          }}
        >
          ПРО.ШІ
        </div>

        <div
          style={{
            marginTop: 26,
            fontFamily: TEXT,
            fontSize: 38,
            fontWeight: 500,
            color: C.inkSoft,
            opacity: tag,
            transform: `translateY(${interpolate(tag, [0, 1], [18, 0])}px)`,
          }}
        >
          Практичний курс для публічної служби
        </div>
      </AbsoluteFill>

      {/* Звук іде за картинкою, а не поруч із нею: підйом тягне погляд до
          знака, удар збігається з посадкою плашки, іскра — з жовтою крапкою. */}
      <Sequence from={0} durationInFrames={f(1.4)} name="підйом">
        <Audio src={staticFile('audio/sfx/riser-cine.mp3')} volume={0.16} />
      </Sequence>
      <Sequence from={f(0.3)} durationInFrames={f(1.6)} name="посадка">
        <Audio src={staticFile('audio/sfx/impact-transition.mp3')} volume={0.2} />
      </Sequence>
      <Sequence from={f(1.05)} durationInFrames={f(1.2)} name="крапка">
        <Audio src={staticFile('audio/sfx/sparkle-touch.mp3')} volume={0.26} />
      </Sequence>
    </AbsoluteFill>
  );
};

/**
 * Титр уроку одразу після заставки.
 *
 * Окремий кадр, а не рядок під назвою курсу: заставка про курс, титр про урок.
 * Змішані в одному кадрі, вони конкурують — і не запам'ятовується жодне.
 */
export const LessonTitle: React.FC<{
  durationSec: number;
  kicker: string;
  number: string;
  title: string;
}> = ({ durationSec, kicker, number, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: SPRING_SOFT, durationInFrames: 26 });
  const badge = spring({ frame: frame - 6, fps, config: SPRING, durationInFrames: 24 });
  const text = spring({ frame: frame - 11, fps, config: SPRING, durationInFrames: 24 });

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill
        style={{ background: `radial-gradient(58% 52% at 50% 44%, ${C.blueTint} 0%, ${C.paper} 74%)` }}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: CAPTION_BAND }}>
        <div
          style={{
            width: 1240,
            padding: '72px 88px',
            borderRadius: R.xl,
            background: C.white,
            boxShadow: clay(1.4),
            opacity: card,
            transform: `translateY(${interpolate(card, [0, 1], [36, 0])}px) scale(${interpolate(card, [0, 1], [0.965, 1])})`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: badge }}>
            <BrandMark size={54} delay={4} />
            <span
              style={{
                padding: '10px 26px',
                borderRadius: R.pill,
                background: C.blueTint,
                color: C.blueDeep,
                fontFamily: TEXT,
                fontSize: 30,
                fontWeight: 600,
              }}
            >
              {kicker}
            </span>
          </div>

          <div
            style={{
              marginTop: 32,
              display: 'flex',
              alignItems: 'baseline',
              gap: 26,
              opacity: text,
              transform: `translateY(${interpolate(text, [0, 1], [22, 0])}px)`,
            }}
          >
            <span style={{ fontFamily: HEAD, fontSize: 92, fontWeight: 700, color: C.blue }}>{number}</span>
            {/* Переноси в назві задає викликач (
), а не ширина картки.
                Автоматичний перенес залишив на другому рядку одне слово-сироту. */}
            <span
              style={{
                fontFamily: HEAD,
                fontSize: 62,
                fontWeight: 700,
                color: C.ink,
                lineHeight: 1.16,
                whiteSpace: 'pre-line',
              }}
            >
              {title}
            </span>
          </div>
        </div>
      </AbsoluteFill>

      <Sequence from={0} durationInFrames={f(1)} name="поява титру">
        <Audio src={staticFile('audio/sfx/swoosh-quick.mp3')} volume={0.18} />
      </Sequence>
    </AbsoluteFill>
  );
};
