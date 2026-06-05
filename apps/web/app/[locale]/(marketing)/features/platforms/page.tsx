import type { Metadata } from 'next';
import { Globe, BarChart2, Layers, GitMerge } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Cross-Platform',
  description:
    'Manage Meta, Google, TikTok, and Snap from one unified AdNexus dashboard — with cross-platform attribution, reporting, and budget coordination.',
  alternates: { canonical: '/features/platforms' },
};

const PLATFORMS = [
  { name: 'Meta', color: 'bg-blue-500', detail: 'Facebook & Instagram — full campaign, ad set, ad, and creative management.' },
  { name: 'Google', color: 'bg-red-500', detail: 'Search, Display, Performance Max, and Demand Gen with smart bidding insight.' },
  { name: 'TikTok', color: 'bg-cyan-400', detail: 'Video-first metrics, creative testing, and Campaign Budget Optimization.' },
  { name: 'Snap', color: 'bg-yellow-400', detail: 'Snap, Story, and Collection Ads with goal-based bidding and pixel tracking.' },
];

const BENEFITS = [
  { icon: <GitMerge size={20} />, title: 'Cross-Platform Attribution', desc: 'See the true contribution of each channel in one unified view instead of four siloed reports.' },
  { icon: <Layers size={20} />, title: 'One Brain, Not Four Tools', desc: 'The AI reasons across platforms — shifting budget to wherever it performs best this week.' },
  { icon: <BarChart2 size={20} />, title: 'Unified Reporting', desc: 'Executive-ready dashboards that aggregate spend, ROAS, and conversions across all channels.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Cross-Platform"
        title={<>Four platforms. One brain.</>}
        subtitle="Most tools optimize a single platform. AdNexus coordinates Meta, Google, TikTok, and Snap together."
      />
      <Section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLATFORMS.map((p) => (
            <Card key={p.name} className="border-border/60">
              <CardContent className="pt-6 flex items-start gap-4">
                <span className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${p.color}`} aria-hidden="true" />
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{p.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
      <Section className="bg-card">
        <FeatureGrid className="md:grid-cols-3">
          {BENEFITS.map((b) => (
            <FeatureCard key={b.title} icon={b.icon} title={b.title} description={b.desc} />
          ))}
        </FeatureGrid>
      </Section>
      <CtaBand
        title="Unify your ad stack"
        subtitle="Connect all four platforms in minutes and see them in one place."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
