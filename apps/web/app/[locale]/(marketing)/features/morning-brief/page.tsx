import type { Metadata } from 'next';
import { FileText, Clock, TrendingUp, Bell, BarChart2, Coffee } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand, ScenarioBlock } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Morning Brief',
  description:
    'Start every day with a clear, actionable summary of what changed overnight, what needs your attention, and what the AI recommends — delivered before your first coffee.',
  alternates: { canonical: '/features/morning-brief' },
};

const ITEMS = [
  { icon: <Clock size={22} style={{ color: '#818cf8' }} aria-hidden="true" />, title: 'Overnight Summary', desc: 'Every morning, a concise digest of performance changes, spend shifts, and anomaly alerts across all platforms.' },
  { icon: <TrendingUp size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Ranked Recommendations', desc: 'The AI sorts recommendations by impact, so you tackle the highest-value optimizations first.' },
  { icon: <Bell size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Smart Alerts', desc: 'Only get notified when something actually needs your attention — no noise, no false alarms.' },
  { icon: <BarChart2 size={22} style={{ color: '#818cf8' }} aria-hidden="true" />, title: 'Cross-Platform View', desc: 'See the full picture in one place instead of logging into four separate dashboards.' },
  { icon: <FileText size={22} style={{ color: '#10B981' }} aria-hidden="true" />, title: 'Shareable Reports', desc: 'Export or share the brief with stakeholders, clients, or team members in one click.' },
  { icon: <Coffee size={22} style={{ color: '#818cf8' }} aria-hidden="true" />, title: 'Before Your Coffee', desc: 'Delivered to your inbox or Slack before you start your day — no login required to scan it.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Morning Brief"
        title={<>Your daily AI <span className="text-gradient-indigo">briefing</span></>}
        subtitle="Start every day knowing exactly what changed, what needs attention, and what to approve — before you finish your coffee."
      />
      <Section eyebrow="A day in the life" title="Monday morning, four platforms">
        <ScenarioBlock
          situation="It's 8am. You manage campaigns across Meta, Google, TikTok, and Snap. Over the weekend, two budgets overpaced, a TikTok creative fatigued, and one campaign's CPA crept past target. In the old world, you'd find out by logging into four accounts."
          outcome="Instead, you open one brief. The agent already caught all four issues and drafted the fixes — a budget pull-back, a creative refresh, an audience tweak. You read the reasoning, approve three, edit one, and you're done before your coffee's cold."
        />
      </Section>
      <Section title="What's inside the brief" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ITEMS.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
          ))}
        </div>
      </Section>
      <CtaBand title="Wake up to better campaigns" subtitle="Connect your accounts and get your first Morning Brief tomorrow." />
    </>
  );
}
