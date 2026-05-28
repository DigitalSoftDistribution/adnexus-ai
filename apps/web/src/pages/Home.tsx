import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Play, Sparkles, BarChart3, TrendingUp,
  Bell, Palette, GitBranch, Shield, Lock, Key,
  Check, ChevronRight, Zap, AlertTriangle,
  Bot, Layers, CheckCircle2, MousePointerClick,
  BrainCircuit, Rocket, Globe, Cpu, LineChart,
  Users, Briefcase, Infinity, Headphones, Building2,
  Clock, XCircle, Code2, BarChart2, FileText,
  Eye, Repeat, Wallet, Landmark, MessageSquare,
  Star, ChevronDown, Github, Twitter, Linkedin,
  ExternalLink, Activity, Fingerprint, Radio,
  Server, Cable, Smartphone, Tablet, Monitor,
} from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import SEO from '../components/SEO';

/* ───────── easing helpers ───────── */
const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number]
const easeBounce = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

/* ═══════════════════════════════════
   Fade-In Scroll Wrapper
   ═══════════════════════════════════ */
function FadeInSection({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right'
}) {
  const { ref, isVisible } = useScrollAnimation(0.15)

  const initial = direction === 'up' ? { opacity: 0, y: 40 }
    : direction === 'left' ? { opacity: 0, x: -40 }
      : { opacity: 0, x: 40 }

  const animate = isVisible
    ? { opacity: 1, y: 0, x: 0 }
    : initial

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{ duration: 0.6, delay, ease: easeSmooth }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ═══════════════════════════════════
   Animated Counter Hook
   ═══════════════════════════════════ */
function useAnimatedCounter(end: number, duration: number = 2000, decimals: number = 0) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true)
        }
      },
      { threshold: 0.5 }
    )

    const current = ref.current
    if (current) observer.observe(current)
    return () => { if (current) observer.unobserve(current) }
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return

    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(eased * end)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [hasStarted, end, duration])

  const formatted = decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toString()
  return { ref, formatted, hasStarted }
}

/* ═══════════════════════════════════
   Section 1: Hero (full viewport)
   ═══════════════════════════════════ */
function HeroSection() {
  return (
    <section
      className="relative min-h-[100dvh] flex items-center overflow-hidden px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
      />

      {/* Floating background orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(195,245,59,0.15), transparent 70%)', filter: 'blur(60px)' }}
      />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full pointer-events-none opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2), transparent 70%)', filter: 'blur(80px)' }}
      />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-center relative z-10">
        {/* Left: text */}
        <div>
          {/* Floating pill badge */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: easeBounce }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(195,245,59,0.1)', border: '1px solid rgba(195,245,59,0.2)', color: '#c3f53b' }}
          >
            <Sparkles size={12} />
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase">
              The Intelligent Campaign Workspace
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: easeSmooth }}
            className="font-space font-bold text-5xl md:text-6xl leading-[1.08] tracking-[-0.02em] mb-6"
          >
            Nothing goes live
            <br />
            without{' '}
            <span className="text-gradient-blue glow-text-blue">your</span>
            <br />
            approval
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: easeSmooth }}
            className="text-base md:text-lg leading-relaxed max-w-[520px] mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            AI-powered ad management across Meta, Google, TikTok, and Snap —
            where every AI-generated change is a draft awaiting your approval.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4, ease: easeSmooth }}
            className="flex flex-wrap items-center gap-4 mb-6"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold rounded-lg transition-all duration-150 hover:scale-[1.02]"
              style={{ background: '#c3f53b', color: '#0a0a0a' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.boxShadow = '0 0 30px rgba(195,245,59,0.4)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.boxShadow = 'none'
              }}
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
            <button
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium rounded-lg border transition-all duration-150"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.color = 'var(--text-primary)'
                el.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.color = 'var(--text-secondary)'
                el.style.background = 'transparent'
              }}
            >
              <Play size={14} />
              Watch Demo
            </button>
          </motion.div>

          {/* Trust microcopy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.3 }}
            className="text-xs mb-10"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No credit card required &bull; 2-minute setup &bull; Cancel anytime
          </motion.p>

          {/* Floating badges row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.4 }}
            className="flex flex-wrap items-center gap-3"
          >
            {[
              { label: 'MCP Native', icon: <Cable size={12} /> },
              { label: 'Draft-First Approval', icon: <CheckCircle2 size={12} /> },
              { label: '4 Platforms', icon: <Globe size={12} /> },
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

        {/* Right: Animated Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9, ease: easeBounce }}
          className="relative hidden lg:flex items-center justify-center"
          style={{ height: '540px' }}
        >
          {/* Glow */}
          <div
            className="absolute w-[500px] h-[480px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, rgba(195,245,59,0.08) 0%, rgba(37,99,235,0.08) 50%, transparent 70%)',
              animation: 'glow-pulse 4s infinite',
            }}
          />

          {/* Dashboard mockup container */}
          <div
            className="relative w-full max-w-[480px]"
            style={{ perspective: '1000px', animation: 'float 6s ease-in-out infinite' }}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                transform: 'rotateY(-6deg) rotateX(3deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Mockup header bar */}
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

              {/* Mockup content: KPI cards */}
              <div className="grid grid-cols-3 gap-2 p-3">
                {[
                  { label: 'ROAS', value: '4.2x', change: '+12%', up: true },
                  { label: 'Spend', value: '$24.8K', change: '-3%', up: true },
                  { label: 'CPA', value: '$18.5', change: '-8%', up: true },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg p-2.5" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</div>
                    <div className="text-sm font-bold text-white font-mono-data">{kpi.value}</div>
                    <div className="text-[9px] font-medium" style={{ color: 'var(--status-active)' }}>{kpi.change}</div>
                  </div>
                ))}
              </div>

              {/* Mockup: Chart area */}
              <div className="px-3 pb-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Campaign Performance</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>7d</span>
                  </div>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-1.5 h-16">
                    {[35, 52, 45, 68, 58, 82, 75, 90, 85, 95, 88, 92].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${h}%`,
                          background: i >= 9 ? 'linear-gradient(to top, #c3f53b, rgba(195,245,59,0.4))' : 'linear-gradient(to top, rgba(37,99,235,0.5), rgba(37,99,235,0.15))',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Mon</span>
                    <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Sun</span>
                  </div>
                </div>
              </div>

              {/* Mockup: Draft Approval notification */}
              <div className="px-3 pb-3">
                <div
                  className="rounded-lg p-3 flex items-start gap-3"
                  style={{
                    background: 'rgba(195,245,59,0.05)',
                    border: '1px solid rgba(195,245,59,0.15)',
                  }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(195,245,59,0.12)' }}
                  >
                    <Eye size={14} style={{ color: '#c3f53b' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white mb-0.5">3 Drafts Awaiting Approval</div>
                    <div className="text-[10px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                      AI suggested budget shifts for Meta & Google campaigns
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: '#c3f53b', color: '#0a0a0a' }}>Review</span>
                      <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Dismiss</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#c3f53b' }} />
                </div>
              </div>
            </div>

            {/* Reflection */}
            <div
              className="absolute left-0 right-0 h-16 overflow-hidden pointer-events-none"
              style={{
                bottom: '-64px',
                transform: 'skewY(-8deg)',
                transformOrigin: 'top',
                opacity: 0.08,
                filter: 'blur(6px)',
              }}
            >
              <div
                className="w-full h-[540px] rounded-xl"
                style={{
                  background: 'var(--bg-elevated)',
                  transform: 'scaleY(-1)',
                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 80%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 80%)',
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ═══════════════════════════════════
   Section 2: The Problem
   ═══════════════════════════════════ */
function ProblemSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  const painPoints = [
    {
      stat: '56%',
      label: 'of marketers lack time to analyze data',
      icon: <Clock size={24} style={{ color: '#F59E0B' }} />,
      desc: 'Manual reporting and analysis consumes hours each week, leaving little time for strategic decision-making.',
    },
    {
      stat: '20-30%',
      label: 'of budgets wasted on creative fatigue',
      icon: <AlertTriangle size={24} style={{ color: '#EF4444' }} />,
      desc: 'Ad creative fatigue goes undetected, burning through budget on worn-out assets that no longer convert.',
    },
    {
      stat: 'Zero',
      label: 'tools combine AI + cross-platform + governance',
      icon: <XCircle size={24} style={{ color: 'var(--text-tertiary)' }} />,
      desc: 'Existing tools either optimize automatically without oversight or require manual work across disconnected platforms.',
    },
  ]

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto">
        <FadeInSection className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: 'var(--status-error)' }}>
            The Problem
          </span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">
            Marketers are overwhelmed
          </h2>
          <p className="text-sm max-w-[480px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Managing campaigns across multiple platforms shouldn&apos;t require superhuman effort.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {painPoints.map((point, i) => (
            <motion.div
              key={point.label}
              initial={{ opacity: 0, y: 40 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12, ease: easeSmooth }}
              className="card-surface p-6 text-center group hover-lift"
            >
              <div className="flex justify-center mb-4">{point.icon}</div>
              <div className="font-mono-data text-5xl font-bold text-white mb-2">{point.stat}</div>
              <div className="text-sm font-semibold text-white mb-3">{point.label}</div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{point.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════
   Section 3: The Solution — 3 Pillars
   ═══════════════════════════════════ */
function SolutionPillarsSection() {
  const { ref, isVisible } = useScrollAnimation(0.15)

  const pillars = [
    {
      title: 'Draft-First Approval',
      icon: <CheckCircle2 size={28} style={{ color: '#c3f53b' }} />,
      description: 'Every AI-generated change lands as a draft. Review, edit, approve, or reject — full control over what goes live.',
      accent: '#c3f53b',
      mockup: (
        <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', color: 'white' }}>AI</div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Suggested budget reallocation</span>
          </div>
          {[
            { label: 'Meta Retargeting', change: '+$450', approved: true },
            { label: 'Google Search', change: '-$200', approved: true },
            { label: 'TikTok Awareness', change: '-$250', approved: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-[11px] text-white">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono-data" style={{ color: item.approved ? '#c3f53b' : '#F59E0B' }}>{item.change}</span>
                {item.approved ? <CheckCircle2 size={12} style={{ color: '#c3f53b' }} /> : <Clock size={12} style={{ color: '#F59E0B' }} />}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: '#c3f53b', color: '#0a0a0a' }}>Approve 2</span>
            <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Edit</span>
            <span className="text-[9px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>Reject All</span>
          </div>
        </div>
      ),
    },
    {
      title: 'MCP-Native Architecture',
      icon: <Cable size={28} style={{ color: '#A78BFA' }} />,
      description: 'Built on the Model Context Protocol. Your AI assistant talks directly to ad platforms through a secure, standardized interface.',
      accent: '#A78BFA',
      mockup: (
        <div className="rounded-lg overflow-hidden" style={{ background: '#0D1117', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: 'var(--bg-secondary)' }}>
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="ml-2 text-[9px] font-mono-data" style={{ color: 'var(--text-tertiary)' }}>mcp-config.json</span>
          </div>
          <div className="p-3 font-mono-data text-[10px] leading-[18px]">
            <div><span style={{ color: '#A78BFA' }}>&quot;adnexus&quot;</span>: <span style={{ color: 'var(--text-tertiary)' }}>{'{'}</span></div>
            <div className="pl-3"><span style={{ color: '#A78BFA' }}>&quot;command&quot;</span>: <span style={{ color: '#10B981' }}>&quot;npx adnexus-mcp&quot;</span>,</div>
            <div className="pl-3"><span style={{ color: '#A78BFA' }}>&quot;platforms&quot;</span>: [</div>
            <div className="pl-6"><span style={{ color: '#10B981' }}>&quot;meta&quot;</span>, <span style={{ color: '#10B981' }}>&quot;google&quot;</span>,</div>
            <div className="pl-6"><span style={{ color: '#10B981' }}>&quot;tiktok&quot;</span>, <span style={{ color: '#10B981' }}>&quot;snap&quot;</span></div>
            <div className="pl-3">],</div>
            <div className="pl-3"><span style={{ color: '#A78BFA' }}>&quot;approval_mode&quot;</span>: <span style={{ color: '#F59E0B' }}>&quot;draft-first&quot;</span></div>
            <div><span style={{ color: 'var(--text-tertiary)' }}>{'}'}</span></div>
          </div>
        </div>
      ),
    },
    {
      title: 'Cross-Platform Intelligence',
      icon: <Globe size={28} style={{ color: 'var(--accent)' }} />,
      description: 'Unified reporting and optimization across Meta, Google, TikTok, and Snap — one dashboard, one brain, zero fragmentation.',
      accent: '#2563EB',
      mockup: (
        <div className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Meta', color: '#1877F2', spend: '$12.4K', roas: '4.2x', share: 65 },
              { name: 'Google', color: '#DB4437', spend: '$8.1K', roas: '3.8x', share: 42 },
              { name: 'TikTok', color: '#00F2EA', spend: '$3.2K', roas: '5.1x', share: 25 },
              { name: 'Snap', color: '#FFFC00', spend: '$1.1K', roas: '3.5x', share: 12 },
            ].map((p) => (
              <div key={p.name} className="rounded p-2 flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <span className="text-[10px] font-semibold text-white">{p.name}</span>
                </div>
                <div className="text-[11px] font-mono-data text-white">{p.spend}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>ROAS {p.roas}</div>
                <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                  <div className="h-full rounded-full" style={{ width: `${p.share}%`, background: p.color, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <FadeInSection className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: 'var(--status-active)' }}>
            The Solution
          </span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">
            Three pillars of intelligent ad management
          </h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
            A fundamentally different approach to AI-powered advertising — built on transparency, control, and cross-platform cohesion.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15, ease: easeSmooth }}
              className="card-surface overflow-hidden flex flex-col"
            >
              {/* Pillar header */}
              <div className="p-6 flex-1">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${pillar.accent}15` }}
                >
                  {pillar.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{pillar.title}</h3>
                <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {pillar.description}
                </p>
              </div>
              {/* Pillar mockup */}
              <div className="px-6 pb-6">
                {pillar.mockup}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════
   Section 4: How It Works — 3 Steps
   ═══════════════════════════════════ */
function HowItWorksSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  const steps = [
    {
      num: '01',
      title: 'Connect your ad accounts',
      desc: 'Link Meta, Google, TikTok, and Snap via secure OAuth. Takes under 2 minutes.',
      icon: <Globe size={24} style={{ color: 'var(--accent)' }} />,
      features: ['One-click OAuth', '4 platforms', 'Secure tokens'],
    },
    {
      num: '02',
      title: 'AI analyzes & creates optimization drafts',
      desc: 'Our AI monitors performance 24/7 and generates optimization drafts — never auto-publishes.',
      icon: <BrainCircuit size={24} style={{ color: '#A78BFA' }} />,
      features: ['24/7 monitoring', 'Predictive insights', 'Draft generation'],
    },
    {
      num: '03',
      title: 'You review, approve, and publish',
      desc: 'Review each draft, make edits if needed, and approve with one click. Full governance.',
      icon: <CheckCircle2 size={24} style={{ color: '#c3f53b' }} />,
      features: ['One-click approve', 'Edit drafts', 'Full audit trail'],
    },
  ]

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-[1000px] mx-auto">
        <FadeInSection className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: 'var(--accent)' }}>
            How It Works
          </span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">
            From insight to action in <span style={{ color: '#c3f53b' }}>3 steps</span>
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            AI does the heavy lifting. You stay in control.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[32px] left-[18%] right-[18%] h-px" style={{ background: 'var(--border-subtle)' }}>
            <div
              className="h-full"
              style={{
                background: 'linear-gradient(90deg, #2563EB, #A78BFA, #c3f53b)',
                opacity: 0.4,
              }}
            />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15, ease: easeSmooth }}
              className="text-center relative"
            >
              {/* Step circle */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 relative z-10"
                style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border-subtle)' }}
              >
                {step.icon}
              </div>

              {/* Content card */}
              <div className="p-5 rounded-xl text-left" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="font-mono-data text-[10px] font-bold tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  STEP {step.num}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {step.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {step.features.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════
   Section 5: Features Grid (2x4)
   ═══════════════════════════════════ */
function FeaturesGridSection() {
  const { ref, isVisible } = useScrollAnimation(0.15)

  const features = [
    {
      title: 'AI Agent',
      desc: 'Autonomous monitoring that proactively identifies issues and generates optimization drafts.',
      icon: <Bot size={22} style={{ color: '#A78BFA' }} />,
    },
    {
      title: 'Morning Brief',
      desc: 'Start every day with a curated summary of what changed, what needs attention, and what the AI recommends.',
      icon: <FileText size={22} style={{ color: '#F59E0B' }} />,
    },
    {
      title: 'Creative Fatigue',
      desc: 'AI detects when ad creative performance drops, alerts you, and suggests replacements before budget is wasted.',
      icon: <Palette size={22} style={{ color: '#EF4444' }} />,
    },
    {
      title: 'Competitive Intel',
      desc: 'Track competitor ad activity, spending patterns, and creative strategies across platforms.',
      icon: <Eye size={22} style={{ color: 'var(--accent)' }} />,
    },
    {
      title: 'Budget Pacing',
      desc: 'Smart budget allocation across campaigns and platforms to maximize ROAS throughout the month.',
      icon: <Wallet size={22} style={{ color: '#10B981' }} />,
    },
    {
      title: 'Approval Workflows',
      desc: 'Multi-tier approval chains. Junior reviewers can suggest, seniors approve. Full audit trails.',
      icon: <CheckCircle2 size={22} style={{ color: '#c3f53b' }} />,
    },
    {
      title: 'Cross-Platform Reporting',
      desc: 'Unified dashboards that aggregate performance across Meta, Google, TikTok, and Snap in real-time.',
      icon: <BarChart2 size={22} style={{ color: '#3B82F6' }} />,
    },
    {
      title: 'MCP Integration',
      desc: 'Native MCP server support. Works with Claude, ChatGPT, Cursor, and any MCP-compatible client.',
      icon: <Cable size={22} style={{ color: '#8B5CF6' }} />,
    },
  ]

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1100px] mx-auto">
        <FadeInSection className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: 'var(--accent)' }}>
            Features
          </span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">
            Everything you need to run smarter campaigns
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            A complete toolkit for AI-assisted, human-approved advertising.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.06, ease: easeSmooth }}
              className="card-surface p-5 group hover-lift cursor-pointer"
              whileHover={{ y: -4, borderColor: 'rgba(37,99,235,0.25)' }}
            >
              <div className="mb-3">{feature.icon}</div>
              <h3 className="text-sm font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════
   Section 6: Testimonials
   ═══════════════════════════════════ */
function TestimonialsSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  const testimonials = [
    {
      quote: "AdNexus changed how we manage $2M in monthly ad spend. The draft-first approach means our team never worries about rogue AI changes going live.",
      name: 'Sarah Chen',
      role: 'VP of Growth, Luminex',
      avatar: 'SC',
      avatarColor: '#2563EB',
      stars: 5,
    },
    {
      quote: "We reduced wasted spend by 28% in the first month. The creative fatigue detection alone paid for the platform. It's like having an extra analyst on the team.",
      name: 'Marcus Rodriguez',
      role: 'Head of Performance, Atlas Agency',
      avatar: 'MR',
      avatarColor: '#10B981',
      stars: 5,
    },
    {
      quote: "The MCP integration is seamless. We query campaign data from Claude and get optimization drafts within seconds. Best ad tech investment we've made.",
      name: 'Emily Watson',
      role: 'CMO, Prism Commerce',
      avatar: 'EW',
      avatarColor: '#A78BFA',
      stars: 5,
    },
  ]

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-5xl mx-auto">
        <FadeInSection className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>
            Testimonials
          </span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">
            Loved by growth teams
          </h2>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12, ease: easeSmooth }}
              className="card-surface p-6 flex flex-col"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} size={13} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                ))}
              </div>

              {/* Quote */}
              <p className="text-[13px] leading-relaxed mb-6 flex-1" style={{ color: 'var(--text-secondary)' }}>
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Avatar + info */}
              <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: t.avatarColor }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════
   Section 7: Pricing Teaser
   ═══════════════════════════════════ */
function PricingTeaserSection() {
  const { ref, isVisible } = useScrollAnimation(0.2)

  const plans = [
    {
      name: 'Growth',
      price: '$79',
      period: '/mo',
      description: 'For lean teams managing up to $50K/month in spend',
      features: ['2 platform connections', '50 AI drafts/month', 'Morning Brief', 'Email alerts', '7-day data history'],
      cta: 'Start Free Trial',
      featured: false,
    },
    {
      name: 'Scale',
      price: '$199',
      period: '/mo',
      description: 'For growing brands with multi-platform strategies',
      features: ['All 4 platforms', 'Unlimited AI drafts', 'Approval workflows', 'Creative fatigue alerts', 'Competitive intel', '30-day data history', 'Team collaboration'],
      cta: 'Start Free Trial',
      featured: true,
      badge: 'Most Popular',
    },
    {
      name: 'Accelerate',
      price: '$499',
      period: '/mo',
      description: 'For agencies and high-spend brands requiring full power',
      features: ['Everything in Scale', 'Unlimited seats', 'Custom AI rules', 'API access', 'SSO & advanced security', 'Dedicated support', 'Unlimited data history'],
      cta: 'Contact Sales',
      featured: false,
    },
  ]

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1000px] mx-auto">
        <FadeInSection className="text-center mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: 'var(--accent)' }}>
            Pricing
          </span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Start free. Scale as your spend grows.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: plan.featured ? 0.2 : i * 0.12, ease: easeSmooth }}
              className="card-surface p-6 relative flex flex-col"
              style={{
                background: 'var(--bg-elevated)',
                borderColor: plan.featured ? 'rgba(195,245,59,0.4)' : 'var(--border-subtle)',
                boxShadow: plan.featured ? '0 0 30px rgba(195,245,59,0.08)' : undefined,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: '#c3f53b', color: '#0a0a0a' }}
                >
                  {plan.badge}
                </div>
              )}

              <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
              <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>

              <div className="mb-6">
                <span className="font-mono-data text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>{plan.period}</span>
              </div>

              <div className="flex flex-col gap-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: plan.featured ? '#c3f53b' : 'var(--status-active)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                className="w-full py-2.5 text-sm font-bold rounded-lg transition-all duration-150"
                style={{
                  background: plan.featured ? '#c3f53b' : 'transparent',
                  color: plan.featured ? '#0a0a0a' : 'var(--text-secondary)',
                  border: plan.featured ? 'none' : '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  if (plan.featured) {
                    el.style.boxShadow = '0 0 20px rgba(195,245,59,0.3)'
                  } else {
                    el.style.background = 'var(--bg-hover)'
                    el.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  if (plan.featured) {
                    el.style.boxShadow = 'none'
                  } else {
                    el.style.background = 'transparent'
                    el.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* View full pricing link */}
        <FadeInSection className="text-center" delay={0.3}>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            View full pricing
            <ChevronRight size={14} />
          </Link>
        </FadeInSection>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════
   Section 8: Final CTA
   ═══════════════════════════════════ */
function FinalCTASection() {
  const { ref, isVisible } = useScrollAnimation(0.4)

  return (
    <section
      ref={ref}
      className="w-full py-24 px-6 relative overflow-hidden"
      style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(195,245,59,0.08) 0%, rgba(37,99,235,0.06) 40%, transparent 65%)',
        }}
      />

      <div className="max-w-[640px] mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
        >
          <h2 className="font-space text-4xl md:text-5xl font-bold text-white mb-5">
            Ready to transform your ad workflow?
          </h2>
          <p className="text-base mb-8 max-w-[460px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Join hundreds of teams using AdNexus AI to manage campaigns smarter —
            with full control over every AI-generated change.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
          className="flex flex-wrap items-center justify-center gap-4 mb-4"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-lg transition-all duration-150 hover:scale-[1.02]"
            style={{ background: '#c3f53b', color: '#0a0a0a' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(195,245,59,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Start Free Trial
            <ArrowRight size={16} />
          </Link>
          <button
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium rounded-lg border transition-all duration-150"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.color = 'var(--text-primary)'
              el.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.color = 'var(--text-secondary)'
              el.style.background = 'transparent'
            }}
          >
            <Play size={14} />
            Watch Demo
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          No credit card required
        </motion.p>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════
   Section 9: Footer
   ═══════════════════════════════════ */
function FooterSection() {
  const linkGroups = [
    {
      title: 'Product',
      links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap'],
    },
    {
      title: 'Resources',
      links: ['Documentation', 'API Reference', 'Blog', 'Case Studies', 'Community'],
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Contact', 'Partners', 'Press Kit'],
    },
    {
      title: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Security', 'Compliance'],
    },
  ]

  return (
    <footer className="w-full py-16 px-6" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#c3f53b' }}>
                <Zap size={16} style={{ color: '#0a0a0a' }} />
              </div>
              <span className="font-space text-base font-bold text-white">AdNexus AI</span>
            </div>
            <p className="text-[13px] leading-relaxed max-w-[240px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              The Intelligent Campaign Workspace. AI-powered ad management with draft-first approval.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: <Twitter size={16} />, label: 'Twitter' },
                { icon: <Github size={16} />, label: 'GitHub' },
                { icon: <Linkedin size={16} />, label: 'LinkedIn' },
              ].map((social) => (
                <span
                  key={social.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                    e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                  }}
                >
                  {social.icon}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link}>
                    <span
                      className="text-[13px] cursor-pointer transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            &copy; {new Date().getFullYear()} AdNexus AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Meta Business Partner</span>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>&bull;</span>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Google Partner</span>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>&bull;</span>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>SOC 2 Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════
   Home Page
   ═══════════════════════════════════ */
export default function Home() {
  return (
    <>
    <SEO
      title="AdNexus AI - The Intelligent Campaign Workspace"
      description="AdNexus AI helps marketing teams plan, launch, optimize, and report on ad campaigns with AI-powered tools. Unify multi-channel advertising in one intelligent workspace."
      keywords="AI advertising, campaign management, ad optimization, marketing platform, multi-channel ads, PPC management, AI marketing tool"
    />
    <div>
      <HeroSection />
      <ProblemSection />
      <SolutionPillarsSection />
      <HowItWorksSection />
      <FeaturesGridSection />
      <TestimonialsSection />
      <PricingTeaserSection />
      <FinalCTASection />
      <FooterSection />
    </div>
    </>
  )
}
