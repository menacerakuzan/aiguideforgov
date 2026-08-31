import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson54: React.FC = () => (
  <LessonVideo
    src="5-4/take.mp4"
    voicePrefix="5-4/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 5 · Перевірка результату (фактчекінг)', number: '5.4', title: 'Перевірка посилань на нормативні акти' }}
    outro={{
      kicker: 'Коротко',
      title: 'Знайшлося — це ще не «все гаразд»',
      note: 'Шукаємо за номером і датою, не за назвою. Не знайшлося — документа немає. Знайшлося — дивимось редакцію й читаємо сам пункт: нечинна редакція небезпечніша за вигадку, вона проходить перевірку «є / нема».',
    }}
  />
);

export { TOTAL };
