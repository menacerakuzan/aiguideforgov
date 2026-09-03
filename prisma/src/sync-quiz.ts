/**
 * Оновлює ЛИШЕ підсумкові тести — тести модулів і фінальну атестацію.
 *
 * Навіщо окремо від seed: seed чистить базу повністю, тобто разом із питаннями
 * стирає користувачів, сесії та прогрес. Правка формулювання в одному питанні
 * не має цього коштувати.
 *
 * Запуск: pnpm --filter @proai/db sync-quiz
 *
 * Питання перестворюються цілком (старі видаляються, нові створюються): вони
 * не мають стабільного ключа, за яким їх можна було б зіставити, а редагування
 * «на місці» тихо переплутало б варіанти з правильними індексами. Спроби
 * (Attempt / ExamAttempt) при цьому лишаються — вони посилаються на тест, а не
 * на окремі питання; уже виставлені бали не перераховуються.
 */
import { prisma } from './client';
import { finalExamQuestions, moduleQuizzes, type QuizQuestion } from './content/quizzes';

function rows(questions: QuizQuestion[], withSecurity = false) {
  return questions.map((question, i) => ({
    order: i + 1,
    text: question.text,
    options: JSON.stringify(question.options),
    correctIndex: question.correctIndex,
    explainCorrect: question.explainCorrect,
    explainWrong: question.explainWrong,
    ...(withSecurity ? { isSecurity: question.isSecurity ?? false } : {}),
  }));
}

async function main() {
  for (const quiz of moduleQuizzes) {
    const module_ = await prisma.module.findUnique({
      where: { slug: quiz.moduleSlug },
      select: { id: true, title: true, quiz: { select: { id: true } } },
    });

    if (!module_) {
      console.warn(`  ⚠ модуля немає в базі (slug: ${quiz.moduleSlug}) — пропущено`);
      continue;
    }

    const quizId = module_.quiz?.id;

    if (quizId) {
      await prisma.$transaction([
        prisma.question.deleteMany({ where: { quizId } }),
        prisma.quiz.update({
          where: { id: quizId },
          data: { passScore: quiz.passScore, questions: { create: rows(quiz.questions) } },
        }),
      ]);
    } else {
      await prisma.quiz.create({
        data: {
          moduleId: module_.id,
          passScore: quiz.passScore,
          questions: { create: rows(quiz.questions) },
        },
      });
    }

    console.log(`  ✓ ${module_.title}: ${quiz.questions.length} питань, прохідний ${quiz.passScore}%`);
  }

  const exam = await prisma.finalExam.findFirst({ select: { id: true } });
  if (exam) {
    await prisma.$transaction([
      prisma.finalExamQuestion.deleteMany({ where: { examId: exam.id } }),
      prisma.finalExam.update({
        where: { id: exam.id },
        data: { questions: { create: rows(finalExamQuestions, true) } },
      }),
    ]);
    const security = finalExamQuestions.filter((question) => question.isSecurity).length;
    console.log(`  ✓ фінальна атестація: ${finalExamQuestions.length} питань, з них ${security} з блоку безпеки`);
  } else {
    console.warn('  ⚠ фінальної атестації немає в базі — пропущено');
  }

  console.log('Готово. Користувачів, сесії, прогрес і спроби не змінено.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
