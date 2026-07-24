import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

/** Кругла кольорова плашка для іконки. Обертається при наведенні на предка .group (Lift). */
const orbVariants = cva(
  'inline-grid flex-none place-items-center rounded-full orb-shadow transition-transform duration-350 ease-out group-hover:scale-[1.12] group-hover:rotate-[8deg]',
  {
    variants: {
      size: {
        sm: 'h-10 w-10',
        default: 'h-[52px] w-[52px]',
        lg: 'h-16 w-16',
      },
      color: {
        blue: 'bg-blue text-white',
        green: 'bg-green text-white',
        amber: 'bg-amber text-[#4A3410]',
        red: 'bg-red text-white',
        sun: 'bg-sun text-sun-deep',
        gold: 'bg-gold text-[#4A3410]',
        muted: 'bg-paper-2 text-ink-mute shadow-[inset_0_3px_7px_rgba(93,88,128,0.16)]',
      },
    },
    defaultVariants: { size: 'default', color: 'blue' },
  },
);

export interface OrbProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof orbVariants> {}

export const Orb = forwardRef<HTMLSpanElement, OrbProps>(
  ({ className, size, color, ...props }, ref) => (
    <span ref={ref} className={cn(orbVariants({ size, color }), className)} {...props} />
  ),
);
Orb.displayName = 'Orb';
