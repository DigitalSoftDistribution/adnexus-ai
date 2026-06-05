import type { Metadata } from 'next';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';
import { ScrollReveal } from '@/components/marketing/v2/animations';
import { Rocket, Users, Zap, Shield, TrendingUp, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Startups — AdNexus AI',
  description:
    'Early-stage growth teams use AdNexus AI to run professional ad operations without hiring a full team. AI does the analysis, you approve the action.',
  alternates: { canonical: '/use-cases/startups' },
  openGraph: {
    title: 'For Startups — AdNexus AI',
    description: 'Run professional ad ops without a full team. AI analysis + your approval = growth.',
    url: '/use-cases/startups',
  },
};

const CHALLENGES = [
  {
    icon: <Users size={22} style={{ color: '#EF4444' }} aria-hidden="true" />,
    title: 'Small Team, Big Goals',
    desc: 'You have one person running ads part-time, but the board expects hockey-stick growth. Every hour spent on manual optimization is an hour not spent on product.',
  },
  {
    icon: <Clock size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />,
    title: 'Learning Curve',
    desc: 'Meta Ads Manager, Google Ads, TikTok Business Center — each platform has its own interface, rules, and quirks. Mastery takes months you do not have.',
  },
  {
    icon: <TrendingUp size={22} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'Budget Sensitivity',
    desc: 'Every dollar matters. A single mistake — wrong audience, tired creative, missed frequency cap — can burn a week\'s budget with nothing to show.',
  },
];

const SOLUTIONS = [
  {
    icon: <Rocket size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />,
    title: 'Launch in 2 Minutes',
    desc: 'Connect your accounts with OAuth. No code, no spreadsheets, no waiting on a sales call. See your first insights today.',
  },
  {
    icon: <Zap size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'AI Does the Heavy Lifting',
    desc: 'The agent watches every account 24/7, spots issues, and writes optimization drafts. You review and approve — no expertise required.',
  },
  {
    icon: <Shield size={22} style={{ color: '#10B981' }} aria-hidden="true" />,
    title: 'Mistake-Proof by Design',
    desc: 'Nothing goes live without your approval. The AI proposes, you decide. Perfect for founders who want speed without risk.',
  },
];

const WORKFLOW = [
  { step: '01', title: 'Connect', desc: 'Link Meta, Google, TikTok, and Snap with one-click OAuth. 2 minutes, zero code.' },
  { step: '02', title: 'Learn', desc: 'AI analyzes 30 days of historical data to establish baselines and identify quick wins.' },
  { step: '03', title: 'Act', desc: 'Review AI-generated drafts every morning. Approve with one click. Watch performance improve.' },
  { step: '04', title: 'Scale', desc: 'As you grow, add team members, workspaces, and platforms. The same workflow scales from $1K to $1M/month.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Use Case"
        title={
          <>
            Growth without the{' '}
            <span style={{ color: '#c3f53b' }}>headcount</span>
          </>
        }
        subtitle="Early-stage teams use AdNexus AI to run professional ad operations without hiring a full growth team. AI does the analysis, you approve the action."
      />

      {/* Challenges */}
      <Section title="The startup ad challenge" subtitle="Three problems every early-stage team faces">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CHALLENGES.map((c, i) => (
            <ScrollReveal key={c.title} delay={i * 0.12}>
              <div
                className="card-surface p-6 text-center"
                style={{ borderColor: 'rgba(239,68,68,0.2)' }}
              >
                <div className="flex justify-center mb-4">{c.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">{c.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {c.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Solutions */}
      <Section title="How AdNexus helps" subtitle="Three ways we turn your constraints into advantages" alt>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SOLUTIONS.map((s, i) => (
            <ScrollReveal key={s.title} delay={i * 0.12}>
              <FeatureCard icon={s.icon} title={s.title} desc={s.desc} />
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Workflow */}
      <Section title="From zero to optimized" subtitle="Four steps to professional ad operations">
        <div className="max-w-3xl mx-auto space-y-3">
          {WORKFLOW.map((w, i) => (
            <ScrollReveal key={w.step} delay={i * 0.1}>
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
                  {w.step}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{w.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {w.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Pricing teaser */}
      <Section title="Pricing that scales with you" subtitle="Start free, upgrade as you grow — not as you spend" alt>
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <div
              className="rounded-xl p-6 sm:p-8 mb-6"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="font-mono-data text-4xl font-bold text-white mb-2">$0</div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Free forever for startups with &lt;$5K/month ad spend
              </p>
              <div className="space-y-2 text-left max-w-sm mx-auto">
                {[
                  '1 workspace',
                  '2 platform connections',
                  'Daily morning brief',
                  'Creative fatigue alerts',
                  'Basic budget pacing',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Shield size={14} style={{ color: '#c3f53b' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Upgrade to Starter ($49/mo) when you hit $5K/month. No surprise charges.
            </p>
          </div>
        </ScrollReveal>
      </Section>

      <CtaBand
        title="Start growing smarter today"
        subtitle="Connect your accounts in 2 minutes. See your first AI insights today."
      />
    </>
  );
}
