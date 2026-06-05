import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bot, CheckCircle2, Globe, FileText, Palette, Eye, Wallet, BarChart2,
  Cable, BrainCircuit, Shield, Bell, ArrowRight,
} from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { JsonLd, SOFTWARE_APPLICATION_JSONLD } from '@/components/marketing/JsonLd';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Everything AdNexus AI does: an autonomous AI agent, draft-first approvals, cross-platform reporting, creative fatigue detection, budget pacing, and MCP-native integration.',
  alternates: { canonical: '/features' },
};

const PILLARS = [
  {
    href: '/features/ai-agent',
    icon: <Bot size={20} />,
    title: 'AI Agent',
    desc: 'Autonomous 24/7 monitoring that proactively spots issues and drafts optimizations — it never auto-publishes.',
  },
  {
    href: '/features/approvals',
    icon: <CheckCircle2 size={20} />,
    title: 'Draft-First Approvals',
    desc: 'Every AI change is staged as a draft. Review, edit, approve, or reject — with a full audit trail.',
  },
  {
    href: '/features/platforms',
    icon: <Globe size={20} />,
    title: 'Cross-Platform',
    desc: 'Meta, Google, TikTok, and Snap in one unified dashboard — one brain, zero fragmentation.',
  },
];

const FEATURES = [
  { icon: <FileText size={20} />, title: 'Morning Brief', desc: 'A daily summary of what changed, what needs attention, and what the AI recommends.' },
  { icon: <Palette size={20} />, title: 'Creative Fatigue Detection', desc: 'Catch declining ad performance early and get replacement suggestions before budget is wasted.' },
  { icon: <Eye size={20} />, title: 'Competitive Intelligence', desc: 'Track competitor ad activity, spend patterns, and creative strategies across platforms.' },
  { icon: <Wallet size={20} />, title: 'Budget Pacing', desc: 'Smart allocation across campaigns and platforms to maximize ROAS through the whole month.' },
  { icon: <BarChart2 size={20} />, title: 'Cross-Platform Reporting', desc: 'Unified dashboards aggregating performance across all four platforms in real time.' },
  { icon: <Cable size={20} />, title: 'MCP Integration', desc: 'Native MCP server. Works with Claude, ChatGPT, Cursor, and any MCP-compatible client.' },
  { icon: <BrainCircuit size={20} />, title: 'Predictive Analytics', desc: 'Forecast spend, ROAS, and creative fatigue before they happen — not after.' },
  { icon: <Bell size={20} />, title: 'Smart Alerts', desc: 'Anomaly detection for budget pacing, performance drops, and account issues.' },
  { icon: <Shield size={20} />, title: 'Approval Workflows', desc: 'Multi-tier approval chains — juniors suggest, seniors approve, everything is logged.' },
];

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={SOFTWARE_APPLICATION_JSONLD} />
      <PageHero
        eyebrow="Features"
        title={<>Everything you need to run smarter campaigns</>}
        subtitle="Open the dashboard, read the morning brief, approve a few drafts, and your day's optimization is done."
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <Link key={p.href} href={p.href} className="block group">
              <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                    {p.icon}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                    {p.title}
                    <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="bg-card">
        <FeatureGrid>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.desc} />
          ))}
        </FeatureGrid>
      </Section>

      <CtaBand
        title="Ready to run smarter campaigns?"
        subtitle="Start your free trial and see the full feature set in action."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
