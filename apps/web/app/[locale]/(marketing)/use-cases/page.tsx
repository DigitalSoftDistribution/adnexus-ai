import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, ShoppingCart, Building2, ArrowRight } from 'lucide-react';
import { PageHero, Section, CtaBand } from '@/components/marketing/sections';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Use Cases',
  description:
    'How agencies, e-commerce brands, and in-house teams use AdNexus AI to manage ad spend with AI-native automation and draft-first governance.',
  alternates: { canonical: '/use-cases' },
};

const CASES = [
  {
    href: '/use-cases/agencies',
    icon: <Briefcase size={20} />,
    title: 'For Agencies',
    desc: 'Manage dozens of clients from one workspace with per-client scopes, approval chains, and white-label reports.',
  },
  {
    href: '/use-cases/ecommerce',
    icon: <ShoppingCart size={20} />,
    title: 'For E-commerce',
    desc: 'Protect ROAS across the funnel with creative-fatigue detection, budget pacing, and cross-platform attribution.',
  },
  {
    href: '/use-cases/in-house',
    icon: <Building2 size={20} />,
    title: 'For In-house Teams',
    desc: 'Move faster with AI drafts and guardrails — ship optimizations daily without losing oversight.',
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Use Cases"
        title={<>Built for the way you run ads</>}
        subtitle="Whether you manage many clients, one big store, or an internal team, AdNexus adapts to your workflow."
      />
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CASES.map((c) => (
            <Link key={c.href} href={c.href} className="block group">
              <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                    {c.icon}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                    {c.title}
                    <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
      <CtaBand
        title="Find your fit"
        subtitle="See how AdNexus works for your specific use case."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
      />
    </>
  );
}
