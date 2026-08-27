import { prisma } from '@proai/db';
import type { FinalExam, SubmitFinalExamInput, SubmitFinalExamResponse } from '@proai/types';
import { issueCertificate } from '@proai/certificates';
import { hasCompletedAllModules } from './lib/completion';

/**
 * Спроба скласти фінальну атестацію без пройдених модулів курсу.
 * Окремий тип, а не 403 рядком: рівень домену не знає про HTTP, а
 * withApiErrors перетворює його на коректну відповідь.
 */
export class NotEligibleError extends Error {
  constructor(message = 'Спершу пройдіть усі модулі курсу') {
    super(message);
    this.name = 'NotEligibleError';
  }
}

/** Фінальна атестація курсу разом з ознакою допуску для конкретного слухача. */
export async function getFinalExam(userId: string, courseSlug: string): Promise<FinalExam | null> {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: { finalExam: { include: { questions: { orderBy: { order: 'asc' } } } } },
  });
  if (!course?.finalExam) return null;

  const eligible = await hasCompletedAllModules(userId, course.id);

  return {
    id: course.finalExam.id,
    courseSlug: course.slug,
    courseTitle: course.title,
    passScore: course.finalExam.passScore,
    securityPassScore: course.finalExam.securityPassScore,
    eligible,
    questions: course.finalExam.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options) as string[],
      order: q.order,
      isSecurity: q.isSecurity,
    })),
  };
}

/**
 * Оцінює фінальну атестацію: загальний бал І окремий бал за питаннями
 * безпеки (isSecurity) — обидва пороги мають бути пройдені. За успіху
 * і повного проходження всіх модулів курсу — видає сертифікат.
 */
export async function submitFinalExam(userId: string, input: SubmitFinalExamInput): Promise<SubmitFinalExamResponse> {
  const exam = await prisma.finalExam.findUniqueOrThrow({
    where: { id: input.examId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  // Допуск перевіряємо ТУТ, а не лише в getFinalExam: сторінка ховає кнопку,
  // але POST на /api/exam/submit можна надіслати й повз неї — і в базі
  // з'являлася б спроба атестації від того, хто курс ще не пройшов.
  const eligible = await hasCompletedAllModules(userId, exam.courseId);
  if (!eligible) throw new NotEligibleError();

  const graded = exam.questions.map((q, i) => {
    const options = JSON.parse(q.options) as string[];
    const pickedIndex = input.answers[i] ?? -1;
    const ok = pickedIndex === q.correctIndex;
    return {
      isSecurity: q.isSecurity,
      review: {
        questionText: q.text,
        pickedIndex,
        correctIndex: q.correctIndex,
        correctText: options[q.correctIndex] ?? '',
        ok,
        explain: ok ? q.explainCorrect : q.explainWrong,
      },
    };
  });

  const review = graded.map((g) => g.review);
  const correctCount = review.filter((r) => r.ok).length;
  const score = Math.round((correctCount / exam.questions.length) * 100);

  const securityGraded = graded.filter((g) => g.isSecurity);
  const securityCorrect = securityGraded.filter((g) => g.review.ok).length;
  const securityScore = securityGraded.length
    ? Math.round((securityCorrect / securityGraded.length) * 100)
    : 100;

  const passed = score >= exam.passScore && securityScore >= exam.securityPassScore;

  await prisma.examAttempt.create({
    data: { userId, examId: exam.id, score, securityScore, passed, answers: JSON.stringify(input.answers) },
  });

  let certificate = null;
  if (passed) {
    certificate = await issueCertificate({ userId, score, withHonors: score >= 95 && securityScore === 100 });
  }

  return {
    score,
    securityScore,
    passed,
    passScore: exam.passScore,
    securityPassScore: exam.securityPassScore,
    review,
    certificate,
  };
}
