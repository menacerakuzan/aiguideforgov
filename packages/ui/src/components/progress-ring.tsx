'use client';

import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export interface ProgressRingProps {
  /** Відсоток, 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Зелений колір при завершенні (§complete-стан з cert.html/quiz.html) */
  complete?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Кільце прогресу. Порт .ring-wrap/.ring-bg/.ring-fg: SVG-коло, що
 * домальовується пружиною при появі результату (score-ring).
 */
export function ProgressRing({
  value,
  size = 170,
  strokeWidth = 17,
  complete,
  children,
  className,
}: ProgressRingProps) {
  const reduced = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - pct / 100);

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="fill-none stroke-paper-2" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('fill-none', complete ? 'stroke-green' : 'stroke-blue')}
          style={{ strokeDasharray: circumference }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 16 }}
        />
      </svg>
      {children && <div className="absolute text-center">{children}</div>}
    </div>
  );
}
