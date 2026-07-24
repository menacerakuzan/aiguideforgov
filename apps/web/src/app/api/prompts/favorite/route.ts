import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { toggleFavorite } from '@yasno/prompts';
import { PromptIdInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const input = PromptIdInputSchema.parse(await request.json());
    const favorite = await toggleFavorite(me.id, input.promptId);
    return NextResponse.json({ favorite });
  });
}
