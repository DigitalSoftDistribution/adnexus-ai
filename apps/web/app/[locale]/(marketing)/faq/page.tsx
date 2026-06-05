import { PageHero, Section, FaqSection } from '@/components/marketing/sections';

export const metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about AdNexus AI — pricing, features, security, and more.',
};

const FAQS = [
  {
    q: 'What platforms does AdNexus AI support?',
    a: 'We currently support Meta Ads (Facebook, Instagram), Google Ads (Search, Display, YouTube), TikTok Ads, and Snapchat Ads. More platforms are coming soon.',
  },
  {
    q: 'How does the AI Agent work?',
    a: 'The AI Agent continuously monitors your campaigns, detects anomalies, and generates optimization drafts. You review and approve changes with one click.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. We use AES-256 encryption at rest and TLS 1.3 in transit. We are SOC 2 Type II certified and GDPR compliant.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Monthly plans can be cancelled anytime. Annual plans include a 30-day money-back guarantee.',
  },
  {
    q: 'Do you offer custom enterprise plans?',
    a: 'Yes. Contact our sales team for custom pricing, SLAs, on-premise deployment, and dedicated support.',
  },
  {
    q: 'How long is the free trial?',
    a: 'Every plan includes a 14-day free trial with full access to all features. No credit card required.',
  },
];

export default function FaqPage() {
  return (
    <>
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
