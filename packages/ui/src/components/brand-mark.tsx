'use client';

import { motion } from 'motion/react';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { cn } from '../lib/utils';

/**
 * Логотип «ПРО.ШІ»: монограма «Ш» у синій clay-плашці, крапка над правою
 * щоглою добирає «І» — разом читається «ШІ».
 *
 * Чому не світлофор: три крапки по 7px у колі 36px зливалися в рисочку й
 * зникали на фавіконі, а метафору світлофора головна вже несе двічі (герой +
 * блок класифікації даних) — знаку лишалося дублювати її втретє.
 *
 * Облямівка й тінь малюються currentColor = --color-ink, тому в темній темі
 * знак сам отримує світлий контур, як ClayCard і Orb. Синій та білий однакові
 * в обох темах, тому всередині плашки колір фіксований.
 */
export function BrandMark({ className, size = 40 }: { className?: string; size?: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.span
      className={cn('inline-flex flex-none text-ink', className)}
      style={{ width: size, height: size }}
      whileHover={reduced ? undefined : { rotate: -6, scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 14 }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" role="img" aria-label="ПРО.ШІ">
        {/* зсунута суцільна тінь — той самий прийом, що й --toon-shadow */}
        <rect x="5.5" y="5.5" width="31" height="31" rx="10.5" fill="currentColor" />
        <rect
          x="2.5"
          y="2"
          width="31"
          height="31"
          rx="10.5"
          fill="#3763e8"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M11.2 11.4V23.2h13.6V11.4M18 11.4V23.2"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="27.8" cy="8.9" r="2.4" fill="#ffc93d" />
      </svg>
    </motion.span>
  );
}
