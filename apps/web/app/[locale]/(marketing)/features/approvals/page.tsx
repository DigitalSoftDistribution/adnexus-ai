import type { Metadata } from 'next';
import { CircleCheck, PenLine, ListChecks, ShieldCheck, Users, History } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Draft-First Approvals',
  description:
    'Nothing goes live without your approval. Every AI-generated change in AdNexus is staged as a draft you can review, edit, approve, or reject — with a full audit trail.',
  alternates: { canonical: '/features/approvals' },
};

const ITEMS = [
  { icon: <ListChecks size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'Everything Is a Draft', desc: 'AI suggestions never touch live campaigns directly. They queue up for review first — always.' },
  { icon: <PenLine size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Edit Before You Ship', desc: 'Tweak a budget number, narrow an audience, or adjust copy before approving. You stay in control of the details.' },
  { icon: <CircleCheck size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'One-Click Approve', desc: 'Approve a single draft or batch-approve a set. Changes publish to the platform instantly.' },
  { icon: <Users size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Multi-Tier Workflows', desc: 'Junior reviewers suggest, senior approvers sign off. Perfect for agencies and structured teams.' },
  { icon: <History size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Full Audit Trail', desc: 'Who approved what, when, and why — every action logged for compliance and peace of mind.' },
  { icon: <ShieldCheck size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'No Rogue Changes', desc: 'The architecture makes accidental or autonomous live edits impossible by design.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Draft-First Approvals"
        title={<>Nothing goes live without <span style={{ color: '#c3f53b' }}>your</span> approval</>}
        subtitle="The governance layer that lets you trust AI with your ad spend — because you sign off on every change."
      />
      <Section title="Governance, built in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ITEMS.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
          ))}
        </div>
      </Section>
      <CtaBand title="Trust AI without losing control" subtitle="See draft-first approval in action on your own accounts." />
    </>
  );
}
