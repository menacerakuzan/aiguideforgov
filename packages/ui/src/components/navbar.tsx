'use client';

import { useState, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu } from '@proai/icons';
import { cn } from '../lib/utils';

export interface NavLinkItem {
  href: string;
  label: string;
  current?: boolean;
}

export interface NavbarProps {
  brand: React.ReactNode;
  links: NavLinkItem[];
  actions?: React.ReactNode;
  /** Дозволяє підставити next/link замість <a> (зберігає client-side навігацію) */
  LinkComponent?: ComponentType<{ href: string; className?: string; children: React.ReactNode; onClick?: () => void }>;
  /**
   * Пунктів багато (адмінка): щільніші пункти, а бургер — нижче 1280px, а не
   * лише на телефоні. Інакше між планшетом і широким екраном капсула не
   * вміщує все й кнопки з правого краю вилазять за неї.
   */
  crowded?: boolean;
}

/** Класи точки згортання — статичними рядками, щоб Tailwind їх згенерував. */
const COLLAPSE = {
  md: { links: 'md:flex', burger: 'md:hidden', actions: 'md:block', panel: 'md:hidden' },
  xl: { links: 'xl:flex', burger: 'xl:hidden', actions: 'xl:block', panel: 'xl:hidden' },
} as const;

/**
 * Pill-навігація. Порт .nav-shell/.nav/.nav-links/.burger: на десктопі —
 * горизонтальна капсула, нижче 1000px — бургер із випадною панеллю.
 */
export function Navbar({ brand, links, actions, LinkComponent, crowded }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const at = COLLAPSE[crowded ? 'xl' : 'md'];
  const Anchor = LinkComponent ?? ((props: { href: string; className?: string; children: React.ReactNode; onClick?: () => void }) => <a {...props} />);

  return (
    <div className="sticky top-0 z-[60] p-4">
      <nav
        aria-label="Основна навігація"
        className="relative mx-auto flex max-w-[1120px] items-center gap-5 rounded-full border-[2.5px] border-ink bg-paper/92 py-2.5 pr-2.5 pl-5 shadow-[4px_5px_0_0_var(--color-ink)] backdrop-blur-[14px]"
      >
        {brand}

        <div className={cn('ml-auto hidden gap-1', at.links)}>
          {links.map((link) => (
            <Anchor
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-full py-2.5 text-[15.5px] font-medium whitespace-nowrap text-ink-soft transition-colors hover:bg-blue-tint hover:text-blue-deep',
                crowded ? 'px-[13px]' : 'px-[17px]',
                link.current && 'bg-ink text-white hover:bg-ink hover:text-white',
              )}
            >
              {link.label}
            </Anchor>
          ))}
        </div>

        <button
          type="button"
          aria-label="Відкрити меню"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn('ml-auto grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-ink bg-paper-2', at.burger)}
        >
          <Menu size={21} />
        </button>

        {actions && <div className={cn('hidden flex-none', at.actions)}>{actions}</div>}

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={cn(
                'absolute top-[76px] right-4 left-4 z-[70] flex flex-col gap-1 rounded-[30px] border-[2.5px] border-ink bg-paper p-3.5 shadow-[5px_6px_0_0_var(--color-ink)]',
                at.panel,
              )}
            >
              {links.map((link) => (
                <Anchor
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'rounded-full px-[17px] py-2.5 text-[15.5px] font-medium text-ink-soft transition-colors hover:bg-blue-tint hover:text-blue-deep',
                    link.current && 'bg-ink text-white',
                  )}
                >
                  {link.label}
                </Anchor>
              ))}
              {actions && <div className="px-2 pt-2">{actions}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}
