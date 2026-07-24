import { headers } from 'next/headers';
import { RoleSchema, type Role } from '@yasno/types';
import { auth } from './instance';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string | null;
  organizationId: string | null;
}

export class UnauthorizedError extends Error {
  constructor(message = 'Потрібен вхід у систему') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Читає сесію з cookies поточного запиту. Повертає null, якщо користувач не увійшов. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const raw = session.user as typeof session.user & {
    role?: string;
    position?: string | null;
    organizationId?: string | null;
  };

  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: RoleSchema.parse(raw.role ?? 'LEARNER'),
    position: raw.position ?? null,
    organizationId: raw.organizationId ?? null,
  };
}

/** Те саме, але кидає UnauthorizedError, якщо сесії немає — для API route handlers. */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
