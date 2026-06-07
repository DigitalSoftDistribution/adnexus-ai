'use client';

import { motion } from 'framer-motion';
import { Quote, ExternalLink } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const MENTIONS = [
  { publication: 'TechCrunch', quote: 'The draft-first approach to AI ad management is exactly what the industry needs.', status: 'coming-soon' },
  { publication: 'Product Hunt', quote: 'A genuinely useful AI tool that does not try to replace the marketer.', status: 'coming-soon' },
  { publication: 'AdExchanger', quote: 'Cross-platform coordination with human oversight — a rare combination.', status: 'coming-soon' },
];

export function PressMentions() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
        {['TechCrunch', 'Product Hunt', 'AdExchanger', 'Marketing Brew'].map((pub) => (
          <span
            key={pub}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            {pub}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MENTIONS.map((m, i) => (
          <motion.div
            key={m.publication}
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
            className="card-surface p-5 relative"
          >
            <div className="absolute top-3 left-3 opacity-10">
              <Quote size={32} style={{ color: '#c3f53b' }} />
            </div>
            <p className="text-[13px] leading-relaxed text-white mb-3 relative z-10">&ldquo;{m.quote}&rdquo;</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>{m.publication}</span>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>Coming soon</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
