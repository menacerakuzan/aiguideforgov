import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { submitFinalExam } from '@yasno/learning';
import { SubmitFinalExamInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = SubmitFinalExamInputSchema.parse(await request.json());
    const result = await submitFinalExam(me.id, input);
    return NextResponse.json(result);
  });
}
