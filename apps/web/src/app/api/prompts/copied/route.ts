import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { incrementCopyCount } from '@yasno/prompts';
import { PromptIdInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    await requireCurrentUser(); // копіювання рахуємо лише для авторизованих слухачів
    const input = PromptIdInputSchema.parse(await request.json());
    const copyCount = await incrementCopyCount(input.promptId);
    return NextResponse.json({ copyCount });
  });
}
