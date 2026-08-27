import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson22: React.FC = () => (
  <LessonVideo
    src="2-2/take.mp4"
    voicePrefix="2-2/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.2', title: 'Скорочення великого тексту' }}
    outro={{
      kicker: 'Коротко',
      title: 'Тридцять чотири сторінки за секунди',
      note: 'ШІ читає замість вас, але кожна цифра лишається перевіреною — сторінка джерела вказана, і звірити її займає секунди, а не двадцять хвилин.',
    }}
  />
);

export { TOTAL };
