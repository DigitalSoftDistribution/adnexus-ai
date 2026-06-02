import type { MetadataRoute } from 'next';

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
];
// Legal pages (/legal/*) are intentionally excluded — they set
// `robots: { index: false }`, so listing them here would send conflicting
// signals to crawlers.

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/pricing' ? 0.9 : 0.7,
  }));
}
