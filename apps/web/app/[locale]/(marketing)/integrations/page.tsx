import type { Metadata } from 'next';
import { Cable, Slack, Bot } from 'lucide-react';
import { PageHero, Section, FeatureCard, FeatureGrid, CtaBand } from '@/components/marketing/sections';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Integrations',
  description:
    'AdNexus AI connects to Meta, Google, TikTok, and Snap ad platforms, plus MCP clients like Claude and ChatGPT, Slack alerts, and an API for custom workflows.',
  alternates: { canonical: '/integrations' },
};

const PLATFORMS = [
  { name: 'Meta Ads', color: 'bg-blue-500', detail: 'Facebook & Instagram — full write access' },
  { name: 'Google Ads', color: 'bg-red-500', detail: 'Search, Display, PMax, Demand Gen' },
  { name: 'TikTok Ads', color: 'bg-cyan-400', detail: 'Campaign, ad group, creative management' },
  { name: 'Snap Ads', color: 'bg-yellow-400', detail: 'Snap, Story & Collection Ads' },
];

const TOOLS = [
  { icon: <Bot size={20} />, title: 'MCP Clients', desc: 'Claude, ChatGPT, Cursor, and any MCP-compatible assistant connect natively.' },
  { icon: <Slack size={20} />, title: 'Slack', desc: 'Get alerts and approval requests where your team already works.' },
  { icon: <Cable size={20} />, title: 'API & Webhooks', desc: 'Build custom automations on top of AdNexus with our REST API and event webhooks.' },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Integrations"
        title={<>Connects to your stack</>}
        subtitle="AdNexus plugs into the platforms and tools you already use — no migration, no disruption."
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
          {TOOLS.map((t) => (
            <FeatureCard key={t.title} icon={t.icon} title={t.title} description={t.desc} />
          ))}
        </FeatureGrid>
      </Section>
      <CtaBand
        title="Need a custom integration?"
        subtitle="We are expanding our integration library. Let us know what you need."
        cta="Contact us"
        ctaHref="/contact"
      />
    </>
  );
}
