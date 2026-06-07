'use client';

import { motion } from 'framer-motion';
import { Check, Clock, FileText } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const MILESTONES = [
  { title: 'GDPR Compliance', status: 'complete', date: '2026-Q1', desc: 'Data processing agreements, right to deletion, EU residency' },
  { title: 'Penetration Testing', status: 'complete', date: '2026-Q1', desc: 'Annual third-party security assessment completed' },
  { title: 'SOC 2 Type I', status: 'in-progress', date: '2026-Q2', desc: 'Control audit and documentation review underway' },
  { title: 'SOC 2 Type II', status: 'planned', date: '2026-Q4', desc: 'Continuous monitoring period and final certification' },
];

export function ComplianceTimeline() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="max-w-3xl mx-auto">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'var(--border-subtle)' }} />
        {MILESTONES.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, x: -20 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
            className="relative flex items-start gap-4 mb-6 pl-10"
          >
            <div className="absolute left-4 top-1 w-3 h-3 rounded-full -translate-x-1/2 z-10" style={{
              background: m.status === 'complete' ? '#10B981' : m.status === 'in-progress' ? '#F59E0B' : 'var(--bg-elevated)',
              border: `2px solid ${m.status === 'complete' ? '#10B981' : m.status === 'in-progress' ? '#F59E0B' : 'var(--border-subtle)'}`,
            }} />
            <div className="card-surface p-4 flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white">{m.title}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{
                  background: m.status === 'complete' ? 'rgba(16,185,129,0.15)' : m.status === 'in-progress' ? 'rgba(245,158,11,0.15)' : 'var(--bg-primary)',
                  color: m.status === 'complete' ? '#34D399' : m.status === 'in-progress' ? '#F59E0B' : 'var(--text-tertiary)',
                }}>
                  {m.status === 'complete' ? 'Complete' : m.status === 'in-progress' ? 'In Progress' : 'Planned'}
                </span>
              </div>
              <span className="text-[11px] font-mono-data block mb-1" style={{ color: 'var(--text-tertiary)' }}>{m.date}</span>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{m.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
