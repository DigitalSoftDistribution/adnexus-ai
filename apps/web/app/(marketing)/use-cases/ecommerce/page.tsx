import type { Metadata } from 'next';
import { ShoppingCart, Palette, Wallet, GitMerge, TrendingUp, Eye } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand, ScenarioBlock, WorkflowSteps } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'AdNexus for E-commerce',
  description:
    'AdNexus AI for e-commerce: protect ROAS with creative-fatigue detection, budget pacing, and cross-platform attribution across Meta, Google, TikTok, and Snap.',
  alternates: { canonical: '/use-cases/ecommerce' },
};

const POINTS = [
  { icon: <Palette size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'Stop Creative Fatigue', desc: 'Meta creative fatigues in 3–5 days. The AI flags it early and suggests fresh variants before ROAS dips.' },
  { icon: <Wallet size={22} style={{ color: '#10B981' }} aria-hidden="true" />, title: 'Protect Your ROAS', desc: 'Budget pacing shifts spend toward winners automatically — pending your approval.' },
  { icon: <GitMerge size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'True Attribution', desc: 'Understand which platform actually drove the sale with unified cross-platform attribution.' },
  { icon: <Eye size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Audience Saturation Alerts', desc: 'Get warned when an audience is tapped out — saving the 15–25% of spend usually wasted on it.' },
  { icon: <TrendingUp size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Seasonal Forecasting', desc: 'Plan budgets around predicted demand instead of reacting after the peak has passed.' },
  { icon: <ShoppingCart size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Built for D2C', desc: 'Purpose-built for high-velocity catalogs and the four platforms that drive e-commerce growth.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="For E-commerce"
        title={<>Defend every dollar of <span style={{ color: '#c3f53b' }}>ad spend</span></>}
        subtitle="Catch fatigue, saturation, and pacing problems before they quietly drain your ROAS."
      />
      <Section eyebrow="A day in the life" title="The slow leak you don't see coming">
        <ScenarioBlock
          situation="Your winning Meta creative has been running for a week. It's still profitable on paper, so you leave it alone. But frequency is climbing, CTR is sliding, and CPMs are creeping up — the ad is quietly fatiguing, and the budget keeps flowing into it."
          outcome="AdNexus baselines each creative's first days and watches the slope. The moment fatigue crosses the line, it drafts an alert and a suggested refresh — before the dip shows up in your ROAS. You approve the swap and the leak is sealed."
        />
      </Section>

      <Section title="How it works for e-commerce" alt>
        <WorkflowSteps
          steps={[
            { title: 'Connect every channel', desc: 'Meta, Google, TikTok, and Snap in one place, so the AI sees the whole funnel — not one platform in isolation.' },
            { title: 'The agent watches the leading indicators', desc: 'Frequency, CTR decay, CPM creep, and audience saturation — the early signals of waste, monitored around the clock.' },
            { title: 'Get drafts before the dip', desc: 'Creative refreshes, budget pacing, and saturation alerts arrive as drafts with the reasoning attached.' },
            { title: 'Approve and protect margin', desc: 'You decide what ships. Cross-platform attribution keeps you honest about which channel actually drove the sale.' },
          ]}
        />
      </Section>

      <Section title="Where AdNexus protects your margins">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POINTS.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title} desc={p.desc} />
          ))}
        </div>
      </Section>
      <CtaBand title="Protect your ROAS today" subtitle="Connect your store's ad accounts and get a free AI audit in two minutes." primaryLabel="Start Free Audit" />
    </>
  );
}
