import type { Metadata } from 'next';
import { PricingContent } from '@/components/marketing/PricingContent';
import { JsonLd } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Flat, transparent AdNexus AI pricing that never scales with your ad spend. Request managed v1 pilot access for Meta execution, cross-platform reporting, and team workflows.',
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
      name: 'Is self-serve checkout available?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Not yet. AdNexus AI v1 is provisioned through a managed pilot so platform access, guardrails, and Meta write permissions are verified before launch.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which ad platforms are supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Meta is launch-ready for v1 execution. Google, TikTok, and Snap are read-only or coming soon while production write support is completed.',
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
