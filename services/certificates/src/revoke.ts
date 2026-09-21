import { prisma } from '@proai/db';
import type { Certificate } from '@proai/types';
import { toCertificateDto } from './issue';

/** Відкликання — виключно ADMIN+, причина обов'язкова (перевіряється на рівні API-схеми). */
export async function revokeCertificate(certificateId: string, reason: string): Promise<Certificate> {
  const cert = await prisma.certificate.update({
    where: { id: certificateId },
    data: { revoked: true, revokedReason: reason },
    include: { course: { select: { slug: true } } },
  });

  return toCertificateDto(cert);
}
