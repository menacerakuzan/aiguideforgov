import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson25: React.FC = () => (
  <LessonVideo
    src="2-5/take.mp4"
    voicePrefix="2-5/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.5', title: 'Зміна тону' }}
    outro={{
      kicker: 'Коротко',
      title: 'Той самий зміст, інший звук',
      note: 'Тон правиться одним реченням запиту. Після зміни перечитайте текст саме на додані обіцянки — це єдине, що варто перевіряти окремо.',
    }}
  />
);

export { TOTAL };
