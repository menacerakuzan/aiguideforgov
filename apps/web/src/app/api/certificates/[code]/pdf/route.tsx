import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { withApiErrors } from '@/lib/api-guard';
import { CertificateDocument } from '@/lib/certificate-pdf';

/** PDF-версія сертифіката: власник або будь-який ADMIN. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    const { code } = await params;

    const cert = await prisma.certificate.findUnique({ where: { code: decodeURIComponent(code) } });
    if (!cert) return NextResponse.json({ error: 'Сертифікат не знайдено' }, { status: 404 });
    if (cert.userId !== me.id) requireAdmin(me.role);

    const buffer = await renderToBuffer(
      <CertificateDocument
        data={{
          code: cert.code,
          holderName: cert.holderName,
          holderPosition: cert.holderPosition,
          organizationName: cert.organizationName,
          score: cert.score,
          withHonors: cert.withHonors,
          issuedAt: cert.issuedAt.toISOString(),
          validUntil: cert.validUntil.toISOString(),
          // Назва курсу — зі самого сертифіката, а не з бази курсів: документ
          // друкує те, за що його видали, навіть якщо курс відтоді
          // перейменували або прибрали з платформи.
          courseTitle: cert.courseTitle,
          verifyOrigin: process.env.NEXT_PUBLIC_APP_URL ?? null,
        }}
      />,
    );

    // Content-Disposition має бути ByteString (лише ASCII) — код сертифіката кириличний,
    // тож даємо ASCII-безпечний fallback-filename і UTF-8 через filename* для сучасних браузерів.
    const asciiFallback = cert.code.replace(/[^\x20-\x7e]/g, '_');
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sertyfikat-${asciiFallback}.pdf"; filename*=UTF-8''${encodeURIComponent(`sertyfikat-${cert.code}.pdf`)}`,
      },
    });
  });
}
