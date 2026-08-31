import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson45: React.FC = () => (
  <LessonVideo
    src="4-5/take.mp4"
    voicePrefix="4-5/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 4 · Промптинг: як говорити з ШІ', number: '4.5', title: 'Ітерації: як довести чернетку до потрібного' }}
    outro={{
      kicker: 'Коротко',
      title: 'Одна репліка за раз — і завжди можна відкотити',
      note: 'Помічник пам\'ятає розмову: не треба повторювати суть і вимоги до стилю, досить сказати, що змінити. А якщо правка вийшла невдалою — «поверни попередній варіант» повертає все як було.',
    }}
  />
);

export { TOTAL };
