import type { Metadata } from 'next';
import { Briefcase, Users, FileText, ShieldCheck, Layers, Clock } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';

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
