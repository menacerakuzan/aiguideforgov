'use client';

import { motion } from 'motion/react';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { cn } from '../lib/utils';

/**
 * Логотип «Ясно»: три крапки світлофора (червона/бурштинова/зелена)
 * у темному колі. Порт .brand-mark — обертається при наведенні на .brand.
 */
export function BrandMark({ className, size = 40 }: { className?: string; size?: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.span
      className={cn(
        'inline-flex flex-none flex-col items-center justify-center gap-[3px] rounded-full bg-ink shadow-[inset_0_-4px_8px_rgba(0,0,0,0.3),inset_0_5px_10px_rgba(255,255,255,0.16)]',
        className,
      )}
      style={{ width: size, height: size }}
      whileHover={reduced ? undefined : { rotate: 14, scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 14 }}
    >
      <i className="h-[7px] w-[7px] rounded-full bg-red" />
      <i className="h-[7px] w-[7px] rounded-full bg-amber" />
      <i className="h-[7px] w-[7px] rounded-full bg-green" />
    </motion.span>
  );
}
