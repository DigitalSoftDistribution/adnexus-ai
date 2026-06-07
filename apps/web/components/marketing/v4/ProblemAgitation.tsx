'use client';

import { motion } from 'framer-motion';
import { Clock, AlertTriangle, XCircle } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface PainCard {
  icon: React.ReactNode;
  title: string;
  stat: string;
  desc: string;
}

const DEFAULT_PAINS: PainCard[] = [
  {
    icon: <Clock size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />,
    title: 'Hours lost to manual reporting',
    stat: '2-4 hrs',
    desc: 'Every morning spent copy-pasting numbers between Meta, Google, TikTok, and Snap dashboards.',
  },
  {
    icon: <AlertTriangle size={22} style={{ color: '#EF4444' }} aria-hidden="true" />,
    title: '20-30% of spend wasted on tired creative',
    stat: '20-30%',
    desc: 'Creative fatigue goes unnoticed until ROAS collapses. By then, the budget is already gone.',
  },
  {
    icon: <XCircle size={22} style={{ color: '#8B5CF6' }} aria-hidden="true" />,
    title: 'Zero tools pair AI with real guardrails',
    stat: '0 tools',
    desc: 'Either the AI has full autopilot (risky) or it just chats (no action). Nothing in between.',
  },
];

interface ProblemAgitationProps {
  eyebrow?: string;
  headline?: string;
  pains?: PainCard[];
}

export function ProblemAgitation({
  eyebrow = 'The 8am problem',
  headline = 'Running ads across four platforms shouldn\'t take four hours every morning',
  pains = DEFAULT_PAINS,
}: ProblemAgitationProps) {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-14"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#EF4444' }}>{eyebrow}</span>
          <h2 className="font-space text-3xl sm:text-4xl font-semibold text-white mb-3 max-w-2xl mx-auto">{headline}</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pains.map((pain, i) => (
            <motion.div
              key={pain.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12, ease: easeSmooth }}
              className="card-surface p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)', transform: 'translate(30%, -30%)' }} />
              <div className="mb-4">{pain.icon}</div>
              <div className="font-mono-data text-3xl font-bold text-white mb-2">{pain.stat}</div>
              <h3 className="text-base font-semibold text-white mb-2">{pain.title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{pain.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
