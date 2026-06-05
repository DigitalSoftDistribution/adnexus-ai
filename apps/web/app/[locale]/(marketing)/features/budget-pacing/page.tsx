import type { Metadata } from 'next';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';
import { ScrollReveal } from '@/components/marketing/v2/animations';
import { Wallet, TrendingUp, Shield, BarChart3, Zap, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Budget Pacing — AdNexus AI',
  description:
    'Smart budget allocation across campaigns and platforms to maximize ROAS throughout the month. Never overspend or underspend again.',
  alternates: { canonical: '/features/budget-pacing' },
  openGraph: {
    title: 'Budget Pacing — AdNexus AI',
    description: 'Smart budget allocation across campaigns and platforms. Maximize ROAS every day.',
    url: '/features/budget-pacing',
  },
};

const FEATURES = [
  {
    icon: <Wallet size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />,
    title: 'Daily Pacing Targets',
    desc: 'AI calculates optimal daily spend for each campaign based on month-to-date performance and remaining budget.',
  },
  {
    icon: <TrendingUp size={22} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'Performance-Based Shifts',
    desc: 'Automatically reallocate budget from underperformers to campaigns with the highest ROAS potential.',
  },
  {
    icon: <Shield size={22} style={{ color: '#10B981' }} aria-hidden="true" />,
    title: 'Overspend Protection',
    desc: 'Hard stops and soft warnings when campaigns approach their daily or monthly limits. Never blow a budget.',
  },
  {
    icon: <BarChart3 size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'Cross-Platform Balance',
    desc: 'See budget allocation across Meta, Google, TikTok, and Snap in one view. Rebalance with one click.',
  },
  {
    icon: <Zap size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />,
    title: 'Opportunity Alerts',
    desc: 'Get notified when a high-performing campaign has budget headroom — so you can scale before the opportunity fades.',
  },
  {
    icon: <Globe size={22} style={{ color: '#34D399' }} aria-hidden="true" />,
    title: 'Seasonal Adjustments',
    desc: 'AI learns your seasonal patterns and pre-adjusts pacing for Black Friday, holiday seasons, and sale events.',
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Feature"
        title={
          <>
            Smart budget pacing,{' '}
            <span style={{ color: '#c3f53b' }}>maximum ROAS</span>
          </>
        }
        subtitle="AI allocates your budget across campaigns and platforms in real-time, so every dollar works as hard as possible."
      />

      {/* Visual Demo */}
      <Section title="How it works" subtitle="From monthly goal to daily execution">
        <ScrollReveal>
          <div
            className="max-w-3xl mx-auto rounded-xl p-6 sm:p-8"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="space-y-6">
              {/* Monthly budget */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Monthly Budget</span>
                  <span className="text-sm font-bold text-white font-mono-data">$50,000</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ background: '#c3f53b', width: '62%' }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    Spent: $31,200
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    Remaining: $18,800
                  </span>
                </div>
              </div>

              {/* Platform breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { platform: 'Meta', spend: '$14,200', pct: 45, color: '#1877F2' },
                  { platform: 'Google', spend: '$10,800', pct: 35, color: '#EA4335' },
                  { platform: 'TikTok', spend: '$4,200', pct: 13, color: '#FF0050' },
                  { platform: 'Snap', spend: '$2,000', pct: 6, color: '#FFFC00' },
                ].map((p) => (
                  <div
                    key={p.platform}
                    className="rounded-lg p-3"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: p.color }}
                      />
                      <span className="text-[11px] font-medium text-white">{p.platform}</span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono-data">
                      {p.spend}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {p.pct}% of spend
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Recommendation */}
              <div
                className="rounded-lg p-4 flex items-start gap-3"
                style={{
                  background: 'rgba(195,245,59,0.05)',
                  border: '1px solid rgba(195,245,59,0.15)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(195,245,59,0.12)' }}
                >
                  <Zap size={14} style={{ color: '#c3f53b' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">AI Recommendation</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Meta ROAS is 5.2x vs Google at 3.1x. Reallocate $3,000 from Google to Meta
                    for the remaining 10 days. Estimated ROAS improvement: +18%.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-[10px] px-2 py-1 rounded font-medium"
                      style={{ background: '#c3f53b', color: '#0a0a0a' }}
                    >
                      Create Draft
                    </span>
                    <span
                      className="text-[10px] px-2 py-1 rounded font-medium"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Dismiss
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Section>

      {/* Features */}
      <Section title="What you get" subtitle="Six capabilities that optimize every dollar" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
            </ScrollReveal>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Make every dollar count"
        subtitle="Set up smart budget pacing in 2 minutes. The AI optimizes allocation 24/7."
      />
    </>
  );
}
