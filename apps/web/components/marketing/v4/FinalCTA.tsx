'use client';

import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface FinalCTAProps {
  headline: string;
  subtitle: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  trustNote?: string;
}

export function FinalCTA({
  headline,
  subtitle,
  primaryCta = { label: 'Start Free Trial', href: '/auth/signup' },
  secondaryCta = { label: 'View pricing', href: '/pricing' },
  trustNote = 'No credit card required',
}: FinalCTAProps) {
  const { ref, isVisible } = useScrollAnimation(0.3);

  return (
    <section ref={ref} className="w-full py-24 px-6 relative overflow-hidden" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(195,245,59,0.08) 0%, rgba(37,99,235,0.06) 40%, transparent 65%)' }} />
      <div className="max-w-[640px] mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
        >
          <h2 className="font-space text-4xl md:text-5xl font-bold text-white mb-5">{headline}</h2>
          <p className="text-base mb-8 max-w-[460px] mx-auto" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
          className="flex flex-wrap items-center justify-center gap-4 mb-4"
        >
          <Link
            href={primaryCta.href}
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-lg transition-all duration-150 hover:scale-[1.02]"
            style={{ background: '#c3f53b', color: '#0a0a0a' }}
          >
            {primaryCta.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium rounded-lg border transition-all duration-150 hover:text-white"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            {secondaryCta.label}
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {trustNote}
        </motion.p>
      </div>
    </section>
  );
}
