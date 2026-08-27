import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson24: React.FC = () => (
  <LessonVideo
    src="2-4/take.mp4"
    voicePrefix="2-4/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.4', title: 'Вичитка й редагування' }}
    outro={{
      kicker: 'Коротко',
      title: 'Список правок, а не переписаний текст',
      note: 'Помічник пропонує — «було → стало → чому» — а приймаєте кожну правку ви, рукою. Так жоден рядок не міняється непомітно.',
    }}
  />
);

export { TOTAL };
