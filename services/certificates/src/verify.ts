import { prisma } from '@yasno/db';
import type { VerifyCertificateResponse } from '@yasno/types';

/**
 * Публічна перевірка (без авторизації, §DESIGN_REVIEW C3 — довіра сертифіката
 * тримається саме на цій перевірці). Розрізняє чотири стани: чинний,
 * прострочений, відкликаний, не знайдений.
 */
export async function verifyCertificate(code: string): Promise<VerifyCertificateResponse> {
  const cert = await prisma.certificate.findUnique({ where: { code } });
  if (!cert) return { status: 'NOT_FOUND', certificate: null };

  const dto = {
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

  if (cert.revoked) return { status: 'REVOKED', certificate: dto };
  if (cert.validUntil.getTime() < Date.now()) return { status: 'EXPIRED', certificate: dto };
  return { status: 'VALID', certificate: dto };
}
