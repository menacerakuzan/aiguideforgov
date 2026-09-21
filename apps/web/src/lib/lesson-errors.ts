import type { ZodError } from 'zod';

/** Назви блоків так, як їх бачить автор у редакторі уроку. */
const BLOCK_LABELS: Record<string, string> = {
  text: 'текст',
  video: 'відео',
  image: 'зображення',
  prompt: 'промпт',
  file: 'файл',
  check: 'перевірка',
  sort: 'сортування',
  pick: 'вибір',
  pair: 'пара',
  trafficLight: 'світлофор',
  redact: 'знеособлення',
  builder: 'конструктор',
};

/**
 * Людське пояснення, чому урок не зберігся: номер блоку, його тип і поле.
 *
 * Загальне «Перевірте введені дані» тут марне: урок перевіряється ЦІЛИМ, тож
 * помилка може сидіти в блоці, якого автор навіть не торкався, — саме так
 * заміна посилання на файл «не зберігалась» через відео кількома блоками вище.
 */
export function describeLessonError(error: ZodError, body: unknown): string {
  const issue = error.issues[0];
  if (!issue) return 'Перевірте введені дані';

  const [root, index, ...field] = issue.path;
  if (root === 'blocks' && typeof index === 'number') {
    const blocks = (body as { blocks?: Array<{ type?: string }> } | null)?.blocks;
    const type = blocks?.[index]?.type ?? '';
    const label = BLOCK_LABELS[type] ?? type;
    const where = field.length ? `, поле «${field.join('.')}»` : '';
    return `Блок ${index + 1}${label ? ` (${label})` : ''}${where}: ${issue.message}`;
  }

  return issue.path.length ? `Поле «${issue.path.join('.')}»: ${issue.message}` : issue.message;
}
