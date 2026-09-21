import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { sanitizeLessonBlocks } from '@proai/infra';
import { CreateLessonInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';
import { describeLessonError } from '@/lib/lesson-errors';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const body = await request.json();
    const parsed = CreateLessonInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: describeLessonError(parsed.error, body), details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { blocks, ...rest } = parsed.data;
    // Санітизація саме тут, на межі запису: у базі має лежати вже чистий HTML,
    // бо на сторінці уроку він іде в dangerouslySetInnerHTML без жодного фільтра.
    const lesson = await prisma.lesson.create({
      data: { ...rest, content: JSON.stringify(sanitizeLessonBlocks(blocks)) },
    });
    return NextResponse.json({ lesson }, { status: 201 });
  });
}
