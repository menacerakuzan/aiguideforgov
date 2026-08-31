import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson46: React.FC = () => (
  <LessonVideo
    src="4-6/take.mp4"
    voicePrefix="4-6/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 4 · Промптинг: як говорити з ШІ', number: '4.6', title: 'Робота з файлами' }}
    outro={{
      kicker: 'Коротко',
      title: 'Файл іде цілком, разом з усім службовим шаром',
      note: 'Прикріпити — скріпка або перетягування, тоді написати завдання. Кілька файлів одразу дають найкорисніше питання: «порівняй і покажи відмінності». І завжди — робоча копія, без приміток і прихованих рядків.',
    }}
  />
);

export { TOTAL };
