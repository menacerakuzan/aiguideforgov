import Link from 'next/link';
import { BrandMark, Navbar } from '@yasno/ui';
import { ThemeToggle } from '@/components/theme-toggle';

const LINKS = [
  { href: '/#svitlofor', label: 'Світлофор даних' },
  { href: '/#moduli', label: 'Модулі' },
  { href: '/login', label: 'Увійти' },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar
        LinkComponent={Link}
        links={LINKS}
        brand={
          <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-bold">
            <BrandMark size={36} /> Ясно
          </Link>
        }
        actions={
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/register" className="inline-flex h-11 items-center rounded-full border-2 border-ink bg-blue px-6 font-display text-sm font-extrabold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
              Почати навчання
            </Link>
          </div>
        }
      />
      {children}
      <footer className="py-14">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-6 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Ясно · Безпечний ШІ для держслужби</span>
          <span>Доступність: WCAG 2.1 AA</span>
        </div>
      </footer>
    </>
  );
}
