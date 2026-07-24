import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser } from '@yasno/auth';
import { listPrompts } from '@yasno/prompts';
import { PromptsQuerySchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const query = PromptsQuerySchema.parse({
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      favorites: searchParams.get('favorites') ?? undefined,
    });
    const prompts = await listPrompts(me.id, query);
    return NextResponse.json({ prompts });
  });
}
