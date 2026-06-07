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
        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Effective: {updated}
        </p>
        <div
          className="mb-8 rounded-xl px-4 py-3 text-xs leading-relaxed"
          style={{
            background: 'rgba(195, 245, 59, 0.08)',
            border: '1px solid rgba(195, 245, 59, 0.18)',
            color: 'var(--text-secondary)',
          }}
        >
          This page contains standard SaaS legal template language for AdNexus AI and is provided for
          product-readiness purposes. It should be reviewed by qualified legal counsel before relying
          on it as a final legal agreement.
        </div>

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
