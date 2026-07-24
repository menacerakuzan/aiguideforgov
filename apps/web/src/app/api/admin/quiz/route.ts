import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { UpsertQuizInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

/** Тест модуля разом із правильними відповідями — для форми редагування в CMS. */
export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const moduleId = new URL(request.url).searchParams.get('moduleId');
    if (!moduleId) return NextResponse.json({ error: 'Вкажіть moduleId' }, { status: 400 });

    const quiz = await prisma.quiz.findUnique({
      where: { moduleId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) return NextResponse.json({ quiz: null });

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        moduleId,
        passScore: quiz.passScore,
        questions: quiz.questions.map((q) => ({
          text: q.text,
          options: JSON.parse(q.options) as string[],
          correctIndex: q.correctIndex,
          explainCorrect: q.explainCorrect,
          explainWrong: q.explainWrong,
        })),
      },
    });
  });
}

/** Повністю замінює тест модуля (passScore + весь набір питань) — простіше й надійніше за часткові патчі. */
export async function PUT(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = UpsertQuizInputSchema.parse(await request.json());

    const quiz = await prisma.$transaction(async (tx) => {
      await tx.quiz.deleteMany({ where: { moduleId: input.moduleId } });
      return tx.quiz.create({
        data: {
          moduleId: input.moduleId,
          passScore: input.passScore,
          questions: {
            create: input.questions.map((q, i) => ({
              order: i + 1,
              text: q.text,
              options: JSON.stringify(q.options),
              correctIndex: q.correctIndex,
              explainCorrect: q.explainCorrect,
              explainWrong: q.explainWrong,
            })),
          },
        },
        include: { questions: { orderBy: { order: 'asc' } } },
      });
    });

    return NextResponse.json({ quiz });
  });
}
