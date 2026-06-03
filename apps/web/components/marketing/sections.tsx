import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

/** Page hero used across the new marketing pages. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden px-6 pt-24 sm:pt-32 pb-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none" style={{ background: 'rgba(195,245,59,0.04)', filter: 'blur(120px)' }} />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6" style={{ background: 'rgba(195,245,59,0.1)', border: '1px solid rgba(195,245,59,0.2)', color: '#c3f53b' }}>
          {eyebrow}
        </span>
        <h1 className="font-space text-4xl sm:text-5xl font-bold tracking-tight text-white mb-5">{title}</h1>
        {subtitle && (
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/** Generic card. */
export function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card-surface p-6 hover-lift">
      <div className="mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {desc}
      </p>
    </div>
  );
}

/** Closing call-to-action band reused on most pages. */
export function CtaBand({
  title = 'Ready to transform your ad workflow?',
  subtitle = 'Start managing campaigns smarter — with full control over every AI-generated change.',
  primaryLabel = 'Start Free Trial',
  primaryHref = '/auth/signup',
  secondaryLabel = 'View pricing',
  secondaryHref = '/pricing',
}: {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="w-full py-24 px-6 relative overflow-hidden" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(195,245,59,0.08) 0%, rgba(37,99,235,0.06) 40%, transparent 65%)' }} />
      <div className="max-w-[640px] mx-auto text-center relative z-10">
        <h2 className="font-space text-3xl sm:text-4xl font-bold text-white mb-5">{title}</h2>
        <p className="text-base mb-8 max-w-[460px] mx-auto" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href={primaryHref} className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-lg transition-transform hover:scale-[1.02]" style={{ background: '#c3f53b', color: '#0a0a0a' }}>
            {primaryLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href={secondaryHref} className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium rounded-lg border transition-colors hover:text-white" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Section wrapper with consistent vertical rhythm + heading. */
export function Section({
  eyebrow,
  title,
  subtitle,
  alt = false,
  children,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  alt?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="w-full py-20 px-6"
      style={{
        background: alt ? 'var(--bg-secondary)' : 'var(--bg-primary)',
        borderTop: alt ? '1px solid var(--border-subtle)' : undefined,
        borderBottom: alt ? '1px solid var(--border-subtle)' : undefined,
      }}
    >
      <div className="max-w-6xl mx-auto">
        {(eyebrow || title) && (
          <div className="text-center mb-12">
            {eyebrow && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#2563EB' }}>
                {eyebrow}
              </span>
            )}
            {title && <h2 className="font-space text-3xl sm:text-4xl font-semibold text-white mb-3">{title}</h2>}
            {subtitle && (
              <p className="text-sm max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/** A concrete "a day in the life" scenario: a situation + the AdNexus outcome. */
export function ScenarioBlock({
  situation,
  outcome,
}: {
  situation: string;
  outcome: string;
}) {
  return (
    <div className="max-w-3xl mx-auto rounded-xl p-6 sm:p-8" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--text-tertiary)' }}>The situation</p>
      <p className="font-space text-lg sm:text-xl font-medium leading-relaxed text-white mb-6">{situation}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--accent)' }}>With AdNexus</p>
      <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{outcome}</p>
    </div>
  );
}

/** Numbered three-to-four step workflow. */
export function WorkflowSteps({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {steps.map((s, i) => (
        <div key={s.title} className="flex items-start gap-4 rounded-xl p-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-mono-data text-sm font-bold"
            style={{ background: 'rgba(195,245,59,0.1)', color: 'var(--accent)' }}
          >
            {i + 1}
          </span>
          <span>
            <span className="block text-sm font-semibold text-white mb-1">{s.title}</span>
            <span className="block text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
