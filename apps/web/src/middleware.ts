import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Лише перевірка наявності сесійної куки — без звернення до Prisma
 * (SQLite несумісний з Edge runtime middleware). Повна перевірка ролі
 * відбувається у layout.tsx відповідної групи через requireCurrentUser().
 */
export function middleware(request: NextRequest) {
  const hasSession = getSessionCookie(request);

  if (!hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/courses/:path*',
    '/lesson/:path*',
    '/quiz/:path*',
    '/certificates/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
};
