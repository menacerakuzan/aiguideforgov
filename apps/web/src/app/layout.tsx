import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { SkipLink } from '@proai/ui';
import { nunito, jetbrainsMono, rubik } from '@/lib/fonts';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ПРО.ШІ', template: '%s · ПРО.ШІ' },
  description: 'Навчальна платформа безпечного використання ШІ для державної служби.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff9f0' },
    { media: '(prefers-color-scheme: dark)', color: '#16142c' },
  ],
};

/** Виставляє data-theme ДО першого малювання — без цього був би спалах світлої теми при заході в темну. */
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('proai-theme');
    var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // nonce народжується в middleware для кожної відповіді; без нього
  // інлайн-скрипт теми заблокує CSP і сторінка почне блимати світлою темою.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

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
        {/* Звичайний <script>, а не next/script: браузер виконує його під час розбору
            HTML — тобто до того, як намалює будь-що з <body>, — і спалаху теми немає.
            suppressHydrationWarning обовʼязковий: за специфікацією CSP браузер
            приховує значення атрибута nonce одразу після завантаження документа
            (getAttribute('nonce') повертає ""), тож React бачить розбіжність
            із серверним HTML і на кожній сторінці писав помилку гідратації. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
        />
        <div aria-hidden="true" className="bg-pattern" />
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
