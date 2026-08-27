import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, isAdmin } from '@proai/auth';
import { ArrowLeft } from '@proai/icons';
import { Navbar } from '@proai/ui';

const LINKS = [
  { href: '/admin', label: 'Огляд' },
  { href: '/admin/content', label: 'Контент' },
  { href: '/admin/library', label: 'Бібліотека' },
  { href: '/admin/organizations', label: 'Організації' },
  { href: '/admin/certificates', label: 'Сертифікати' },
  { href: '/admin/analytics', label: 'Аналітика' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Роль перевіряємо тут, а не лише на кожній сторінці окремо: забути одну
  // сторінку легко, забути єдиний layout цілого розділу — ні.
  if (!isAdmin(user.role)) redirect('/dashboard');

  return (
    <>
      <Navbar
        LinkComponent={Link}
        links={LINKS}
        brand={
          <Link href="/admin" className="flex items-center gap-2.5 font-display text-lg font-bold">
            Адміністрування
          </Link>
        }
        actions={
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
            <ArrowLeft size={15} /> На платформу
          </Link>
        }
      />
      <div className="mx-auto max-w-[1160px] px-6 pb-24">{children}</div>
    </>
  );
}
