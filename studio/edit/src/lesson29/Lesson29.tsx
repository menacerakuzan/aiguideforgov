import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson29: React.FC = () => (
  <LessonVideo
    src="2-9/take.mp4"
    voicePrefix="2-9/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.9', title: 'Мозковий штурм' }}
    outro={{
      kicker: 'Коротко',
      title: 'П’ятнадцять, а не три',
      note: 'Очевидне закінчується на п’ятому варіанті. Другий крок — назвати, що сподобалось, і попросити ще десять у тому ж дусі, — дає найточніший результат.',
    }}
  />
);

export { TOTAL };
