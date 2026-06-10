import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, TrendingUp, BarChart3, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { JsonLd } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Free Marketing Tools',
  description:
    'Free calculators and tools for ad performance: ROAS calculator, CPA estimator, budget pacer, and creative fatigue tracker.',
  alternates: { canonical: '/tools' },
};

const TOOLS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'AdNexus AI Free Marketing Tools',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'ROAS Calculator',
      description: 'Calculate return on ad spend, CPA, CPC, CTR, and CVR with industry benchmarks.',
      url: 'https://adnexus.ai/tools/roas-calculator',
    },
  ],
};

const TOOLS = [
  {
    href: '/tools/roas-calculator',
    icon: <Calculator size={24} style={{ color: '#c3f53b' }} aria-hidden="true" />,
    title: 'ROAS Calculator',
    desc: 'Calculate return on ad spend, CPA, CPC, CTR, and CVR with industry benchmarks for Meta, Google, and TikTok.',
    tag: 'Free',
    tagColor: '#c3f53b',
  },
  {
    href: '#',
    icon: <TrendingUp size={24} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'CPA Estimator',
    desc: 'Estimate your target cost per acquisition based on conversion rate, average order value, and margin goals.',
    tag: 'Coming soon',
    tagColor: '#F59E0B',
  },
  {
    href: '#',
    icon: <BarChart3 size={24} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'Budget Pacer',
    desc: 'Plan daily spend allocation across campaigns and platforms to hit monthly targets without overspending.',
    tag: 'Coming soon',
    tagColor: '#F59E0B',
  },
  {
    href: '#',
    icon: <Clock size={24} style={{ color: '#EF4444' }} aria-hidden="true" />,
    title: 'Creative Fatigue Tracker',
    desc: 'Estimate when your creative will fatigue based on frequency, CTR trends, and historical performance.',
    tag: 'Coming soon',
    tagColor: '#F59E0B',
  },
];

export default function ToolsPage() {
  return (
    <>
      <JsonLd data={TOOLS_JSONLD} />
      <PageHero
        eyebrow="Tools"
        title={<>Free tools for <span style={{ color: '#c3f53b' }}>smarter ads</span></>}
        subtitle="Calculators, estimators, and planners to help you optimize campaigns before you spend a dollar."
      />

      <Section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {TOOLS.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="card-surface p-6 hover-lift block group relative"
              aria-disabled={tool.tag === 'Coming soon'}
              style={tool.tag === 'Coming soon' ? { opacity: 0.7 } : undefined}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  {tool.icon}
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: `${tool.tagColor}22`, color: tool.tagColor }}
                >
                  {tool.tag}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-1.5">
                {tool.title}
                {tool.tag !== 'Coming soon' && (
                  <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-tertiary)' }} />
                )}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>
      </Section>

      <Section alt>
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(195,245,59,0.1)', border: '1px solid rgba(195,245,59,0.2)' }}>
            <Sparkles size={20} style={{ color: '#c3f53b' }} />
          </div>
          <h2 className="font-space text-2xl font-semibold text-white mb-3">Want more tools?</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            We&apos;re building new calculators and planners every month.
            Sign up to get notified when new tools drop.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg"
            style={{ background: '#c3f53b', color: '#0a0a0a' }}
          >
            Get notified
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
