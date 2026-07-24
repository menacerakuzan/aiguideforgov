import { NextResponse } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import type { Certificate } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const certs = await prisma.certificate.findMany({ where: { userId: me.id }, orderBy: { issuedAt: 'desc' } });

    const certificates: Certificate[] = certs.map((c) => ({
      id: c.id,
      code: c.code,
      userId: c.userId,
      holderName: c.holderName,
      holderPosition: c.holderPosition,
      organizationName: c.organizationName,
      score: c.score,
      withHonors: c.withHonors,
      issuedAt: c.issuedAt.toISOString(),
      validUntil: c.validUntil.toISOString(),
      revoked: c.revoked,
    }));

    return NextResponse.json({ certificates });
  });
}
