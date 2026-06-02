import type { Metadata } from 'next';
import { PricingContent } from './pricing-content';
import { PRICING_FAQS } from '@/lib/pricing';
import {
  pricingOffersSchema,
  faqSchema,
  breadcrumbSchema,
  jsonLd,
} from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'AdNexus AI pricing — start free, then scale from $39/mo. AI-powered ad management with draft-first approval across Meta, Google, TikTok, and Snap. 14-day trial, no credit card.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | AdNexus AI',
    description:
      'Plans that scale with your ad spend. Start free, upgrade from $39/mo. 14-day trial.',
    url: '/pricing',
    type: 'website',
  },
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(pricingOffersSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(PRICING_FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Pricing', path: '/pricing' },
            ]),
          ),
        }}
      />
      <PricingContent />
    </>
  );
}
