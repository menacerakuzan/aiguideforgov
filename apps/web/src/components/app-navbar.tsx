'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar, type NavLinkItem } from '@proai/ui';

/**
 * Navbar із підсвіченим поточним пунктом.
 *
 * Navbar уміє малювати активний пункт (`link.current`), але layout'и —
 * серверні компоненти, а поточний шлях відомий лише в браузері, тому прапорець
 * ніхто не проставляв і підсвітка не працювала в жодному розділі. Цей тонкий
 * клієнтський шар знає pathname і додає `current`; решта — той самий Navbar.
 *
 * `prefetch` лишається типовим для next/link: у продакшні Next сам тягне
 * маршрути, на які вказують видимі посилання, тож перехід відбувається без
 * очікування чанка.
 */
export function AppNavbar({
  links,
  brand,
  actions,
  crowded,
}: {
  links: NavLinkItem[];
  brand: React.ReactNode;
  actions?: React.ReactNode;
  crowded?: boolean;
}) {
  const pathname = usePathname();

  // Активним стає ОДИН пункт — з найдовшим збігом. Просте `startsWith` підсвітило
  // б на /admin/content одразу і «Контент», і «Огляд» (/admin), бо корінь розділу
  // є префіксом усіх його сторінок.
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const activeHref = links
    .map((l) => l.href)
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];

  const withCurrent = links.map((link) => ({ ...link, current: link.href === activeHref }));

  return <Navbar LinkComponent={Link} links={withCurrent} brand={brand} actions={actions} crowded={crowded} />;
}
