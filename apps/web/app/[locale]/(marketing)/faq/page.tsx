import type { Metadata } from 'next';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { FaqSection } from '@/components/marketing/sections';
import { JsonLd } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about AdNexus AI — how draft-first approval works, supported platforms, MCP integration, pricing, security, and getting started.',
  alternates: { canonical: '/faq' },
};

const FAQS = [
  { question: 'What is AdNexus AI?', answer: 'AdNexus is an AI-powered campaign workspace for managing ads across Meta, Google, TikTok, and Snap. An autonomous agent monitors performance and drafts optimizations that you review and approve.' },
  { question: 'What does "draft-first" mean?', answer: 'Every change the AI proposes is staged as a draft. Nothing publishes to your live campaigns until a person reviews and approves it. Autonomous live changes are impossible by design.' },
  { question: 'Which platforms are supported?', answer: 'Meta (Facebook & Instagram), Google Ads, TikTok Ads, and Snap Ads. The Growth plan covers Meta and Google; Scale and Agency add TikTok and Snap.' },
  { question: 'Does it work with Claude or ChatGPT?', answer: 'Yes. AdNexus is MCP-native, so you can connect it to Claude, ChatGPT, Cursor, or any MCP-compatible assistant — in addition to using the full visual dashboard.' },
  { question: 'Does pricing scale with my ad spend?', answer: 'No. Pricing is flat and never increases just because your managed ad spend grows — unlike spend-based tools such as Madgicx or Revealbot.' },
  { question: 'How long does setup take?', answer: 'About two minutes. Connect your ad accounts via secure OAuth and the AI begins auditing immediately. No credit card required to start.' },
  { question: 'Is my data secure?', answer: 'We use OAuth (never your passwords), encrypt data in transit and at rest, enforce least-privilege role-based access, and log every action. See our Security page for details.' },
  { question: 'Can I cancel anytime?', answer: 'Yes. Upgrade, downgrade, or cancel from billing settings at any time. If you cancel you keep access through the end of your current period.' },
];

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
};

export default function Page() {
  return (
    <>
      <JsonLd data={FAQ_JSONLD} />
      <PageHero
        eyebrow="FAQ"
        title={<>Questions? Answers.</>}
        subtitle="Everything you need to know about AdNexus AI before you start."
      />
      <Section>
        <FaqSection items={FAQS} />
      </Section>
      <CtaBand
        title="Still have questions?"
        subtitle="Reach out and our team will help you find the right fit."
        cta="Contact us"
        ctaHref="/contact"
      />
    </>
  );
}
