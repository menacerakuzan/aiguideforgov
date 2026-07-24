import { prisma } from '@yasno/db';
import type { Certificate } from '@yasno/types';

/** Відкликання — виключно ADMIN+, причина обов'язкова (перевіряється на рівні API-схеми). */
export async function revokeCertificate(certificateId: string, reason: string): Promise<Certificate> {
  const cert = await prisma.certificate.update({
    where: { id: certificateId },
    data: { revoked: true, revokedReason: reason },
  });

  return {
    id: cert.id,
    code: cert.code,
    userId: cert.userId,
    holderName: cert.holderName,
    holderPosition: cert.holderPosition,
    organizationName: cert.organizationName,
    score: cert.score,
    withHonors: cert.withHonors,
    issuedAt: cert.issuedAt.toISOString(),
    validUntil: cert.validUntil.toISOString(),
    revoked: cert.revoked,
  };
}
