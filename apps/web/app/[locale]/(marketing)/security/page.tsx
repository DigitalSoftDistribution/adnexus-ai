import type { Metadata } from 'next';
import { Lock, KeyRound, ShieldCheck, Eye, Server, FileText } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How AdNexus AI protects your data: OAuth-based platform connections, encryption in transit and at rest, least-privilege access, audit logging, and draft-first safety by design.',
  alternates: { canonical: '/security' },
};

const CONTROLS = [
  { icon: <KeyRound size={20} />, title: 'OAuth, Never Passwords', desc: 'We connect to ad platforms via official OAuth. We never see or store your platform passwords.' },
  { icon: <Lock size={20} />, title: 'Encryption Everywhere', desc: 'All data is encrypted in transit (TLS) and at rest. Access tokens are stored encrypted.' },
  { icon: <ShieldCheck size={20} />, title: 'Draft-First by Design', desc: 'The architecture makes autonomous live changes impossible — a person approves every action.' },
  { icon: <Eye size={20} />, title: 'Audit Logging', desc: 'Every mutating action is recorded: who did what, when, and which campaign it touched.' },
  { icon: <Server size={20} />, title: 'Least-Privilege Access', desc: 'Role-based access control ensures team members only reach the accounts and actions they need.' },
  { icon: <FileText size={20} />, title: 'Data Processing Agreement', desc: 'A DPA is available for customers with regulatory or procurement requirements.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title={<>Your spend, your control, your data</>}
        subtitle="Security and governance are foundational to AdNexus — not an afterthought bolted on later."
      />
      <Section>
        <FeatureGrid>
          {CONTROLS.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.desc} />
          ))}
        </FeatureGrid>
      </Section>
      <CtaBand
        title="Security review?"
        subtitle="We are happy to walk through our architecture, answer questionnaires, or provide a DPA."
        cta="Contact us"
        ctaHref="/contact"
      />
    </>
  );
}
