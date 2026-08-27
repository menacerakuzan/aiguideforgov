import { prisma } from '@proai/db';
import type { Certificate } from '@proai/types';
import { generateCertificateCode } from './code';

export interface IssueCertificateInput {
  userId: string;
  score: number;
  withHonors: boolean;
}

function toDto(c: {
  id: string;
  code: string;
  userId: string;
  holderName: string;
  holderPosition: string | null;
  organizationName: string | null;
  score: number;
  withHonors: boolean;
  issuedAt: Date;
  validUntil: Date;
  revoked: boolean;
}): Certificate {
  return {
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
  };
}

/**
 * Видає сертифікат. Не дублює: якщо в користувача вже є нечинний-невідкликаний
 * сертифікат, повертає його замість створення нового (повторне складання тесту
 * після вже виданого сертифіката не плодить нові документи).
 */
export async function issueCertificate(input: IssueCertificateInput): Promise<Certificate> {
  const existing = await prisma.certificate.findFirst({
    where: { userId: input.userId, revoked: false },
    orderBy: { issuedAt: 'desc' },
  });
  if (existing) return toDto(existing);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    include: { organization: true },
  });

  const issuedAt = new Date();
  const validUntil = new Date(issuedAt);
  validUntil.setMonth(validUntil.getMonth() + 24);

  // Унікальність коду: практично гарантована 6-символьним алфавітом,
  // але перевіряємо явно, щоб конфлікт ніколи не впав у користувача помилкою.
  let code = generateCertificateCode(issuedAt.getFullYear());
  while (await prisma.certificate.findUnique({ where: { code } })) {
    code = generateCertificateCode(issuedAt.getFullYear());
  }

  const created = await prisma.certificate.create({
    data: {
      code,
      userId: user.id,
      holderName: user.name,
      holderPosition: user.position,
      organizationName: user.organization?.name ?? null,
      score: input.score,
      withHonors: input.withHonors,
      issuedAt,
      validUntil,
    },
  });

  return toDto(created);
}
