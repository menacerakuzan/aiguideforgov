import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { CreateSectionInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = CreateSectionInputSchema.parse(await request.json());
    const section = await prisma.section.create({ data: input });
    return NextResponse.json({ section }, { status: 201 });
  });
}
