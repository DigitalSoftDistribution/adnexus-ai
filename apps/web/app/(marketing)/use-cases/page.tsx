import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, ShoppingCart, Building2, ArrowRight } from 'lucide-react';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Use Cases',
  description:
    'How agencies, e-commerce brands, and in-house teams use AdNexus AI to manage ad spend with AI-native automation and draft-first governance.',
  alternates: { canonical: '/use-cases' },
};

const CASES = [
  {
    href: '/use-cases/agencies',
    icon: <Briefcase size={24} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'For Agencies',
    desc: 'Manage dozens of clients from one workspace with per-client scopes, approval chains, and white-label reports.',
  },
  {
    href: '/use-cases/ecommerce',
    icon: <ShoppingCart size={24} style={{ color: '#34D399' }} aria-hidden="true" />,
    title: 'For E-commerce',
    desc: 'Protect ROAS across the funnel with creative-fatigue detection, budget pacing, and cross-platform attribution.',
  },
  {
    href: '/use-cases/in-house',
    icon: <Building2 size={24} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'For In-house Teams',
    desc: 'Move faster with AI drafts and guardrails — ship optimizations daily without losing oversight.',
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Use Cases"
        title={<>Built for the way <span style={{ color: '#c3f53b' }}>you</span> run ads</>}
        subtitle="Whether you manage many clients, one big store, or an internal team, AdNexus adapts to your workflow."
      />
      <Section title="Find your fit">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CASES.map((c) => (
            <Link key={c.href} href={c.href} className="card-surface p-6 hover-lift block">
              <div className="mb-3">{c.icon}</div>
              <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-1.5">
                {c.title}
                <ArrowRight size={14} aria-hidden="true" style={{ color: 'var(--text-tertiary)' }} />
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.desc}</p>
            </Link>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
