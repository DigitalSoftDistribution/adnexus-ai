import type { Metadata } from 'next';
import { Wallet, BarChart2, Target, Zap, Clock, ShieldCheck } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand, ScenarioBlock } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Budget Pacing',
  description:
    'Smart budget allocation across campaigns and platforms. AdNexus AI monitors spend velocity, forecasts outcomes, and drafts reallocation recommendations.',
  alternates: { canonical: '/features/budget-pacing' },
};

const ITEMS = [
  { icon: <BarChart2 size={20} />, title: 'Spend Velocity Tracking', desc: 'Monitors how fast each campaign burns budget versus its target pace — catching over- and under-spenders early.' },
  { icon: <Target size={20} />, title: 'Forecasting', desc: 'Predicts month-end spend and ROAS based on current trajectory, so you can adjust before it is too late.' },
  { icon: <Zap size={20} />, title: 'Smart Reallocation', desc: 'Drafts recommendations to shift budget from underperformers to winners — pending your approval.' },
  { icon: <Wallet size={20} />, title: 'Cross-Platform Coordination', desc: 'Allocates budget across Meta, Google, TikTok, and Snap based on where it performs best this week.' },
  { icon: <Clock size={20} />, title: 'Daily Check-ins', desc: 'The agent reviews pacing every morning and flags issues in the Morning Brief before they compound.' },
  { icon: <ShieldCheck size={20} />, title: 'Guardrails', desc: 'Set minimum and maximum spend limits per campaign. The agent respects them in every recommendation.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Budget Pacing"
        title={<>Smart spend allocation</>}
        subtitle="Maximize ROAS through the whole month. The agent monitors pacing, forecasts outcomes, and drafts reallocations — you approve every move."
      />
      <Section>
        <ScenarioBlock
          before={{
            title: 'The mid-month surprise',
            points: [
              'Top campaign burns 70% of budget in two weeks',
              'Better-performing campaign underspends by 40%',
              'You find out at month-end — too late to fix',
              'Budget is locked in the wrong places',
            ],
          }}
          after={{
            title: 'The fix',
            points: [
              'Agent tracks spend velocity daily',
              'Forecasts month-end outcomes automatically',
              'Drafts reallocation before it is too late',
              'You approve and the month runs optimized',
            ],
          }}
        />
      </Section>
      <Section className="bg-card">
        <FeatureGrid>
          {ITEMS.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.desc} />
          ))}
        </FeatureGrid>
      </Section>
      <CtaBand
        title="Optimize every dollar of spend"
        subtitle="Connect your accounts and start smart budget pacing today."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
