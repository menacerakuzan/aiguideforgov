import { prisma } from '@proai/db';
import type { Certificate } from '@proai/types';
import { generateCertificateCode } from './code';

export interface IssueCertificateInput {
  userId: string;
  /** Курс, за який видається документ. Сертифікат без курсу не має сенсу. */
  courseId: string;
  score: number;
  withHonors: boolean;
}

/** Скільки місяців сертифікат лишається чинним. */
const VALID_MONTHS = 24;

interface CertificateRow {
  id: string;
  code: string;
  userId: string;
  holderName: string;
  holderPosition: string | null;
  organizationName: string | null;
  courseTitle: string;
  score: number;
  withHonors: boolean;
  issuedAt: Date;
  validUntil: Date;
  revoked: boolean;
  course: { slug: string } | null;
}

export function toCertificateDto(c: CertificateRow): Certificate {
  return {
    id: c.id,
    code: c.code,
    userId: c.userId,
    holderName: c.holderName,
    holderPosition: c.holderPosition,
    organizationName: c.organizationName,
    courseTitle: c.courseTitle,
    courseSlug: c.course?.slug ?? null,
    score: c.score,
    withHonors: c.withHonors,
    issuedAt: c.issuedAt.toISOString(),
    validUntil: c.validUntil.toISOString(),
    revoked: c.revoked,
  };
}

/**
 * Видає сертифікат за конкретний курс.
 *
 * Не дублює В МЕЖАХ КУРСУ: якщо чинний сертифікат за цей курс уже є, повертаємо
 * його — перескладання атестації після виданого документа не має плодити нові
 * коди. Але сертифікат за ІНШИЙ курс — це інший документ, і він видається
 * незалежно: раніше перевірка стояла на самому лише userId, тож людина, яка
 * пройшла другий курс, мовчки отримувала назад сертифікат за перший.
 *
 * Відкликаний сертифікат видачу не блокує: якщо людина склала атестацію
 * наново, вона має отримати новий чинний документ.
 */
export async function issueCertificate(input: IssueCertificateInput): Promise<Certificate> {
  const existing = await prisma.certificate.findFirst({
    where: { userId: input.userId, courseId: input.courseId, revoked: false },
    orderBy: { issuedAt: 'desc' },
    include: { course: { select: { slug: true } } },
  });
  if (existing) return toCertificateDto(existing);

  const [user, course] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: input.userId }, include: { organization: true } }),
    prisma.course.findUniqueOrThrow({ where: { id: input.courseId }, select: { id: true, title: true } }),
  ]);

  const issuedAt = new Date();
  const validUntil = new Date(issuedAt);
  validUntil.setMonth(validUntil.getMonth() + VALID_MONTHS);

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
      courseId: course.id,
      // Знімок назви: курс перейменують — виданий документ не змінюється.
      courseTitle: course.title,
      score: input.score,
      withHonors: input.withHonors,
      issuedAt,
      validUntil,
    },
    include: { course: { select: { slug: true } } },
  });

  return toCertificateDto(created);
}
