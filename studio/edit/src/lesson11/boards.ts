/**
 * Хронометраж «дощок» уроку 1.1 — усього, що не є записом екрана.
 *
 * Заставка, титр, вступна дошка «скільки це коштує зараз», підсумкова дошка
 * і фінальний титр. Живуть окремим файлом, бо їх треба порахувати ДО зйомки:
 * дошки не залежать від дубля, і саме з них починається перевірка ролика.
 *
 * Правило довжини те саме, що в решті курсу: скільки звучить мовлення,
 * стільки триває сцена. Різниця лише в тому, що тут до мовлення додається
 * власний час анімації — дошці треба зібратись, перш ніж диктор про неї
 * скаже, і постояти після того, як він замовк.
 */
import voice from '../voice-1-1.json';
import { FPS } from '../theme';

type Line = { file: string; seconds: number; text: string };
const V = voice as Record<string, Line>;

export const sec = (key: string) => {
  if (!V[key]) throw new Error(`Репліку "${key}" не знайдено у voice-1-1.json`);
  return V[key].seconds;
};
export const text = (key: string) => V[key].text;
export const fr = (s: number) => Math.round(s * FPS);

/**
 * Заставка. П'ять секунд на знак — це багато для трисекундного логотипа й
 * рівно стільки, скільки треба, щоб знак ЗІБРАВСЯ і постояв: дуга збирання
 * ≈1,5 с, назва ≈1 с, підпис ≈0,7 с, і повна секунда спокою наприкінці
 * (aesthetic-rules R1 — те, що має запам'ятатись, мусить постояти).
 */
export const INTRO_SEC = 5.2;

/** Титр уроку. Коротко: він лише називає, що зараз буде. */
export const TITLE_SEC = 3.0;

/**
 * Вступна дошка. Мовлення чотирьох реплік плюс пауза на початку (дошка
 * збирається мовчки) і півтори секунди в кінці — на підсумок «≈4 години»
 * треба встигнути подивитись, а не почути.
 */
export const PROBLEM_LEAD = 1.0;
export const PROBLEM_VO = ['p-a', 'p-b', 'p-c', 'p-d'] as const;
export const PROBLEM_GAP = 0.55;
export const PROBLEM_TAIL = 1.6;

/** Підсумкова дошка — так само, але хвіст довший: тут головне число ролика. */
export const RESULT_LEAD = 0.9;
export const RESULT_VO = ['r-a', 'r-b'] as const;
export const RESULT_GAP = 0.8;
export const RESULT_TAIL = 1.8;

/** Фінальний титр із цитатою і знаком курсу. */
export const OUTRO_LEAD = 0.7;
export const OUTRO_VO = ['o-a'] as const;
export const OUTRO_TAIL = 2.4;

const band = (lead: number, keys: readonly string[], gap: number, tail: number) =>
  lead + keys.reduce((s, k, i) => s + sec(k) + (i < keys.length - 1 ? gap : 0), 0) + tail;

export const PROBLEM_SEC = band(PROBLEM_LEAD, PROBLEM_VO, PROBLEM_GAP, PROBLEM_TAIL);
export const RESULT_SEC = band(RESULT_LEAD, RESULT_VO, RESULT_GAP, RESULT_TAIL);
/** У фінальному титрі репліка одна, тож проміжку між репліками немає. */
export const OUTRO_SEC = band(OUTRO_LEAD, OUTRO_VO, 0, OUTRO_TAIL);

/** Кадри початку кожної репліки всередині своєї дошки. */
export const bandLines = (lead: number, keys: readonly string[], gap: number) => {
  let cursor = fr(lead);
  return keys.map((key) => {
    const from = cursor;
    const duration = fr(sec(key));
    cursor += duration + fr(gap);
    return { key, from, duration, text: text(key) };
  });
};

export const PROBLEM_LINES = bandLines(PROBLEM_LEAD, PROBLEM_VO, PROBLEM_GAP);
export const RESULT_LINES = bandLines(RESULT_LEAD, RESULT_VO, RESULT_GAP);
export const OUTRO_LINES = bandLines(OUTRO_LEAD, OUTRO_VO, 0);

/** Усе, що йде ДО запису екрана, і все, що ПІСЛЯ. */
export const HEAD_SEC = INTRO_SEC + TITLE_SEC + PROBLEM_SEC;
export const TAIL_SEC = RESULT_SEC + OUTRO_SEC;
