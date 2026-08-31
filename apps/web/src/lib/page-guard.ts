import { redirect } from 'next/navigation';
import { ForbiddenError, getCurrentUser, requireAdmin, type CurrentUser } from '@proai/auth';

/**
 * Гарди для серверних компонентів-сторінок.
 *
 * В API-роутах ті самі перевірки кидають UnauthorizedError/ForbiddenError, а
 * withApiErrors перетворює їх на 401/403. Сторінці ж потрібен редирект: виняток
 * із серверного компонента Next показує як помилку рендера, а не як «увійдіть».
 */

/**
 * Поточний слухач або редирект на /login.
 *
 * Чому не `requireCurrentUser()` напряму: layout групи (app) теж перевіряє сесію
 * й робить редирект, але в App Router layout і page рендеряться **паралельно** —
 * редирект із layout не встигає скасувати рендер сторінки. Тому сторінка, яка
 * кидає виняток, встигає це зробити, і в консолі зʼявляється
 * `⨯ Error [UnauthorizedError]` замість тихого переходу на форму входу.
 *
 * Найпростіше відтворити так: кука сесії в браузері є, а самої сесії вже немає
 * (термін вийшов, користувача видалили, базу перестворили). middleware пропускає
 * такий запит, бо перевіряє лише наявність куки, — і сторінка лишається сам на сам
 * із порожньою сесією.
 *
 * Повернення на потрібну сторінку після входу (`?next=`) тут не проставляємо:
 * типовий випадок «куки немає» перехоплює middleware, і він це вже робить.
 */
export async function requirePageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Те саме, що requireAdmin з @proai/auth, але для сторінок: замість некерованого
 * винятку (який Next.js показав би як 500) — чистий редирект на /dashboard.
 */
export function requirePageAdmin(user: CurrentUser): void {
  try {
    requireAdmin(user.role);
  } catch (error) {
    if (error instanceof ForbiddenError) redirect('/dashboard');
    throw error;
  }
}
