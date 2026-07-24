import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { revokeCertificate } from '@yasno/certificates';
import { RevokeCertificateInputSchema } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = RevokeCertificateInputSchema.parse(await request.json());
    const certificate = await revokeCertificate(input.certificateId, input.reason);
    return NextResponse.json({ certificate });
  });
}
