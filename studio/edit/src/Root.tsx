import { Composition } from 'remotion';

import { FPS, s } from './theme';
import { TitleCard, titleSchema } from './parts/TitleCard';
import { Lesson21, TOTAL as LESSON21 } from './lesson21/Lesson21';
import { Lesson22, TOTAL as LESSON22 } from './lesson22/Lesson22';
import { Lesson23, TOTAL as LESSON23 } from './lesson23/Lesson23';
import { Lesson24, TOTAL as LESSON24 } from './lesson24/Lesson24';
import { Lesson25, TOTAL as LESSON25 } from './lesson25/Lesson25';
import { Lesson26, TOTAL as LESSON26 } from './lesson26/Lesson26';
import { Lesson27, TOTAL as LESSON27 } from './lesson27/Lesson27';
import { Lesson28, TOTAL as LESSON28 } from './lesson28/Lesson28';
import { Lesson29, TOTAL as LESSON29 } from './lesson29/Lesson29';

export const Root: React.FC = () => {
  return (
    <>
      {/* Урок 2.1 — змонтований скрінкаст. */}
      <Composition
        id="Lesson21"
        component={Lesson21}
        durationInFrames={LESSON21}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Урок 2.2 — змонтований скрінкаст. */}
      <Composition
        id="Lesson22"
        component={Lesson22}
        durationInFrames={LESSON22}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Урок 2.3 — змонтований скрінкаст. */}
      <Composition
        id="Lesson23"
        component={Lesson23}
        durationInFrames={LESSON23}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Урок 2.4 — змонтований скрінкаст. */}
      <Composition
        id="Lesson24"
        component={Lesson24}
        durationInFrames={LESSON24}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Урок 2.5 — змонтований скрінкаст. */}
      <Composition
        id="Lesson25"
        component={Lesson25}
        durationInFrames={LESSON25}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Урок 2.6 — змонтований скрінкаст. */}
      <Composition
        id="Lesson26"
        component={Lesson26}
        durationInFrames={LESSON26}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Урок 2.7 — змонтований скрінкаст. */}
      <Composition
        id="Lesson27"
        component={Lesson27}
        durationInFrames={LESSON27}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Урок 2.8 — змонтований скрінкаст. */}
      <Composition
        id="Lesson28"
        component={Lesson28}
        durationInFrames={LESSON28}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Урок 2.9 — змонтований скрінкаст. */}
      <Composition
        id="Lesson29"
        component={Lesson29}
        durationInFrames={LESSON29}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/*
        Титульна картка окремо: нею перевіряють конвеєр після змін і з неї
        зручно знімати статичні заставки для уроків без відео.
      */}
      <Composition
        id="TitleCard"
        component={TitleCard}
        schema={titleSchema}
        durationInFrames={s(4)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          number: '2.1',
          title: 'Лист-відповідь на звернення',
          kicker: 'Модуль 2 · Реальні задачі',
        }}
      />
    </>
  );
};
