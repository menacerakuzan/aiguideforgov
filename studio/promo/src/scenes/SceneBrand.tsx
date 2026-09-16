import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BrandMark } from '../parts/BrandMark';
import { PaperGround } from '../parts/DeviceFrame';
import { C, F, SPRING_SOFT, s } from '../theme';

/**
 * Сцена 1 — знак ПРО.ШІ.
 *
 * Найповільніший кадр усього ролика, і це навмисно. Заставка працює тільки
 * тоді, коли після складання знак СТОЇТЬ: секунда нерухомості коштує тридцять
 * кадрів і дає єдине, заради чого заставка існує, — впізнавання.
 *
 * Сама дуга розтягнута (`pace`): у першій версії знак збирався за вісім
 * десятих секунди й устигав скластися раніше, ніж око за ним пішло. Головний
 * герой відкриття мусить рухатись не менше трьох секунд.
 *
 * Літери назви сходяться з розрідження. Той самий жест повторить фінал, і разом
 * вони замикають ролик у рамку.
 */

export const BRAND_SEC = 4;

export const SceneBrand: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const name = spring({ frame: frame - s(2.6), fps, config: SPRING_SOFT, durationInFrames: 34 });
  const tagline = spring({ frame: frame - s(3.6), fps, config: SPRING_SOFT, durationInFrames: 28 });

  // Гасне лише в останні кадри: заставка не має «здуватись» одразу після того,
  // як зібралась.
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <PaperGround />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 40,
          opacity: out,
        }}
      >
        <BrandMark size={190} delay={s(0.2)} pace={2.0} />

        <div
          style={{
            fontFamily: F.head,
            fontSize: 118,
            fontWeight: 700,
            color: C.ink,
            // Розрідження стягується — те саме, що робить назва в шапці сайта,
            // коли сторінка завантажилась.
            letterSpacing: `${interpolate(name, [0, 1], [0.3, 0.005])}em`,
            opacity: name,
            // Компенсуємо праве розрідження, інакше слово стоїть не по центру.
            marginRight: `${interpolate(name, [0, 1], [-0.3, -0.005])}em`,
          }}
        >
          ПРО.ШІ
        </div>

        <div
          style={{
            fontFamily: F.text,
            fontSize: 44,
            fontWeight: 500,
            color: C.inkSoft,
            opacity: tagline,
            transform: `translateY(${interpolate(tagline, [0, 1], [18, 0])}px)`,
          }}
        >
          Безпечний ШІ для державної служби
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
