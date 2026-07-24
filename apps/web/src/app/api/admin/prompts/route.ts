import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { CreatePromptInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = CreatePromptInputSchema.parse(await request.json());
    const created = await prisma.prompt.create({ data: { ...input, verified: true } });
    return NextResponse.json({ prompt: created }, { status: 201 });
  });
}
