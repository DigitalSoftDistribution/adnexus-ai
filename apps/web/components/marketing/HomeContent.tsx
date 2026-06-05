'use client';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Section,
  SectionHeader,
  FeatureCard,
  FeatureGrid,
  CtaBand,
  WorkflowSteps,
  PricingCard,
  TestimonialCard,
} from '@/components/marketing/sections';
import { FadeIn } from '@/components/marketing/v3/animations/FadeIn';
import { StaggerContainer, StaggerItem } from '@/components/marketing/v3/animations/StaggerText';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle,
  Clock,
  Globe,
  Layers,
  MessageSquare,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

/* ── Dashboard mockup ── */
function DashboardMockup() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
          </div>
          <div className="flex-1 mx-4">
            <div className="h-6 rounded-md bg-muted/50 text-xs flex items-center px-3 text-muted-foreground font-mono">
              app.adnexus.ai/campaigns
            </div>
          </div>
        </div>
        {/* Dashboard body */}
        <div className="p-6 grid md:grid-cols-3 gap-4">
          {/* Sidebar */}
          <div className="hidden md:flex flex-col gap-2">
            <div className="h-8 rounded-md bg-primary/10 flex items-center px-3 text-xs text-primary font-medium">
              Campaigns
            </div>
            {['Analytics', 'Creative', 'Audiences', 'Settings'].map((item) => (
              <div key={item} className="h-8 rounded-md bg-muted/30 flex items-center px-3 text-xs text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
          {/* Main content */}
          <div className="md:col-span-2 space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Spend', value: '$12.4k', change: '+8%' },
                { label: 'ROAS', value: '4.2x', change: '+12%' },
                { label: 'CPA', value: '$18.50', change: '-5%' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-success mt-0.5">{stat.change}</p>
                </div>
              ))}
            </div>
            {/* Agent chat */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot size={12} className="text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">AdNexus Agent</span>
                <Badge variant="secondary" className="text-[10px] h-4">Active</Badge>
              </div>
              <div className="space-y-2">
                <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
                  I noticed Campaign A is pacing 23% under budget. Should I reallocate to the best-performing ad set?
                </div>
                <div className="flex gap-2">
                  <div className="rounded-md bg-primary/10 px-3 py-1.5 text-xs text-primary cursor-pointer hover:bg-primary/20 transition-colors">
                    Approve reallocation
                  </div>
                  <div className="rounded-md bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                    Review first
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Logo bar ── */
function LogoBar() {
  const platforms = ['Meta', 'Google Ads', 'TikTok', 'Snapchat'];
  return (
    <div className="py-10 border-y border-border">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs text-muted-foreground uppercase tracking-wider mb-6">
          Works with your existing platforms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {platforms.map((p) => (
            <span key={p} className="text-lg font-semibold text-muted-foreground/60">
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main export ── */
export function HomeContent() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-32 md:pt-44 pb-16 md:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <FadeIn>
              <Badge variant="secondary" className="mb-6">
                Now in early access
              </Badge>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium tracking-tight text-foreground leading-[1.1]">
                Talk to your ads.{" "}
                <em className="text-primary">Let agents run them.</em>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                AdNexus AI is your autonomous campaign analyst. It monitors, drafts changes,
                and waits for your approval — across Meta, Google, TikTok, and Snap.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/auth/signup">
                    Start Free Trial <ArrowRight size={16} className="ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/features/ai-agent">See how it works</Link>
                </Button>
              </div>
            </FadeIn>
            <FadeIn delay={0.4}>
              <div className="mt-16">
                <DashboardMockup />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <LogoBar />

      {/* ── Problem ── */}
      <Section>
        <SectionHeader
          eyebrow="The problem"
          title="Managing campaigns across four platforms shouldn't take a team of ten"
          subtitle="Marketers spend 60% of their week switching tabs, copying data, and chasing approvals."
        />
        <div className="mt-12">
          <FeatureGrid>
            <StaggerContainer staggerDelay={0.1}>
              <StaggerItem>
                <FeatureCard
                  icon={<Clock size={20} />}
                  title="Endless tab switching"
                  description="Meta Ads Manager, Google Ads, TikTok Business Center — each with different interfaces, metrics, and workflows."
                />
              </StaggerItem>
              <StaggerItem>
                <FeatureCard
                  icon={<BarChart3 size={20} />}
                  title="Data everywhere"
                  description="Performance data lives in silos. By the time you build a report, the numbers have already changed."
                />
              </StaggerItem>
              <StaggerItem>
                <FeatureCard
                  icon={<MessageSquare size={20} />}
                  title="Approval chaos"
                  description="Changes get lost in Slack threads. Nobody knows what's live, what's pending, or what was rejected."
                />
              </StaggerItem>
            </StaggerContainer>
          </FeatureGrid>
        </div>
      </Section>

      {/* ── Solution pillars ── */}
      <Section className="bg-card">
        <SectionHeader
          eyebrow="The solution"
          title="One workspace. One agent. Full control."
          subtitle="AdNexus AI brings every platform into a single intelligent workspace — with an AI agent that works for you, not instead of you."
        />
        <div className="mt-12">
          <FeatureGrid className="lg:grid-cols-3">
            <StaggerContainer staggerDelay={0.1}>
              <StaggerItem>
                <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                      <Bot size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">AI Agent</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Monitors campaigns 24/7, detects anomalies, and drafts optimization changes. You approve every action.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                      <CheckCircle size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Draft Approvals</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Nothing goes live without your say. Review, edit, or reject every change in a clean approval workflow.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                      <Globe size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Cross-Platform</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Meta, Google, TikTok, and Snapchat — unified reporting, unified actions, one source of truth.
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            </StaggerContainer>
          </FeatureGrid>
        </div>
      </Section>

      {/* ── How it works ── */}
      <Section>
        <SectionHeader
          eyebrow="How it works"
          title="Set it up in minutes, not months"
        />
        <div className="mt-12 max-w-2xl mx-auto">
          <WorkflowSteps
            steps={[
              {
                number: '1',
                title: 'Connect your platforms',
                description: 'Link Meta, Google, TikTok, and Snap in one secure OAuth flow. No API keys to manage.',
              },
              {
                number: '2',
                title: 'Set your guardrails',
                description: 'Define budgets, ROAS targets, and creative rules. The agent stays within your limits.',
              },
              {
                number: '3',
                title: 'Review daily drafts',
                description: 'Every morning, get a briefing of proposed changes. Approve, edit, or reject in one click.',
              },
              {
                number: '4',
                title: 'Watch performance improve',
                description: 'Track lift in real time. The agent learns what works and doubles down on winners.',
              },
            ]}
          />
        </div>
      </Section>

      {/* ── Features grid ── */}
      <Section className="bg-card">
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to scale"
          subtitle="From morning briefings to creative fatigue detection — AdNexus covers the full campaign lifecycle."
        />
        <div className="mt-12">
          <FeatureGrid className="lg:grid-cols-3">
            <StaggerContainer staggerDelay={0.08}>
              {[
                {
                  icon: <Sparkles size={20} />,
                  title: 'Morning Brief',
                  desc: 'A daily AI-generated summary of what changed, what matters, and what needs your attention.',
                },
                {
                  icon: <TrendingUp size={20} />,
                  title: 'Budget Pacing',
                  desc: 'Smart reallocation across campaigns and ad sets to hit targets without overspending.',
                },
                {
                  icon: <Layers size={20} />,
                  title: 'Creative Fatigue',
                  desc: 'Detect when ads are wearing out before they burn budget. Get replacement suggestions.',
                },
                {
                  icon: <Shield size={20} />,
                  title: 'Approval Guardrails',
                  desc: 'Multi-level approvals with audit trails. Know exactly who approved what and when.',
                },
                {
                  icon: <Zap size={20} />,
                  title: 'Auto-Optimization',
                  desc: 'The agent pauses losers, scales winners, and adjusts bids — all pending your approval.',
                },
                {
                  icon: <BarChart3 size={20} />,
                  title: 'Unified Reporting',
                  desc: 'One dashboard for cross-platform metrics. No more spreadsheet gymnastics.',
                },
              ].map((f) => (
                <StaggerItem key={f.title}>
                  <FeatureCard icon={f.icon} title={f.title} description={f.desc} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </FeatureGrid>
        </div>
      </Section>

      {/* ── Social proof ── */}
      <Section>
        <SectionHeader
          eyebrow="Trusted by teams"
          title="Results that speak"
        />
        <div className="mt-12 grid md:grid-cols-3 gap-8 mb-12">
          {[
            { value: '4.2x', label: 'Average ROAS lift' },
            { value: '12h', label: 'Saved per week' },
            { value: '35%', label: 'Lower CPA' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-serif text-4xl md:text-5xl font-medium text-primary">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="max-w-2xl mx-auto">
          <TestimonialCard
            quote="AdNexus cut our campaign management time in half. The agent catches things we'd miss, and the approval workflow keeps us in control."
            author="Sarah Chen"
            role="Head of Performance"
            company="Bloom Commerce"
          />
        </div>
      </Section>

      {/* ── Pricing teaser ── */}
      <Section className="bg-card">
        <SectionHeader
          eyebrow="Pricing"
          title="Start free. Scale as you grow."
          subtitle="No hidden fees. No long-term contracts. Cancel anytime."
        />
        <div className="mt-12">
          <FeatureGrid className="lg:grid-cols-4">
            <StaggerContainer staggerDelay={0.1}>
              <StaggerItem>
                <PricingCard
                  name="Starter"
                  price="$0"
                  period="mo"
                  description="For solo marketers getting started"
                  features={['1 platform', '3 campaigns', 'Daily brief', 'Email support']}
                  cta="Get started"
                  ctaHref="/auth/signup"
                />
              </StaggerItem>
              <StaggerItem>
                <PricingCard
                  name="Growth"
                  price="$79"
                  period="mo"
                  description="For growing teams with multiple campaigns"
                  features={['2 platforms', '10 campaigns', 'AI agent', 'Draft approvals', 'Chat support']}
                  cta="Start trial"
                  ctaHref="/auth/signup"
                />
              </StaggerItem>
              <StaggerItem>
                <PricingCard
                  name="Pro"
                  price="$199"
                  period="mo"
                  description="For agencies and scaling in-house teams"
                  features={['4 platforms', 'Unlimited campaigns', 'Priority agent', 'Custom rules', 'Slack integration']}
                  highlighted
                  cta="Start trial"
                  ctaHref="/auth/signup"
                />
              </StaggerItem>
              <StaggerItem>
                <PricingCard
                  name="Enterprise"
                  price="Custom"
                  period=""
                  description="For large teams with custom needs"
                  features={['Dedicated agent', 'SSO & SAML', 'Custom integrations', 'SLA', 'Dedicated support']}
                  cta="Contact sales"
                  ctaHref="/contact"
                />
              </StaggerItem>
            </StaggerContainer>
          </FeatureGrid>
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <CtaBand
        title="Ready to let agents run your ads?"
        subtitle="Join hundreds of teams who have replaced tab-switching with intelligent campaign management."
        cta="Start Free Trial"
        ctaHref="/auth/signup"
        secondaryCta="Talk to sales"
        secondaryCtaHref="/contact"
      />
    </>
  );
}
