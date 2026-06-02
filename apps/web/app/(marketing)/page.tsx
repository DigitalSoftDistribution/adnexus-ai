import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bot,
  Layers,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Bell,
  Flame,
  Eye,
  Gauge,
  Workflow,
  Check,
  ArrowRight,
  Star,
} from 'lucide-react';
import { PRICING_TIERS, priceForPeriod } from '@/lib/pricing';
import {
  organizationSchema,
  softwareApplicationSchema,
  jsonLd,
} from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'AdNexus AI — Advertising Intelligence Platform',
  description:
    'AI-powered ad management across Meta, Google, TikTok, and Snap. Every AI-generated change is a draft awaiting your approval. Start free — no credit card required.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'AdNexus AI — Nothing goes live without your approval',
    description:
      'AI-powered ad management across Meta, Google, TikTok, and Snap with draft-first approval.',
    url: '/',
    type: 'website',
  },
};

const PROBLEMS = [
  { stat: '56%', label: 'of marketers lack time to analyze campaign data' },
  { stat: '20-30%', label: 'of ad budgets wasted on creative fatigue' },
  { stat: 'Zero', label: 'tools combine AI + cross-platform + governance' },
];

const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Draft-First Approval',
    body: 'Every AI-generated change is staged as a draft. You review, edit, and approve before anything goes live — no surprises on your ad spend.',
  },
  {
    icon: Layers,
    title: 'MCP-Native Architecture',
    body: 'Built on the Model Context Protocol from day one. Connect Meta, Google, TikTok, and Snap through a single intelligent layer.',
  },
  {
    icon: Sparkles,
    title: 'Cross-Platform Intelligence',
    body: 'Unified reporting and optimization across all four platforms. Spot what works, kill what does not, and pace budgets automatically.',
  },
];

const STEPS = [
  { n: '1', title: 'Connect your ad accounts', body: 'Securely link Meta, Google, TikTok, and Snap in a couple of clicks.' },
  { n: '2', title: 'AI analyzes & drafts optimizations', body: 'The agent reviews performance and proposes changes as reviewable drafts.' },
  { n: '3', title: 'You review, approve, and publish', body: 'Approve with one click. Nothing changes on your accounts without your sign-off.' },
];

const FEATURES = [
  { icon: Bot, title: 'AI Agent', body: 'Draft-first optimization across every connected platform.' },
  { icon: Bell, title: 'Morning Brief', body: 'A proactive daily digest of what needs your attention.' },
  { icon: Flame, title: 'Creative Fatigue', body: 'Detect and replace fatigued creatives before performance drops.' },
  { icon: Eye, title: 'Competitive Intel', body: 'Track competitor ads and positioning in your market.' },
  { icon: Gauge, title: 'Budget Pacing', body: 'Automatic pacing so you never over- or under-spend.' },
  { icon: Workflow, title: 'Approval Workflows', body: 'Multi-step approval chains for teams and agencies.' },
  { icon: BarChart3, title: 'Cross-Platform Reporting', body: 'One dashboard for Meta, Google, TikTok, and Snap.' },
  { icon: Layers, title: 'MCP Integration', body: 'Native Model Context Protocol support for AI tooling.' },
];

const TESTIMONIALS = [
  {
    quote:
      'The draft-first approach means I finally trust AI with my ad accounts. Nothing changes without my approval, but the optimizations are spot on.',
    name: 'Sarah Chen',
    role: 'VP Growth, Luminex',
  },
  {
    quote:
      'We manage 40+ client accounts. AdNexus cut our optimization time in half while giving every account owner full visibility and control.',
    name: 'Marcus Rodriguez',
    role: 'Head of Performance, Atlas Agency',
  },
  {
    quote:
      'Cross-platform reporting that actually makes sense, plus an AI that drafts changes instead of making them blindly. Game changer.',
    name: 'Emily Watson',
    role: 'CMO, Prism Commerce',
  },
];

export default function HomePage() {
  const teaserTiers = PRICING_TIERS.filter((t) => t.id !== 'free');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(softwareApplicationSchema()) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(195,245,59,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8 lg:py-32">
          <span className="inline-flex items-center rounded-full border border-[#c3f53b]/30 bg-[#c3f53b]/10 px-4 py-1.5 text-sm font-medium text-[#c3f53b]">
            The Intelligent Campaign Workspace
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Nothing goes live without <span className="text-[#c3f53b]">your</span> approval
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl">
            AI-powered ad management across Meta, Google, TikTok, and Snap — where every AI-generated
            change is a draft awaiting your approval.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#c3f53b] px-7 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/tools/roas-calculator"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Try ROAS Calculator
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            No credit card required • 2-minute setup • Cancel anytime
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {['MCP Native', 'Draft-First Approval', '4 Platforms'].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-gray-300"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div
                key={p.label}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center"
              >
                <div className="text-4xl font-bold text-[#c3f53b]">{p.stat}</div>
                <p className="mt-3 text-sm text-gray-400">{p.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution pillars */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Built different, on purpose</h2>
            <p className="mt-4 text-gray-400">
              Three principles that make AdNexus the only AI ad platform you can actually trust.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                <pillar.icon size={28} className="text-[#c3f53b]" aria-hidden="true" />
                <h3 className="mt-5 text-xl font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
            <p className="mt-4 text-gray-400">From connection to approved optimization in three steps.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c3f53b] text-sm font-bold text-black">
                  {step.n}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to scale</h2>
            <p className="mt-4 text-gray-400">A complete toolkit for AI-assisted, human-approved advertising.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <feature.icon size={22} className="text-[#c3f53b]" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-400">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Trusted by growth teams</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className="fill-[#c3f53b] text-[#c3f53b]" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-gray-300">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-gray-400">
              Start free with a read-only audit. Paid plans from $39/mo with a 14-day trial.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {teaserTiers.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-2xl border p-8 ${
                  tier.popular
                    ? 'border-[#c3f53b]/40 bg-[#c3f53b]/[0.04]'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${priceForPeriod(tier, 'monthly')}</span>
                  <span className="text-sm text-gray-400">/mo</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">{tier.description}</p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {tier.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-[#c3f53b]" aria-hidden="true" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              See full pricing <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to transform your ad workflow?</h2>
          <p className="mt-4 text-gray-400">
            Join growth teams who trust AI to draft — and themselves to approve.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#c3f53b] px-7 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
