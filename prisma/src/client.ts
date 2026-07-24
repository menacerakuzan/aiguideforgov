import { PrismaClient } from '@prisma/client';

/**
 * Один інстанс Prisma на процес. У dev-режимі Next.js перезавантажує модулі
 * при кожній зміні файлу — кешуємо клієнт на globalThis, щоб не вичерпати
 * ліміт з'єднань SQLite.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
