import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { submitQuiz } from '@yasno/learning';
import { SubmitQuizInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = SubmitQuizInputSchema.parse(await request.json());
    const result = await submitQuiz(me.id, input);
    return NextResponse.json(result);
  });
}
