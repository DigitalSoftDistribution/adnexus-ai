'use client';

import { motion } from 'framer-motion';
import { Eye, Check, X, Pencil, Sparkles } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/**
 * "See it work" section. A faithful, stylized recreation of the draft-approval
 * inbox so the abstract "draft-first" idea becomes concrete. Annotated with
 * callouts. Pre-launch: this is a styled mockup, not a real screenshot — when
 * real product captures exist, drop them into the framed panel below.
 */

const DRAFTS = [
  {
    platform: 'Meta',
    color: '#1877F2',
    title: 'Shift $450/day to Retargeting — Prospecting',
    why: 'ROAS on Retargeting is 5.1x vs 2.3x on Prospecting over the last 7 days.',
    delta: '+$450',
    deltaColor: '#c3f53b',
  },
  {
    platform: 'Google',
    color: '#DB4437',
    title: 'Pause "Summer Sale — Broad" ad group',
    why: 'CPA is $61, 3.2x your $19 target, with no conversions in 4 days.',
    delta: 'Pause',
    deltaColor: '#F59E0B',
  },
  {
    platform: 'TikTok',
    color: '#00F2EA',
    title: 'Refresh 3 fatiguing creatives',
    why: 'Frequency hit 4.1 and CTR fell 38% — fatigue threshold crossed.',
    delta: 'Review',
    deltaColor: '#A78BFA',
  },
];

const CALLOUTS = [
  { icon: <Sparkles size={16} aria-hidden="true" />, title: 'The AI explains itself', desc: 'Every draft shows the metric that triggered it and the expected impact — no black box.' },
  { icon: <Pencil size={16} aria-hidden="true" />, title: 'Edit before you ship', desc: 'Change a budget number or narrow an audience inline, then approve.' },
  { icon: <Check size={16} aria-hidden="true" />, title: 'Approve in one click', desc: 'Approve a single draft or a whole batch. It publishes the moment you say so.' },
];

export function ProductShowcase() {
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#2563EB' }}>See it work</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Your approval inbox, every morning</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
            The agent does the analysis overnight. You wake up to a short list of drafts, each with the reasoning attached. Approve the good ones and move on.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          {/* Mock approval inbox */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, ease: easeSmooth }}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              </span>
              <span className="flex-1 text-center text-[10px] font-mono-data" style={{ color: 'var(--text-tertiary)' }}>
                Drafts &middot; 3 awaiting approval
              </span>
            </div>

            <div className="p-4 space-y-3">
              {DRAFTS.map((d, i) => (
                <motion.div
                  key={d.title}
                  initial={{ opacity: 0, x: -16 }}
                  animate={isVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.12, ease: easeSmooth }}
                  className="rounded-lg p-3"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{d.platform}</span>
                    </span>
                    <span className="text-[11px] font-mono-data font-semibold" style={{ color: d.deltaColor }}>{d.delta}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-white mb-1">{d.title}</p>
                  <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: 'var(--text-secondary)' }}>{d.why}</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded font-semibold" style={{ background: '#c3f53b', color: '#0a0a0a' }}>
                      <Check size={11} aria-hidden="true" /> Approve
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <Pencil size={11} aria-hidden="true" /> Edit
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                      <X size={11} aria-hidden="true" /> Reject
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Annotations */}
          <div className="space-y-5">
            {CALLOUTS.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease: easeSmooth }}
                className="flex items-start gap-3"
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(195,245,59,0.1)', color: 'var(--accent)' }}
                >
                  {c.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white mb-1">{c.title}</span>
                  <span className="block text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.desc}</span>
                </span>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isVisible ? { opacity: 1 } : {}}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="flex items-center gap-2 pt-2 text-[12px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Eye size={13} aria-hidden="true" />
              Illustrative preview of the AdNexus draft inbox.
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
