'use client';

import { cn } from '../lib/utils';

export interface FilterTabsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Пігулки-фільтри (рівень модуля, категорія промпта). Порт .tabs/.tab. */
export function FilterTabs<T extends string>({ options, value, onChange, label, className }: FilterTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex flex-wrap gap-2.5', className)}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full px-5 py-2.5 text-sm font-bold transition-all',
              selected
                ? 'bg-blue text-white shadow-[0_12px_22px_-9px_rgba(62,109,245,0.32),inset_0_-5px_10px_rgba(20,45,130,0.32),inset_0_6px_13px_rgba(255,255,255,0.22)]'
                : 'bg-surface text-ink-soft shadow-[0_9px_18px_-10px_rgba(38,34,74,0.14),inset_0_6px_12px_rgba(255,255,255,0.9)] hover:-translate-y-0.5',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
