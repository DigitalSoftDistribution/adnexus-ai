import type { ReactNode } from 'react';
import { Section } from './sections';
import { FadeIn } from './v3/animations';

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <Section className="pt-24">
      <FadeIn className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">
          {title}
        </h1>
        {updated && (
          <p className="text-sm text-muted-foreground mb-4">Last updated: {updated}</p>
        )}
        <div className="mb-8 rounded-xl border border-[#c3f53b]/20 bg-[#c3f53b]/10 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          This page contains standard SaaS legal template language for AdNexus AI and is provided for
          product-readiness purposes. It should be reviewed by qualified legal counsel before relying
          on it as a final legal agreement.
        </div>
        <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
          {children}
        </div>
      </FadeIn>
    </Section>
  );
}

export function LegalSection({ title, heading, children }: { title?: string; heading?: string; children: ReactNode }) {
  const displayTitle = title || heading || '';
  return (
    <div className="mt-8">
      <h2 className="font-display text-xl font-semibold text-foreground mb-3">{displayTitle}</h2>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
