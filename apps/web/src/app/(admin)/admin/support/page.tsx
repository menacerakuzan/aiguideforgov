import { listSupportThreads } from '@proai/support';
import { requirePageAdmin, requirePageUser } from '@/lib/page-guard';
import { SupportInbox } from '@/components/admin/support-inbox';

export const metadata = { title: 'Підтримка' };

/**
 * Підтримка: усі розмови людей з адміністраторами.
 *
 * Список розмов приходить у першому HTML (серверна вибірка), а далі сторінка
 * сама опитує API — нові звернення зʼявляються без перезавантаження.
 * `?user=<id>` відкриває розмову з конкретною людиною, зокрема ще порожню:
 * так працює кнопка «Написати» в картці людини в аналітиці.
 */
export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const me = await requirePageUser();
  requirePageAdmin(me);

  const [threads, { user }] = await Promise.all([listSupportThreads(), searchParams]);

  return (
    <div className="pt-8">
      <SupportInbox initialThreads={threads} initialUserId={typeof user === 'string' ? user : null} />
    </div>
  );
}
