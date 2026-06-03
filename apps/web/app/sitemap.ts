import type { MetadataRoute } from 'next';
import { BLOG_SLUGS } from '@/lib/marketing/blog-posts';
import { locales } from '@/i18n/config';

const BASE = 'https://adnexus.ai';

const ROUTES = [
  '',
  '/pricing',
  '/features',
  '/features/ai-agent',
  '/features/approvals',
  '/features/platforms',
  '/use-cases',
  '/use-cases/agencies',
  '/use-cases/ecommerce',
  '/use-cases/in-house',
  '/integrations',
  '/changelog',
  '/security',
  '/about',
  '/contact',
  '/faq',
  '/blog',
  '/tools/roas-calculator',
  '/compare/pipeboard',
  '/compare/madgicx',
  '/compare/revealbot',
  '/compare/smartly',
  '/compare/adkit',
  ...BLOG_SLUGS.map((slug) => `/blog/${slug}`),
];
// Legal pages (/legal/*) are intentionally excluded — they set
// `robots: { index: false }`, so listing them here would send conflicting
// signals to crawlers.

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Marketing routes are served under a locale prefix (e.g. /en/pricing). Emit
  // one entry per locale with hreflang alternates so crawlers can map them.
  return ROUTES.flatMap((route) =>
    locales.map((locale) => ({
      url: `${BASE}/${locale}${route}`,
      lastModified: now,
      changeFrequency: (route === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
      priority: route === '' ? 1 : route === '/pricing' ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${BASE}/${l}${route}`]),
        ),
      },
    })),
  );
}
