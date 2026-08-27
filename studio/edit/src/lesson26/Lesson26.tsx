import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson26: React.FC = () => (
  <LessonVideo
    src="2-6/take.mp4"
    voicePrefix="2-6/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.6', title: 'Швидкий переклад' }}
    outro={{
      kicker: 'Коротко',
      title: 'Глосарій на вході, зворотний переклад на виході',
      note: 'Термінологія в запиті робить переклад професійним, а зворотний переклад перевіряє зміст без знання мови.',
    }}
  />
);

export { TOTAL };
