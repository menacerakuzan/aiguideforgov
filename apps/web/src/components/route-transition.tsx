'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '@proai/ui';

/**
 * Плавний вхід кожної сторінки: легкий fade + зсув знизу замість різкого
 * підміняння вмісту. Використовується в template.tsx групи маршрутів —
 * template ремонтується при кожній навігації, на відміну від layout.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  // Next.js remounts template.tsx on every navigation (unlike layout.tsx), so this
  // AnimatePresence tree is always freshly mounted — `initial={false}` would suppress
  // the very enter animation we want on each navigation, so it's deliberately omitted.
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
