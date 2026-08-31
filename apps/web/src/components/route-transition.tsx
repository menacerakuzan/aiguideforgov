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
  //
  // Тривалість свідомо коротка. Анімація програється вже ПІСЛЯ того, як приїхав
  // чанк маршруту й змонтувалася сторінка, тобто додається до відчутної затримки
  // кліку. 220 мс і зсув на 10px читалися як «сайт думає»; 120 мс і 4px дають ту
  // саму мʼякість, але перехід відчувається миттєвим.
  //
  // AnimatePresence лишається без mode="wait": template щоразу монтується заново,
  // тож попередньої сторінки в цьому дереві немає і чекати нема на що — mode="wait"
  // тут лише відкладав би появу нової сторінки.
  return (
    <AnimatePresence>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
