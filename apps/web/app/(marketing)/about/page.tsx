import type { Metadata } from 'next';
import { Target, Eye, ShieldCheck, Globe } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'About',
  description:
    'AdNexus AI is the intelligent campaign workspace — built on the belief that AI should draft, and humans should decide. Learn about our mission and principles.',
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  { icon: <ShieldCheck size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Humans approve, AI drafts', desc: 'We believe automation earns trust by asking first. Nothing goes live without a person signing off.' },
  { icon: <Eye size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Transparency over magic', desc: 'Every recommendation explains its reasoning. No black boxes spending your budget.' },
  { icon: <Globe size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Cross-platform by default', desc: 'Real performance lives across channels, so our product reasons across all of them — not just one.' },
  { icon: <Target size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Flat, honest pricing', desc: 'We never charge more just because you spend more. Our incentives stay aligned with yours.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title={<>AI should draft. <span style={{ color: '#c3f53b' }}>Humans should decide.</span></>}
        subtitle="AdNexus AI exists to give marketing teams the speed of automation without surrendering control of their spend."
      />

      <Section title="Why we built AdNexus">
        <div className="max-w-3xl mx-auto space-y-5 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <p>
            The market split in two. On one side, MCP-native chat connectors let you talk to your ad
            data but offer no dashboard and no governance. On the other, mature SaaS platforms
            automate aggressively — usually for a single platform, and usually with pricing that
            climbs as your spend does.
          </p>
          <p>
            We thought teams deserved a third option: an AI that is genuinely autonomous in its
            analysis, genuinely cross-platform in its reach, and genuinely safe because every change
            it proposes is a draft awaiting human approval. That is AdNexus.
          </p>
        </div>
      </Section>

      <Section title="What we believe" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRINCIPLES.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title} desc={p.desc} />
          ))}
        </div>
      </Section>

      <CtaBand title="Join us" subtitle="See what a draft-first, cross-platform AI workspace can do for your campaigns." />
    </>
  );
}
