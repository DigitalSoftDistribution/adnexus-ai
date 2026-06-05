import type { Metadata } from 'next';
import { Wallet, BarChart2, Target, Zap, Clock, ShieldCheck } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand, ScenarioBlock } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Budget Pacing',
  description:
    'Smart budget allocation across campaigns and platforms. AdNexus AI monitors spend velocity, forecasts month-end outcomes, and drafts reallocation recommendations to maximize ROAS.',
  alternates: { canonical: '/features/budget-pacing' },
};

const ITEMS = [
  { icon: <BarChart2 size={22} style={{ color: '#818cf8' }} aria-hidden="true" />, title: 'Spend Velocity Tracking', desc: 'Monitors how fast each campaign burns budget versus its target pace — catching over- and under-spenders early.' },
  { icon: <Target size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Forecasting', desc: 'Predicts month-end spend and ROAS based on current trajectory, so you can adjust before it is too late.' },
  { icon: <Zap size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Smart Reallocation', desc: 'Drafts recommendations to shift budget from underperformers to winners — pending your approval.' },
  { icon: <Wallet size={22} style={{ color: '#818cf8' }} aria-hidden="true" />, title: 'Cross-Platform Coordination', desc: 'Allocates budget across Meta, Google, TikTok, and Snap based on where it performs best this week.' },
  { icon: <Clock size={22} style={{ color: '#10B981' }} aria-hidden="true" />, title: 'Daily Check-ins', desc: 'The agent reviews pacing every morning and flags issues in the Morning Brief before they compound.' },
  { icon: <ShieldCheck size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'Guardrails', desc: 'Set minimum and maximum spend limits per campaign. The agent respects them in every recommendation.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Budget Pacing"
        title={<>Smart spend <span className="text-gradient-indigo">allocation</span></>}
        subtitle="Maximize ROAS through the whole month. The agent monitors pacing, forecasts outcomes, and drafts reallocations — you approve every move."
      />
      <Section eyebrow="A day in the life" title="The mid-month surprise">
        <ScenarioBlock
          situation="It's the 15th. Your top-performing Meta campaign burned through 70% of its monthly budget in the first two weeks. Meanwhile, a Google campaign with better ROAS is underspending by 40%. You won't find out until the end-of-month review — when it's too late to fix."
          outcome="AdNexus tracks spend velocity daily and forecasts month-end outcomes. The moment it detects the imbalance, it drafts a reallocation: pull $3,200 from Meta, push to Google. You review the reasoning, approve, and the rest of the month runs on optimized pacing."
        />
      </Section>
      <Section title="How budget pacing works" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ITEMS.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
          ))}
        </div>
      </Section>
      <CtaBand title="Optimize every dollar of spend" subtitle="Connect your accounts and start smart budget pacing today." />
    </>
  );
}
