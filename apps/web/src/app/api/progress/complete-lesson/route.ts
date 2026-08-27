import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { completeLesson } from '@proai/learning';
import { CompleteLessonInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = CompleteLessonInputSchema.parse(await request.json());
    const result = await completeLesson(me.id, input.lessonId);
    return NextResponse.json(result);
  });
}
