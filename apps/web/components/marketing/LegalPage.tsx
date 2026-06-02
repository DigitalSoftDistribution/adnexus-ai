import type { ReactNode } from 'react';

/** Shared shell for legal pages. */
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
    <section className="px-6 pt-24 sm:pt-32 pb-24" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-space text-3xl sm:text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>
          Effective: {updated}
        </p>

        <div className="space-y-6 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-space text-lg font-semibold text-white mb-2">{heading}</h2>
      <div>{children}</div>
    </div>
  );
}
