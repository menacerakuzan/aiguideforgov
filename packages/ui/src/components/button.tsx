'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { useReducedMotion } from '../hooks/use-reduced-motion';

/**
 * Кнопка-«наліпка»: товста темна облямівка + суцільна зсунута тінь (toon-стиль).
 * Натискання «втоплює» кнопку в її ж тінь: translate на величину зсуву тіні +
 * тінь зникає, відпускання повертає обидва назад пружиною.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2.5 rounded-full border-[2.5px] border-ink font-display font-extrabold whitespace-nowrap select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        blue: 'bg-blue text-white hover:bg-blue-deep',
        sun: 'bg-sun text-sun-deep',
        green: 'bg-green text-white',
        ghost: 'bg-surface text-ink',
      },
      size: {
        default: 'h-[52px] px-[30px] text-base',
        lg: 'h-[58px] px-[38px] text-lg',
        sm: 'h-11 px-[22px] text-sm',
      },
    },
    defaultVariants: { variant: 'blue', size: 'default' },
  },
);

const MotionSlot = motion.create(Slot);

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  /** Рендерить фізику й стилі на єдиному дочірньому елементі (напр. next/link) замість <button>. */
  asChild?: boolean;
}

const REST_SHADOW = '4px 5px 0 0 var(--color-ink)';
const HOVER_SHADOW = '5px 6px 0 0 var(--color-ink)';
const PRESSED_SHADOW = '0 0 0 0 var(--color-ink)';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, children, style, ...props }, ref) => {
    const reduced = useReducedMotion();
    const Comp = asChild ? MotionSlot : motion.button;

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ boxShadow: REST_SHADOW, ...style }}
        whileHover={reduced ? undefined : { y: -3, boxShadow: HOVER_SHADOW }}
        whileTap={reduced ? undefined : { y: 4, x: 3, boxShadow: PRESSED_SHADOW }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
