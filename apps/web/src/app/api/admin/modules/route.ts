import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { CreateModuleInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = CreateModuleInputSchema.parse(await request.json());
    const module_ = await prisma.module.create({ data: input });
    return NextResponse.json({ module: module_ }, { status: 201 });
  });
}
