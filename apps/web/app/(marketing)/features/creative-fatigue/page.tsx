import type { Metadata } from 'next';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';
import { ScrollReveal } from '@/components/marketing/v2/animations';
import { AlertTriangle, RefreshCw, BarChart3, Eye, Zap, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Creative Fatigue Detection — AdNexus AI',
  description:
    'AI detects when ad creative performance drops, alerts you, and suggests replacements before budget is wasted. Catch tired creative before it burns budget.',
  alternates: { canonical: '/features/creative-fatigue' },
  openGraph: {
    title: 'Creative Fatigue Detection — AdNexus AI',
    description: 'Catch tired creative before it burns budget. AI-powered fatigue detection across all platforms.',
    url: '/features/creative-fatigue',
  },
};

const FEATURES = [
  {
    icon: <AlertTriangle size={22} style={{ color: '#EF4444' }} aria-hidden="true" />,
    title: 'Early Warning System',
    desc: 'Get alerted when CTR drops 15% or conversion rate falls below your baseline — before the budget drain becomes visible in weekly reports.',
  },
  {
    icon: <RefreshCw size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />,
    title: 'Smart Replacements',
    desc: 'AI recommends which creative to replace and generates new variants to test, complete with predicted performance lift.',
  },
  {
    icon: <BarChart3 size={22} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'Cross-Platform View',
    desc: 'See fatigue patterns across Meta, Google, TikTok, and Snap in one dashboard. No more switching between four tabs.',
  },
  {
    icon: <Eye size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'Visual Timeline',
    desc: 'Track every creative\'s performance lifecycle from launch to fatigue. Spot the exact moment performance starts declining.',
  },
  {
    icon: <Zap size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />,
    title: 'Auto-Generated Briefs',
    desc: 'When fatigue is detected, AI writes a creative brief for your design team with data-backed recommendations.',
  },
  {
    icon: <Shield size={22} style={{ color: '#10B981' }} aria-hidden="true" />,
    title: 'Budget Protection',
    desc: 'Set automatic pause rules when fatigue thresholds are hit. Never waste another dollar on tired creative.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Baseline Establishment',
    desc: 'AI learns your creative\'s normal performance range within 48 hours of launch, accounting for platform, audience, and objective differences.',
  },
  {
    step: '02',
    title: 'Continuous Monitoring',
    desc: 'Every hour, the agent checks CTR, conversion rate, frequency, and engagement velocity against the baseline and industry benchmarks.',
  },
  {
    step: '03',
    title: 'Fatigue Detection',
    desc: 'When performance drops below your threshold for 6+ hours, a fatigue alert is generated with confidence score and estimated impact.',
  },
  {
    step: '04',
    title: 'Actionable Draft',
    desc: 'The AI creates an optimization draft: pause the tired creative, suggest replacements, or generate a new brief — all awaiting your approval.',
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Feature"
        title={
          <>
            Catch tired creative{' '}
            <span style={{ color: '#c3f53b' }}>before it burns budget</span>
          </>
        }
        subtitle="AdNexus AI monitors every creative across all platforms and flags fatigue the moment performance drops. No more guessing when to refresh."
      />

      {/* How it works */}
      <Section title="How it works" subtitle="Four steps from launch to protection">
        <div className="max-w-3xl mx-auto space-y-4">
          {HOW_IT_WORKS.map((item, i) => (
            <ScrollReveal key={item.step} delay={i * 0.1}>
              <div
                className="flex items-start gap-4 rounded-xl p-5"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-mono-data text-sm font-bold"
                  style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}
                >
                  {item.step}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Features grid */}
      <Section title="What you get" subtitle="Six capabilities that protect your creative investment" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Scenario */}
      <Section>
        <ScrollReveal>
          <div
            className="max-w-3xl mx-auto rounded-xl p-6 sm:p-8"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Real-world scenario
            </p>
            <p className="font-space text-lg sm:text-xl font-medium leading-relaxed text-white mb-6">
              &ldquo;Our hero image was converting at 4.2% on day one. By day five, it had dropped
              to 2.1% — but our weekly report wouldn&apos;t flag it for another two days. We burned
              $3,400 before noticing.&rdquo;
            </p>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2"
              style={{ color: '#c3f53b' }}
            >
              With AdNexus
            </p>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The AI detected the CTR decline within 6 hours of crossing the threshold. It
              generated a draft to pause the creative, suggested two replacement variants from your
              media library, and wrote a brief for your designer. You approved the draft at 2 PM.
              The new creative was live by 3 PM. Estimated savings: $2,800.
            </p>
          </div>
        </ScrollReveal>
      </Section>

      <CtaBand
        title="Never let tired creative burn budget again"
        subtitle="Set up fatigue detection in 2 minutes. The AI watches every creative, every hour."
      />
    </>
  );
}
