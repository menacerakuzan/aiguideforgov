import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { sanitizeRichHtml } from '@proai/infra';
import { CreateResourceInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = CreateResourceInputSchema.parse(await request.json());
    // resource.body рендериться через dangerouslySetInnerHTML у /library.
    const created = await prisma.resource.create({
      data: { ...input, body: sanitizeRichHtml(input.body) },
    });
    return NextResponse.json({ resource: created }, { status: 201 });
  });
}
