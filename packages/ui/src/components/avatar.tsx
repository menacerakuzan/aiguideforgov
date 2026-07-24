import { cn } from '../lib/utils';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const SIZE = { sm: 'h-8 w-8 text-xs', default: 'h-11 w-11 text-sm', lg: 'h-14 w-14 text-base' };

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Кругла плашка з ініціалами — фото не обов'язкове. */
export function Avatar({ name, size = 'default', className }: AvatarProps) {
  return (
    <span
      aria-label={name}
      className={cn(
        'grid flex-none place-items-center rounded-full bg-blue-tint font-display font-bold text-blue-deep',
        SIZE[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
