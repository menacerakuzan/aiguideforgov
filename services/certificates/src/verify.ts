import { prisma } from '@proai/db';
import type { PublicCertificate, VerifyCertificateResponse } from '@proai/types';
import { normalizeCertificateCode } from './code';

/**
 * Публічна перевірка (без авторизації, §DESIGN_REVIEW C3 — довіра сертифіката
 * тримається саме на цій перевірці). Розрізняє чотири стани: чинний,
 * прострочений, відкликаний, не знайдений.
 *
 * Назовні віддаємо PublicCertificate, а не повний рядок таблиці: id та userId
 * стороннім не потрібні, а їх витік перетворює публічне посилання на джерело
 * внутрішніх ідентифікаторів.
 */
export async function verifyCertificate(code: string): Promise<VerifyCertificateResponse> {
  const cert = await prisma.certificate.findUnique({ where: { code: normalizeCertificateCode(code) } });
  if (!cert) return { status: 'NOT_FOUND', certificate: null };

  const dto: PublicCertificate = {
    code: cert.code,
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
