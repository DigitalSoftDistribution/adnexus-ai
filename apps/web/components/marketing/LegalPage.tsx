import type { ReactNode } from 'react';

/** Shared shell for legal stub pages. Clearly marks content as a draft. */
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
        <p className="text-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>Last updated: {updated}</p>

        <div
          className="rounded-lg p-4 mb-8 text-[13px]"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--text-secondary)' }}
        >
          This is a draft template provided for transparency and is not yet legal advice. The final,
          counsel-reviewed version will be published before general availability. For specific terms,
          contact{' '}
          <a href="mailto:legal@adnexus.ai" className="underline" style={{ color: '#c3f53b' }}>
            legal@adnexus.ai
          </a>
          .
        </div>

        <div className="space-y-5 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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
      <p>{children}</p>
    </div>
  );
}
