import type { Metadata } from 'next';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';
import { ScrollReveal } from '@/components/marketing/v2/animations';
import { FileText, TrendingUp, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Morning Brief — AdNexus AI',
  description:
    'Start each day with a personalized AI-generated summary of what changed, what needs attention, and what the AI recommends. Your daily briefing, written by AI.',
  alternates: { canonical: '/features/morning-brief' },
  openGraph: {
    title: 'Morning Brief — AdNexus AI',
    description: 'Your daily AI briefing. What changed, what needs attention, and what to do next.',
    url: '/features/morning-brief',
  },
};

const FEATURES = [
  {
    icon: <FileText size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />,
    title: 'Personalized Summary',
    desc: 'Every brief is tailored to your role, your accounts, and your priorities. No generic templates.',
  },
  {
    icon: <TrendingUp size={22} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'Performance Highlights',
    desc: 'Top movers, biggest wins, and concerning trends — surfaced automatically with context.',
  },
  {
    icon: <AlertCircle size={22} style={{ color: '#EF4444' }} aria-hidden="true" />,
    title: 'Attention Required',
    desc: 'Campaigns that need your eyes today: budget pacing issues, creative fatigue, or performance drops.',
  },
  {
    icon: <CheckCircle2 size={22} style={{ color: '#10B981' }} aria-hidden="true" />,
    title: 'AI Recommendations',
    desc: 'Specific, actionable drafts the AI has prepared. Review and approve in one click.',
  },
  {
    icon: <Clock size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />,
    title: 'Scheduled Delivery',
    desc: 'Choose your time: 8 AM, before your first meeting, or whenever your workday starts.',
  },
  {
    icon: <Zap size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'Multi-Channel Delivery',
    desc: 'Get your brief in-app, via email, Slack, or as a voice summary. Your choice.',
  },
];

const SAMPLE_BRIEF = {
  date: 'Friday, June 5, 2026',
  highlights: [
    { label: 'ROAS', value: '4.2x', change: '+12%', positive: true },
    { label: 'Spend', value: '$24.8K', change: '-3%', positive: true },
    { label: 'CPA', value: '$18.5', change: '-8%', positive: true },
  ],
  alerts: [
    'Meta Campaign "Summer Sale" CTR dropped 18% — creative fatigue suspected',
    'Google Ads budget pacing 23% behind target for the week',
  ],
  drafts: [
    'Pause "Summer Sale" hero image and replace with variant B (predicted +15% CTR)',
    'Reallocate $2,400 from underperforming Google campaign to TikTok prospecting',
  ],
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Feature"
        title={
          <>
            Your daily briefing,{' '}
            <span style={{ color: '#c3f53b' }}>written by AI</span>
          </>
        }
        subtitle="Start each day knowing exactly what changed, what needs attention, and what the AI recommends — across all your platforms."
      />

      {/* Sample Brief Demo */}
      <Section title="A real morning brief" subtitle="This is what lands in your inbox every morning">
        <ScrollReveal>
          <div
            className="max-w-2xl mx-auto rounded-xl overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(195,245,59,0.15)' }}
                >
                  <FileText size={16} style={{ color: '#c3f53b' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Morning Brief</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {SAMPLE_BRIEF.date}
                  </p>
                </div>
              </div>
              <span
                className="text-[10px] px-2 py-1 rounded-full font-medium"
                style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}
              >
                AI Generated
              </span>
            </div>

            {/* KPIs */}
            <div className="p-5">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Performance Snapshot
              </p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {SAMPLE_BRIEF.highlights.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-lg p-3"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    <div
                      className="text-[9px] uppercase tracking-wider mb-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {kpi.label}
                    </div>
                    <div className="text-lg font-bold text-white font-mono-data">
                      {kpi.value}
                    </div>
                    <div
                      className="text-[10px] font-medium"
                      style={{ color: kpi.positive ? '#10B981' : '#EF4444' }}
                    >
                      {kpi.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Alerts */}
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3"
                style={{ color: '#EF4444' }}
              >
                Needs Attention
              </p>
              <div className="space-y-2 mb-5">
                {SAMPLE_BRIEF.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg p-3"
                    style={{
                      background: 'rgba(239,68,68,0.05)',
                      border: '1px solid rgba(239,68,68,0.1)',
                    }}
                  >
                    <AlertCircle
                      size={14}
                      style={{ color: '#EF4444' }}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      {alert}
                    </p>
                  </div>
                ))}
              </div>

              {/* Drafts */}
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3"
                style={{ color: '#c3f53b' }}
              >
                AI Recommendations
              </p>
              <div className="space-y-2">
                {SAMPLE_BRIEF.drafts.map((draft, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg p-3"
                    style={{
                      background: 'rgba(195,245,59,0.05)',
                      border: '1px solid rgba(195,245,59,0.1)',
                    }}
                  >
                    <CheckCircle2
                      size={14}
                      style={{ color: '#c3f53b' }}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      {draft}
                    </p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="w-full py-2.5 text-sm font-bold rounded-lg transition-all hover:scale-[1.01]"
                  style={{ background: '#c3f53b', color: '#0a0a0a' }}
                >
                  Review 2 Drafts in Dashboard
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Section>

      {/* Features */}
      <Section title="What you get" subtitle="Six capabilities that make every morning productive" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
            </ScrollReveal>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Wake up to clarity"
        subtitle="Get your first Morning Brief tomorrow. Set it up in 2 minutes."
      />
    </>
  );
}
