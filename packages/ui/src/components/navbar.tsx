'use client';

import { useState, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu } from '@yasno/icons';
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
}

/**
 * Pill-навігація. Порт .nav-shell/.nav/.nav-links/.burger: на десктопі —
 * горизонтальна капсула, нижче 1000px — бургер із випадною панеллю.
 */
export function Navbar({ brand, links, actions, LinkComponent }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const Anchor = LinkComponent ?? ((props: { href: string; className?: string; children: React.ReactNode; onClick?: () => void }) => <a {...props} />);

  return (
    <div className="sticky top-0 z-[60] p-4">
      <nav
        aria-label="Основна навігація"
        className="relative mx-auto flex max-w-[1120px] items-center gap-5 rounded-full border-[2.5px] border-ink bg-paper/92 py-2.5 pr-2.5 pl-5 shadow-[4px_5px_0_0_var(--color-ink)] backdrop-blur-[14px]"
      >
        {brand}

        <div className="ml-auto hidden gap-1 md:flex">
          {links.map((link) => (
            <Anchor
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-full px-[17px] py-2.5 text-[15.5px] font-medium text-ink-soft transition-colors hover:bg-blue-tint hover:text-blue-deep',
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
          className="ml-auto grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-ink bg-paper-2 md:hidden"
        >
          <Menu size={21} />
        </button>

        {actions && <div className="hidden flex-none md:block">{actions}</div>}

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="absolute top-[76px] right-4 left-4 z-[70] flex flex-col gap-1 rounded-[30px] border-[2.5px] border-ink bg-paper p-3.5 shadow-[5px_6px_0_0_var(--color-ink)] md:hidden"
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
