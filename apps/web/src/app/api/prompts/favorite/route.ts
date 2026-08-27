import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@proai/auth';
import { toggleFavorite } from '@proai/prompts';
import { PromptIdInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = PromptIdInputSchema.parse(await request.json());
    const favorite = await toggleFavorite(me.id, input.promptId);
    return NextResponse.json({ favorite });
  });
}
