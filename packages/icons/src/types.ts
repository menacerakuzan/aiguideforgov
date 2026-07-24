import type { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> {
  /** Розмір у пікселях (квадрат). За замовчуванням 24. */
  size?: number | string;
}

/** Спільні атрибути для кожної іконки: stroke 2, currentColor, круглі кінці. */
export const baseSvgProps = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};
