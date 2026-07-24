import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

/**
 * Пухка «clay»-поверхня — базовий матеріал усієї дизайн-системи.
 * Кожен варіант — окрема утиліта з packages/config/theme.css
 * (@utility clay, clay-tint, clay-blue, clay-green, clay-amber, clay-red,
 * clay-sun, clay-gold), щоб тіні лишались тришаровими й консистентними.
 */
const clayVariants = cva('', {
  variants: {
    variant: {
      default: 'clay',
      tint: 'clay-tint',
      blue: 'clay-blue',
      green: 'clay-green',
      amber: 'clay-amber',
      red: 'clay-red',
      sun: 'clay-sun',
      gold: 'clay-gold',
    },
    padding: {
      none: 'p-0',
      sm: 'p-5',
      default: 'p-7',
      lg: 'p-9',
    },
  },
  defaultVariants: { variant: 'default', padding: 'default' },
});

export interface ClayCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof clayVariants> {
  /** Активний елемент шляху/поточний модуль — товща синя облямівка (§ current-стан) */
  current?: boolean;
}

export const ClayCard = forwardRef<HTMLDivElement, ClayCardProps>(
  ({ className, variant, padding, current, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        clayVariants({ variant, padding }),
        current && 'outline outline-[3px] outline-offset-[-3px] outline-blue',
        className,
      )}
      {...props}
    />
  ),
);
ClayCard.displayName = 'ClayCard';
