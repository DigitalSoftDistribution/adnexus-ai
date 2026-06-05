import type { Metadata } from 'next';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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

const TAG_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> = {
  New: 'success',
  Improved: 'default',
  Fixed: 'outline',
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Changelog"
        title={<>What&apos;s new</>}
        subtitle="Product updates, new features, and improvements to AdNexus AI."
      />
      <Section>
        <div className="max-w-3xl mx-auto space-y-4">
          {ENTRIES.map((e) => (
            <Card key={e.title} className="border-border/60">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={TAG_VARIANT[e.tag] ?? 'secondary'}>{e.tag}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{e.date}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{e.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{e.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
      <CtaBand
        title="Ready to try the latest?"
        subtitle="Start your free trial and experience everything AdNexus has to offer."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
