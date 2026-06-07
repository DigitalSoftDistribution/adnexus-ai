'use client';

import { motion } from 'framer-motion';
import { Lock, KeyRound, ShieldCheck, Eye, Server } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const LAYERS = [
  { icon: <Lock size={18} />, title: 'Encryption', desc: 'TLS in transit, AES-256 at rest', color: '#2563EB', level: 1 },
  { icon: <KeyRound size={18} />, title: 'OAuth', desc: 'No passwords stored, tokens encrypted', color: '#A78BFA', level: 2 },
  { icon: <ShieldCheck size={18} />, title: 'Draft-First', desc: 'Autonomous live changes impossible', color: '#c3f53b', level: 3 },
  { icon: <Eye size={18} />, title: 'Audit', desc: 'Every action logged with full context', color: '#F59E0B', level: 4 },
  { icon: <Server size={18} />, title: 'RBAC', desc: 'Least-privilege role-based access', color: '#EF4444', level: 5 },
];

export function SecurityArchitecture() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <div ref={ref} className="max-w-3xl mx-auto">
      <div className="relative">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: 'var(--border-subtle)' }} />

        {LAYERS.map((layer, i) => {
          const isLeft = i % 2 === 0;
          return (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
              className={`relative flex items-center gap-4 mb-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
            >
              <div className={`flex-1 ${isLeft ? 'text-right' : 'text-left'}`}>
                <div className="inline-block card-surface p-4 max-w-xs">
                  <div className={`flex items-center gap-2 mb-1 ${isLeft ? 'justify-end' : ''}`}>
                    <span style={{ color: layer.color }}>{layer.icon}</span>
                    <span className="text-sm font-semibold text-white">{layer.title}</span>
                  </div>
                  <p className={`text-[12px] ${isLeft ? '' : ''}`} style={{ color: 'var(--text-secondary)' }}>{layer.desc}</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ background: `${layer.color}20`, border: `2px solid ${layer.color}`, color: layer.color }}>
                {layer.level}
              </div>
              <div className="flex-1" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
