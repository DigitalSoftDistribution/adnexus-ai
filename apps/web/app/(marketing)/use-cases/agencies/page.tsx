import type { Metadata } from 'next';
import { Briefcase, Users, FileText, ShieldCheck, Layers, Clock } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand, ScenarioBlock, WorkflowSteps } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'AdNexus for Agencies',
  description:
    'AdNexus AI for agencies: manage many clients from one workspace with per-client scopes, multi-tier approvals, white-label reports, and flat pricing that never scales with spend.',
  alternates: { canonical: '/use-cases/agencies' },
};

const POINTS = [
  { icon: <Layers size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Many Clients, One Workspace', desc: 'Switch between client accounts instantly, with isolated scopes so nothing crosses wires.' },
  { icon: <ShieldCheck size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Approval Chains', desc: 'Junior buyers propose, account leads approve. Every client change is reviewed and logged.' },
  { icon: <FileText size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'White-Label Reports', desc: 'Send branded, client-ready reports on a schedule — without the manual export grind.' },
  { icon: <Clock size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Reclaim Hours Weekly', desc: 'The AI handles monitoring and first-draft optimizations so your team focuses on strategy.' },
  { icon: <Users size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Unlimited Seats', desc: 'On the Agency plan, bring your whole team — no per-seat surprises.' },
  { icon: <Briefcase size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'Flat Pricing', desc: 'Your bill does not balloon as client spend grows. Margins stay predictable.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="For Agencies"
        title={<>Run more accounts with <span style={{ color: '#c3f53b' }}>fewer fire drills</span></>}
        subtitle="The workspace, governance, and reporting agencies need to scale client work profitably."
      />
      <Section eyebrow="A day in the life" title="Monday morning, fifteen client accounts">
        <ScenarioBlock
          situation="It's 8am. You manage fifteen clients across Meta, Google, TikTok, and Snap. Over the weekend, two budgets overpaced, a TikTok creative fatigued, and one client's CPA crept past target. In the old world, you'd find out by logging into fifteen accounts."
          outcome="Instead, you open one brief. The agent already caught all four issues and drafted the fixes — a budget pull-back, a creative refresh, an audience tweak. You read the reasoning, approve three, edit one, and you're done before your coffee's cold. Every approval is logged for the client report."
        />
      </Section>

      <Section title="How it works for agencies" alt>
        <WorkflowSteps
          steps={[
            { title: 'Add clients as isolated workspaces', desc: 'Each client gets its own scope. Nothing crosses wires, and access is controlled per team member.' },
            { title: 'Set the approval chain', desc: 'Junior buyers propose, account leads sign off. The structure matches how your team already works.' },
            { title: 'Start the day with one brief', desc: 'The agent monitors every account overnight and ranks what needs attention across all clients.' },
            { title: 'Approve, then report', desc: 'Approve drafts in seconds. The audit trail doubles as a clean, client-ready record of every change.' },
          ]}
        />
      </Section>

      <Section title="Everything your team needs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POINTS.map((p) => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title} desc={p.desc} />
          ))}
        </div>
      </Section>
      <CtaBand title="Scale your agency without scaling headcount" primaryLabel="Talk to Sales" primaryHref="/contact" secondaryLabel="See pricing" secondaryHref="/pricing" />
    </>
  );
}
