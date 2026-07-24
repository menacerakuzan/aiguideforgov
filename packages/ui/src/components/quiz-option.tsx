'use client';

import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export type QuizOptionState = 'idle' | 'picked' | 'correct' | 'wrong';

export interface QuizOptionProps {
  index: number;
  text: string;
  state: QuizOptionState;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
}

const STATE_STYLES: Record<QuizOptionState, string> = {
  idle: 'bg-surface shadow-[0_12px_24px_-13px_rgba(38,34,74,0.14),inset_0_-5px_11px_rgba(93,88,128,0.07),inset_0_7px_14px_rgba(255,255,255,0.9)]',
  picked:
    'bg-blue-tint shadow-[0_14px_26px_-12px_rgba(62,109,245,0.26),inset_0_-5px_11px_rgba(62,109,245,0.12),inset_0_7px_14px_rgba(255,255,255,0.8)]',
  correct: 'bg-green-tint text-green-deep',
  wrong: 'bg-red-tint text-red-deep',
};

const KEY_STYLES: Record<QuizOptionState, string> = {
  idle: 'bg-paper-2 text-ink-mute',
  picked: 'bg-blue text-white',
  correct: 'bg-green text-white',
  wrong: 'bg-red text-white',
};

/**
 * Варіант відповіді квіза. Порт .q-option/.q-key: клавіша-кружок пружинить
 * при виборі (scale 1.12) і при правильній відповіді додатково крутиться.
 */
export function QuizOption({ index, text, state, onSelect, disabled, className }: QuizOptionProps) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={state === 'picked' || state === 'correct'}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-4 rounded-[26px] px-5 py-[17px] text-left text-base font-medium transition-colors',
        STATE_STYLES[state],
        disabled && 'pointer-events-none',
        className,
      )}
      whileHover={reduced || disabled ? undefined : { y: -3, scale: 1.012 }}
      whileTap={reduced || disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <motion.span
        className={cn('grid h-[34px] w-[34px] flex-none place-items-center rounded-full font-display text-sm font-bold', KEY_STYLES[state])}
        animate={
          state === 'correct'
            ? { scale: 1.15, rotate: -8 }
            : state === 'picked'
              ? { scale: 1.12, rotate: 0 }
              : { scale: 1, rotate: 0 }
        }
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 14 }}
      >
        {index + 1}
      </motion.span>
      <span>{text}</span>
    </motion.button>
  );
}

export interface QuizDotsProps {
  states: Array<'todo' | 'current' | 'done' | 'wrong'>;
  className?: string;
}

const DOT_STYLES: Record<QuizDotsProps['states'][number], string> = {
  todo: 'bg-paper-2 shadow-[inset_0_2px_4px_rgba(93,88,128,0.2)]',
  current: 'bg-blue scale-[1.35]',
  done: 'bg-green',
  wrong: 'bg-red',
};

/** Крапки прогресу тесту. Порт .q-dots/.q-dot. */
export function QuizDots({ states, className }: QuizDotsProps) {
  return (
    <div className={cn('flex justify-center gap-[9px]', className)} aria-hidden="true">
      {states.map((s, i) => (
        <span key={i} className={cn('h-3 w-3 rounded-full transition-transform duration-300', DOT_STYLES[s])} />
      ))}
    </div>
  );
}
