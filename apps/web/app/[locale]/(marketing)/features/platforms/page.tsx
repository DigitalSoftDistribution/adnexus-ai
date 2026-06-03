import type { Metadata } from 'next';
import { Globe, BarChart2, Layers, GitMerge } from 'lucide-react';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Cross-Platform',
  description:
    'Manage Meta, Google, TikTok, and Snap from one unified AdNexus dashboard — with cross-platform attribution, reporting, and budget coordination from a single brain.',
  alternates: { canonical: '/features/platforms' },
};

const PLATFORMS = [
  { name: 'Meta', color: '#1877F2', detail: 'Facebook & Instagram — full campaign, ad set, ad, and creative management.' },
  { name: 'Google', color: '#DB4437', detail: 'Search, Display, Performance Max, and Demand Gen with smart bidding insight.' },
  { name: 'TikTok', color: '#00F2EA', detail: 'Video-first metrics, creative testing, and Campaign Budget Optimization.' },
  { name: 'Snap', color: '#FFFC00', detail: 'Snap, Story, and Collection Ads with goal-based bidding and pixel tracking.' },
];

const BENEFITS = [
  { icon: <GitMerge size={22} style={{ color: '#2563EB' }} aria-hidden="true" />, title: 'Cross-Platform Attribution', desc: 'See the true contribution of each channel in one unified view instead of four siloed reports.' },
  { icon: <Layers size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />, title: 'One Brain, Not Four Tools', desc: 'The AI reasons across platforms — shifting budget to wherever it performs best this week.' },
  { icon: <BarChart2 size={22} style={{ color: '#34D399' }} aria-hidden="true" />, title: 'Unified Reporting', desc: 'Executive-ready dashboards that aggregate spend, ROAS, and conversions across all channels.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Cross-Platform"
        title={<>Four platforms. <span style={{ color: '#c3f53b' }}>One brain.</span></>}
        subtitle="Most tools optimize a single platform. AdNexus coordinates Meta, Google, TikTok, and Snap together."
      />
      <Section title="Every major platform, write-enabled">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="card-surface p-6 flex items-start gap-4">
              <span className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ background: p.color }} aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">{p.name}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Why cross-platform wins" alt>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BENEFITS.map((b) => (
            <FeatureCard key={b.title} icon={b.icon} title={b.title} desc={b.desc} />
          ))}
        </div>
      </Section>
      <CtaBand title="Unify your ad stack" subtitle="Connect all four platforms in minutes and see them in one place." />
    </>
  );
}
