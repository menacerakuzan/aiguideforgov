import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Middleware робить дві незалежні речі:
 *
 * 1. Content-Security-Policy з одноразовим nonce для кожної відповіді.
 *    Заголовок мусить народжуватися тут, а не в next.config: nonce на те й
 *    nonce, що він різний на кожен запит, а next.config віддає статику.
 *
 * 2. Швидке відсікання неавторизованих на захищених шляхах — лише за
 *    наявністю сесійної куки, без звернення до Prisma (SQLite несумісний з
 *    Edge runtime). Це не перевірка автентичності: підроблену куку тут ніхто
 *    не ловить. Справжню перевірку роблять layout'и через getCurrentUser(),
 *    а це — щоб гість не бачив каркаса сторінки перед редиректом.
 */

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/courses',
  '/lesson',
  '/module',
  '/quiz',
  '/exam',
  '/certificates',
  '/profile',
  '/settings',
  '/admin',
];

function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' дозволяє скриптам, яким ми довірили nonce, підвантажувати
    // власні чанки Next — без нього довелося б перелічувати кожен файл бандла.
    // У dev додається 'unsafe-eval': на ньому тримається React Fast Refresh.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // React пише inline-стилі атрибутом style — без 'unsafe-inline' поїде вся
    // верстка. Це відома й прийнятна поступка: виконуваного коду в style немає.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // Шрифти самохостяться через next/font — жоден зовнішній домен не потрібен.
    "font-src 'self'",
    // Наш API — той самий origin; у dev додаємо ws: для hot reload.
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    "media-src 'self'",
    // Плагінів немає — найдешевший спосіб закрити цілий клас вкладень.
    "object-src 'none'",
    // Не даємо ін'єкції переписати базу для відносних URL.
    "base-uri 'self'",
    // Форми відправляються лише до нас — захист від підміни адреси відправки.
    "form-action 'self'",
    // Платформу не можна вбудувати в чужий iframe: це знімає clickjacking.
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
  ];
  if (!isDev) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, isDev);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !getSessionCookie(request)) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Next читає CSP із заголовка ЗАПИТУ й сам проставляє цей nonce своїм
  // <script>. Тому заголовок ставимо і на запит, і на відповідь.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Усі шляхи, крім статики й службових файлів Next: CSP потрібен на
     * документах, а не на .js-чанках і зображеннях, і зайвий прохід
     * middleware по кожному чанку — це чиста втрата на кожному завантаженні.
     */
    // Крапки екрануються подвійним слешем: у рядку JS "\." — це просто ".",
    // тобто «будь-який символ», і виняток ловив би не лише "/a.png", а й "/apng".
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|media|lessons|fonts|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|mp4)$).*)',
  ],
};
