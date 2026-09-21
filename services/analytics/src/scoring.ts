/**
 * Чиста арифметика спроб тестів — без бази, тому перевіряється тестами.
 *
 * Уся аналітика тестів стоїть на одному незручному факті: `db:sync-quiz`
 * переписує банк питань цілком, а спроби лишаються в базі з відповідями на
 * старі питання. Тут зібрано правила, які не дають старій спробі лягти на
 * новий тест і вигадати статистику.
 */

/**
 * Відповіді спроби — JSON-масив обраних індексів.
 * Довжина масиву = скільки питань було в тесті НА МОМЕНТ спроби.
 */
export function parseAnswers(raw: string): number[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => (typeof v === 'number' ? v : -1)) : [];
  } catch {
    return [];
  }
}

export function parseOptions(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Правильних/усього в спробі.
 *
 * Рахуємо від збереженого балу й довжини відповідей, а не від нинішнього
 * складу питань: так число лишається правильним і для спроб, зроблених по
 * старому банку. `score` записано як round(correct / total * 100), тому
 * зворотне множення повертає рівно те `correct`, що було в момент спроби.
 */
export function attemptCorrectness(score: number, answersRaw: string): { correct: number; total: number } {
  const answers = parseAnswers(answersRaw);
  if (!answers.length) return { correct: 0, total: 0 };
  return { correct: Math.round((score / 100) * answers.length), total: answers.length };
}

/**
 * Чи можна розкласти цю спробу по нинішніх питаннях тесту.
 *
 * Збігу довжин мало: спроба по старому набору з тією ж кількістю питань лягла
 * б на нові питання номер у номер і дала б повністю вигадану статистику —
 * саме так прості питання показувались нерозвʼязними.
 *
 * Тому звіряємось із балом, збереженим у момент спроби: якщо порівняння
 * індексів дає інше число правильних, ніж той бал, — питання вже не ті, і в
 * розріз по питаннях спробу не беремо. Загальні бали й частка правильних при
 * цьому лишаються чинними: вони рахуються з самого балу.
 */
export function alignsWithQuestions(
  answers: number[],
  questions: { correctIndex: number }[],
  score: number,
): boolean {
  if (!questions.length || answers.length !== questions.length) return false;
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  return correct === Math.round((score / 100) * questions.length);
}
