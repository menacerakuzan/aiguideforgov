'use client';

import { createContext, useContext } from 'react';
import { useConfetti } from '@yasno/ui';

const ConfettiContext = createContext<((amount?: number) => void) | null>(null);

/** Один портал конфеті на весь (app)-шар — сторінки лише викликають useFireConfetti(). */
export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const { fire, node } = useConfetti();
  return (
    <ConfettiContext.Provider value={fire}>
      {children}
      {node}
    </ConfettiContext.Provider>
  );
}

export function useFireConfetti() {
  const fire = useContext(ConfettiContext);
  if (!fire) throw new Error('useFireConfetti має використовуватися всередині ConfettiProvider');
  return fire;
}
