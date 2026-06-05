import type { Metadata } from 'next';
import { Palette, Eye, TrendingDown, Zap, BarChart2, Clock } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand, ScenarioBlock } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Creative Fatigue Detection',
  description:
    'Catch declining ad performance before it burns budget. AdNexus AI monitors creative fatigue signals and drafts replacement suggestions while you still have time to act.',
  alternates: { canonical: '/features/creative-fatigue' },
};

const ITEMS = [
  { icon: <Eye size={22} style={{ color: '#818cf8' }} aria-hidden="true" />, title: 'Early Warning', desc: 'Detects fatigue signals — rising frequency, dropping CTR, climbing CPM — before they show up in ROAS.' },
  { icon: <TrendingDown size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Performance Baselines', desc: 'Each creative gets its own baseline. The agent knows when performance deviates from normal, not just from "good."' },
  { icon: <Zap size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Auto-Generated Suggestions', desc: 'Get draft recommendations for creative refreshes, headline variants, and audience pivots — ready to review.' },
  { icon: <Palette size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'Cross-Platform Tracking', desc: 'A creative that fatigues on Meta may still work on TikTok. The agent tracks per-platform performance separately.' },
  { icon: <BarChart2 size={22} style={{ color: '#818cf8' }} aria-hidden="true" />, title: 'Fatigue Score', desc: 'A simple 0-100 score for every creative, so you can spot trouble at a glance without digging into spreadsheets.' },
  { icon: <Clock size={22} style={{ color: '#10B981' }} aria-hidden="true" />, title: 'Timely Alerts', desc: 'Get notified when a creative crosses the fatigue threshold — typically 3-5 days before ROAS starts dropping.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Creative Fatigue"
        title={<>Catch tired creative <span className="text-gradient-indigo">early</span></>}
        subtitle="Stop wasting budget on fatigued ads. The agent monitors every creative and drafts refreshes before performance drops."
      />
      <Section eyebrow="A day in the life" title="The slow leak you don't see coming">
        <ScenarioBlock
          situation="Your winning Meta creative has been running for a week. It's still profitable on paper, so you leave it alone. But frequency is climbing, CTR is sliding, and CPMs are creeping up — the ad is quietly fatiguing, and the budget keeps flowing into it."
          outcome="AdNexus baselines each creative's first days and watches the slope. The moment fatigue crosses the line, it drafts an alert and a suggested refresh — before the dip shows up in your ROAS. You approve the swap and the leak is sealed."
        />
      </Section>
      <Section title="How fatigue detection works" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ITEMS.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
          ))}
        </div>
      </Section>
      <CtaBand title="Protect your creative performance" subtitle="Connect your accounts and start monitoring creative fatigue today." />
    </>
  );
}
