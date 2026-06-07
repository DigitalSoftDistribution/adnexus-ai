import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SecurityArchitecture, ComplianceTimeline } from '@/components/marketing/v4';
import { Section } from '@/components/marketing/sections';
import { Shield, Lock, Eye, Server, FileCheck, KeyRound } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Security — AdNexus AI',
    description: 'Enterprise-grade security. OAuth, encryption, draft-first, audit logging, and compliance.',
    openGraph: { title: 'Security — AdNexus AI', description: 'Enterprise-grade security. OAuth, encryption, draft-first, audit logging, and compliance.' },
  };
}

const BADGES = [
  { icon: <Lock size={18} />, label: 'AES-256', desc: 'Encryption at rest' },
  { icon: <KeyRound size={18} />, label: 'OAuth 2.0', desc: 'No passwords stored' },
  { icon: <Eye size={18} />, label: 'Audit Log', desc: 'Every action tracked' },
  { icon: <Server size={18} />, label: 'RBAC', desc: 'Role-based access' },
  { icon: <FileCheck size={18} />, label: 'GDPR', desc: 'EU compliant' },
  { icon: <Shield size={18} />, label: 'Draft-First', desc: 'No auto-publish' },
];

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <section className="pt-28 pb-12 px-4 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#c3f53b' }}>Trust & Safety</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">Security built in, not bolted on</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Every layer of AdNexus is designed with security as a first-class concern — from OAuth connections to draft-first approval.
        </p>
      </section>

      <section className="pb-16 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {BADGES.map((b) => (
            <div key={b.label} className="card-surface p-4 text-center">
              <div className="flex justify-center mb-2" style={{ color: '#c3f53b' }}>{b.icon}</div>
              <div className="text-xs font-semibold text-white">{b.label}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <Section title="Security architecture" subtitle="Five layers of protection from connection to campaign">
        <SecurityArchitecture />
      </Section>

      <Section title="Compliance roadmap" subtitle="Certifications in progress and planned">
        <ComplianceTimeline />
      </Section>
    </main>
  );
}
