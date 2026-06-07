'use client';

import { motion } from 'framer-motion';
import {
  HeroV2,
  SocialProofBar,
  ProblemAgitation,
  SolutionShowcase,
  FeatureHighlights,
  TestimonialCarousel,
  PricingPreview,
  FAQAccordion,
  FinalCTA,
} from '@/components/marketing/v4';

const easeBounce = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ───────── Dashboard mockup for hero visual slot ───────── */
function DashboardMockup() {
  return (
    <>
      <div className="absolute w-[500px] h-[480px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(195,245,59,0.08) 0%, rgba(37,99,235,0.08) 50%, transparent 70%)', animation: 'glow-pulse 4s infinite' }} />
      <div className="relative w-full max-w-[480px]" style={{ perspective: '1000px', animation: 'float 6s ease-in-out infinite' }}>
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)', transform: 'rotateY(-6deg) rotateX(3deg)', transformStyle: 'preserve-3d' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-[10px] font-mono-data" style={{ color: 'var(--text-tertiary)' }}>AdNexus AI Dashboard</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {[
              { label: 'ROAS', value: '4.2x', change: '+12%' },
              { label: 'Spend', value: '$24.8K', change: '-3%' },
              { label: 'CPA', value: '$18.5', change: '-8%' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg p-2.5" style={{ background: 'var(--bg-primary)' }}>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</div>
                <div className="text-sm font-bold text-white font-mono-data">{kpi.value}</div>
                <div className="text-[9px] font-medium" style={{ color: 'var(--status-active)' }}>{kpi.change}</div>
              </div>
            ))}
          </div>
          <div className="px-3 pb-3">
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Campaign Performance</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}>Live</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 1.2 + i * 0.05, duration: 0.4, ease: easeBounce }}
                    className="flex-1 rounded-sm"
                    style={{
                      background: i >= 8 ? '#c3f53b' : 'rgba(195,245,59,0.3)',
                      minHeight: '4px',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function HomeContent() {
  return (
    <div>
      {/* Section 1: HeroV2 */}
      <HeroV2
        eyebrow="The Intelligent Campaign Workspace"
        headline={
          <>
            AI optimizes your ads.
            <br />
            You approve <span className="text-gradient-blue glow-text-blue">every</span> change.
          </>
        }
        subheadline="Connect Meta, Google, TikTok, and Snap. The AI drafts budget shifts, pauses, and creative refreshes. You review and approve with one click."
        primaryCta={{ label: 'Start Free Trial', href: '/auth/signup' }}
        secondaryCta={{ label: 'See how it works', href: '/features' }}
      >
        <DashboardMockup />
      </HeroV2>

      {/* Section 2: SocialProofBar */}
      <SocialProofBar
        headline="Trusted by teams managing $10M+ in ad spend"
        metrics={[
          { value: '4.2x', label: 'avg ROAS improvement' },
          { value: '12h', label: 'saved per week' },
          { value: '35%', label: 'less wasted spend' },
          { value: '4', label: 'platforms unified' },
        ]}
      />

      {/* Section 3: ProblemAgitation */}
      <ProblemAgitation />

      {/* Section 4: SolutionShowcase */}
      <SolutionShowcase />

      {/* Section 5: FeatureHighlights */}
      <FeatureHighlights />

      {/* Section 6: TestimonialCarousel */}
      <TestimonialCarousel />

      {/* Section 7: PricingPreview */}
      <PricingPreview />

      {/* Section 8: FinalCTA + FAQ */}
      <FAQAccordion
        eyebrow="FAQ"
        headline="Still have questions?"
      />
      <FinalCTA
        headline="Put an AI analyst on every account"
        subtitle="Connect your platforms in two minutes and see the first drafts today. You approve everything that ships."
      />
    </div>
  );
}
