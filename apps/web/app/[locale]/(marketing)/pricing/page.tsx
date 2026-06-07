import type { Metadata } from 'next';
import { PricingContent } from '@/components/marketing/PricingContent';
import { ROICalculator } from '@/components/marketing/v4/ROICalculator';
import { JsonLd } from '@/components/marketing/JsonLd';
import { PricingComparisonTable } from '@/components/marketing/v4/PricingComparisonTable';

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
    {
      '@type': 'Question',
      name: 'Do I need a credit card to start?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No credit card is required for the 14-day free trial. You only enter payment details when you choose to subscribe.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens after the 14-day trial ends?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can subscribe to keep your paid features, or your account automatically drops to the Free tier with read-only access. No data is lost.',
      },
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <JsonLd data={FAQ_JSONLD} />
      <PricingContent />
      <PricingComparisonTable />
      <ROICalculator />
    </>
  );
}
