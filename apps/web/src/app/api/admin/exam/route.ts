import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { UpsertFinalExamInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/** Фінальна атестація курсу разом із правильними відповідями — для форми редагування в CMS. */
export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const courseId = new URL(request.url).searchParams.get('courseId');
    if (!courseId) return NextResponse.json({ error: 'Вкажіть courseId' }, { status: 400 });

    const exam = await prisma.finalExam.findUnique({
      where: { courseId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!exam) return NextResponse.json({ exam: null });

    return NextResponse.json({
      exam: {
        id: exam.id,
        courseId,
        passScore: exam.passScore,
        securityPassScore: exam.securityPassScore,
        questions: exam.questions.map((q) => ({
          text: q.text,
          options: JSON.parse(q.options) as string[],
          correctIndex: q.correctIndex,
          explainCorrect: q.explainCorrect,
          explainWrong: q.explainWrong,
          isSecurity: q.isSecurity,
        })),
      },
    });
  });
}

/** Повністю замінює фінальну атестацію курсу — той самий підхід, що й для тесту модуля. */
export async function PUT(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = UpsertFinalExamInputSchema.parse(await request.json());

    const exam = await prisma.$transaction(async (tx) => {
      await tx.finalExam.deleteMany({ where: { courseId: input.courseId } });
      return tx.finalExam.create({
        data: {
          courseId: input.courseId,
          passScore: input.passScore,
          securityPassScore: input.securityPassScore,
          questions: {
            create: input.questions.map((q, i) => ({
              order: i + 1,
              text: q.text,
              options: JSON.stringify(q.options),
              correctIndex: q.correctIndex,
              explainCorrect: q.explainCorrect,
              explainWrong: q.explainWrong,
              isSecurity: q.isSecurity,
            })),
          },
        },
        include: { questions: { orderBy: { order: 'asc' } } },
      });
    });

    return NextResponse.json({ exam });
  });
}
