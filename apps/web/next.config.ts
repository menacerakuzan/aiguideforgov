import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Статичні заголовки безпеки. Content-Security-Policy тут свідомо немає —
 * він містить nonce, різний на кожен запит, і виставляється в middleware.ts.
 */
const SECURITY_HEADERS = [
  // Браузер не має «здогадуватися» про тип відповіді: саме на цьому тримається
  // перетворення нешкідливого завантаження на виконуваний скрипт.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Дублює frame-ancestors із CSP для старих браузерів, які CSP не читають.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Назовні віддаємо лише домен: шлях і параметри можуть містити коди
  // сертифікатів чи токени відновлення пароля.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Платформа не користується жодним із цих API — вимикаємо їх повністю,
  // щоб чужий скрипт не міг попросити доступ від нашого імені.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isProduction
    ? [
        // Лише в продакшні: на localhost по http HSTS зробив би сайт недоступним.
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Версія Next — безкоштовна підказка для того, хто підбирає відомі вразливості.
  poweredByHeader: false,

  // Prisma Client і @react-pdf/renderer бандляться неправильно (нативні/динамічні
  // ресурси губляться при трасуванні webpack) — тримаємо їх зовнішніми пакетами,
  // які резолвяться напряму з node_modules у рантаймі.
  // sanitize-html тягне за собою CJS-залежності, які не переживають бандлінг.
  serverExternalPackages: ['@prisma/client', '@react-pdf/renderer', 'sanitize-html'],

  // Workspace-пакети без збірки: Next компілює їх напряму з вихідників.
  transpilePackages: [
    '@proai/ui',
    '@proai/icons',
    '@proai/types',
    '@proai/db',
    '@proai/auth',
    '@proai/learning',
    '@proai/prompts',
    '@proai/certificates',
    '@proai/analytics',
    '@proai/infra',
  ],

  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
