import { forwardRef } from 'react';
import { cn } from '../lib/utils';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-full bg-surface py-4 pr-12 pl-6 font-body text-ink shadow-[0_10px_22px_-12px_rgba(38,34,74,0.14),inset_0_4px_9px_rgba(93,88,128,0.09)] focus:outline-none focus-visible:ring-3 focus-visible:ring-blue focus-visible:ring-offset-2',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-ink-mute"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  ),
);
Select.displayName = 'Select';
