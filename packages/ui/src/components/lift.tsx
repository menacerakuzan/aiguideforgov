'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../hooks/use-reduced-motion';

/**
 * Обгортка для інтерактивних плиток (модулі, промпти, посилання).
 * Порт .lift: hover — підйом і легкий поворот, active — стиснення.
 * Позначена class="group" — вкладений <Orb> сам обертається через group-hover.
 */
export const Lift = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ className, children, ...props }, ref) => {
    const reduced = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        className={cn('group', className)}
        whileHover={reduced ? undefined : { y: -7, rotate: -0.4 }}
        whileTap={reduced ? undefined : { y: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 20 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
Lift.displayName = 'Lift';
