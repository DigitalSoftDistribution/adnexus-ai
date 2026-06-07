'use client';

import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { Check, ArrowRight } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const PLATFORMS = [
  { name: 'Meta Ads', color: '#1877F2', detail: 'Facebook & Instagram', status: 'Connected', features: ['Campaigns', 'Ad Sets', 'Ads', 'Creative'] },
  { name: 'Google Ads', color: '#DB4437', detail: 'Search, Display, PMax', status: 'Connected', features: ['Search', 'Display', 'PMax', 'Demand Gen'] },
  { name: 'TikTok Ads', color: '#00F2EA', detail: 'Video-first ads', status: 'Read-only beta', features: ['Campaigns', 'Creative', 'CBO', 'Spark'] },
  { name: 'Snap Ads', color: '#FFFC00', detail: 'Snap, Story, Collection', status: 'Coming soon', features: ['Snap Ads', 'Story', 'Collection', 'Pixel'] },
];

export function IntegrationStatusGrid() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
      {PLATFORMS.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
          className="card-surface p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
              <div>
                <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{p.detail}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>
              <Check size={10} />
              {p.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {p.features.map((f) => (
              <span key={f} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                {f}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
