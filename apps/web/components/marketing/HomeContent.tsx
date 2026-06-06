'use client';

import { Link } from '@/i18n/navigation';
import {
  BarChart3,
  Brain,
  CheckCircle,
  Clock,
  Globe,
  Layers,
  MessageSquare,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Section, FeatureCard, FeatureGrid, CtaBand } from './sections';
import { FadeIn, StaggerContainer, StaggerItem, GradientText, LivingMockup } from './v3/animations';

export function HomeContent() {
  return (
    <>
      {/* ─── Hero ─── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-lines opacity-30 pointer-events-none" />
        <Section className="relative pt-24 md:pt-32">
          <div className="max-w-4xl mx-auto text-center">
            <FadeIn>
              <Badge variant="teal" className="mb-6">AI-Powered Campaign Management</Badge>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.1] text-foreground">
                Your AI campaign{' '}
                <GradientText>analyst.</GradientText>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Autonomous monitoring, intelligent optimization, and cross-platform insights
                for Meta, Google, TikTok, and Snap — all in one place.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/contact">Talk to Sales</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/features/ai-agent">See How It Works</Link>
                </Button>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.4} className="mt-16">
            <LivingMockup className="max-w-5xl mx-auto" />
          </FadeIn>
        </Section>
      </div>

      {/* ─── Logo bar ─── */}
      <Section className="py-12 border-y border-border/50">
        <FadeIn>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Works seamlessly with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {['Meta', 'Google Ads', 'TikTok', 'Snapchat'].map((platform) => (
              <span
                key={platform}
                className="text-lg font-display font-semibold text-muted-foreground/60"
              >
                {platform}
              </span>
            ))}
          </div>
        </FadeIn>
      </Section>

      {/* ─── Problem section ─── */}
      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Managing campaigns across four platforms should not take a team of ten.
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Clock,
              title: 'Hours of manual reporting',
              description: 'Pulling data from multiple platforms, building spreadsheets, and creating decks eats up your week.',
            },
            {
              icon: TrendingUp,
              title: 'Missed optimization windows',
              description: 'By the time you spot underperforming ads, budget has already been wasted.',
            },
            {
              icon: Layers,
              title: 'Fragmented workflows',
              description: 'Jumping between Meta Business Manager, Google Ads, TikTok Ads, and Snap Ads Manager.',
            },
          ].map((item) => (
            <StaggerItem key={item.title}>
              <FeatureCard icon={item.icon} title={item.title} description={item.description} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* ─── Solution pillars ─── */}
      <Section className="bg-secondary/20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <Badge variant="teal" className="mb-4">The Solution</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Three pillars of intelligent advertising
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Brain,
              title: 'AI Agent',
              description: 'Autonomous monitoring that detects anomalies, suggests actions, and learns from every campaign.',
              href: '/features/ai-agent',
            },
            {
              icon: CheckCircle,
              title: 'Draft Approvals',
              description: 'AI-generated optimization drafts with one-click approval. Stay in control without the manual work.',
              href: '/features/approvals',
            },
            {
              icon: Globe,
              title: 'Cross-Platform',
              description: 'Unified dashboard for Meta, Google, TikTok, and Snap. One login, complete visibility.',
              href: '/features/platforms',
            },
          ].map((item) => (
            <StaggerItem key={item.title}>
              <FeatureCard
                icon={item.icon}
                title={item.title}
                description={item.description}
                href={item.href}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* ─── How it works ─── */}
      <Section>
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              How it works
            </h2>
            <p className="mt-4 text-muted-foreground">
              From setup to insights in four simple steps
            </p>
          </FadeIn>
        </div>
        <FadeIn className="max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute left-4 top-8 bottom-8 w-px bg-border hidden md:block" />
            <div className="space-y-8">
              {[
                {
                  title: 'Connect your accounts',
                  description: 'Link Meta, Google, TikTok, and Snap ad accounts in minutes with secure OAuth.',
                },
                {
                  title: 'AI learns your goals',
                  description: 'Set KPI targets, budget constraints, and brand guidelines. The AI adapts to your strategy.',
                },
                {
                  title: 'Get intelligent alerts',
                  description: 'Receive morning briefs, anomaly alerts, and optimization suggestions in real time.',
                },
                {
                  title: 'Approve and execute',
                  description: 'Review AI-generated drafts and approve with one click. Full audit trail included.',
                },
              ].map((step, i) => (
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
        </FadeIn>
      </Section>

      {/* ─── Features grid ─── */}
      <Section className="bg-secondary/20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Everything you need to scale
            </h2>
          </FadeIn>
        </div>
        <StaggerContainer>
          <FeatureGrid className="max-w-5xl mx-auto">
            {[
              {
                icon: Brain,
                title: 'AI Agent',
                description: 'Autonomous monitoring and intelligent anomaly detection across all campaigns.',
                href: '/features/ai-agent',
              },
              {
                icon: MessageSquare,
                title: 'Morning Brief',
                description: 'Daily digest of campaign performance, anomalies, and recommended actions.',
                href: '/features/morning-brief',
              },
              {
                icon: Zap,
                title: 'Creative Fatigue',
                description: 'Detect ad fatigue before it hurts performance. Get refresh recommendations.',
                href: '/features/creative-fatigue',
              },
              {
                icon: BarChart3,
                title: 'Budget Pacing',
                description: 'Smart budget allocation and pacing alerts to maximize ROAS.',
                href: '/features/budget-pacing',
              },
              {
                icon: Shield,
                title: 'Brand Safety',
                description: 'Automated checks ensure every ad meets your brand guidelines.',
                href: '/features',
              },
              {
                icon: TrendingUp,
                title: 'Attribution',
                description: 'Cross-platform attribution modeling to understand true campaign impact.',
                href: '/features',
              },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <FeatureCard
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  href={item.href}
                />
              </StaggerItem>
            ))}
          </FeatureGrid>
        </StaggerContainer>
      </Section>

      {/* ─── Social proof ─── */}
      <Section>
        <div className="max-w-5xl mx-auto">
          <StaggerContainer className="grid md:grid-cols-4 gap-8 mb-16">
            {[
              { value: '4.2x', label: 'Average ROAS improvement' },
              { value: '12h', label: 'Saved per week on reporting' },
              { value: '35%', label: 'Reduction in wasted ad spend' },
              { value: '4', label: 'Platforms unified' },
            ].map((stat) => (
              <StaggerItem key={stat.label}>
                <div className="text-center">
                  <div className="font-display text-4xl font-semibold text-gradient">{stat.value}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      {/* ─── Final CTA ─── */}
      <CtaBand
        title="Ready to transform your advertising?"
        subtitle="Bring AI-assisted campaign monitoring and draft approvals into your team workflow."
        cta="Talk to Sales"
        ctaHref="/contact"
        secondaryCta="Talk to Sales"
        secondaryCtaHref="/contact"
      />
    </>
  );
}
