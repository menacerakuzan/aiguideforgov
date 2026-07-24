import { redirect } from 'next/navigation';
import { ForbiddenError, requireAdmin, type CurrentUser } from '@yasno/auth';

/**
 * Те саме, що requireAdmin з @yasno/auth, але для серверних компонентів-сторінок:
 * замість некерованого винятку (який Next.js показав би як 500) —
 * чистий редирект на /dashboard. withApiErrors ловить цю ж помилку в API-роутах;
 * тут еквівалентна поведінка для сторінок.
 */
export function requirePageAdmin(user: CurrentUser): void {
  try {
    requireAdmin(user.role);
  } catch (error) {
    if (error instanceof ForbiddenError) redirect('/dashboard');
    throw error;
  }
}
