import type { Metadata } from 'next';
import { PageHero, Section, FaqSection } from '@/components/marketing/sections';
import { JsonLd } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about AdNexus AI — draft-first approval, supported platforms, MCP integrations, pricing, security, and getting started.',
  alternates: { canonical: '/faq' },
};

const FAQS = [
  {
    q: 'What is AdNexus AI?',
    a: 'AdNexus is an AI-powered campaign workspace launching with Meta execution and read-only or coming-soon coverage for Google, TikTok, and Snap. The AI monitors performance and drafts optimizations that you review before execution.',
  },
  {
    q: 'What does draft-first mean?',
    a: 'Every change the AI proposes is staged as a draft. Marking a draft reviewed does not write to an ad platform; live Meta writes happen only when an approved draft is explicitly executed.',
  },
  {
    q: 'Which platforms are supported?',
    a: 'Meta Ads is launch-ready for v1 execution. Google Ads is read-only in v1, while TikTok Ads and Snap Ads are coming soon for managed write access.',
  },
  {
    q: 'Does it work with Claude or ChatGPT?',
    a: 'Yes. AdNexus is MCP-native, so you can connect it to Claude, ChatGPT, Cursor, or any MCP-compatible assistant in addition to using the visual dashboard.',
  },
  {
    q: 'Does pricing scale with my ad spend?',
    a: 'No. Pricing is flat and never increases just because your managed ad spend grows.',
  },
  {
    q: 'Is my data secure?',
    a: 'We use OAuth instead of platform passwords, encrypt data in transit and at rest, enforce least-privilege role-based access, and log sensitive actions for review.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'During v1, plan changes are sales-led and handled by our team. The billing page shows current usage without fake self-serve upgrade controls when checkout is unavailable.',
  },
];

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={FAQ_JSONLD} />
      <PageHero
        badge="FAQ"
        title={<>Questions? <span className="text-gradient">Answered.</span></>}
        subtitle="Everything you need to know about AdNexus AI."
      />

      <Section>
        <FaqSection items={FAQS} />
      </Section>
    </>
  );
}
