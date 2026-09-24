import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, isAdmin } from '@proai/auth';
import { ArrowLeft } from '@proai/icons';
import { AppNavbar } from '@/components/app-navbar';
import { SupportWidget } from '@/components/support/support-widget';

const LINKS = [
  { href: '/admin', label: 'Огляд' },
  { href: '/admin/content', label: 'Контент' },
  { href: '/admin/library', label: 'Бібліотека' },
  { href: '/admin/organizations', label: 'Організації' },
  { href: '/admin/certificates', label: 'Сертифікати' },
  { href: '/admin/analytics', label: 'Аналітика' },
  { href: '/admin/support', label: 'Підтримка' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Роль перевіряємо тут, а не лише на кожній сторінці окремо: забути одну
  // сторінку легко, забути єдиний layout цілого розділу — ні.
  if (!isAdmin(user.role)) redirect('/dashboard');

  return (
    <>
      <AppNavbar
        links={LINKS}
        crowded
        brand={
          <Link href="/admin" className="flex flex-none items-center gap-2.5 font-display text-lg font-bold whitespace-nowrap">
            Адміністрування
          </Link>
        }
        actions={
          // У рядку меню — кругла кнопка зі стрілкою (місця для підпису там немає),
          // у випадній панелі на вужчих екранах — з підписом.
          <Link
            href="/dashboard"
            title="На платформу"
            className="inline-flex h-[46px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-ink-soft transition-colors hover:bg-blue-tint hover:text-blue-deep xl:w-[46px] xl:justify-center xl:border-2 xl:border-ink xl:bg-paper-2 xl:px-0"
          >
            <ArrowLeft size={16} /> <span className="xl:sr-only">На платформу</span>
          </Link>
        }
      />
      <div className="mx-auto max-w-[1160px] px-6 pb-24">{children}</div>
      <SupportWidget isAdmin />
    </>
  );
}
