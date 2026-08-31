import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson36: React.FC = () => (
  <LessonVideo
    src="3-6/take.mp4"
    voicePrefix="3-6/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 3 · Безпека та відповідальність', number: '3.6', title: 'Налаштування приватності' }}
    outro={{
      kicker: 'Коротко',
      title: 'П’ять хвилин, один раз',
      note: 'Вимкнути навчання на даних, скоротити строк зберігання історії, знати кнопку тимчасового чату — жодне з налаштувань не скасовує правил про те, що взагалі не варто вставляти.',
    }}
  />
);

export { TOTAL };
