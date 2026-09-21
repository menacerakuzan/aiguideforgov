import Link from 'next/link';
import { ArrowLeft } from '@proai/icons';
import { BrandMark } from '@proai/ui';
import { ConfettiProvider } from '@/components/confetti-provider';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Каркас демо-уроку для гостя. Навмисно без навігації платформи: з демо не
 * ведуть ні «Курси», ні «Кабінет», ні пошук — лише назад на головну.
 * Вигляд той самий, що в (app), щоб урок виглядав так, як після реєстрації.
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfettiProvider>
      <div className="sticky top-0 z-[60] p-4">
        <nav
          aria-label="Основна навігація"
          className="mx-auto flex max-w-[1120px] items-center gap-3 rounded-full border-[2.5px] border-ink bg-paper/92 py-2.5 pr-2.5 pl-5 shadow-[4px_5px_0_0_var(--color-ink)] backdrop-blur-[14px]"
        >
          <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-bold">
            <BrandMark size={36} /> ПРО.ШІ
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-ink bg-surface px-5 font-display text-sm font-extrabold text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
            >
              <ArrowLeft size={14} /> <span className="hidden sm:inline">На головну</span>
              <span className="sm:hidden">Вийти</span>
            </Link>
          </div>
        </nav>
      </div>
      <div className="mx-auto max-w-[1160px] px-6 pb-24">{children}</div>
    </ConfettiProvider>
  );
}
