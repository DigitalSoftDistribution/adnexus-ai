'use client';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Check, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ─── Section wrapper ─── */
export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('py-20 md:py-28 px-6', className)}>
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  );
}

/* ─── Page hero ─── */
export function PageHero({
  badge,
  title,
  subtitle,
  cta,
  ctaHref,
  secondaryCta,
  secondaryCtaHref,
  children,
}: {
  badge?: string;
  title: ReactNode;
  subtitle: string;
  cta?: string;
  ctaHref?: string;
  secondaryCta?: string;
  secondaryCtaHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-lines opacity-30 pointer-events-none" />
      <Section className="relative pt-24 md:pt-32">
        <div className="max-w-3xl mx-auto text-center">
          {badge && <Badge variant="teal" className="mb-6">{badge}</Badge>}
          <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-tight text-foreground">
            {title}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>
          {(cta || secondaryCta) && (
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              {cta && ctaHref && (
                <Button size="lg" asChild>
                  <Link href={ctaHref}>{cta}</Link>
                </Button>
              )}
              {secondaryCta && secondaryCtaHref && (
                <Button size="lg" variant="outline" asChild>
                  <Link href={secondaryCtaHref}>{secondaryCta}</Link>
                </Button>
              )}
            </div>
          )}
        </div>
        {children && <div className="mt-16">{children}</div>}
      </Section>
    </div>
  );
}

/* ─── Feature card ─── */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href?: string;
  className?: string;
}) {
  const content = (
    <Card className={cn('group h-full hover:border-primary/30 transition-all duration-300', className)}>
      <CardHeader>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {href && (
        <CardContent className="pt-0">
          <span className="inline-flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
            Learn more <ArrowRight size={14} />
          </span>
        </CardContent>
      )}
    </Card>
  );

  if (href) return <Link href={href} className="block">{content}</Link>;
  return content;
}

/* ─── Feature grid (bento) ─── */
export function FeatureGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {children}
    </div>
  );
}

/* ─── CTA band ─── */
export function CtaBand({
  title,
  subtitle,
  cta,
  ctaHref,
  secondaryCta,
  secondaryCtaHref,
  variant = 'gradient',
}: {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  secondaryCta?: string;
  secondaryCtaHref?: string;
  variant?: 'gradient' | 'dark';
}) {
  return (
    <Section>
      <div
        className={cn(
          'rounded-2xl p-10 md:p-16 text-center',
          variant === 'gradient'
            ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
            : 'bg-card border border-border'
        )}
      >
        <h2
          className={cn(
            'font-display text-3xl md:text-4xl font-semibold tracking-tight',
            variant === 'gradient' ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            'mt-4 text-lg max-w-xl mx-auto',
            variant === 'gradient' ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          {subtitle}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            variant={variant === 'gradient' ? 'secondary' : 'default'}
            asChild
          >
            <Link href={ctaHref}>{cta}</Link>
          </Button>
          {secondaryCta && secondaryCtaHref && (
            <Button
              size="lg"
              variant={variant === 'gradient' ? 'outline' : 'outline'}
              className={variant === 'gradient' ? 'border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10' : ''}
              asChild
            >
              <Link href={secondaryCtaHref}>{secondaryCta}</Link>
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ─── Scenario block (before/after) ─── */
export function ScenarioBlock({
  before,
  after,
}: {
  before: string[];
  after: string[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <X size={18} /> Without AdNexus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {before.map((item) => (
              <li key={item} className="flex items-start gap-2 text-muted-foreground">
                <X size={16} className="text-destructive mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Check size={18} /> With AdNexus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {after.map((item) => (
              <li key={item} className="flex items-start gap-2 text-muted-foreground">
                <Check size={16} className="text-primary mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Workflow steps ─── */
export function WorkflowSteps({ steps }: { steps: { title: string; description: string }[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-8 bottom-8 w-px bg-border hidden md:block" />
      <div className="space-y-8">
        {steps.map((step, i) => (
          <div key={step.title} className="relative flex gap-6 md:pl-12">
            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0 hidden md:flex">
              {i + 1}
            </div>
            <div className="md:hidden w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0">
              {i + 1}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Pricing card ─── */
export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlighted,
  cta,
  ctaHref,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaHref: string;
}) {
  return (
    <Card
      className={cn(
        'relative flex flex-col h-full',
        highlighted && 'border-primary/40 shadow-glow'
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="teal">Most Popular</Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-base">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="font-display text-3xl font-semibold text-foreground">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3 mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check size={16} className="text-primary mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <Button className="w-full" variant={highlighted ? 'default' : 'outline'} asChild>
          <Link href={ctaHref}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Testimonial card ─── */
export function TestimonialCard({
  quote,
  author,
  role,
  company,
}: {
  quote: string;
  author: string;
  role: string;
  company: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <p className="text-foreground leading-relaxed">&ldquo;{quote}&rdquo;</p>
        <div className="mt-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {author.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{author}</p>
            <p className="text-xs text-muted-foreground">
              {role}, {company}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── FAQ section ─── */
export function FaqSection({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {items.map((item) => (
        <Card key={item.q} className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-medium">{item.q}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground leading-relaxed">{item.a}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
