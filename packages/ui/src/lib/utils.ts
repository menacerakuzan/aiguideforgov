import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Стандартний shadcn-хелпер: обʼєднує класи, вирішує конфлікти Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
