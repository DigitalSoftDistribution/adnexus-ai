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
  { q: 'What is AdNexus AI?', a: 'AdNexus is an AI-powered campaign workspace launching with Meta execution and read-only/coming-soon coverage for Google, TikTok, and Snap. An autonomous agent monitors performance and drafts optimizations that you review before execution.' },
  { q: 'What does "draft-first" mean?', a: 'Every change the AI proposes is staged as a draft. Marking a draft reviewed does not write to an ad platform; live Meta writes happen only when an approved draft is explicitly executed. Autonomous live changes are impossible by design.' },
  { q: 'Which platforms are supported?', a: 'Meta (Facebook & Instagram) is launch-ready for v1 execution. Google Ads is read-only in v1, while TikTok Ads and Snap Ads are coming soon for managed write access.' },
  { q: 'Does it work with Claude or ChatGPT?', a: 'Yes. AdNexus is MCP-native, so you can connect it to Claude, ChatGPT, Cursor, or any MCP-compatible assistant — in addition to using the full visual dashboard.' },
  { q: 'Does pricing scale with my ad spend?', a: 'No. Pricing is flat and never increases just because your managed ad spend grows — unlike spend-based tools such as Madgicx or Revealbot.' },
  { q: 'How long does setup take?', a: 'Meta OAuth setup is guided during the managed v1 pilot. Google, TikTok, and Snap access is labeled read-only or coming soon until production write support is ready.' },
  { q: 'Is my data secure?', a: 'We use OAuth (never your passwords), encrypt data in transit and at rest, enforce least-privilege role-based access, and log every action. See our Security page for details.' },
  { q: 'Can I cancel anytime?', a: 'During v1, plan changes are sales-led and handled by our team. The billing page shows current usage without fake self-serve upgrade controls when checkout is unavailable.' },
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
