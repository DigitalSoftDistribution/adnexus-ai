import type { Metadata } from 'next';
import Link from 'next/link';
import { Target, Eye, ShieldCheck, Globe, ArrowRight } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'About',
  description:
    'AdNexus AI is the intelligent campaign workspace — built on the belief that AI should draft, and humans should decide. Read the story and the principles behind it.',
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  { icon: <ShieldCheck size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Humans approve, AI drafts', desc: 'Automation earns trust by asking first. Nothing goes live without a person signing off.' },
  { icon: <Eye size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Transparency over magic', desc: 'Every recommendation shows its reasoning. No black box spends your budget.' },
  { icon: <Globe size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Cross-platform by default', desc: 'Performance lives across channels, so the product reasons across all of them — not just one.' },
  { icon: <Target size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Flat, honest pricing', desc: 'We never charge more just because you spend more. Our incentives stay aligned with yours.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title={<>AI should draft. <span style={{ color: '#c3f53b' }}>Humans should decide.</span></>}
        subtitle="AdNexus AI gives marketing teams the speed of automation without surrendering control of their spend."
      />

      <Section title="The story">
        <div className="max-w-3xl mx-auto space-y-5 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <p>
            Every advertiser we talked to was stuck choosing between two bad options.
          </p>
          <p>
            The first was a new wave of AI chat tools. You could ask a question in plain English and
            get an answer from your ad data — genuinely useful. But there was no dashboard to see the
            whole picture, no record of what changed, and nothing stopping the AI from pushing a live
            edit you never reviewed. Powerful, but no guardrails.
          </p>
          <p>
            The second was the mature SaaS suites. Polished dashboards, deep automation — but usually
            for a single platform, and almost always priced as a percentage of your ad spend. The more
            you grew, the more they charged. And the automation acted on rules you had to write and
            maintain by hand.
          </p>
          <p>
            Nobody offered the obvious third option: an AI that does the heavy analysis across{' '}
            <span className="text-white font-medium">all</span> your platforms, proposes the changes
            for you, and then waits for your approval before touching a live campaign. Speed and
            control, in the same tool. So we built it.
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

      <Section>
        <div id="founder" className="max-w-3xl mx-auto scroll-mt-24">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#2563EB' }}>
            From the founder
          </span>
          <div
            className="rounded-xl p-6 sm:p-8"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <blockquote className="font-space text-lg sm:text-xl font-medium leading-relaxed text-white mb-5">
              &ldquo;I&apos;ve handed budgets to automation that made changes I&apos;d never have
              approved. I&apos;ve also spent whole afternoons stitching four dashboards together by
              hand. AdNexus is the tool I wanted in both moments — an analyst that never sleeps, and a
              review step I never have to skip.&rdquo;
            </blockquote>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
              We&apos;re a small, founder-led team building in the open. If you&apos;re evaluating
              AdNexus, want to push back on our approach, or just want to talk shop about AI and ad
              ops, I&apos;d genuinely like to hear from you.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg"
              style={{ background: '#c3f53b', color: '#0a0a0a' }}
            >
              Talk to the founder
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand title="Come build the third option with us" subtitle="See what a draft-first, cross-platform AI workspace does for your campaigns." />
    </>
  );
}
