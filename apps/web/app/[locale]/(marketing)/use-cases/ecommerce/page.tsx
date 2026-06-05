import type { Metadata } from 'next';
import { ShoppingCart, Palette, Wallet, GitMerge, TrendingUp, Eye } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand, ScenarioBlock, WorkflowSteps } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'AdNexus for E-commerce',
  description:
    'AdNexus AI for e-commerce: protect ROAS with creative-fatigue detection, budget pacing, and cross-platform attribution.',
  alternates: { canonical: '/use-cases/ecommerce' },
};

const POINTS = [
  { icon: <Palette size={20} />, title: 'Stop Creative Fatigue', desc: 'Meta creative fatigues in 3–5 days. The AI flags it early and suggests fresh variants before ROAS dips.' },
  { icon: <Wallet size={20} />, title: 'Protect Your ROAS', desc: 'Budget pacing shifts spend toward winners automatically — pending your approval.' },
  { icon: <GitMerge size={20} />, title: 'True Attribution', desc: 'Understand which platform actually drove the sale with unified cross-platform attribution.' },
  { icon: <Eye size={20} />, title: 'Audience Saturation Alerts', desc: 'Get warned when an audience is tapped out — saving the 15–25% of spend usually wasted on it.' },
  { icon: <TrendingUp size={20} />, title: 'Seasonal Forecasting', desc: 'Plan budgets around predicted demand instead of reacting after the peak has passed.' },
  { icon: <ShoppingCart size={20} />, title: 'Built for D2C', desc: 'Purpose-built for high-velocity catalogs and the four platforms that drive e-commerce growth.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="For E-commerce"
        title={<>Defend every dollar of ad spend</>}
        subtitle="Catch fatigue, saturation, and pacing problems before they quietly drain your ROAS."
      />
      <Section>
        <ScenarioBlock
          before={{
            title: 'The slow leak',
            points: [
              'Winning creative runs unchecked for weeks',
              'Frequency climbs, CTR slides quietly',
              'Budget keeps flowing into declining ads',
              'ROAS drops before you notice',
            ],
          }}
          after={{
            title: 'The fix',
            points: [
              'Agent baselines every creative from day one',
              'Fatigue detected 3-5 days early',
              'Draft refresh ready for approval',
              'Swap before ROAS is impacted',
            ],
          }}
        />
      </Section>
      <Section className="bg-card">
        <WorkflowSteps
          steps={[
            { number: '1', title: 'Connect every channel', description: 'Meta, Google, TikTok, and Snap in one place, so the AI sees the whole funnel.' },
            { number: '2', title: 'Watch the leading indicators', description: 'Frequency, CTR decay, CPM creep, and audience saturation — monitored around the clock.' },
            { number: '3', title: 'Get drafts before the dip', description: 'Creative refreshes, budget pacing, and saturation alerts arrive as drafts with reasoning.' },
            { number: '4', title: 'Approve and protect margin', description: 'You decide what ships. Cross-platform attribution keeps you honest about true performance.' },
          ]}
        />
      </Section>
      <Section>
        <FeatureGrid>
          {POINTS.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title} description={p.desc} />
          ))}
        </FeatureGrid>
      </Section>
      <CtaBand
        title="Protect your ROAS today"
        subtitle="Connect your store's ad accounts and get a free AI audit in two minutes."
        cta="Start Free Audit"
        ctaHref="/auth/signup"
      />
    </>
  );
}
