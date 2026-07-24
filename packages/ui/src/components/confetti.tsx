'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../hooks/use-reduced-motion';

const COLORS = ['#3763E8', '#0C8455', '#FFC93D', '#F5A31A', '#CC3E27', '#8FB0FF'];

export interface ConfettiHandle {
  fire: (amount?: number) => void;
}

interface Burst {
  id: number;
  particles: Array<{
    key: number;
    left: number;
    width: number;
    height: number;
    color: string;
    duration: number;
    delay: number;
    pill: boolean;
  }>;
}

function makeParticles(amount: number): Burst['particles'] {
  return Array.from({ length: amount }, (_, i) => {
    const size = 6 + Math.random() * 8;
    return {
      key: i,
      left: Math.random() * 100,
      width: size,
      height: size * (0.5 + Math.random()),
      color: COLORS[i % COLORS.length]!,
      duration: 2 + Math.random() * 2.2,
      delay: Math.random() * 0.5,
      pill: Math.random() > 0.5,
    };
  });
}

/**
 * Конфеті-порт з app.js. Єдина «церемонія» продукту використовується
 * при видачі сертифіката й повних успіхах — не для дрібних подій.
 * Рендерити один екземпляр у корені layout, викликати через ref/useConfetti.
 */
export const Confetti = forwardRef<ConfettiHandle>((_props, ref) => {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const reduced = useReducedMotion();
  const idRef = useRef(0);

  useImperativeHandle(ref, () => ({
    fire: (amount = 90) => {
      if (reduced) return;
      const id = ++idRef.current;
      setBursts((prev) => [...prev, { id, particles: makeParticles(amount) }]);
      setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 5200);
    },
  }));

  if (!bursts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden" aria-hidden="true">
      {bursts.map((burst) =>
        burst.particles.map((p) => (
          <motion.i
            key={`${burst.id}-${p.key}`}
            className="absolute -top-5"
            style={{
              left: `${p.left}vw`,
              width: p.width,
              height: p.height,
              background: p.color,
              borderRadius: p.pill ? 999 : 4,
            }}
            initial={{ y: 0, rotate: 0, opacity: 0 }}
            animate={{ y: '110vh', rotate: 720, opacity: 0.9 }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
          />
        )),
      )}
    </div>
  );
});
Confetti.displayName = 'Confetti';

/** Зручний хук: {fire, node} — node рендериться один раз у корені сторінки/layout. */
export function useConfetti() {
  const ref = useRef<ConfettiHandle>(null);
  const fire = useCallback((amount?: number) => ref.current?.fire(amount), []);
  return { fire, node: <Confetti ref={ref} /> };
}
