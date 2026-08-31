import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson48: React.FC = () => (
  <LessonVideo
    src="4-8/take.mp4"
    voicePrefix="4-8/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 4 · Промптинг: як говорити з ШІ', number: '4.8', title: 'Голос і фото замість набору' }}
    outro={{
      kicker: 'Коротко',
      title: 'Помічнику потрібен зміст, а не гладкі речення',
      note: 'Сумбурний диктант із самовиправленнями працює так само добре, як охайно набраний текст — оформлення це робота помічника, не ваша.',
    }}
  />
);

export { TOTAL };
