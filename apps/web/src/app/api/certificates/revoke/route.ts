import { NextResponse, type NextRequest } from 'next/server';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { revokeCertificate } from '@proai/certificates';
import { RevokeCertificateInputSchema } from '@proai/types';
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
