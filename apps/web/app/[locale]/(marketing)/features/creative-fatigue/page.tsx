import type { Metadata } from 'next';
import { Palette, Eye, TrendingDown, Zap, BarChart2, Clock } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand, ScenarioBlock } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Creative Fatigue Detection',
  description:
    'Catch declining ad performance before it burns budget. AdNexus AI monitors creative fatigue signals and drafts replacement suggestions.',
  alternates: { canonical: '/features/creative-fatigue' },
};

const ITEMS = [
  { icon: <Eye size={20} />, title: 'Early Warning', desc: 'Detects fatigue signals — rising frequency, dropping CTR, climbing CPM — before they show up in ROAS.' },
  { icon: <TrendingDown size={20} />, title: 'Performance Baselines', desc: 'Each creative gets its own baseline. The agent knows when performance deviates from normal, not just from "good."' },
  { icon: <Zap size={20} />, title: 'Auto-Generated Suggestions', desc: 'Get draft recommendations for creative refreshes, headline variants, and audience pivots — ready to review.' },
  { icon: <Palette size={20} />, title: 'Cross-Platform Tracking', desc: 'A creative that fatigues on Meta may still work on TikTok. The agent tracks per-platform performance separately.' },
  { icon: <BarChart2 size={20} />, title: 'Fatigue Score', desc: 'A simple 0-100 score for every creative, so you can spot trouble at a glance without digging into spreadsheets.' },
  { icon: <Clock size={20} />, title: 'Timely Alerts', desc: 'Get notified when a creative crosses the fatigue threshold — typically 3-5 days before ROAS starts dropping.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Creative Fatigue"
        title={<>Catch tired creative early</>}
        subtitle="Stop wasting budget on fatigued ads. The agent monitors every creative and drafts refreshes before performance drops."
      />
      <Section>
        <ScenarioBlock
          before={{
            title: 'The slow leak',
            points: [
              'Winning creative runs for weeks unchecked',
              'Frequency climbs, CTR slides quietly',
              'Budget keeps flowing into declining ads',
              'ROAS drops before you notice',
            ],
          }}
          after={{
            title: 'The fix',
            points: [
              'Agent baselines every creative from day one',
              'Fatigue signals detected 3-5 days early',
              'Draft refresh ready for your approval',
              'Swap before ROAS is impacted',
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
        title="Protect your creative performance"
        subtitle="Connect your accounts and start monitoring creative fatigue today."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
