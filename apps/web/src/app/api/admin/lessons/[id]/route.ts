import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { sanitizeLessonBlocks } from '@proai/infra';
import { UpdateLessonInputSchema, type LessonBlock } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';
import { describeLessonError } from '@/lib/lesson-errors';

/** Повний урок разом із розібраними блоками — для форми редагування в CMS. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({
      lesson: {
        id: lesson.id,
        moduleId: lesson.moduleId,
        slug: lesson.slug,
        title: lesson.title,
        minutes: lesson.minutes,
        order: lesson.order,
        kind: lesson.kind,
        blocks: JSON.parse(lesson.content) as LessonBlock[],
        updatedAt: lesson.updatedAt.toISOString(),
        validAsOf: lesson.validAsOf ? lesson.validAsOf.toISOString() : null,
      },
    });
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    const body = await request.json();
    const parsed = UpdateLessonInputSchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: describeLessonError(parsed.error, body), details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { blocks, validAsOf, ...rest } = parsed.data;

    const lesson = await prisma.$transaction(async (tx) => {
      const before = await tx.lesson.findUniqueOrThrow({ where: { id } });
      // Знімок перед зміною — проста історія версій без відкату.
      await tx.lessonRevision.create({
        data: { lessonId: id, content: before.content, editedById: me.id },
      });
      return tx.lesson.update({
        where: { id },
        data: {
          ...rest,
          id: undefined,
          ...(blocks ? { content: JSON.stringify(sanitizeLessonBlocks(blocks)) } : {}),
          ...(validAsOf !== undefined ? { validAsOf: validAsOf ? new Date(validAsOf) : null } : {}),
        },
      });
    });

    return NextResponse.json({ lesson });
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);
    const { id } = await params;

    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
