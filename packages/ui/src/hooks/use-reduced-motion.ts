'use client';

import { useEffect, useState } from 'react';

/**
 * Респектуємо prefers-reduced-motion глобально. Кожен компонент з пружинною
 * фізикою (Button, TaskItem, Confetti, Reveal, CountUp) звіряється з цим
 * хуком і колапсує анімацію до миттєвої зміни стану.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
