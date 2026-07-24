import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

/** Статус-бейдж для адмін-таблиць (роль, стан сертифіката). Завжди текст + колір, не лише колір. */
const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold', {
  variants: {
    color: {
      neutral: 'bg-paper-2 text-ink-soft',
      blue: 'bg-blue-tint text-blue-deep',
      green: 'bg-green-tint text-green-deep',
      amber: 'bg-amber-tint text-amber-deep',
      red: 'bg-red-tint text-red-deep',
      gold: 'bg-gold-tint text-gold-deep',
    },
  },
  defaultVariants: { color: 'neutral' },
});

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, color, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ color }), className)} {...props} />
));
Badge.displayName = 'Badge';
