import type { Metadata } from 'next';
import { motion } from 'framer-motion';
import { BrainCircuit, Eye, Bell, FileText, Clock, Cable, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'AI Agent',
  description:
    'The AdNexus AI Agent monitors your campaigns 24/7, predicts problems before they happen, and drafts optimizations for your approval — it never publishes on its own.',
  alternates: { canonical: '/features/ai-agent' },
};

const CAPABILITIES = [
  { icon: <Clock size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: '24/7 Monitoring', desc: 'The agent watches every connected account around the clock, so issues surface in minutes, not at month-end.' },
  { icon: <BrainCircuit size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Predictive, Not Reactive', desc: 'Forecasts spend, ROAS, and creative fatigue before they hit — and proposes action while it still matters.' },
  { icon: <Eye size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Explains Its Reasoning', desc: 'Every draft comes with the why: the metric that triggered it and the expected impact of the change.' },
  { icon: <FileText size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Draft Generation', desc: 'Budget shifts, pauses, audience tweaks, and creative swaps arrive as ready-to-review drafts.' },
  { icon: <Bell size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'Smart Alerts', desc: 'Anomaly detection flags pacing problems and performance drops the moment they appear.' },
  { icon: <Cable size={22} style={{ color: '#8B5CF6' }} aria-hidden="true" />, title: 'MCP-Native', desc: 'Query and direct the agent from Claude, ChatGPT, or Cursor through the Model Context Protocol.' },
];

const AGENT_FLOW = [
  { step: 'Monitor', desc: 'Watches KPIs across all connected platforms 24/7', icon: <Eye size={14} /> },
  { step: 'Detect', desc: 'Identifies anomalies, fatigue, and optimization opportunities', icon: <AlertTriangle size={14} /> },
  { step: 'Draft', desc: 'Generates a detailed proposal with reasoning and expected impact', icon: <FileText size={14} /> },
  { step: 'Notify', desc: 'Surfaces the draft in your inbox and morning brief', icon: <Bell size={14} /> },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="AI Agent"
        title={<>An analyst that never sleeps — and never goes <span style={{ color: '#c3f53b' }}>rogue</span></>}
        subtitle="Autonomous monitoring with human-in-the-loop control. The agent does the analysis; you make the call."
      />

      {/* Agent flow visualization */}
      <Section eyebrow="How it works" title="Monitor → Detect → Draft → Notify">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {AGENT_FLOW.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="card-surface p-5 text-center relative"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}>
                  {item.icon}
                </div>
                <div className="text-sm font-semibold text-white mb-1">{item.step}</div>
                <div className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</div>
                {i < AGENT_FLOW.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-px" style={{ background: 'var(--border-subtle)' }} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="What the agent does for you">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAPABILITIES.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
          ))}
        </div>
      </Section>

      {/* MCP highlight */}
      <Section eyebrow="MCP Integration" title="Works with your favorite AI tools" alt>
        <div className="max-w-3xl mx-auto card-surface p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}>
              <Cable size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Model Context Protocol</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                AdNexus exposes a native MCP server. Ask Claude, ChatGPT, or Cursor to check campaign status, 
                generate reports, or draft optimizations — all through natural language.
              </p>
            </div>
          </div>
          <div className="rounded-lg p-4 font-mono-data text-[11px] leading-relaxed overflow-x-auto" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#c3f53b' }}>$</span> claude mcp adnexus status --campaigns<br />
            <span style={{ color: 'var(--text-tertiary)' }}># ROAS: 4.2x | Spend: $24.8K | 3 drafts awaiting approval</span>
          </div>
        </div>
      </Section>

      <CtaBand title="Put an AI analyst on every account" subtitle="Connect in two minutes and let the agent draft its first optimizations today." />
    </>
  );
}
