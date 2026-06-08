import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = [
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
  '/onboarding',
];
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/favicon', '/legal/', '/blog/', '/sitemap'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  // Strip locale prefix to check against public paths
  const pathWithoutLocale = pathname.replace(/^\/(de|en|es|fr|it|ja|nl|pl|pt|ru)/, '') || '/';
  if (pathWithoutLocale === '/') return true;
  return PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p));
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth token on protected routes (C8 fix — was only client-side guard)
  if (!isPublicPath(pathname)) {
    const token =
      request.cookies.get('adnexus_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      const locale = pathname.match(/^\/(de|en|es|fr|it|ja|nl|pl|pt|ru)/)?.[1] || 'en';
      return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(de|en|es|fr|it|ja|nl|pl|pt|ru)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
