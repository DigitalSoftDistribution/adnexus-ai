'use client';

import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight, Sparkles, CheckCircle2, Globe, Cable,
  BrainCircuit, FileText, Palette, Eye, Wallet, BarChart2,
  Clock, XCircle, Zap, ChevronRight,
} from 'lucide-react';
import { PRICING_TIERS, formatPrice } from '@/lib/marketing/pricing';
import { FadeIn, StaggerText, GlowCard } from './v3/animations';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/* ───────── Hero ───────── */
function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="gradient-mesh" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(139, 92, 246, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)',
            animation: 'mesh-drift 20s ease-in-out infinite',
          }}
        />
      </div>
      <div className="absolute inset-0 bg-grid-subtle pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-center relative z-10">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: easeSmooth }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
          >
            <Sparkles size={12} aria-hidden="true" />
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase">The Intelligent Campaign Workspace</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: easeSmooth }}
            className="font-space font-bold text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-[-0.03em] mb-6"
          >
            Nothing goes live
            <br />
            without <span className="text-gradient-indigo glow-text-indigo">your</span>
            <br />
            approval
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: easeSmooth }}
            className="text-base md:text-lg leading-relaxed max-w-[520px] mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            An AI agent watches your Meta, Google, TikTok, and Snap campaigns around the clock and
            drafts the fixes. You review each one and approve with a click. Nothing reaches your live
            budget until you say so.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4, ease: easeSmooth }}
            className="flex flex-wrap items-center gap-4 mb-6"
          >
            <Link
              href="/auth/signup"
              className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-sm rounded-xl"
            >
              Start Free Trial
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/features"
              className="btn-secondary inline-flex items-center gap-2 px-7 py-3.5 text-sm rounded-xl"
            >
              See how it works
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.3 }}
            className="text-xs mb-10"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No credit card required &bull; 2-minute setup &bull; Cancel anytime
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.4 }}
            className="flex flex-wrap items-center gap-3"
          >
            {[
              { label: 'MCP Native', icon: <Cable size={12} aria-hidden="true" /> },
              { label: 'Draft-First Approval', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
              { label: '4 Platforms', icon: <Globe size={12} aria-hidden="true" /> },
            ].map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                {badge.icon}
                {badge.label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9, ease: easeSmooth }}
          className="relative hidden lg:flex items-center justify-center"
          style={{ height: '540px' }}
        >
          <div className="absolute w-[500px] h-[480px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 50%, transparent 70%)', animation: 'glow-pulse 4s infinite' }} />
          <div className="relative w-full max-w-[480px]" style={{ perspective: '1000px', animation: 'float 6s ease-in-out infinite' }}>
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)', transform: 'rotateY(-6deg) rotateX(3deg)', transformStyle: 'preserve-3d' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[10px] font-mono-data" style={{ color: 'var(--text-tertiary)' }}>AdNexus AI Dashboard</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3">
                {[
                  { label: 'ROAS', value: '4.2x', change: '+12%' },
                  { label: 'Spend', value: '$24.8K', change: '-3%' },
                  { label: 'CPA', value: '$18.5', change: '-8%' },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg p-2.5" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</div>
                    <div className="text-sm font-bold text-white font-mono-data">{kpi.value}</div>
                    <div className="text-[9px] font-medium" style={{ color: 'var(--status-active)' }}>{kpi.change}</div>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Campaign Performance</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Live</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Meta - Summer Sale', status: 'active', roas: '3.8x' },
                      { name: 'Google - Brand Search', status: 'warning', roas: '2.1x' },
                      { name: 'TikTok - Viral', status: 'active', roas: '5.2x' },
                    ].map((camp) => (
                      <div key={camp.name} className="flex items-center justify-between text-[10px]">
                        <span style={{ color: 'var(--text-secondary)' }}>{camp.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${camp.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="font-mono-data font-semibold text-white">{camp.roas}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3">
                <div className="rounded-lg p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit size={12} style={{ color: '#818cf8' }} />
                    <span className="text-[10px] font-semibold" style={{ color: '#818cf8' }}>AI Recommendation</span>
                  </div>
                  <p className="text-[10px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Shift $2,400 from Google Brand Search to TikTok Viral. Expected ROAS improvement: +1.2x
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: 'var(--approval)', color: 'var(--text-inverse)' }}>Approve</span>
                    <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>Edit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────── Credibility bar ───────── */
function CredibilityBar() {
  return (
    <section className="w-full py-8 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <p className="text-center text-[11px] font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-tertiary)' }}>
            Works with your ad stack
          </p>
        </FadeIn>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {['Meta Ads', 'Google Ads', 'TikTok Ads', 'Snap Ads', 'Slack', 'MCP'].map((platform) => (
            <FadeIn key={platform} delay={0.05}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{platform}</span>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Problem section ───────── */
function ProblemSection() {
  return (
    <section className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="eyebrow mb-4 block">The Problem</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Running ads shouldn&apos;t take superhuman effort</h2>
          <p className="text-sm max-w-[480px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Four platforms. A dozen dashboards. One person trying to keep up.</p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Clock size={22} style={{ color: '#EF4444' }} />, title: 'Time drain', desc: 'Hours spent checking dashboards, exporting reports, and stitching data together by hand.' },
            { icon: <XCircle size={22} style={{ color: '#F59E0B' }} />, title: 'Missed signals', desc: 'Problems surface too late — when budget is already wasted and ROAS has dropped.' },
            { icon: <Zap size={22} style={{ color: '#6366f1' }} />, title: 'Reactive, not proactive', desc: 'You find out about issues when performance dips, not before they cost you money.' },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.1}>
              <GlowCard className="p-6">
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              </GlowCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Solution pillars ───────── */
function SolutionPillarsSection() {
  return (
    <section className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="eyebrow mb-4 block">The Solution</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Three pillars, deeply integrated</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>AI that monitors, drafts, and explains — with you in control every step of the way.</p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <BrainCircuit size={24} style={{ color: '#818cf8' }} />, title: 'AI Agent', desc: 'Monitors campaigns 24/7, predicts problems before they hit, and drafts optimizations with full reasoning.' },
            { icon: <CheckCircle2 size={24} style={{ color: '#c3f53b' }} />, title: 'Draft-First Approvals', desc: 'Every AI change is staged as a draft. Review, edit, approve, or reject — with a full audit trail.' },
            { icon: <Globe size={24} style={{ color: '#818cf8' }} />, title: 'Cross-Platform', desc: 'Meta, Google, TikTok, and Snap in one unified dashboard — one brain, zero fragmentation.' },
          ].map((pillar, i) => (
            <FadeIn key={pillar.title} delay={i * 0.12}>
              <div className="card-surface p-8 hover-lift card-glow text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  {pillar.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{pillar.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{pillar.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── How it works ───────── */
function HowItWorksSection() {
  const steps = [
    { title: 'Connect your accounts', desc: 'Link Meta, Google, TikTok, and Snap via OAuth in under two minutes.' },
    { title: 'The AI agent monitors', desc: 'Watches performance, spend, and creative fatigue around the clock.' },
    { title: 'Get drafted recommendations', desc: 'Budget shifts, creative refreshes, and audience tweaks arrive as ready-to-review drafts.' },
    { title: 'Approve and ship', desc: 'One-click approval publishes changes. Every action is logged for compliance.' },
  ];

  return (
    <section className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="eyebrow mb-4 block">How it works</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">From connection to optimization in four steps</h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.1}>
              <div className="relative text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 font-mono-data text-lg font-bold" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
                  {i + 1}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px" style={{ background: 'linear-gradient(90deg, var(--border-subtle), transparent)' }} />
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Features grid ───────── */
function FeaturesGridSection() {
  const features = [
    { icon: <FileText size={20} style={{ color: '#818cf8' }} />, title: 'Morning Brief', desc: 'A daily summary of what changed, what needs attention, and what the AI recommends.' },
    { icon: <Palette size={20} style={{ color: '#F59E0B' }} />, title: 'Creative Fatigue', desc: 'Catch declining ad performance early and get replacement suggestions before budget is wasted.' },
    { icon: <Eye size={20} style={{ color: '#818cf8' }} />, title: 'Competitive Intel', desc: 'Track competitor ad activity, spend patterns, and creative strategies across platforms.' },
    { icon: <Wallet size={20} style={{ color: '#10B981' }} />, title: 'Budget Pacing', desc: 'Smart allocation across campaigns and platforms to maximize ROAS through the whole month.' },
    { icon: <BarChart2 size={20} style={{ color: '#818cf8' }} />, title: 'Cross-Platform Reporting', desc: 'Unified dashboards aggregating performance across all four platforms in real time.' },
    { icon: <Cable size={20} style={{ color: '#c3f53b' }} />, title: 'MCP Integration', desc: 'Native MCP server. Works with Claude, ChatGPT, Cursor, and any MCP-compatible client.' },
  ];

  return (
    <section className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="eyebrow mb-4 block">Features</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Everything you need to run smarter campaigns</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Open the dashboard, read the morning brief, approve a few drafts, and your day&apos;s optimization is done.</p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.06}>
              <GlowCard className="p-5">
                <div className="mb-3">{feature.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.desc}</p>
              </GlowCard>
            </FadeIn>
          ))}
        </div>
        <FadeIn className="text-center mt-10" delay={0.2}>
          <Link href="/features" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Explore all features
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* ───────── Why AdNexus ───────── */
function WhyAdNexusSection() {
  const points = [
    { title: 'vs MCP-only tools', desc: 'Chat connectors like Pipeboard have no dashboard and no governance. AdNexus pairs the AI with a visual workspace and draft approvals.', icon: <Cable size={22} style={{ color: '#818cf8' }} /> },
    { title: 'vs Meta-only platforms', desc: 'Madgicx optimizes one platform. AdNexus coordinates Meta, Google, TikTok, and Snap from a single brain.', icon: <Globe size={22} style={{ color: '#818cf8' }} /> },
    { title: 'vs manual rule engines', desc: 'Rule-based tools make you write every trigger by hand. AdNexus is AI-native — it proposes the changes, you approve them.', icon: <BrainCircuit size={22} style={{ color: '#c3f53b' }} /> },
  ];

  return (
    <section className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="eyebrow mb-4 block">Why AdNexus</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">The gap no other tool fills</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Every alternative makes you trade something away. AdNexus is the one built to give you all three at once.</p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {points.map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.12}>
              <GlowCard className="p-6">
                <div className="mb-4">{p.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.desc}</p>
              </GlowCard>
            </FadeIn>
          ))}
        </div>
        <FadeIn className="text-center mt-10" delay={0.2}>
          <Link href="/compare/pipeboard" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            See full comparisons
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* ───────── Pricing teaser ───────── */
function PricingTeaserSection() {
  return (
    <section className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-[1100px] mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="eyebrow mb-4 block">Pricing</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Flat pricing that never scales with your ad spend</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Start free. Upgrade as your strategy grows — not as your budget does.</p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {PRICING_TIERS.map((tier, i) => (
            <FadeIn key={tier.id} delay={tier.popular ? 0.2 : i * 0.1}>
              <div
                className="card-surface p-6 relative flex flex-col"
                style={{
                  borderColor: tier.popular ? 'rgba(99,102,241,0.4)' : 'var(--border-subtle)',
                  boxShadow: tier.popular ? '0 0 30px rgba(99,102,241,0.08)' : undefined,
                }}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>Most Popular</div>
                )}
                <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
                <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>{tier.description}</p>
                <div className="mb-6">
                  <span className="font-mono-data text-4xl font-bold text-white">{formatPrice(tier.monthlyPrice)}</span>
                  {tier.monthlyPrice !== null && tier.monthlyPrice > 0 && (
                    <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>/mo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2.5 mb-6 flex-1">
                  {tier.highlights.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: tier.popular ? 'var(--accent)' : 'var(--status-active)' }} />
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href={tier.ctaHref}
                  className="w-full text-center py-2.5 text-sm font-bold rounded-xl transition-all duration-150 hover:scale-[1.01]"
                  style={{ background: tier.popular ? 'var(--accent-gradient)' : 'transparent', color: tier.popular ? 'var(--text-inverse)' : 'var(--text-secondary)', border: tier.popular ? 'none' : '1px solid var(--border-subtle)' }}
                >
                  {tier.cta}
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn className="text-center" delay={0.3}>
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            View full pricing &amp; feature comparison
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* ───────── Final CTA ───────── */
function FinalCTASection() {
  return (
    <section className="w-full py-24 px-6 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 40%, transparent 65%)' }} />
      <div className="max-w-[640px] mx-auto text-center relative z-10">
        <FadeIn>
          <h2 className="font-space text-4xl md:text-5xl font-bold text-white mb-5">Put an AI analyst on every account</h2>
          <p className="text-base mb-8 max-w-[460px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Connect your platforms in two minutes and see the first drafts today. You approve everything that ships.</p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <Link href="/auth/signup" className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-sm rounded-xl">
              Start Free Trial
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/pricing" className="btn-secondary inline-flex items-center gap-2 px-6 py-3.5 text-sm rounded-xl">
              View pricing
            </Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No credit card required</p>
        </FadeIn>
      </div>
    </section>
  );
}

export function HomeContent() {
  return (
    <div>
      <HeroSection />
      <CredibilityBar />
      <ProblemSection />
      <SolutionPillarsSection />
      <HowItWorksSection />
      <FeaturesGridSection />
      <WhyAdNexusSection />
      <PricingTeaserSection />
      <FinalCTASection />
    </div>
  );
}
