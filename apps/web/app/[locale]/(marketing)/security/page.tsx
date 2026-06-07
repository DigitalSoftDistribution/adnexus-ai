import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, KeyRound, ShieldCheck, Eye, Server, FileText, ArrowRight, Clock, Award, ClipboardCheck } from 'lucide-react';
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

const CERTIFICATIONS = [
  {
    icon: <Award size={20} style={{ color: '#c3f53b' }} aria-hidden="true" />,
    title: 'SOC 2 Type II',
    status: 'In Progress',
    desc: 'Formal certification audit underway. Expected Q3 2026.',
  },
  {
    icon: <ShieldCheck size={20} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'GDPR Compliant',
    status: 'Active',
    desc: 'Data processing agreements, right to deletion, and EU data residency options.',
  },
  {
    icon: <Lock size={20} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'Penetration Tested',
    status: 'Active',
    desc: 'Annual third-party penetration testing with remediation tracking.',
  },
  {
    icon: <ClipboardCheck size={20} style={{ color: '#34D399' }} aria-hidden="true" />,
    title: 'Security Questionnaire',
    status: 'Available',
    desc: 'Complete security posture documentation available under NDA.',
  },
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

      {/* Trust badges / certifications */}
      <Section title="Trust & compliance" alt>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {CERTIFICATIONS.map((cert) => (
            <div key={cert.title} className="card-surface p-5 text-center">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                {cert.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{cert.title}</h3>
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2"
                style={{
                  background: cert.status === 'Active' ? 'rgba(16,185,129,0.15)' : cert.status === 'In Progress' ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.15)',
                  color: cert.status === 'Active' ? '#34D399' : cert.status === 'In Progress' ? '#F59E0B' : '#2563EB',
                }}
              >
                {cert.status}
              </span>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{cert.desc}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center mt-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Last security review: June 2026</span>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Need our security questionnaire, sub-processor list, or DPA?{' '}
            <Link href="/contact" className="font-medium" style={{ color: '#2563EB' }}>Contact us</Link>{' '}
            and we&apos;ll send it within one business day.
          </p>
        </div>
      </Section>

      <Section>
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
