'use client';

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Check } from 'lucide-react';

/* ── Section wrapper ── */
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
    <section id={id} className={cn('py-20 md:py-28', className)}>
      <div className="max-w-7xl mx-auto px-6">{children}</div>
    </section>
  );
}

/* ── Eyebrow + title + subtitle block ── */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  centered = true,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn('max-w-3xl', centered && 'mx-auto text-center')}>
      {eyebrow && (
        <Badge variant="secondary" className="mb-4">
          {eyebrow}
        </Badge>
      )}
      <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ── Page hero ── */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  cta,
  ctaHref,
  secondaryCta,
  secondaryCtaHref,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle: string;
  cta?: string;
  ctaHref?: string;
  secondaryCta?: string;
  secondaryCtaHref?: string;
  children?: ReactNode;
}) {
  return (
    <Section className="pt-28 md:pt-36 pb-12">
      <div className="max-w-4xl mx-auto text-center">
        {eyebrow && (
          <Badge variant="secondary" className="mb-6">
            {eyebrow}
          </Badge>
        )}
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          {subtitle}
        </p>
        {(cta || secondaryCta) && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {cta && ctaHref && (
              <Button size="lg" asChild>
                <Link href={ctaHref}>
                  {cta} <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
            )}
            {secondaryCta && secondaryCtaHref && (
              <Button variant="outline" size="lg" asChild>
                <Link href={secondaryCtaHref}>{secondaryCta}</Link>
              </Button>
            )}
          </div>
        )}
        {children && <div className="mt-16">{children}</div>}
      </div>
    </Section>
  );
}

/* ── Feature card ── */
export function FeatureCard({
  icon,
  title,
  description,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Card className={cn('h-full border-border/60 hover:border-primary/40 transition-colors', className)}>
      <CardHeader>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

/* ── Feature grid (bento) ── */
export function FeatureGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── CTA band ── */
export function CtaBand({
  title,
  subtitle,
  cta,
  ctaHref,
  secondaryCta,
  secondaryCtaHref,
}: {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  secondaryCta?: string;
  secondaryCtaHref?: string;
}) {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 md:px-16 md:py-20">
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-primary-foreground tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">{subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="secondary" size="lg" asChild>
              <Link href={ctaHref}>
                {cta} <ArrowRight size={16} className="ml-2" />
              </Link>
            </Button>
            {secondaryCta && secondaryCtaHref && (
              <Button
                variant="outline"
                size="lg"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href={secondaryCtaHref}>{secondaryCta}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Scenario block (before/after) ── */
export function ScenarioBlock({
  before,
  after,
}: {
  before: { title: string; points: string[] };
  after: { title: string; points: string[] };
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{before.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {before.points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-destructive">—</span>
                {p}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base text-primary">{after.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {after.points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check size={14} className="mt-0.5 text-primary shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Workflow steps ── */
export function WorkflowSteps({
  steps,
}: {
  steps: { number: string; title: string; description: string }[];
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border hidden md:block" />
      <div className="space-y-8">
        {steps.map((step) => (
          <div key={step.number} className="relative flex gap-6 md:pl-12">
            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hidden md:flex">
              {step.number}
            </div>
            <div>
              <div className="md:hidden w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold mb-3">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Pricing card ── */
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
        'h-full flex flex-col',
        highlighted && 'border-primary ring-1 ring-primary'
      )}
    >
      <CardHeader>
        <CardTitle className="text-base">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4">
          <span className="font-serif text-4xl font-medium text-foreground">{price}</span>
          <span className="text-muted-foreground text-sm">/{period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check size={14} className="mt-0.5 text-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
      <div className="p-6 pt-0">
        <Button className="w-full" variant={highlighted ? 'default' : 'outline'} asChild>
          <Link href={ctaHref}>{cta}</Link>
        </Button>
      </div>
    </Card>
  );
}

/* ── Testimonial card ── */
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
    <Card className="border-border/60">
      <CardContent className="pt-6">
        <p className="text-foreground leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
            {author.charAt(0)}
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

/* ── FAQ section ── */
export function FaqSection({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="max-w-3xl mx-auto">
      {items.map((item) => (
        <div key={item.question} className="border-b border-border py-6">
          <h3 className="text-lg font-semibold text-foreground">{item.question}</h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">{item.answer}</p>
        </div>
      ))}
    </div>
  );
}
