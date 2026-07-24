import { forwardRef } from 'react';
import { cn } from '../lib/utils';

export const Table = forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="clay overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table ref={ref} className={cn('w-full border-collapse text-left', className)} {...props} />
      </div>
    </div>
  ),
);
Table.displayName = 'Table';

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-paper-2', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-ink/6 last:border-0 hover:bg-paper-2/60 transition-colors', className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-5 py-3.5 text-xs font-bold tracking-wide text-ink-mute uppercase whitespace-nowrap', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-5 py-3.5 text-sm', className)} {...props} />;
}
