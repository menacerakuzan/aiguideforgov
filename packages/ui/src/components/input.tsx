import { forwardRef } from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/** Порт .input: пігулка з вдавленою тінню, фокус — синє кільце + легкий zoom. */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid}
    className={cn(
      'w-full rounded-full bg-surface px-6 py-4 font-body text-ink shadow-[0_10px_22px_-12px_rgba(38,34,74,0.14),inset_0_4px_9px_rgba(93,88,128,0.09)] placeholder:text-ink-mute transition-[box-shadow,transform] focus:scale-[1.01] focus:outline-none focus-visible:ring-3 focus-visible:ring-offset-2',
      invalid ? 'focus-visible:ring-red' : 'focus-visible:ring-blue',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** Багаторядкове поле — заокруглене (r-md), не пігулка, як .mono-блоки. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid}
    className={cn(
      'min-h-[110px] w-full rounded-[26px] bg-surface px-5 py-4 font-body text-ink shadow-[0_10px_22px_-12px_rgba(38,34,74,0.14),inset_0_4px_9px_rgba(93,88,128,0.09)] placeholder:text-ink-mute transition-[box-shadow,transform] focus:scale-[1.005] focus:outline-none focus-visible:ring-3 focus-visible:ring-offset-2',
      invalid ? 'focus-visible:ring-red' : 'focus-visible:ring-blue',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 pl-2 text-[13.5px] font-semibold text-red">
      {children}
    </p>
  );
}
