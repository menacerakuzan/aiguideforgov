import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@yasno/auth';
import { ArrowLeft } from '@yasno/icons';
import { Navbar } from '@yasno/ui';

const LINKS = [
  { href: '/admin', label: 'Огляд' },
  { href: '/admin/org', label: 'Організація' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Кожна сторінка розділу сама вимагає свою мінімальну роль (ADMIN для /admin,
  // HR для /admin/org) — тут лише перевіряємо, що користувач узагалі увійшов.

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
