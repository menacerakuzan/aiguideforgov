import { cn } from '../lib/utils';
import { Orb } from './orb';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Порожній стан: спокійний тон, одна дія, ніколи не порожня пляма. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-16 text-center', className)}>
      <Orb color="muted" size="lg">
        {icon}
      </Orb>
      <div>
        <p className="font-display text-lg font-bold">{title}</p>
        {description && <p className="mx-auto mt-2 max-w-[42ch] text-[15px] text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div className={cn('clay flex flex-col items-center gap-4 px-6 py-14 text-center', className)}>
      <Orb color="red" size="default">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </Orb>
      <div>
        <p className="font-display text-lg font-bold">{title}</p>
        {description && <p className="mx-auto mt-2 max-w-[42ch] text-[15px] text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-full bg-paper-2', className)} />;
}
