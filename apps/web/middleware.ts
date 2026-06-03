import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: [
    '/',
    '/(de|en|es|fr|it|ja|nl|pl|pt|ru)/:path*',
    // Exclude API routes, Next internals, and static files from locale handling
    // so `/api/v1` and `/api/v2` rewrites are not locale-prefixed.
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
