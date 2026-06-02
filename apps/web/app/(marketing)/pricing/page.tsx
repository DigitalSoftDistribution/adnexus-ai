import type { Metadata } from 'next';
import { PricingContent } from '@/components/marketing/PricingContent';
import { JsonLd } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Flat, transparent AdNexus AI pricing that never scales with your ad spend. Start free, upgrade for AI optimization, cross-platform reporting, and team workflows.',
  alternates: { canonical: '/pricing' },
};

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does pricing scale with my ad spend?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. AdNexus pricing is flat and does not grow when your managed ad spend grows, unlike spend-based tools such as Madgicx or Revealbot.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the 14-day free trial work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Start any paid plan with a 14-day free trial with no credit card required. At the end you can subscribe or drop to the free tier automatically.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which ad platforms are supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Growth covers Meta and Google. Scale and Agency add TikTok and Snapchat — all four major platforms in one dashboard.',
      },
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <JsonLd data={FAQ_JSONLD} />
      <PricingContent />
    </>
  );
}
