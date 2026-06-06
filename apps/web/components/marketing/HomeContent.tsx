'use client';

import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight, Play, Sparkles, Palette,
  Check, ChevronRight, Zap, AlertTriangle,
  Bot, CheckCircle2,
  BrainCircuit, Globe, Cpu,
  Clock, XCircle, BarChart2, FileText,
  Eye, Wallet, Cable, ChevronDown,
  TrendingUp, Layers, Shield, Lock,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { PRICING_TIERS, formatPrice } from '@/lib/marketing/pricing';
import { CredibilityBar } from '@/components/marketing/CredibilityBar';
import { ProductShowcase } from '@/components/marketing/ProductShowcase';
import { HomeComparison } from '@/components/marketing/HomeComparison';
import { FadeIn, StaggerContainer, StaggerItem, CountUp, HoverScale } from './v3/animations';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];
const easeBounce = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ───────── Hero ───────── */
function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden px-6" style={{ background: 'var(--bg-primary)' }}>
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 65%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 65%)',
        }}
      />
      {/* Single-color ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none opacity-10" style={{ background: 'radial-gradient(circle, rgba(195,245,59,0.12), transparent 70%)', filter: 'blur(80px)' }} />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-center relative z-10">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: easeBounce }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(195,245,59,0.1)', border: '1px solid rgba(195,245,59,0.2)', color: '#c3f53b' }}
          >
            <Sparkles size={12} aria-hidden="true" />
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase">The Intelligent Campaign Workspace</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: easeSmooth }}
            className="font-space font-bold text-5xl md:text-6xl leading-[1.08] tracking-[-0.02em] mb-6"
          >
            Nothing goes live
            <br />
            without <span className="text-[#c3f53b]">your</span>
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
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold rounded-lg transition-all duration-150 hover:scale-[1.02]"
              style={{ background: '#c3f53b', color: '#0a0a0a' }}
            >
              Request Pilot Access
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium rounded-lg border transition-all duration-150 hover:text-white"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
            >
              <Play size={14} aria-hidden="true" />
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
            Sales-led provisioning &bull; 2-minute setup &bull; Cancel anytime
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
          transition={{ delay: 0.5, duration: 0.9, ease: easeBounce }}
          className="relative hidden lg:flex items-center justify-center"
          style={{ height: '540px' }}
        >
          <div className="absolute w-[500px] h-[480px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(195,245,59,0.06) 0%, transparent 70%)', animation: 'glow-pulse 4s infinite' }} />
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
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>7d</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-16">
                    {[35, 52, 45, 68, 58, 82, 75, 90, 85, 95, 88, 92].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i >= 9 ? 'linear-gradient(to top, #c3f53b, rgba(195,245,59,0.4))' : 'linear-gradient(to top, rgba(195,245,59,0.3), rgba(195,245,59,0.08))' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3">
                <div className="rounded-lg p-3 flex items-start gap-3" style={{ background: 'rgba(195,245,59,0.05)', border: '1px solid rgba(195,245,59,0.15)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(195,245,59,0.12)' }}>
                    <Eye size={14} style={{ color: '#c3f53b' }} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white mb-0.5">3 Drafts Awaiting Approval</div>
                    <div className="text-[10px] mb-2" style={{ color: 'var(--text-secondary)' }}>AI suggested budget shifts for Meta &amp; Google campaigns</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: '#c3f53b', color: '#0a0a0a' }}>Review</span>
                      <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Dismiss</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#c3f53b' }} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Scroll</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ───────── Problem ───────── */
function ProblemSection() {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const painPoints = [
    { stat: 'Hours', label: 'lost to manual reporting every week', icon: <Clock size={24} style={{ color: '#c3f53b' }} aria-hidden="true" />, desc: 'You pull the same numbers across four dashboards before you can make a single decision. The analysis eats the time you needed for strategy.' },
    { stat: '20-30%', label: 'of spend wasted on tired creative', icon: <AlertTriangle size={24} style={{ color: '#c3f53b' }} aria-hidden="true" />, desc: 'Creative fatigues in days. By the time you notice the drop, the budget is already gone. Industry research puts the waste at a fifth to a third of spend.' },
    { stat: 'Zero', label: 'tools pair AI with real guardrails', icon: <XCircle size={24} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />, desc: 'Today you choose between automation that acts without asking, or manual work across disconnected platforms. Nobody gives you both speed and control.' },
  ];

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: 'var(--status-error)' }}>The Problem</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Running ads shouldn&apos;t take superhuman effort</h2>
          <p className="text-sm max-w-[480px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Four platforms. A dozen dashboards. One person trying to keep up.</p>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {painPoints.map((point) => (
            <StaggerItem key={point.label}>
              <HoverScale>
                <div className="card-surface p-6 text-center h-full">
                  <div className="flex justify-center mb-4">{point.icon}</div>
                  <div className="font-mono-data text-5xl font-bold text-white mb-2">{point.stat}</div>
                  <div className="text-sm font-semibold text-white mb-3">{point.label}</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{point.desc}</p>
                </div>
              </HoverScale>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ───────── Solution pillars ───────── */
function SolutionPillarsSection() {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const pillars = [
    { title: 'Approve before anything ships', icon: <CheckCircle2 size={28} style={{ color: '#c3f53b' }} aria-hidden="true" />, description: 'Every change the AI proposes arrives as a draft. Read the reasoning, edit a number, approve or reject. Your live budget never moves on its own.', accent: '#c3f53b' },
    { title: 'Talk to your ads in plain English', icon: <Cable size={28} style={{ color: '#A78BFA' }} aria-hidden="true" />, description: 'Built on the open Model Context Protocol, so Claude, ChatGPT, or Cursor connect straight to your accounts. Ask a question, get an answer from live data.', accent: '#A78BFA' },
    { title: 'See every platform clearly', icon: <Globe size={28} style={{ color: '#2563EB' }} aria-hidden="true" />, description: 'Start Meta-first with Google reporting, then add Google write access plus TikTok and Snap on Scale. The AI reasons across connected channels without implying unsupported writes.', accent: '#2563EB' },
  ];

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: 'var(--status-active)' }}>The Solution</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Speed and control, finally together</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Three ideas hold the whole product together. Each one earns your trust before it asks for it.</p>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {pillars.map((pillar) => (
            <StaggerItem key={pillar.title}>
              <HoverScale>
                <div className="card-surface p-6 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${pillar.accent}15` }}>{pillar.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{pillar.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{pillar.description}</p>
                </div>
              </HoverScale>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ───────── How it works ───────── */
function HowItWorksSection() {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const steps = [
    { num: '01', title: 'Connect in two minutes', desc: 'Link Meta with secure OAuth, add Google for read-only reporting on Growth, and unlock Google writes plus TikTok/Snap on Scale. No code, no spreadsheets, no waiting on a sales call.', icon: <Globe size={24} style={{ color: '#2563EB' }} aria-hidden="true" />, features: ['One-click OAuth', 'Clear access levels', 'Secure tokens'] },
    { num: '02', title: 'Let the agent find the wins', desc: 'It watches every account around the clock, spots the budget leaks and tired creative, and writes the fix as a draft. It never publishes on its own.', icon: <BrainCircuit size={24} style={{ color: '#A78BFA' }} aria-hidden="true" />, features: ['24/7 monitoring', 'Predictive insights', 'Draft generation'] },
    { num: '03', title: 'Approve with one click', desc: 'Read each draft and the reasoning behind it, tweak if you want, then approve. Every action is logged for a full audit trail.', icon: <CheckCircle2 size={24} style={{ color: '#c3f53b' }} aria-hidden="true" />, features: ['One-click approve', 'Edit drafts', 'Full audit trail'] },
  ];

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-[1000px] mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>How It Works</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">From insight to action in <span className="text-[#c3f53b]">3 steps</span></h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>AI does the heavy lifting. You stay in control.</p>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step) => (
            <StaggerItem key={step.num}>
              <div className="text-center relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 relative z-10" style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border-subtle)' }}>{step.icon}</div>
                <div className="p-5 rounded-xl text-left h-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div className="font-mono-data text-[10px] font-bold tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>STEP {step.num}</div>
                  <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {step.features.map((f) => (
                      <span key={f} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ───────── Features grid ───────── */
function FeaturesGridSection() {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const features = [
    { title: 'AI Agent', desc: 'Autonomous monitoring that proactively identifies issues and generates optimization drafts.', icon: <Bot size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'Morning Brief', desc: 'Start each day with a summary of what changed, what needs attention, and what the AI recommends.', icon: <FileText size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'Creative Fatigue', desc: 'AI detects when ad performance drops, alerts you, and suggests replacements before budget is wasted.', icon: <Palette size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'Competitive Intel', desc: 'Track competitor ad activity, spending patterns, and creative strategies across platforms.', icon: <Eye size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'Budget Pacing', desc: 'Smart budget allocation across campaigns and platforms to maximize ROAS throughout the month.', icon: <Wallet size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'Approval Workflows', desc: 'Multi-tier approval chains. Junior reviewers suggest, seniors approve. Full audit trails.', icon: <CheckCircle2 size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'Cross-Platform Reporting', desc: 'Unified dashboards aggregating Meta performance now, with Google, TikTok, and Snap marked read-only or coming soon as support expands.', icon: <BarChart2 size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'MCP Integration', desc: 'Native MCP server support. Works with Claude, ChatGPT, Cursor, and any MCP-compatible client.', icon: <Cable size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
  ];

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1100px] mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>Features</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">One workspace for the whole job</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>From the morning brief to the final approval, everything lives in one place.</p>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <HoverScale y={-4}>
                <div className="card-surface p-5 h-full">
                  <div className="mb-3">{feature.icon}</div>
                  <h3 className="text-sm font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.desc}</p>
                </div>
              </HoverScale>
            </StaggerItem>
          ))}
        </StaggerContainer>
        <FadeIn className="text-center mt-10" delay={0.2}>
          <Link href="/features" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#c3f53b' }}>
            Explore all features
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* ───────── Stats band ───────── */
function StatsBandSection() {
  const stats = [
    { value: 4.2, suffix: 'x', prefix: '', decimals: 1, label: 'Average ROAS improvement' },
    { value: 12, suffix: 'h', prefix: '', decimals: 0, label: 'Hours saved per week' },
    { value: 35, suffix: '%', prefix: '', decimals: 0, label: 'Reduction in wasted spend' },
    { value: 4, suffix: '', prefix: '', decimals: 0, label: 'Platforms unified' },
  ];

  return (
    <section className="w-full py-20 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-4xl mx-auto">
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="text-center">
                <div className="font-mono-data text-4xl md:text-5xl font-bold text-white mb-2">
                  <CountUp end={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} />
                </div>
                <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ───────── Trust badges ───────── */
function TrustBadgesSection() {
  const badges = [
    { icon: <Shield size={20} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'SOC 2 Ready', desc: 'Security controls audited' },
    { icon: <Lock size={20} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'GDPR Compliant', desc: 'EU data protection ready' },
    { icon: <CheckCircle2 size={20} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: 'OAuth Only', desc: 'Never stores passwords' },
    { icon: <TrendingUp size={20} style={{ color: '#c3f53b' }} aria-hidden="true" />, title: '99.9% Uptime', desc: 'Enterprise SLA available' },
  ];

  return (
    <section className="w-full py-16 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <FadeIn className="text-center mb-10">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: 'var(--text-tertiary)' }}>Enterprise Ready</span>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <StaggerItem key={badge.title}>
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                {badge.icon}
                <div>
                  <div className="text-sm font-semibold text-white">{badge.title}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{badge.desc}</div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

/* ───────── Why AdNexus ───────── */
function WhyAdNexusSection() {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const points = [
    { title: 'vs MCP-only tools', desc: 'Chat connectors like Pipeboard have no dashboard and no governance. AdNexus pairs the AI with a visual workspace and draft approvals.', icon: <Cpu size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'vs Meta-only platforms', desc: 'Madgicx optimizes one platform. AdNexus starts with Meta execution and a clear cross-platform roadmap instead of overstating launch scope.', icon: <Globe size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
    { title: 'vs manual rule engines', desc: 'Rule-based tools make you write every trigger by hand. AdNexus is AI-native — it proposes the changes, you approve them.', icon: <BrainCircuit size={22} style={{ color: '#c3f53b' }} aria-hidden="true" /> },
  ];

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>Why AdNexus</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">The gap no other tool fills</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Every alternative makes you trade something away. AdNexus is the one built to give you all three at once.</p>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {points.map((p) => (
            <StaggerItem key={p.title}>
              <HoverScale>
                <div className="card-surface p-6 h-full">
                  <div className="mb-4">{p.icon}</div>
                  <h3 className="text-base font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.desc}</p>
                </div>
              </HoverScale>
            </StaggerItem>
          ))}
        </StaggerContainer>
        <FadeIn className="text-center mt-10" delay={0.2}>
          <Link href="/compare/pipeboard" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#c3f53b' }}>
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
  const { ref, isVisible } = useScrollAnimation(0.2);

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1100px] mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>Pricing</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Flat pricing that never scales with your ad spend</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Start free. Upgrade as your strategy grows — not as your budget does.</p>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {PRICING_TIERS.map((tier, i) => (
            <StaggerItem key={tier.id}>
              <HoverScale>
                <div
                  className="card-surface p-6 relative flex flex-col h-full"
                  style={{ borderColor: tier.popular ? 'rgba(195,245,59,0.4)' : 'var(--border-subtle)', boxShadow: tier.popular ? '0 0 30px rgba(195,245,59,0.08)' : undefined }}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: '#c3f53b', color: '#0a0a0a' }}>Most Popular</div>
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
                        <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: tier.popular ? '#c3f53b' : 'var(--status-active)' }} aria-hidden="true" />
                        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={tier.ctaHref}
                    className="w-full text-center py-2.5 text-sm font-bold rounded-lg transition-all duration-150 hover:scale-[1.01]"
                    style={{ background: tier.popular ? '#c3f53b' : 'transparent', color: tier.popular ? '#0a0a0a' : 'var(--text-secondary)', border: tier.popular ? 'none' : '1px solid var(--border-subtle)' }}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </HoverScale>
            </StaggerItem>
          ))}
        </StaggerContainer>
        <FadeIn className="text-center" delay={0.3}>
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#c3f53b' }}>
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
  const { ref, isVisible } = useScrollAnimation(0.4);
  return (
    <section ref={ref} className="w-full py-24 px-6 relative overflow-hidden" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
      {/* Single-color ambient glow — no rainbow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(195,245,59,0.06) 0%, transparent 60%)' }} />
      <div className="max-w-[640px] mx-auto text-center relative z-10">
        <FadeIn>
          <h2 className="font-space text-4xl md:text-5xl font-bold text-white mb-5">Put an AI analyst on every account</h2>
          <p className="text-base mb-8 max-w-[460px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Connect your platforms in two minutes and see the first drafts today. You approve everything that ships.</p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-lg transition-all duration-150 hover:scale-[1.02]" style={{ background: '#c3f53b', color: '#0a0a0a' }}>
              Request Pilot Access
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium rounded-lg border transition-all duration-150 hover:text-white" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
              View pricing
            </Link>
          </div>
        </FadeIn>
        <FadeIn delay={0.4}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sales-led provisioning</p>
        </FadeIn>
      </div>
    </section>

  );
}
/* ───────── Testimonials ───────── */
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "We cut our reporting time by 80%. The AI drafts budget shifts overnight and I approve them with my morning coffee. No more jumping between four dashboards.",
      name: "Sarah Chen",
      role: "Performance Marketing Director",
      company: "ScaleUp Commerce",
    },
    {
      quote: "The draft-approval workflow is exactly what we needed. Our team was skeptical about AI autonomy, but having full control over every change won them over in a week.",
      name: "Marcus Johnson",
      role: "Head of Growth",
      company: "Nordic Brands Group",
    },
    {
      quote: "We caught creative fatigue before it burned through our budget. The AI flagged declining CTR on our top performer and suggested a replacement that outperformed the original.",
      name: "Elena Rodriguez",
      role: "Paid Social Lead",
      company: "Velocity Agency",
    },
  ];

  return (
    <section className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>What teams say</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Trusted by marketers who demand control</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>Teams managing $10M+ in annual ad spend rely on AdNexus to scale without losing oversight.</p>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <HoverScale>
                <div className="card-surface p-6 h-full flex flex-col">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c3f53b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4" aria-hidden="true">
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                  </svg>
                  <p className="text-[14px] leading-relaxed flex-1 mb-6" style={{ color: 'var(--text-secondary)' }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{t.role}, {t.company}</div>
                    </div>
                  </div>
                </div>
              </HoverScale>
            </StaggerItem>
          ))}
        </StaggerContainer>
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
      <ProductShowcase />
      <TestimonialsSection />
      <FeaturesGridSection />
      <StatsBandSection />
      <TrustBadgesSection />
      <WhyAdNexusSection />
      <HomeComparison />
      <PricingTeaserSection />
      <FinalCTASection />
    </div>
  );
}
