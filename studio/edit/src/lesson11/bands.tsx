import { Sequence, staticFile } from 'remotion';
import { Audio } from '@remotion/media';

import { BrandIntro, LessonTitle } from '../parts/BrandIntro';
import { BrandOutro, ProblemBoard, ResultBoard } from '../parts/TimeBoard';
import { PaperSubtitle } from './promo';
import {
  INTRO_SEC, OUTRO_LINES, OUTRO_SEC, PROBLEM_LINES, PROBLEM_SEC,
  RESULT_LINES, RESULT_SEC, TITLE_SEC, fr,
} from './boards';

/**
 * Смуги ролика, які не є записом екрана.
 *
 * Кожна смуга — самодостатній шматок: картинка, свої репліки, свої субтитри.
 * Завдяки цьому їх можна зібрати окремою композицією й перевірити ДО зйомки
 * (`Lesson11Boards`), а потім тими самими компонентами скласти повний ролик.
 * Перевіряти брендові кадри після дубля — означає ганяти рендер усього ролика
 * заради восьми секунд заставки.
 */

type Line = { key: string; from: number; duration: number; text: string };

/** Репліка з субтитром — однаково в усіх смугах. */
const Voice: React.FC<{ lines: Line[] }> = ({ lines }) => (
  <>
    {lines.map((l) => (
      <Sequence key={l.key} from={l.from} durationInFrames={l.duration} name={l.key}>
        <Audio src={staticFile(`1-1/voice/${l.key}.mp3`)} />
        <PaperSubtitle text={l.text} />
      </Sequence>
    ))}
  </>
);

/** Заставка курсу + титр уроку. Разом, бо це одна дія: «звідки ви і що зараз». */
export const IntroBand: React.FC = () => (
  <>
    <Sequence durationInFrames={fr(INTRO_SEC)} name="Заставка ПРО.ШІ">
      <BrandIntro durationSec={INTRO_SEC} />
    </Sequence>
    <Sequence from={fr(INTRO_SEC)} durationInFrames={fr(TITLE_SEC)} name="Титр уроку">
      <LessonTitle
        durationSec={TITLE_SEC}
        kicker="Модуль 1 · Знайомство"
        number="1.1"
        title={'Як це виглядає\nв реальній роботі'}
      />
    </Sequence>
  </>
);

/** Дошка «скільки це коштує зараз» — постановка задачі перед демонстрацією. */
export const ProblemBand: React.FC = () => (
  <>
    <ProblemBoard durationSec={PROBLEM_SEC} />
    <Voice lines={PROBLEM_LINES} />
  </>
);

/** Дошка «скільки це коштує тепер» — та сама таблиця з іншими числами. */
export const ResultBand: React.FC = () => (
  <>
    <ResultBoard durationSec={RESULT_SEC} />
    <Voice lines={RESULT_LINES} />
  </>
);

/** Фінальний титр: головна думка курсу і знак. */
export const OutroBand: React.FC = () => (
  <>
    <BrandOutro durationSec={OUTRO_SEC} next="що таке ШІ і як він працює" />
    <Voice lines={OUTRO_LINES} />
  </>
);

export { INTRO_SEC, TITLE_SEC, PROBLEM_SEC, RESULT_SEC, OUTRO_SEC };
