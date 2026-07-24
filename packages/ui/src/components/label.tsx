import { forwardRef } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../lib/utils';

export const Label = forwardRef<HTMLLabelElement, LabelPrimitive.LabelProps>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('mb-2 block pl-2 text-[15px] font-semibold text-ink', className)}
    {...props}
  />
));
Label.displayName = 'Label';
