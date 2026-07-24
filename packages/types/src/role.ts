import { z } from 'zod';

/**
 * RBAC: дві ролі. LEARNER вчиться, ADMIN бачить і керує всім —
 * усіма користувачами, їхньою статистикою, усіма сертифікатами й контентом.
 */
export const ROLES = ['LEARNER', 'ADMIN'] as const;

export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const ROLE_LABELS: Record<Role, string> = {
  LEARNER: 'Слухач',
  ADMIN: 'Адміністратор',
};
