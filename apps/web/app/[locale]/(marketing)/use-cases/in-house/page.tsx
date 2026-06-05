import type { Metadata } from 'next';
import { Building2, Zap, ShieldCheck, FileText, Users, BarChart2 } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand, ScenarioBlock, WorkflowSteps } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'AdNexus for In-house Teams',
  description:
    'AdNexus AI for in-house marketing teams: move faster with AI-drafted optimizations and guardrails.',
  alternates: { canonical: '/use-cases/in-house' },
};

const POINTS = [
  { icon: <Zap size={20} />, title: 'Ship Daily', desc: 'The AI surfaces optimizations every morning so small wins compound instead of waiting for the monthly review.' },
  { icon: <ShieldCheck size={20} />, title: 'Guardrails by Default', desc: 'Draft-first approval means a lean team can move fast without risking a costly mistake.' },
  { icon: <BarChart2 size={20} />, title: 'Exec-Ready Reporting', desc: 'Unified dashboards turn four platforms into one clear story for leadership.' },
  { icon: <FileText size={20} />, title: 'Morning Brief', desc: 'Everyone starts the day aligned on what changed and what needs a decision.' },
  { icon: <Users size={20} />, title: 'Right-Sized Collaboration', desc: 'Roles and approvals scale from a team of one to a full department.' },
  { icon: <Building2 size={20} />, title: 'Predictable Cost', desc: 'Flat pricing keeps your tooling budget steady as spend grows.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="For In-house Teams"
        title={<>Move fast — with a safety net</>}
        subtitle="Give a small team the leverage of a full optimization desk, without the risk of autonomous changes."
      />
      <Section>
        <ScenarioBlock
          before={{
            title: 'A team of two, the workload of ten',
            points: [
              'Four platforms to monitor daily',
              'Reports take half a day to compile',
              'Optimizations wait for monthly reviews',
              'One mistake can cost thousands',
            ],
          }}
          after={{
            title: 'With AdNexus',
            points: [
              'One dashboard for all four platforms',
              'Morning brief arrives before you start',
              'Draft optimizations ready to approve',
              'Every change logged and reversible',
            ],
          }}
        />
      </Section>
      <Section className="bg-card">
        <WorkflowSteps
          steps={[
            { number: '1', title: 'Connect your platforms', description: 'Meta, Google, TikTok, and Snap — linked in minutes via secure OAuth.' },
            { number: '2', title: 'Set your guardrails', description: 'Define budgets, ROAS targets, and approval rules. The agent stays within your limits.' },
            { number: '3', title: 'Review the morning brief', description: 'Every day starts with a ranked list of what needs attention and why.' },
            { number: '4', title: 'Approve and move on', description: 'Batch-approve drafts in seconds. The audit trail keeps everyone aligned.' },
          ]}
        />
      </Section>
      <Section>
        <FeatureGrid>
          {POINTS.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title} description={p.desc} />
          ))}
        </FeatureGrid>
      </Section>
      <CtaBand
        title="Give your team superpowers"
        subtitle="Start your free trial and see how much a small team can accomplish."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
