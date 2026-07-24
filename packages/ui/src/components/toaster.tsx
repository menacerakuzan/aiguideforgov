'use client';

import { Toaster as SonnerToaster } from 'sonner';

export { toast } from 'sonner';

/** Стилізований під clay тост-стек. Один екземпляр у корені layout. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'clay flex items-center gap-3 px-5 py-4 text-sm font-medium text-ink w-[340px]',
          title: 'font-semibold',
          description: 'text-ink-soft',
          actionButton: 'rounded-full bg-blue px-3 py-1.5 text-white font-bold',
          cancelButton: 'rounded-full bg-paper-2 px-3 py-1.5 text-ink-soft',
        },
      }}
    />
  );
}
