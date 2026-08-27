import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { submitFinalExam } from '@proai/learning';
import { SubmitFinalExamInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = SubmitFinalExamInputSchema.parse(await request.json());
    const result = await submitFinalExam(me.id, input);
    return NextResponse.json(result);
  });
}
