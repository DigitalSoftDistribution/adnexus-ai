import type { ComponentType, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Check, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountUp, HoverScale } from './v3/animations';

/** Page hero used across the new marketing pages. */
export function PageHero({
  eyebrow,
  badge,
  title,
  subtitle,
  cta,
  ctaHref,
  children,
}: {
  eyebrow?: string;
  badge?: string;
  title: ReactNode;
  subtitle?: string;
  cta?: string;
  ctaHref?: string;
  children?: ReactNode;
}) {
  const label = eyebrow ?? badge;

  return (
    <section className="relative overflow-hidden px-6 pt-24 sm:pt-32 pb-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none" style={{ background: 'rgba(195,245,59,0.04)', filter: 'blur(120px)' }} />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        {label && (
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6" style={{ background: 'rgba(195,245,59,0.1)', border: '1px solid rgba(195,245,59,0.2)', color: '#c3f53b' }}>
            {label}
          </span>
        )}
        <h1 className="font-space text-4xl sm:text-5xl font-bold tracking-tight text-white mb-5">{title}</h1>
        {subtitle && (
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
        {cta && ctaHref && (
          <div className="mt-8">
            <Link href={ctaHref} className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-lg transition-transform hover:scale-[1.02]" style={{ background: '#c3f53b', color: '#0a0a0a' }}>
              {cta}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
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
  description,
  href,
}: {
  icon: ReactNode | ComponentType<{ className?: string }>;
  title: string;
  desc?: string;
  description?: string;
  href?: string;
}) {
  const iconNode = typeof icon === 'function'
    ? (() => {
        const Icon = icon;
        return <Icon className="w-5 h-5" />;
      })()
    : icon;

  const content = (
    <HoverScale>
      <div className="card-surface p-6 hover-lift h-full">
        <div className="mb-3">{iconNode}</div>
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description ?? desc}
        </p>
      </div>
    </HoverScale>
  );

  return href ? <Link href={href} className="block h-full">{content}</Link> : content;
}

export function FeatureGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>{children}</div>;
}

/** Closing call-to-action band reused on most pages. */
export function CtaBand({
  title = 'Ready to transform your ad workflow?',
  subtitle = 'Start managing campaigns smarter — with full control over every AI-generated change.',
  primaryLabel,
  primaryHref,
  secondaryLabel = 'View pricing',
  secondaryHref = '/pricing',
  cta,
  ctaHref,
}: {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  cta?: string;
  ctaHref?: string;
  variant?: 'gradient' | 'dark' | string;
}) {
  const mainLabel = primaryLabel ?? cta ?? 'Start Free Trial';
  const mainHref = primaryHref ?? ctaHref ?? '/auth/signup';

  return (
    <section className="w-full py-24 px-6 relative overflow-hidden" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(195,245,59,0.06) 0%, transparent 60%)' }} />
      <div className="max-w-[640px] mx-auto text-center relative z-10">
        <h2 className="font-space text-3xl sm:text-4xl font-bold text-white mb-5">{title}</h2>
        <p className="text-base mb-8 max-w-[460px] mx-auto" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href={mainHref} className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-lg transition-transform hover:scale-[1.02]" style={{ background: '#c3f53b', color: '#0a0a0a' }}>
            {mainLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          {secondaryLabel && secondaryHref && (
            <Link href={secondaryHref} className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium rounded-lg border transition-colors hover:text-white" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
              {secondaryLabel}
            </Link>
          )}
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
  className,
  id,
  children,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  alt?: boolean;
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn('w-full py-20 px-6', className)}
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>
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

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlighted = false,
  cta,
  ctaHref,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaHref: string;
}) {
  return (
    <HoverScale className="h-full">
      <div
        className="card-surface p-6 h-full flex flex-col"
        style={{ borderColor: highlighted ? 'rgba(195,245,59,0.45)' : 'var(--border-subtle)' }}
      >
        {highlighted && (
          <span className="self-start text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-full mb-4" style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}>
            Most popular
          </span>
        )}
        <h3 className="font-space text-xl font-semibold text-white mb-2">{name}</h3>
        <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        <div className="mb-6">
          <span className="font-mono-data text-3xl font-bold text-white">{price}</span>
          {period && <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{period}</span>}
        </div>
        <ul className="space-y-3 flex-1 mb-6">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#c3f53b' }} aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
        <Link href={ctaHref} className="inline-flex justify-center items-center gap-2 px-5 py-3 text-sm font-bold rounded-lg transition-transform hover:scale-[1.02]" style={{ background: highlighted ? '#c3f53b' : 'transparent', color: highlighted ? '#0a0a0a' : 'var(--text-primary)', border: highlighted ? undefined : '1px solid var(--border-subtle)' }}>
          {cta}
        </Link>
      </div>
    </HoverScale>
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
            style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}
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

/** Testimonial card with quote, name, role, company. */
export function TestimonialCard({
  quote,
  name,
  role,
  company,
}: {
  quote: string;
  name: string;
  role: string;
  company: string;
}) {
  return (
    <HoverScale className="h-full">
      <div className="card-surface p-6 h-full flex flex-col">
        <Quote size={20} className="mb-4" style={{ color: '#c3f53b' }} aria-hidden="true" />
        <p className="text-[14px] leading-relaxed flex-1 mb-6" style={{ color: 'var(--text-secondary)' }}>
          &ldquo;{quote}&rdquo;
        </p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}>
            {name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{name}</div>
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{role}, {company}</div>
          </div>
        </div>
      </div>
    </HoverScale>
  );
}

/** Horizontal logo bar with platform names. */
export function LogoBar({
  title = 'Trusted by teams at',
  logos,
}: {
  title?: string;
  logos: { name: string; color?: string }[];
}) {
  return (
    <div className="w-full py-12 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] mb-8" style={{ color: 'var(--text-tertiary)' }}>
          {title}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {logos.map((logo) => (
            <span key={logo.name} className="inline-flex items-center gap-2">
              {logo.color && (
                <span className="w-2 h-2 rounded-full" style={{ background: logo.color }} aria-hidden="true" />
              )}
              <span className="font-space text-lg font-semibold text-white/70">{logo.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Stats counter with animated count-up. */
export function StatsCounter({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  label,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="font-mono-data text-4xl md:text-5xl font-bold text-white mb-2">
        <CountUp end={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
      <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}

/** Step timeline with numbered steps and connecting line. */
export function StepTimeline({
  steps,
}: {
  steps: { title: string; desc: string }[];
}) {
  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="absolute left-6 top-8 bottom-8 w-px hidden md:block" style={{ background: 'var(--border-subtle)' }} />
      <div className="space-y-8">
        {steps.map((step, i) => (
          <div key={step.title} className="relative flex gap-6 items-start">
            <div 
              className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-mono-data text-sm font-bold"
              style={{ background: 'rgba(195,245,59,0.1)', border: '2px solid rgba(195,245,59,0.3)', color: '#c3f53b' }}
            >
              {i + 1}
            </div>
            <div className="flex-1 pt-2">
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
