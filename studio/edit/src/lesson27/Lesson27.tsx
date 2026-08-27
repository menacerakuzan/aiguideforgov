import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson27: React.FC = () => (
  <LessonVideo
    src="2-7/take.mp4"
    voicePrefix="2-7/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.7', title: 'Структура документа за 2 хвилини' }}
    outro={{
      kicker: 'Коротко',
      title: 'Скелет, а не текст',
      note: 'Просимо розділи, обсяг і адресата — не сам текст. План стає чек-листом, а три варіанти показують, що документ можна побудувати по-різному.',
    }}
  />
);

export { TOTAL };
