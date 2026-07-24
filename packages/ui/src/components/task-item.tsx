'use client';

import { motion } from 'motion/react';
import { Check } from '@yasno/icons';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export interface TaskItemProps {
  label: string;
  meta?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

/**
 * Рядок завдання/уроку з галочкою, що вкручується. Порт .task/.box:
 * при відмітці куля обертається (-10deg) і роздувається (scale 1.15).
 */
export function TaskItem({ label, meta, checked, onCheckedChange, className }: TaskItemProps) {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-[26px] px-4 py-3 text-left transition-colors hover:bg-paper-2',
        className,
      )}
    >
      <motion.span
        className={cn(
          'grid h-[34px] w-[34px] flex-none place-items-center rounded-full transition-colors',
          checked
            ? 'bg-green text-white shadow-[0_8px_16px_-6px_rgba(22,183,122,0.30),inset_0_5px_10px_rgba(255,255,255,0.4)]'
            : 'bg-paper-2 text-transparent shadow-[inset_0_3px_7px_rgba(93,88,128,0.16)]',
        )}
        animate={checked ? { scale: 1.15, rotate: -10 } : { scale: 1, rotate: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 14 }}
      >
        <Check size={16} />
      </motion.span>
      <span className={cn('flex-1 text-base font-medium', checked && 'text-ink-mute line-through decoration-2')}>
        {label}
      </span>
      {meta && <span className="text-[13.5px] font-semibold text-ink-mute">{meta}</span>}
    </button>
  );
}
