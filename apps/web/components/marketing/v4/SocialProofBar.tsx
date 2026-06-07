'use client';

import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface SocialProofBarProps {
  headline?: string;
  metrics: { value: string; label: string }[];
  logos?: { name: string; initials: string }[];
}

export function SocialProofBar({
  headline = 'Trusted by teams managing $10M+ in ad spend',
  metrics,
  logos = [
    { name: 'Performance Agency', initials: 'PA' },
    { name: 'E-commerce Brand', initials: 'EB' },
    { name: 'In-house Team', initials: 'IH' },
    { name: 'Media Buyer', initials: 'MB' },
  ],
}: SocialProofBarProps) {
  const { ref, isVisible } = useScrollAnimation(0.2);

  return (
    <section ref={ref} className="w-full py-14 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Logo strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: easeSmooth }}
          className="text-center mb-8"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-5" style={{ color: 'var(--text-tertiary)' }}>
            {headline}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {logos.map((logo) => (
              <span
                key={logo.name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <span
                  className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold"
                  style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b' }}
                >
                  {logo.initials}
                </span>
                {logo.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Metrics strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15, ease: easeSmooth }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {metrics.map((m) => (
            <div key={m.label} className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="font-mono-data text-2xl font-bold text-white mb-1">{m.value}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{m.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
