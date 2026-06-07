'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Shield, Key, RefreshCw, FileCheck } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const STEPS = [
  { icon: <Shield size={18} />, title: 'Authorize', desc: 'Click connect and approve via official OAuth screen', color: '#2563EB' },
  { icon: <Key size={18} />, title: 'Scope', desc: 'We request only least-privilege access needed', color: '#A78BFA' },
  { icon: <RefreshCw size={18} />, title: 'Sync', desc: 'Campaigns, audiences, and creatives sync automatically', color: '#34D399' },
  { icon: <FileCheck size={18} />, title: 'Draft', desc: 'AI proposes changes as drafts awaiting your approval', color: '#c3f53b' },
];

export function OAuthFlowDiagram() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
            className="relative"
          >
            <div className="card-surface p-5 text-center h-full">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3"
                style={{ background: `${step.color}15`, color: step.color, border: `1px solid ${step.color}30` }}
              >
                {step.icon}
              </div>
              <div className="text-sm font-semibold text-white mb-1">{step.title}</div>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className="hidden lg:flex absolute top-1/2 -right-2 z-10 items-center justify-center w-4 h-4 rounded-full" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <ArrowRight size={10} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
