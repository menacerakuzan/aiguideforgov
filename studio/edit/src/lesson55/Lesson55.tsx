import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson55: React.FC = () => (
  <LessonVideo
    src="5-5/take.mp4"
    voicePrefix="5-5/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 5 · Перевірка результату (фактчекінг)', number: '5.5', title: 'Цифри та статистика' }}
    outro={{
      kicker: 'Коротко',
      title: 'Покажи доданки — і побачиш помилку',
      note: 'Підсумок під таблицею — не обчислення, а правдоподібне продовження тексту. «Перелічи доданки по одному, а потім суму» робить розбіжність видимою за секунди, без калькулятора.',
    }}
  />
);

export { TOTAL };
