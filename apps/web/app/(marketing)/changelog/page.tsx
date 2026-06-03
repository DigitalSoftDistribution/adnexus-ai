import type { Metadata } from 'next';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Changelog',
  description: "What's new in AdNexus AI — product updates, new features, and improvements.",
  alternates: { canonical: '/changelog' },
};

const ENTRIES = [
  {
    date: '2026-06',
    tag: 'New',
    title: 'Public marketing site & unified navigation',
    body: 'A brand-new public site with features, use cases, comparisons, security, and pricing — all served from the production app.',
  },
  {
    date: '2026-05',
    tag: 'Improved',
    title: 'Cross-platform attribution',
    body: 'Unified attribution now spans Meta, Google, TikTok, and Snap so you can see each channel\u2019s true contribution in one view.',
  },
  {
    date: '2026-05',
    tag: 'New',
    title: 'Creative fatigue detection',
    body: 'The AI now flags fatiguing creative early and suggests replacements before performance drops.',
  },
  {
    date: '2026-04',
    tag: 'New',
    title: 'MCP-native agent',
    body: 'Connect AdNexus to Claude, ChatGPT, and Cursor through the Model Context Protocol.',
  },
];

const TAG_COLOR: Record<string, string> = {
  New: '#c3f53b',
  Improved: '#2563EB',
  Fixed: '#A78BFA',
};

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Changelog" title={<>What&apos;s <span style={{ color: '#c3f53b' }}>new</span></>} subtitle="Product updates, new features, and improvements to AdNexus AI." />
      <Section>
        <div className="max-w-3xl mx-auto space-y-4">
          {ENTRIES.map((e) => (
            <div key={e.title} className="card-surface p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: `${TAG_COLOR[e.tag] ?? '#888'}22`, color: TAG_COLOR[e.tag] ?? '#888' }}>{e.tag}</span>
                <span className="font-mono-data text-xs" style={{ color: 'var(--text-tertiary)' }}>{e.date}</span>
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">{e.title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{e.body}</p>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
