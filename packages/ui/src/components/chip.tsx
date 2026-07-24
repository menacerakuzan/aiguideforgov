import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const chipVariants = cva(
  'inline-flex items-center gap-[7px] rounded-full border-2 border-ink px-4 py-[6px] text-[13.5px] font-bold whitespace-nowrap',
  {
    variants: {
      color: {
        neutral: 'bg-paper-2 text-ink-soft',
        blue: 'bg-blue-tint text-blue-deep',
        green: 'bg-green-tint text-green-deep',
        red: 'bg-red-tint text-red-deep',
        sun: 'bg-sun-tint text-sun-deep',
      },
    },
    defaultVariants: { color: 'neutral' },
  },
);

export interface ChipProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof chipVariants> {}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, color, ...props }, ref) => (
    <span ref={ref} className={cn(chipVariants({ color }), className)} {...props} />
  ),
);
Chip.displayName = 'Chip';
