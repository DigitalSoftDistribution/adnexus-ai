import type { Metadata } from 'next';
import { Building2, Zap, ShieldCheck, FileText, Users, ChartNoAxesColumn } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand, ScenarioBlock, WorkflowSteps } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'AdNexus for In-house Teams',
  description:
    'AdNexus AI for in-house marketing teams: move faster with AI-drafted optimizations and guardrails — ship daily improvements without losing oversight.',
  alternates: { canonical: '/use-cases/in-house' },
};

const POINTS = [
  { icon: <Zap size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Ship Daily', desc: 'The AI surfaces optimizations every morning so small wins compound instead of waiting for the monthly review.' },
  { icon: <ShieldCheck size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Guardrails by Default', desc: 'Draft-first approval means a lean team can move fast without risking a costly mistake.' },
  { icon: <ChartNoAxesColumn size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Exec-Ready Reporting', desc: 'Unified dashboards turn four platforms into one clear story for leadership.' },
  { icon: <FileText size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Morning Brief', desc: 'Everyone starts the day aligned on what changed and what needs a decision.' },
  { icon: <Users size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Right-Sized Collaboration', desc: 'Roles and approvals scale from a team of one to a full department.' },
  { icon: <Building2 size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'Predictable Cost', desc: 'Flat pricing keeps your tooling budget steady as spend grows.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="For In-house Teams"
        title={<>Move fast — <span style={{ color: '#c3f53b' }}>with a safety net</span></>}
        subtitle="Give a small team the leverage of a full optimization desk, without the risk of autonomous changes."
      />
      <Section eyebrow="A day in the life" title="A team of two, the output of ten">
        <ScenarioBlock
          situation="You're a two-person growth team running the whole paid program. There's never enough time to check every campaign daily, so optimizations slip to the monthly review — and small problems compound for weeks before anyone catches them."
          outcome="AdNexus closes that gap. The agent reviews everything overnight and hands you a short list each morning. You ship small wins daily instead of monthly, and because every change is a draft you approve, a lean team moves fast without fear of a costly mistake."
        />
      </Section>

      <Section title="How it works for in-house teams" alt>
        <WorkflowSteps
          steps={[
            { title: 'Connect and set guardrails', desc: 'Link your accounts and define who can approve what. Draft-first means nothing ships unreviewed.' },
            { title: 'Read the morning brief', desc: 'Start aligned: one ranked list of what changed and what needs a decision today.' },
            { title: 'Ship daily, not monthly', desc: 'Approve the clear wins in seconds so small improvements compound instead of waiting for the review cycle.' },
            { title: 'Report up with confidence', desc: 'Unified dashboards turn four platforms into one clear story for leadership.' },
          ]}
        />
      </Section>

      <Section title="How in-house teams win with AdNexus">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POINTS.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title} desc={p.desc} />
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
