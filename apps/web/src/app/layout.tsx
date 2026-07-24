import type { Metadata } from 'next';
import Script from 'next/script';
import { SkipLink } from '@yasno/ui';
import { nunito, jetbrainsMono, rubik } from '@/lib/fonts';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Ясно', template: '%s · Ясно' },
  description: 'Навчальна платформа безпечного використання ШІ для державної служби.',
};

/** Виставляє data-theme ДО першого малювання — без цього був би спалах світлої теми при заході в темну. */
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('yasno-theme');
    var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="uk"
      className={`${nunito.variable} ${rubik.variable} ${jetbrainsMono.variable}`}
      // data-theme виставляється інлайн-скриптом ДО гідратації (щоб не було спалаху
      // світлої теми) — сервер його не знає, тож React завжди побачить тут "різницю".
      // Це очікувано й безпечно ігнорувати лише для цього атрибута на цьому елементі.
      suppressHydrationWarning
    >
      <body>
        {/* beforeInteractive — Next сам переносить цей скрипт у справжній <head> до гідратації;
            вручну рендерити <head> в root layout не можна, це конфліктує з metadata API. */}
        <Script id="no-flash-theme" strategy="beforeInteractive">
          {NO_FLASH_THEME_SCRIPT}
        </Script>
        <div aria-hidden="true" className="bg-pattern" />
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
