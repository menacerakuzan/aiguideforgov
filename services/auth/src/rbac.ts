import type { Role } from '@yasno/types';

/**
 * RBAC спрощено до двох ролей: LEARNER вчиться, ADMIN бачить і керує всім.
 * Немає матриці дій — достатньо однієї перевірки «це адмін чи ні».
 */
export function isAdmin(role: Role): boolean {
  return role === 'ADMIN';
}

export class ForbiddenError extends Error {
  constructor(message = 'Недостатньо прав для цієї дії') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Кидає ForbiddenError, якщо роль не ADMIN — для використання на початку route handler/сторінки. */
export function requireAdmin(role: Role): void {
  if (!isAdmin(role)) throw new ForbiddenError();
}
