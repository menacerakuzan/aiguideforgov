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

/**
 * Колір системної панелі браузера на мобільних. Без media-запиту: тема сайту
 * більше не залежить від налаштувань ОС (див. NO_FLASH_THEME_SCRIPT), тож
 * темна панель над світлою сторінкою виглядала б як помилка верстки.
 */
export const viewport: Viewport = {
  themeColor: '#fff9f0',
};

/**
 * Виставляє data-theme ДО першого малювання — без цього був би спалах чужої
 * теми на кожному завантаженні.
 *
 * Тема за замовчуванням — світла, а не системна. Системну (prefers-color-scheme)
 * тут свідомо не питаємо: платформу відкривають переважно з робочих комп'ютерів,
 * де темна тема ОС часто стоїть випадково, і людина отримувала темний інтерфейс,
 * якого не просила. Хто хоче темну — перемикає, і вибір лишається в localStorage.
 */
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('proai-theme');
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
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
