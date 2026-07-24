'use client';

import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export interface ProgressBarProps {
  /** Відсоток заповнення, 0–100 */
  value: number;
  color?: 'blue' | 'green' | 'gold';
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
  className?: string;
}

const FILL_COLOR: Record<NonNullable<ProgressBarProps['color']>, string> = {
  blue: 'bg-blue',
  green: 'bg-green',
  gold: 'bg-gold',
};

/** Порт .bar/.bar-fill: жолоб-«ямка» + пружинне заповнення. */
export function ProgressBar({ value, color = 'blue', label, valueLabel, className }: ProgressBarProps) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={className}>
      {(label || valueLabel) && (
        <div className="mb-2 flex justify-between text-[13.5px] font-semibold">
          <span>{label}</span>
          <span>{valueLabel}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-4 overflow-hidden rounded-full border-2 border-ink bg-paper-2"
      >
        <motion.div
          className={cn('h-full rounded-full', FILL_COLOR[color])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
