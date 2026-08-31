import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson44: React.FC = () => (
  <LessonVideo
    src="4-4/take.mp4"
    voicePrefix="4-4/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 4 · Промптинг: як говорити з ШІ', number: '4.4', title: 'Приклад як інструмент' }}
    outro={{
      kicker: 'Коротко',
      title: 'Показати легше, ніж описати',
      note: 'Зразок замінює опис стилю: обсяг, структуру й тон видно з документа. Перед прикріпленням — знеособлюємо через «Знайти й замінити», як і будь-який інший службовий документ.',
    }}
  />
);

export { TOTAL };
