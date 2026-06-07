'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface TimelineStep {
  time: string;
  oldWay: string;
  newWay: string;
}

interface UseCaseTimelineProps {
  steps: TimelineStep[];
}

export function UseCaseTimeline({ steps }: UseCaseTimelineProps) {
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <div ref={ref} className="max-w-4xl mx-auto">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[60px] sm:left-[80px] top-0 bottom-0 w-px" style={{ background: 'var(--border-subtle)' }} />

        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.1, ease: easeSmooth }}
            className="relative flex items-start gap-4 sm:gap-6 mb-8"
          >
            {/* Time badge */}
            <div className="w-[60px] sm:w-[80px] flex-shrink-0 text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono-data font-bold" style={{ color: '#c3f53b' }}>
                <Clock size={12} />
                {step.time}
              </span>
            </div>

            {/* Dot */}
            <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5 z-10" style={{ background: '#c3f53b', boxShadow: '0 0 10px rgba(195,245,59,0.3)' }} />

            {/* Content */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: '#EF4444' }}>Old way</span>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{step.oldWay}</p>
              </div>
              <div className="rounded-lg p-4" style={{ background: 'rgba(195,245,59,0.05)', border: '1px solid rgba(195,245,59,0.15)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: '#c3f53b' }}>With AdNexus</span>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{step.newWay}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
