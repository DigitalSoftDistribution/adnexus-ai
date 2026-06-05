import type { Metadata } from 'next';
import { BrainCircuit, Eye, Bell, FileText, Clock, Cable } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'AI Agent',
  description:
    'The AdNexus AI Agent monitors your campaigns 24/7, predicts problems before they happen, and drafts optimizations for your approval.',
  alternates: { canonical: '/features/ai-agent' },
};

const CAPABILITIES = [
  { icon: <Clock size={20} />, title: '24/7 Monitoring', desc: 'The agent watches every connected account around the clock, so issues surface in minutes, not at month-end.' },
  { icon: <BrainCircuit size={20} />, title: 'Predictive, Not Reactive', desc: 'Forecasts spend, ROAS, and creative fatigue before they hit — and proposes action while it still matters.' },
  { icon: <Eye size={20} />, title: 'Explains Its Reasoning', desc: 'Every draft comes with the why: the metric that triggered it and the expected impact of the change.' },
  { icon: <FileText size={20} />, title: 'Draft Generation', desc: 'Budget shifts, pauses, audience tweaks, and creative swaps arrive as ready-to-review drafts.' },
  { icon: <Bell size={20} />, title: 'Smart Alerts', desc: 'Anomaly detection flags pacing problems and performance drops the moment they appear.' },
  { icon: <Cable size={20} />, title: 'MCP-Native', desc: 'Query and direct the agent from Claude, ChatGPT, or Cursor through the Model Context Protocol.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="AI Agent"
        title={<>An analyst that never sleeps — and never goes rogue</>}
        subtitle="Autonomous monitoring with human-in-the-loop control. The agent does the analysis; you make the call."
      />
      <Section>
        <FeatureGrid>
          {CAPABILITIES.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.desc} />
          ))}
        </FeatureGrid>
      </Section>
      <CtaBand
        title="Put an AI analyst on every account"
        subtitle="Connect in two minutes and let the agent draft its first optimizations today."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
