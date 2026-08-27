import { NextResponse } from 'next/server';
import { verifyCertificate } from '@proai/certificates';
import { withApiErrors } from '@/lib/api-guard';

/** Публічний ендпоінт — без авторизації. Саме на ньому тримається довіра до сертифіката. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  return withApiErrors(async () => {
    const { code } = await params;
    const result = await verifyCertificate(decodeURIComponent(code));
    return NextResponse.json(result);
  });
}
