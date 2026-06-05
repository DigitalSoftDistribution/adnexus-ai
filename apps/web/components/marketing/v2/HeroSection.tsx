'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Play, Sparkles, Globe, CheckCircle2, Cable } from 'lucide-react';
import { GradientOrb } from './animations';
import { easeSmooth, easeBounce } from '@/lib/marketing/animations';

export function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section
      ref={ref}
      className="relative min-h-[100dvh] flex items-center overflow-hidden px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Animated gradient background */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y, opacity }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(195,245,59,0.08)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(37,99,235,0.08)_0%,_transparent_50%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Floating orbs */}
      <GradientOrb
        color="rgba(195,245,59,0.08)"
        size={384}
        blur={80}
        opacity={0.8}
        className="top-20 left-10"
        delay={0}
      />
      <GradientOrb
        color="rgba(37,99,235,0.1)"
        size={480}
        blur={100}
        opacity={0.6}
        className="bottom-20 right-20"
        delay={2}
      />
      <GradientOrb
        color="rgba(167,139,250,0.06)"
        size={320}
        blur={60}
        opacity={0.5}
        className="top-1/2 left-1/3"
        delay={4}
      />

      {/* Content */}
      <motion.div
        className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-center relative z-10"
        style={{ opacity, scale }}
      >
        <div>
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: easeBounce }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{
              background: 'rgba(195,245,59,0.1)',
              border: '1px solid rgba(195,245,59,0.2)',
              color: '#c3f53b',
            }}
          >
            <Sparkles size={12} aria-hidden="true" />
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
            <span
              className="text-gradient-blue glow-text-blue"
              style={{
                background: 'linear-gradient(135deg, #c3f53b 0%, #2563EB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              your
            </span>
            <br />
            approval
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: easeSmooth }}
            className="text-base md:text-lg leading-relaxed max-w-[520px] mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            An AI agent watches your Meta, Google, TikTok, and Snap campaigns around the clock
            and drafts the fixes. You review each one and approve with a click. Nothing reaches
            your live budget until you say so.
          </motion.p>

          {/* CTAs */}
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
              Start Free Trial
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium rounded-lg border transition-all duration-150 hover:text-white"
              style={{
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Play size={14} aria-hidden="true" />
              See how it works
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.3 }}
            className="text-xs mb-10"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No credit card required &bull; 2-minute setup &bull; Cancel anytime
          </motion.p>

          {/* Badges */}
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
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
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
          <div
            className="absolute w-[500px] h-[480px] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse, rgba(195,245,59,0.08) 0%, rgba(37,99,235,0.08) 50%, transparent 70%)',
            }}
          />
          <div
            className="relative w-full max-w-[480px]"
            style={{
              perspective: '1000px',
              animation: 'float 6s ease-in-out infinite',
            }}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                boxShadow:
                  '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                transform: 'rotateY(-6deg) rotateX(3deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                </div>
                <div className="flex-1 text-center">
                  <span
                    className="text-[10px] font-mono-data"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    AdNexus AI Dashboard
                  </span>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-3 gap-2 p-3">
                {[
                  { label: 'ROAS', value: '4.2x', change: '+12%' },
                  { label: 'Spend', value: '$24.8K', change: '-3%' },
                  { label: 'CPA', value: '$18.5', change: '-8%' },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-lg p-2.5"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    <div
                      className="text-[9px] uppercase tracking-wider mb-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {kpi.label}
                    </div>
                    <div className="text-sm font-bold text-white font-mono-data">
                      {kpi.value}
                    </div>
                    <div
                      className="text-[9px] font-medium"
                      style={{ color: 'var(--status-active)' }}
                    >
                      {kpi.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="px-3 pb-3">
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Campaign Performance
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      7d
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5 h-16">
                    {[35, 52, 45, 68, 58, 82, 75, 90, 85, 95, 88, 92].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-sm"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{
                          delay: 0.8 + i * 0.05,
                          duration: 0.5,
                          ease: easeSmooth,
                        }}
                        style={{
                          background:
                            i >= 9
                              ? 'linear-gradient(to top, #c3f53b, rgba(195,245,59,0.4))'
                              : 'linear-gradient(to top, rgba(37,99,235,0.5), rgba(37,99,235,0.15))',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Draft alert */}
              <div className="px-3 pb-3">
                <div
                  className="rounded-lg p-3 flex items-start gap-3"
                  style={{
                    background: 'rgba(195,245,59,0.05)',
                    border: '1px solid rgba(195,245,59,0.15)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(195,245,59,0.12)' }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#c3f53b"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white mb-0.5">
                      3 Drafts Awaiting Approval
                    </div>
                    <div
                      className="text-[10px] mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      AI suggested budget shifts for Meta &amp; Google campaigns
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] px-2 py-1 rounded font-medium"
                        style={{ background: '#c3f53b', color: '#0a0a0a' }}
                      >
                        Review
                      </span>
                      <span
                        className="text-[9px] px-2 py-1 rounded font-medium"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Dismiss
                      </span>
                    </div>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                    style={{ background: '#c3f53b' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
