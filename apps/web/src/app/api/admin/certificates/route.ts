import { NextResponse } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { toCertificateDto } from '@proai/certificates';
import type { AdminCertificatesResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/** Усі сертифікати платформи, видані будь-якому користувачу — лише ADMIN. */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const certs = await prisma.certificate.findMany({
      include: { user: { select: { email: true } }, course: { select: { slug: true } } },
      orderBy: { issuedAt: 'desc' },
    });

    const response: AdminCertificatesResponse = {
      certificates: certs.map((c) => ({ ...toCertificateDto(c), holderEmail: c.user.email })),
    };
    return NextResponse.json(response);
  });
}
