import { NextResponse } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import type { AdminCertificatesResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/** Усі сертифікати платформи, видані будь-якому користувачу — лише ADMIN. */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const certs = await prisma.certificate.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { issuedAt: 'desc' },
    });

    const response: AdminCertificatesResponse = {
      certificates: certs.map((c) => ({
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
        holderEmail: c.user.email,
      })),
    };
    return NextResponse.json(response);
  });
}
