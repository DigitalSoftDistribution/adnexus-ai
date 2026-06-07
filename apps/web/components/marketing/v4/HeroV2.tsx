'use client';

import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, Cable, CheckCircle2, Globe } from 'lucide-react';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];
const easeBounce = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

interface HeroV2Props {
  eyebrow?: string;
  headline: React.ReactNode;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  trustItems?: string[];
  badges?: { label: string; icon: 'mcp' | 'approval' | 'platforms' }[];
  children?: React.ReactNode;
}

const BADGE_ICONS = {
  mcp: <Cable size={12} aria-hidden="true" />,
  approval: <CheckCircle2 size={12} aria-hidden="true" />,
  platforms: <Globe size={12} aria-hidden="true" />,
};

export function HeroV2({
  eyebrow = 'The Intelligent Campaign Workspace',
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  trustItems = ['No credit card required', '2-minute setup', 'Cancel anytime'],
  badges = [
    { label: 'MCP Native', icon: 'mcp' },
    { label: 'Draft-First Approval', icon: 'approval' },
    { label: '4 Platforms', icon: 'platforms' },
  ],
  children,
}: HeroV2Props) {
  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden px-6" style={{ background: 'var(--bg-primary)' }}>
      {/* Background grid */}
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
      {/* Glow orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, rgba(195,245,59,0.15), transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full pointer-events-none opacity-15" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2), transparent 70%)', filter: 'blur(80px)' }} />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-center relative z-10">
        {/* Left: copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: easeBounce }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(195,245,59,0.1)', border: '1px solid rgba(195,245,59,0.2)', color: '#c3f53b' }}
          >
            <Sparkles size={12} aria-hidden="true" />
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase">{eyebrow}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: easeSmooth }}
            className="font-space font-bold text-5xl md:text-6xl leading-[1.08] tracking-[-0.02em] mb-6"
          >
            {headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: easeSmooth }}
            className="text-base md:text-lg leading-relaxed max-w-[520px] mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            {subheadline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4, ease: easeSmooth }}
            className="flex flex-wrap items-center gap-4 mb-6"
          >
            <Link
              href={primaryCta.href}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold rounded-lg transition-all duration-150 hover:scale-[1.02]"
              style={{ background: '#c3f53b', color: '#0a0a0a' }}
            >
              {primaryCta.label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium rounded-lg border transition-all duration-150 hover:text-white"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
              >
                <Play size={14} aria-hidden="true" />
                {secondaryCta.label}
              </Link>
            )}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.3 }}
            className="text-xs mb-10"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {trustItems.join(' \u2022 ')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.4 }}
            className="flex flex-wrap items-center gap-3"
          >
            {badges.map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                {BADGE_ICONS[badge.icon]}
                {badge.label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right: visual slot */}
        {children && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: easeBounce }}
            className="relative hidden lg:flex items-center justify-center"
            style={{ height: '540px' }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}
