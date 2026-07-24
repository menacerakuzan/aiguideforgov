'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/react';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export interface CountUpProps {
  value: number;
  suffix?: string;
  /** Затримка старту (для послідовного «бамп»-ефекту кількох лічильників) */
  delay?: number;
  className?: string;
}

/**
 * Пружинний лічильник. Порт countTo() з app.js: кубічне уповільнення,
 * ~520мс, з коротким «bump»-масштабуванням на старті.
 */
export function CountUp({ value, suffix = '', delay = 0, className }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const [bump, setBump] = useState(false);
  const reduced = useReducedMotion();
  const prevValue = useRef(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const from = prevValue.current;
    if (from === value) return;

    const timeout = setTimeout(() => {
      setBump(true);
      const controls = animate(from, value, {
        duration: 0.52,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => setDisplay(Math.round(latest)),
        onComplete: () => setBump(false),
      });
      prevValue.current = value;
      return () => controls.stop();
    }, delay * 1000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay, reduced]);

  return (
    <span className={className} style={bump ? { transform: 'scale(1.12)', transition: 'transform 0.2s' } : undefined}>
      {display}
      {suffix}
    </span>
  );
}
