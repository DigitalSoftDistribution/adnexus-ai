import type { ReactNode } from 'react';

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <section className="px-6 pt-28 sm:pt-36 pb-24 bg-background">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-foreground mb-2">{title}</h1>
        <p className="text-xs mb-8 text-muted-foreground">
          Effective: {updated}
        </p>
        <div className="space-y-6 text-[15px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </section>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-serif text-lg font-medium text-foreground mb-2">{heading}</h2>
      <div>{children}</div>
    </div>
  );
}
