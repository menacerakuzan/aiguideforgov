'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../hooks/use-reduced-motion';

/** Кругла кнопка-іконка. Порт .icon-btn: hover обертає й підіймає, active стискає. */
export interface IconButtonProps extends HTMLMotionProps<'button'> {
  /** true, коли дія щойно виконана (напр. копіювання) — фарбує у зелений. */
  active?: boolean;
  size?: 'default' | 'sm';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, active, size = 'default', children, ...props }, ref) => {
    const reduced = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-surface shadow-[0_10px_20px_-9px_rgba(38,34,74,0.14),inset_0_6px_12px_rgba(255,255,255,0.9)] transition-colors',
          size === 'default' ? 'h-[46px] w-[46px]' : 'h-9 w-9',
          active ? 'text-green' : 'text-ink-soft hover:text-blue',
          'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue focus-visible:ring-offset-2',
          className,
        )}
        whileHover={reduced ? undefined : { y: -3, scale: 1.1, rotate: 6 }}
        whileTap={reduced ? undefined : { scale: 0.88, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 16 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
IconButton.displayName = 'IconButton';
