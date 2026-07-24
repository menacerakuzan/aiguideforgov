'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Порядковий номер у групі — дає ефект каскаду (70мс на елемент), як у прототипі. */
  index?: number;
  children?: React.ReactNode;
}

/**
 * Поява елемента при прокрутці. Порт .reveal/.reveal.in (раніше — IntersectionObserver),
 * тут — нативний whileInView з Motion: легше і без ручного спостерігача.
 */
export function Reveal({ index = 0, children, ...props }: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -50px 0px' }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
