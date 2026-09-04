import { randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { prisma } from '@proai/db';
import type { PasswordResetRequestRow } from '@proai/types';

/**
 * Відновлення пароля через адміністратора.
 *
 * Чому не автоматичне скидання за посиланням із листа: поштового провайдера в
 * платформі немає (`infra.mailer` лише пише в консоль), тож лист нікуди б не
 * пішов, а людина чекала б на нього. Тому людина лишає заявку, адміністратор
 * скидає пароль руками й надсилає новий на пошту. Механізм Better Auth за
 * токеном лишається в `instance.ts` і запрацює, щойно зʼявиться справжній mailer.
 */

/**
 * Алфавіт без пар, які плутають на слух і на око: немає l/I/1, o/O/0.
 * Пароль диктують телефоном і набирають руками — це не педантизм.
 * 32 символи = рівно 5 біт, і 256 % 32 === 0, тож `байт % 32` не має зсуву.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const GROUPS = 4;
const GROUP_LENGTH = 4;

/** Тимчасовий пароль виду `k7np-3rwq-8mtd-2vxf`: 80 біт, читається вголос. */
export function generateTemporaryPassword(): string {
  const bytes = randomBytes(GROUPS * GROUP_LENGTH);
  const chars = [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]);

  return Array.from({ length: GROUPS }, (_, i) =>
    chars.slice(i * GROUP_LENGTH, (i + 1) * GROUP_LENGTH).join(''),
  ).join('-');
}

/**
 * Приймає заявку від людини, яка не памʼятає пароль.
 *
 * Нічого не повідомляє про те, чи існує такий акаунт: інакше форма
 * перетворюється на спосіб перебрати, хто зареєстрований на платформі.
 * Адміністратор при цьому бачить, знайшовся акаунт чи ні.
 *
 * Повторна заявка на ту саму пошту, доки попередня в черзі, нового рядка не
 * створює — інакше одна людина, яка натиснула кнопку пʼять разів, засмічує
 * адміністратору всю чергу.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();

  const [user, pending] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.passwordResetRequest.findFirst({ where: { email, status: 'PENDING' }, select: { id: true } }),
  ]);

  if (pending) return;

  await prisma.passwordResetRequest.create({ data: { email, userId: user?.id ?? null } });
}

/** Черга заявок для адміністратора: спершу необроблені, всередині — найновіші. */
export async function listPasswordResetRequests(limit = 50): Promise<PasswordResetRequestRow[]> {
  const rows = await prisma.passwordResetRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      user: { select: { name: true, email: true, role: true } },
      handledBy: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    accountName: row.user?.name ?? null,
    accountExists: row.userId !== null,
    handledAt: row.handledAt ? row.handledAt.toISOString() : null,
    handledByName: row.handledBy?.name ?? null,
  }));
}

/** Заявка, до якої вже не можна застосувати дію (опрацьована або зникла). */
export class RequestNotActionableError extends Error {
  constructor(message = 'Заявку вже опрацьовано або її не існує') {
    super(message);
    this.name = 'RequestNotActionableError';
  }
}

/**
 * Скидає пароль за заявкою й повертає новий — рівно один раз.
 *
 * У базі лишається тільки хеш, тому показати пароль ще раз неможливо: якщо
 * адміністратор його загубив, треба скидати заново. Це навмисно, а не
 * недоробка — збережений відкритим тимчасовий пароль небезпечніший за
 * незручність повторного скидання.
 */
export async function resetPasswordByRequest(requestId: string, adminId: string): Promise<string> {
  const request = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, userId: true },
  });

  if (!request || request.status !== 'PENDING') throw new RequestNotActionableError();
  if (!request.userId) {
    throw new RequestNotActionableError('Акаунта з такою поштою немає — заявку можна лише закрити');
  }

  const password = generateTemporaryPassword();
  const hashed = await hashPassword(password);
  const userId = request.userId;

  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { id: true },
  });

  await prisma.$transaction([
    account
      ? prisma.account.update({ where: { id: account.id }, data: { password: hashed } })
      : // Акаунта з паролем може не бути, якщо користувача колись завели інакше.
        prisma.account.create({ data: { userId, accountId: userId, providerId: 'credential', password: hashed } }),
    // Старі сесії обриваємо: якщо доступ до акаунта втрачено не власником,
    // зміна пароля без цього нічого не дає — чужа сесія лишається живою.
    prisma.session.deleteMany({ where: { userId } }),
    prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: { status: 'DONE', handledAt: new Date(), handledById: adminId },
    }),
  ]);

  return password;
}

/** Закриває заявку без скидання: акаунта немає, дубль, звернення не підтвердилось. */
export async function dismissPasswordResetRequest(requestId: string, adminId: string): Promise<void> {
  const { count } = await prisma.passwordResetRequest.updateMany({
    where: { id: requestId, status: 'PENDING' },
    data: { status: 'DISMISSED', handledAt: new Date(), handledById: adminId },
  });

  if (count === 0) throw new RequestNotActionableError();
}
