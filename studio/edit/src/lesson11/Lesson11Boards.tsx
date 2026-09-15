import { AbsoluteFill, Sequence } from 'remotion';

import { C } from '../theme';
import {
  INTRO_SEC, OutroBand, IntroBand, OUTRO_SEC, PROBLEM_SEC, ProblemBand,
  RESULT_SEC, ResultBand, TITLE_SEC,
} from './bands';
import { fr } from './boards';
import { Music } from './music';

/**
 * Тільки брендові смуги ролика 1.1, без запису екрана.
 *
 * Навіщо окрема композиція. Заставка, дошки й фінал не залежать від дубля —
 * їх можна довести до пуття, поки камера ще не вмикалась. Повний ролик
 * важить хвилини рендера й вимагає знятого матеріалу; ця композиція рендериться
 * за півхвилини й показує рівно ті кадри, які найдовше доводити до ладу.
 *
 * У фінальному ролику ці ж смуги стоять на своїх місцях — компоненти ті самі,
 * тому перевірене тут не «схоже на те, що буде», а буквально те саме.
 */
const HEAD = INTRO_SEC + TITLE_SEC + PROBLEM_SEC;
const TAIL = RESULT_SEC + OUTRO_SEC;

export const BOARDS_TOTAL = fr(HEAD + TAIL);

export const Lesson11Boards: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    <IntroBand />

    <Sequence from={fr(INTRO_SEC + TITLE_SEC)} durationInFrames={fr(PROBLEM_SEC)} name="Дошка: скільки це коштує">
      <ProblemBand />
    </Sequence>

    <Sequence from={fr(HEAD)} durationInFrames={fr(RESULT_SEC)} name="Дошка: скільки тепер">
      <ResultBand />
    </Sequence>

    <Sequence from={fr(HEAD + RESULT_SEC)} durationInFrames={fr(OUTRO_SEC)} name="Фінал">
      <OutroBand />
    </Sequence>

    {/* Музика тут звучить рівно так само, як у повному ролику на цих ділянках:
        голосно на брендових кадрах, тихо там, де далі буде робота на екрані. */}
    <Music total={BOARDS_TOTAL} loudUntil={fr(HEAD)} loudFrom={fr(HEAD)} />
  </AbsoluteFill>
);
