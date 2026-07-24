'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from '@yasno/icons';
import { cn } from '../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, ...props }: DialogPrimitive.DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[300] bg-ink/40 backdrop-blur-[3px] data-[state=open]:animate-[pop_0.3s_ease-out]" />
      <DialogPrimitive.Content
        className={cn(
          'clay fixed top-1/2 left-1/2 z-[300] w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-8 focus:outline-none data-[state=open]:animate-[pop_0.35s_var(--ease-spring)]',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-6 right-6 grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue">
          <XIcon size={18} />
          <span className="sr-only">Закрити</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-5 pr-8', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: DialogPrimitive.DialogTitleProps) {
  return <DialogPrimitive.Title className={cn('font-display text-xl font-bold', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: DialogPrimitive.DialogDescriptionProps) {
  return <DialogPrimitive.Description className={cn('mt-2 text-[15px] text-ink-soft', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-7 flex justify-end gap-3', className)} {...props} />;
}
