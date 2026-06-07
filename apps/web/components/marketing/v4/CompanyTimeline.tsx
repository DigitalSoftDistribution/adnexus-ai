'use client';

import { motion } from 'framer-motion';
import { Rocket, Zap, Users, Globe } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const MILESTONES = [
  { icon: <Rocket size={16} />, title: 'Idea born', date: '2025', desc: 'Founder experienced the pain of AI tools with no guardrails firsthand.', color: '#c3f53b' },
  { icon: <Zap size={16} />, title: 'First prototype', date: '2025', desc: 'Draft-first approval workflow validated with 5 beta agencies.', color: '#2563EB' },
  { icon: <Users size={16} />, title: 'Beta launch', date: '2026-Q1', desc: '50+ teams managing $2M+ in monthly ad spend.', color: '#A78BFA' },
  { icon: <Globe size={16} />, title: 'Public launch', date: '2026-Q2', desc: 'AdNexus AI opens to all marketers. Four platforms, one brain.', color: '#34D399' },
];

export function CompanyTimeline() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="max-w-3xl mx-auto">
      <div className="relative">
        <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px sm:-translate-x-1/2" style={{ background: 'var(--border-subtle)' }} />
        {MILESTONES.map((m, i) => {
          const isLeft = i % 2 === 0;
          return (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
              className={`relative flex items-start gap-4 mb-8 ${isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
            >
              <div className="absolute left-4 sm:left-1/2 w-8 h-8 rounded-full flex items-center justify-center -translate-x-1/2 z-10" style={{ background: `${m.color}15`, border: `1px solid ${m.color}40`, color: m.color }}>
                {m.icon}
              </div>
              <div className={`ml-12 sm:ml-0 sm:w-[calc(50%-24px)] ${isLeft ? 'sm:pr-0 sm:text-right' : 'sm:pl-0 sm:text-left'}`}>
                <span className="text-[11px] font-mono-data font-bold" style={{ color: m.color }}>{m.date}</span>
                <h3 className="text-base font-semibold text-white mt-1 mb-1">{m.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{m.desc}</p>
              </div>
              <div className="hidden sm:block sm:w-[calc(50%-24px)]" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
