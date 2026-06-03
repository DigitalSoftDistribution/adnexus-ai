import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';

export default function robots(): MetadataRoute.Robots {
  // App areas live under a locale prefix (e.g. /en/dashboard), so disallow the
  // app/auth surfaces for every locale plus the un-prefixed fallbacks.
  const disallow = ['/api', '/dashboard', '/auth'];
  for (const locale of locales) {
    disallow.push(`/${locale}/dashboard`, `/${locale}/auth`);
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: 'https://adnexus.ai/sitemap.xml',
  };
}
