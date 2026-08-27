import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson23: React.FC = () => (
  <LessonVideo
    src="2-3/take.mp4"
    voicePrefix="2-3/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.3', title: 'Службова записка' }}
    outro={{
      kicker: 'Коротко',
      title: 'Розкажіть як є — офіційний стиль додасться сам',
      note: 'Найважче в записці — не стиль, а перше речення. Опишіть ситуацію своїми словами й скажіть, чого хочете домогтися: решту зробить ШІ.',
    }}
  />
);

export { TOTAL };
