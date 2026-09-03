/**
 * Механічна перевірка підсумкових тестів (`content/quizzes.ts`).
 *
 * Ловить рівно те, через що курс колись проходився натисканням другого
 * варіанта: перекос позицій правильної відповіді й підказку довжиною.
 * Змістовну половину — чи питання про застосування, чи правдоподібні
 * дистрактори — машина не бачить, її читають очима.
 *
 * Запуск: pnpm --filter @proai/db audit-quiz
 */
import { finalExamQuestions, moduleQuizzes, type QuizQuestion } from './content/quizzes';

/**
 * Підказка довжиною — це не «правильний варіант на символ довший за решту»,
 * такої різниці ніхто не бачить. Це коли він помітно виділяється: довший за
 * найдовший із хибних щонайменше на стільки символів.
 */
const STANDOUT = 12;
/** Частка питань, у яких правильний варіант помітно виділяється довжиною. */
const STANDOUT_LIMIT = 0.25;
/** Наскільки позиція може бути популярнішою за рівномірний розподіл. */
const POSITION_LIMIT = 1.8;

let problems = 0;

function check(label: string, questions: QuizQuestion[]): void {
  const lines: string[] = [];
  const positions: Record<number, number> = {};
  let standoutLong = 0;
  let standoutShort = 0;

  const seen = new Map<string, number>();

  questions.forEach((question, i) => {
    const n = i + 1;
    positions[question.correctIndex] = (positions[question.correctIndex] ?? 0) + 1;

    const lengths = question.options.map((o) => o.length);
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    const correctLength = lengths[question.correctIndex]!;
    const others = lengths.filter((_, j) => j !== question.correctIndex);

    if (correctLength - Math.max(...others) >= STANDOUT) {
      standoutLong++;
      lines.push(`  #${n}: правильний варіант помітно довший за решту (+${correctLength - Math.max(...others)})`);
    }
    if (Math.min(...others) - correctLength >= STANDOUT) {
      standoutShort++;
      lines.push(`  #${n}: правильний варіант помітно коротший за решту (−${Math.min(...others) - correctLength})`);
    }

    // Розкид довжин: найдовший варіант удвічі за найкоротший — це вже підказка,
    // незалежно від того, який із них правильний.
    if (max > min * 2) lines.push(`  #${n}: варіанти дуже різні за довжиною (${min}–${max} символів)`);

    if (question.correctIndex < 0 || question.correctIndex >= question.options.length) {
      lines.push(`  #${n}: correctIndex поза межами списку варіантів`);
    }
    if (new Set(question.options).size !== question.options.length) {
      lines.push(`  #${n}: серед варіантів є однакові`);
    }
    if (!question.explainCorrect.trim() || !question.explainWrong.trim()) {
      lines.push(`  #${n}: порожнє пояснення (потрібні обидва)`);
    }

    const key = question.text.toLowerCase().replace(/[^а-яїієґёa-z ]/gi, ' ').replace(/\s+/g, ' ').trim();
    const dup = seen.get(key);
    if (dup) lines.push(`  #${n}: питання дублює #${dup}`);
    else seen.set(key, n);
  });

  const total = questions.length;
  const optionCount = questions[0]?.options.length ?? 4;
  const even = total / optionCount;

  for (const [index, count] of Object.entries(positions)) {
    if (count > even * POSITION_LIMIT) {
      lines.push(`  позиція ${Number(index) + 1}: ${count} з ${total} правильних — перекос`);
    }
  }
  if (standoutLong > total * STANDOUT_LIMIT) {
    lines.push(`  правильний варіант виділяється довжиною в ${standoutLong} з ${total} питань`);
  }
  if (standoutShort > total * STANDOUT_LIMIT) {
    lines.push(`  правильний варіант виділяється стислістю в ${standoutShort} з ${total} питань`);
  }

  const spread = [0, 1, 2, 3].map((i) => positions[i] ?? 0).join('/');
  console.log(`\n${label}: ${total} питань · позиції 1/2/3/4 → ${spread} · виділяються довжиною: ${standoutLong}`);
  if (lines.length) {
    problems += lines.length;
    console.log(lines.join('\n'));
  } else {
    console.log('  ✓ без зауважень');
  }
}

for (const quiz of moduleQuizzes) check(`Тест модуля ${quiz.moduleSlug}`, quiz.questions);
check('Фінальна атестація', finalExamQuestions);

const security = finalExamQuestions.filter((question) => question.isSecurity).length;
console.log(`\nПитань безпеки в атестації: ${security} з ${finalExamQuestions.length}.`);

console.log(problems ? `\n✗ Зауважень: ${problems}` : '\n✓ Усі тести проходять механічну перевірку.');
process.exitCode = problems ? 1 : 0;
