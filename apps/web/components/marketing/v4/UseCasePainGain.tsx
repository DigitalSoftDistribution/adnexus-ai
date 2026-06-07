'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface PainGainItem {
  pain: string;
  painDesc: string;
  gain: string;
  gainDesc: string;
}

interface UseCasePainGainProps {
  items: PainGainItem[];
}

export function UseCasePainGain({ items }: UseCasePainGainProps) {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => setFlipped((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
          className="relative cursor-pointer group"
          onClick={() => toggle(i)}
        >
          <div className="card-surface p-6 min-h-[200px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!flipped[i] ? (
                <motion.div
                  key="pain"
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: -90 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle size={18} style={{ color: '#EF4444' }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#EF4444' }}>Before</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{item.pain}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.painDesc}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="gain"
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 90 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={18} style={{ color: '#c3f53b' }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#c3f53b' }}>After AdNexus</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{item.gain}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.gainDesc}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-1 mt-4 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              <span>Click to flip</span>
              <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
