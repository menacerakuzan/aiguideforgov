import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson28: React.FC = () => (
  <LessonVideo
    src="2-8/take.mp4"
    voicePrefix="2-8/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.8', title: 'Пояснити складне простою мовою' }}
    outro={{
      kicker: 'Коротко',
      title: 'Адресат визначає пояснення',
      note: 'Той самий зміст для листа й для телефонної розмови звучить по-різному. В офіційній відповіді просте пояснення доповнює норму, а не замінює її.',
    }}
  />
);

export { TOTAL };
