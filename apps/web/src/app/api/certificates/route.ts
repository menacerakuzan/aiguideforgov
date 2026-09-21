import { NextResponse } from 'next/server';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import { toCertificateDto } from '@proai/certificates';
import { withApiErrors } from '@/lib/api-guard';

/** Сертифікати поточного слухача — по одному за кожен пройдений курс. */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const certs = await prisma.certificate.findMany({
      where: { userId: me.id },
      orderBy: { issuedAt: 'desc' },
      include: { course: { select: { slug: true } } },
    });

    return NextResponse.json({ certificates: certs.map(toCertificateDto) });
  });
}
