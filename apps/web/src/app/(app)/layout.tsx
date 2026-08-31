import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@proai/auth';
import { BrandMark } from '@proai/ui';
import { AppNavbar } from '@/components/app-navbar';
import { ConfettiProvider } from '@/components/confetti-provider';
import { AppUserMenu } from '@/components/app-user-menu';
import { GlobalSearch } from '@/components/global-search';
import { ThemeToggle } from '@/components/theme-toggle';

const LINKS = [
  { href: '/dashboard', label: 'Кабінет' },
  { href: '/courses', label: 'Курси' },
  { href: '/library', label: 'Бібліотека' },
  { href: '/certificates', label: 'Сертифікати' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <ConfettiProvider>
      <AppNavbar
        links={LINKS}
        brand={
          <Link href="/dashboard" className="flex items-center gap-2.5 font-display text-lg font-bold">
            <BrandMark size={36} /> ПРО.ШІ
          </Link>
        }
        actions={
          <div className="flex items-center gap-1">
            <GlobalSearch />
            <ThemeToggle />
            <AppUserMenu user={user} />
          </div>
        }
      />
      <div className="mx-auto max-w-[1160px] px-6 pb-24">{children}</div>
    </ConfettiProvider>
  );
}
