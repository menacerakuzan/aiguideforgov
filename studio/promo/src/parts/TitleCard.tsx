import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { C, F, SPRING_SOFT } from '../theme';
import { PaperGround } from './DeviceFrame';

/**
 * Дихальний титр між сценами.
 *
 * Навіщо він у ролику, де й так мало часу. Шість екранів інтерфейсу підряд
 * зливаються в одну стрічку: глядач перестає розрізняти, де закінчилась одна
 * думка й почалась наступна. Титр — це кома. Він коштує півтори секунди й
 * повертає ритм.
 *
 * Слова виходять по одному, а не рядком: так фраза читається в тому ж темпі,
 * у якому її промовляє диктор, і око не біжить наперед.
 *
 * Кегль навмисно великий. Правило перевірене на чужих помилках: текст, який
 * глядач має прочитати, мусить мати не менше приблизно 56 пікселів висоти на
 * кадрі 1080p — інакше з телефона його просто не видно. Тут 96, з запасом.
 */
export const TitleCard: React.FC<{ line: string; accent?: string }> = ({ line, accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const words = line.split(' ');
  const out = interpolate(frame, [durationInFrames - 9, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <PaperGround />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 200px',
          opacity: out,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0 22px',
            justifyContent: 'center',
            fontFamily: F.head,
            fontSize: 96,
            lineHeight: 1.18,
            fontWeight: 700,
            color: C.ink,
            textAlign: 'center',
          }}
        >
          {words.map((word, i) => {
            const enter = spring({
              frame: frame - 3 - i * 3,
              fps,
              config: SPRING_SOFT,
              durationInFrames: 22,
            });
            return (
              <span
                key={`${word}-${i}`}
                style={{
                  color: accent && word.startsWith(accent) ? C.blue : C.ink,
                  opacity: enter,
                  transform: `translateY(${interpolate(enter, [0, 1], [26, 0])}px)`,
                  display: 'inline-block',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
