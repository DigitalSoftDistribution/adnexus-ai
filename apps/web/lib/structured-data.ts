/**
 * Server-side JSON-LD structured data builders for marketing pages.
 * Rendered into <script type="application/ld+json"> tags so search engines
 * and AI crawlers can parse offers, articles, breadcrumbs, etc.
 */

import { PRICING_TIERS, STARTING_PRICE } from './pricing';

export const SITE_URL = 'https://adnexus.ai';
export const SITE_NAME = 'AdNexus AI';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/og-default.png`,
    sameAs: ['https://twitter.com/AdNexusAI'],
  };
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '0',
      highPrice: String(PRICING_TIERS[PRICING_TIERS.length - 1].monthlyPrice),
      offerCount: String(PRICING_TIERS.length),
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
    },
  };
}

export function pricingOffersSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${SITE_NAME} Plans`,
    description: `AI-powered advertising management plans starting at $${STARTING_PRICE}/mo.`,
    offers: PRICING_TIERS.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: String(tier.monthlyPrice),
      priceCurrency: 'USD',
      url: `${SITE_URL}/pricing`,
    })),
  };
}

export function faqSchema(faqs: ReadonlyArray<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

export function breadcrumbSchema(items: ReadonlyArray<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * Convert a human-readable date (e.g. "May 15, 2026") to an ISO 8601 date
 * ("2026-05-15"), which schema.org / Google Rich Results require. Falls back
 * to the original string if it can't be parsed.
 */
function toIsoDate(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toISOString().slice(0, 10);
}

export function articleSchema(post: {
  title: string;
  excerpt: string;
  slug: string;
  author: string;
  date: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/blog/${post.slug}`,
    author: { '@type': 'Person', name: post.author },
    publisher: organizationSchema(),
    datePublished: toIsoDate(post.date),
  };
}

export function webApplicationSchema(app: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: app.name,
    description: app.description,
    url: `${SITE_URL}${app.path}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

/** Serialize a schema object for safe embedding in a <script> tag. */
export function jsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
