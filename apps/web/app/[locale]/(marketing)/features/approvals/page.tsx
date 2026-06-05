import type { Metadata } from 'next';
import { CheckCircle2, Edit3, ListChecks, ShieldCheck, Users, History } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Draft-First Approvals',
  description:
    'Nothing goes live without your approval. Every AI-generated change in AdNexus is staged as a draft you can review, edit, approve, or reject.',
  alternates: { canonical: '/features/approvals' },
};

const ITEMS = [
  { icon: <ListChecks size={20} />, title: 'Everything Is a Draft', desc: 'AI suggestions never touch live campaigns directly. They queue up for review first — always.' },
  { icon: <Edit3 size={20} />, title: 'Edit Before You Ship', desc: 'Tweak a budget number, narrow an audience, or adjust copy before approving. You stay in control of the details.' },
  { icon: <CheckCircle2 size={20} />, title: 'One-Click Approve', desc: 'Approve a single draft or batch-approve a set. Changes publish to the platform instantly.' },
  { icon: <Users size={20} />, title: 'Multi-Tier Workflows', desc: 'Junior reviewers suggest, senior approvers sign off. Perfect for agencies and structured teams.' },
  { icon: <History size={20} />, title: 'Full Audit Trail', desc: 'Who approved what, when, and why — every action logged for compliance and peace of mind.' },
  { icon: <ShieldCheck size={20} />, title: 'No Rogue Changes', desc: 'The architecture makes accidental or autonomous live edits impossible by design.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Draft-First Approvals"
        title={<>Nothing goes live without your approval</>}
        subtitle="The governance layer that lets you trust AI with your ad spend — because you sign off on every change."
      />
      <Section>
        <FeatureGrid>
          {ITEMS.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.desc} />
          ))}
        </FeatureGrid>
      </Section>
      <CtaBand
        title="Trust AI without losing control"
        subtitle="See draft-first approval in action on your own accounts."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
