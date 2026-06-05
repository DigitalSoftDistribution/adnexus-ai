import type { Metadata } from 'next';
import { Briefcase, Users, FileText, ShieldCheck, Layers, Clock } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand, ScenarioBlock, WorkflowSteps } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'AdNexus for Agencies',
  description:
    'AdNexus AI for agencies: manage many clients from one workspace with per-client scopes, multi-tier approvals, white-label reports, and flat pricing.',
  alternates: { canonical: '/use-cases/agencies' },
};

const POINTS = [
  { icon: <Layers size={20} />, title: 'Many Clients, One Workspace', desc: 'Switch between client accounts instantly, with isolated scopes so nothing crosses wires.' },
  { icon: <ShieldCheck size={20} />, title: 'Approval Chains', desc: 'Junior buyers propose, account leads approve. Every client change is reviewed and logged.' },
  { icon: <FileText size={20} />, title: 'White-Label Reports', desc: 'Send branded, client-ready reports on a schedule — without the manual export grind.' },
  { icon: <Clock size={20} />, title: 'Reclaim Hours Weekly', desc: 'The AI handles monitoring and first-draft optimizations so your team focuses on strategy.' },
  { icon: <Users size={20} />, title: 'Unlimited Seats', desc: 'On the Agency plan, bring your whole team — no per-seat surprises.' },
  { icon: <Briefcase size={20} />, title: 'Flat Pricing', desc: 'Your bill does not balloon as client spend grows. Margins stay predictable.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="For Agencies"
        title={<>Run more accounts with fewer fire drills</>}
        subtitle="The workspace, governance, and reporting agencies need to scale client work profitably."
      />
      <Section>
        <ScenarioBlock
          before={{
            title: 'Monday morning, fifteen clients',
            points: [
              'Log into fifteen accounts across four platforms',
              'Two budgets overpaced over the weekend',
              'Creative fatigued on a key campaign',
              'CPA crept past target — unnoticed',
            ],
          }}
          after={{
            title: 'With AdNexus',
            points: [
              'One brief covers all fifteen accounts',
              'Agent caught issues and drafted fixes',
              'Approve three, edit one, done in minutes',
              'Every action logged for client reports',
            ],
          }}
        />
      </Section>
      <Section className="bg-card">
        <WorkflowSteps
          steps={[
            { number: '1', title: 'Add clients as isolated workspaces', description: 'Each client gets its own scope. Nothing crosses wires, and access is controlled per team member.' },
            { number: '2', title: 'Set the approval chain', description: 'Junior buyers propose, account leads sign off. The structure matches how your team already works.' },
            { number: '3', title: 'Start the day with one brief', description: 'The agent monitors every account overnight and ranks what needs attention across all clients.' },
            { number: '4', title: 'Approve, then report', description: 'Approve drafts in seconds. The audit trail doubles as a clean, client-ready record of every change.' },
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
        title="Scale your agency without scaling headcount"
        subtitle="See how AdNexus handles multi-client workflows."
        cta="Talk to Sales"
        ctaHref="/contact"
        secondaryCta="See pricing"
        secondaryCtaHref="/pricing"
      />
    </>
  );
}
