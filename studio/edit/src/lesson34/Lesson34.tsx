import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson34: React.FC = () => (
  <LessonVideo
    src="3-4/take.mp4"
    voicePrefix="3-4/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 3 · Безпека та відповідальність', number: '3.4', title: 'Знеособлення: як підготувати текст для ШІ' }}
    outro={{
      kicker: 'Коротко',
      title: 'Позначки краще за видалення',
      note: 'Прямі ідентифікатори — геть, структура лишається. Помічник розуміє задачу так само добре, а позначки показують, куди повернути реальні дані.',
    }}
  />
);

export { TOTAL };
