import { prisma } from '@proai/db';
import type { Quiz, SubmitQuizInput, SubmitQuizResponse } from '@proai/types';
import { refreshStreak } from './streak';

/** Тест модуля без правильних відповідей — вони відомі лише серверу. */
export async function getQuizByModuleSlug(moduleSlug: string): Promise<Quiz | null> {
  const module = await prisma.module.findUnique({
    where: { slug: moduleSlug },
    include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } },
  });
  if (!module?.quiz) return null;

  return {
    id: module.quiz.id,
    moduleSlug: module.slug,
    moduleTitle: module.title,
    passScore: module.quiz.passScore,
    questions: module.quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options) as string[],
      order: q.order,
    })),
  };
}

/** Оцінює спробу проходження тесту модуля і зберігає її. Не видає сертифікат — це робить лише фінальна атестація. */
export async function submitQuiz(userId: string, input: SubmitQuizInput): Promise<SubmitQuizResponse> {
  const quiz = await prisma.quiz.findUniqueOrThrow({
    where: { id: input.quizId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  const review = quiz.questions.map((q, i) => {
    const options = JSON.parse(q.options) as string[];
    const pickedIndex = input.answers[i] ?? -1;
    const ok = pickedIndex === q.correctIndex;
    return {
      questionText: q.text,
      pickedIndex,
      correctIndex: q.correctIndex,
      correctText: options[q.correctIndex] ?? '',
      ok,
      explain: ok ? q.explainCorrect : q.explainWrong,
    };
  });

  const correctCount = review.filter((r) => r.ok).length;
  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = score >= quiz.passScore;

  await prisma.attempt.create({
    data: { userId, quizId: quiz.id, score, passed, answers: JSON.stringify(input.answers) },
  });

  // Спроба тесту — теж день навчання: інакше людина, яка сьогодні тільки
  // складала тест, побачила б учорашню серію.
  await refreshStreak(userId);

  return { score, passed, passScore: quiz.passScore, review };
}
