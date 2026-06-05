import type { Metadata } from 'next';
import { FileText, Clock, TrendingUp, Bell, BarChart2, Coffee } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand, ScenarioBlock } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Morning Brief',
  description:
    'Start every day with a clear, actionable summary of what changed overnight, what needs your attention, and what the AI recommends.',
  alternates: { canonical: '/features/morning-brief' },
};

const ITEMS = [
  { icon: <Clock size={20} />, title: 'Overnight Summary', desc: 'Every morning, a concise digest of performance changes, spend shifts, and anomaly alerts across all platforms.' },
  { icon: <TrendingUp size={20} />, title: 'Ranked Recommendations', desc: 'The AI sorts recommendations by impact, so you tackle the highest-value optimizations first.' },
  { icon: <Bell size={20} />, title: 'Smart Alerts', desc: 'Only get notified when something actually needs your attention — no noise, no false alarms.' },
  { icon: <BarChart2 size={20} />, title: 'Cross-Platform View', desc: 'See the full picture in one place instead of logging into four separate dashboards.' },
  { icon: <FileText size={20} />, title: 'Shareable Reports', desc: 'Export or share the brief with stakeholders, clients, or team members in one click.' },
  { icon: <Coffee size={20} />, title: 'Before Your Coffee', desc: 'Delivered to your inbox or Slack before you start your day — no login required to scan it.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Morning Brief"
        title={<>Your daily AI briefing</>}
        subtitle="Start every day knowing exactly what changed, what needs attention, and what to approve — before you finish your coffee."
      />
      <Section>
        <ScenarioBlock
          before={{
            title: 'Without Morning Brief',
            points: [
              'Log into four platforms every morning',
              'Manually compare performance changes',
              'Miss anomalies until they become problems',
              'Spend the first hour just catching up',
            ],
          }}
          after={{
            title: 'With Morning Brief',
            points: [
              'One digest with everything that changed',
              'AI-ranked recommendations by impact',
              'Anomalies flagged before they compound',
              'Approve drafts and move on in 10 minutes',
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
        title="Wake up to better campaigns"
        subtitle="Connect your accounts and get your first Morning Brief tomorrow."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
