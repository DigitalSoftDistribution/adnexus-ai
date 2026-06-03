import type { Metadata } from 'next';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { FaqAccordion, type FaqEntry } from '@/components/marketing/FaqAccordion';
import { JsonLd } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about AdNexus AI — how draft-first approval works, supported platforms, MCP integration, pricing, security, and getting started.',
  alternates: { canonical: '/faq' },
};

const FAQS: FaqEntry[] = [
  { q: 'What is AdNexus AI?', a: 'AdNexus is an AI-powered campaign workspace for managing ads across Meta, Google, TikTok, and Snap. An autonomous agent monitors performance and drafts optimizations that you review and approve.' },
  { q: 'What does "draft-first" mean?', a: 'Every change the AI proposes is staged as a draft. Nothing publishes to your live campaigns until a person reviews and approves it. Autonomous live changes are impossible by design.' },
  { q: 'Which platforms are supported?', a: 'Meta (Facebook & Instagram), Google Ads, TikTok Ads, and Snap Ads. The Growth plan covers Meta and Google; Scale and Agency add TikTok and Snap.' },
  { q: 'Does it work with Claude or ChatGPT?', a: 'Yes. AdNexus is MCP-native, so you can connect it to Claude, ChatGPT, Cursor, or any MCP-compatible assistant — in addition to using the full visual dashboard.' },
  { q: 'Does pricing scale with my ad spend?', a: 'No. Pricing is flat and never increases just because your managed ad spend grows — unlike spend-based tools such as Madgicx or Revealbot.' },
  { q: 'How long does setup take?', a: 'About two minutes. Connect your ad accounts via secure OAuth and the AI begins auditing immediately. No credit card required to start.' },
  { q: 'Is my data secure?', a: 'We use OAuth (never your passwords), encrypt data in transit and at rest, enforce least-privilege role-based access, and log every action. See our Security page for details.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Upgrade, downgrade, or cancel from billing settings at any time. If you cancel you keep access through the end of your current period.' },
];

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function Page() {
  return (
    <>
      <JsonLd data={FAQ_JSONLD} />
      <PageHero eyebrow="FAQ" title={<>Questions? <span style={{ color: '#c3f53b' }}>Answers.</span></>} subtitle="Everything you need to know about AdNexus AI before you start." />
      <Section>
        <FaqAccordion items={FAQS} />
      </Section>
      <CtaBand title="Still have questions?" subtitle="Reach out and our team will help you find the right fit." primaryLabel="Contact us" primaryHref="/contact" />
    </>
  );
}
