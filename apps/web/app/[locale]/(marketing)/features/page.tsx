import type { Metadata } from 'next';
import { Bot, CheckCircle2, Globe, FileText, Palette, Eye, Wallet, BarChart2, Cable, BrainCircuit, Shield, Bell, ArrowRight } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';
import { JsonLd, SOFTWARE_APPLICATION_JSONLD } from '@/components/marketing/JsonLd';
import { FeatureMatrix } from '@/components/marketing/v4/FeatureMatrix';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Everything AdNexus AI does: an autonomous AI agent, draft-first approvals, cross-platform reporting, creative fatigue detection, budget pacing, and MCP-native integration.',
  alternates: { canonical: '/features' },
};

const FEATURES = [
  { icon: <FileText size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Morning Brief', desc: 'A daily summary of what changed, what needs attention, and what the AI recommends.' },
  { icon: <Palette size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'Creative Fatigue Detection', desc: 'Catch declining ad performance early and get replacement suggestions before budget is wasted.' },
  { icon: <Eye size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Competitive Intelligence', desc: 'Track competitor ad activity, spend patterns, and creative strategies across platforms.' },
  { icon: <Wallet size={22} style={{ color: '#10B981' }} aria-hidden="true" />, title: 'Budget Pacing', desc: 'Smart allocation across campaigns and platforms to maximize ROAS through the whole month.' },
  { icon: <BarChart2 size={22} style={{ color: '#3B82F6' }} aria-hidden="true" />, title: 'Cross-Platform Reporting', desc: 'Unified dashboards aggregating performance across all four platforms in real time.' },
  { icon: <Cable size={22} style={{ color: '#8B5CF6' }} aria-hidden="true" />, title: 'MCP Integration', desc: 'Native MCP server. Works with Claude, ChatGPT, Cursor, and any MCP-compatible client.' },
  { icon: <BrainCircuit size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Predictive Analytics', desc: 'Forecast spend, ROAS, and creative fatigue before they happen — not after.' },
  { icon: <Bell size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Smart Alerts', desc: 'Anomaly detection for budget pacing, performance drops, and account issues.' },
  { icon: <Shield size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Approval Workflows', desc: 'Multi-tier approval chains — juniors suggest, seniors approve, everything is logged.' },
];

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={SOFTWARE_APPLICATION_JSONLD} />
      <PageHero
        eyebrow="Features"
        title={<>Everything you need to run <span style={{ color: '#c3f53b' }}>smarter campaigns</span></>}
        subtitle="Open the dashboard, read the morning brief, approve a few drafts, and your day's optimization is done."
      />

      <FeatureMatrix />

      <Section eyebrow="The Toolkit" title="Built for performance teams" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
