import type { Metadata } from 'next';
import { Lock, KeyRound, ShieldCheck, Eye, Server, FileText } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How AdNexus AI protects your data: OAuth-based platform connections, encryption in transit and at rest, least-privilege access, audit logging, and draft-first safety by design.',
  alternates: { canonical: '/security' },
};

const CONTROLS = [
  { icon: <KeyRound size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'OAuth, Never Passwords', desc: 'We connect to ad platforms via official OAuth. We never see or store your platform passwords.' },
  { icon: <Lock size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Encryption Everywhere', desc: 'All data is encrypted in transit (TLS) and at rest. Access tokens are stored encrypted.' },
  { icon: <ShieldCheck size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Draft-First by Design', desc: 'The architecture makes autonomous live changes impossible — a person approves every action.' },
  { icon: <Eye size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'Audit Logging', desc: 'Every mutating action is recorded: who did what, when, and which campaign it touched.' },
  { icon: <Server size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />, title: 'Least-Privilege Access', desc: 'Role-based access control ensures team members only reach the accounts and actions they need.' },
  { icon: <FileText size={22} style={{ color: '#EF4444' }} aria-hidden="true" />, title: 'Data Processing Agreement', desc: 'A DPA is available for customers with regulatory or procurement requirements.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title={<>Your spend, <span style={{ color: '#c3f53b' }}>your control</span>, your data</>}
        subtitle="Security and governance are foundational to AdNexus — not an afterthought bolted on later."
      />

      <Section title="How we protect your accounts">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONTROLS.map((c) => (
            <FeatureCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
          ))}
        </div>
      </Section>

      <Section alt>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-space text-2xl font-semibold text-white mb-3">Compliance</h2>
          <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
            AdNexus is built to SOC 2 control principles, and our formal certification is in progress.
            We&apos;re happy to share our current security posture, sub-processor list, and DPA with
            prospective customers under NDA.
          </p>
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            Have a specific requirement? Reach out and we&apos;ll route you to the right details.
          </p>
        </div>
      </Section>

      <CtaBand title="Questions about security?" subtitle="Our team is glad to walk through our controls and documentation." primaryLabel="Contact us" primaryHref="/contact" secondaryLabel="Read the FAQ" secondaryHref="/faq" />
    </>
  );
}
