import { Composition } from 'remotion';

import { FPS, s } from './theme';
import { TitleCard, titleSchema } from './parts/TitleCard';
import { Lesson21, TOTAL as LESSON21 } from './lesson21/Lesson21';

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
