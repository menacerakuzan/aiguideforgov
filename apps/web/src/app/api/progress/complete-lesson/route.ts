import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { completeLesson } from '@yasno/learning';
import { CompleteLessonInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = CompleteLessonInputSchema.parse(await request.json());
    const result = await completeLesson(me.id, input.lessonId);
    return NextResponse.json(result);
  });
}
