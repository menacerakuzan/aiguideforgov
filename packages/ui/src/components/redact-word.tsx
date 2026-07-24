'use client';

import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export interface RedactWordProps {
  children: React.ReactNode;
  redacted: boolean;
  onToggle: () => void;
}

/**
 * Слово-кнопка у вправі знеособлення (lesson.html). До натискання —
 * бурштинова підказка; після — чорна плашка, текст стає невидимим.
 */
export function RedactWord({ children, redacted, onToggle }: RedactWordProps) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-pressed={redacted}
      onClick={onToggle}
      className={cn(
        'rounded-full px-2 font-inherit transition-colors',
        redacted ? 'bg-ink text-ink' : 'bg-amber-tint text-inherit',
      )}
      whileHover={reduced ? undefined : { scale: 1.06, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
    >
      {children}
    </motion.button>
  );
}
