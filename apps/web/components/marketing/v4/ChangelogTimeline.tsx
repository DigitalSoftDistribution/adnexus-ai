'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface ChangelogEntry {
  date: string;
  tag: 'New' | 'Improved' | 'Fixed';
  title: string;
  body: string;
}

const DEFAULT_ENTRIES: ChangelogEntry[] = [
  { date: '2026-06', tag: 'New', title: 'Public marketing site & unified navigation', body: 'A brand-new public site with features, use cases, comparisons, security, and pricing — all served from the production app.' },
  { date: '2026-05', tag: 'Improved', title: 'Cross-platform attribution', body: 'Unified attribution now spans Meta, Google, TikTok, and Snap so you can see each channel\'s true contribution in one view.' },
  { date: '2026-05', tag: 'New', title: 'Creative fatigue detection', body: 'The AI now flags fatiguing creative early and suggests replacements before performance drops.' },
  { date: '2026-04', tag: 'New', title: 'MCP-native agent', body: 'Connect AdNexus to Claude, ChatGPT, and Cursor through the Model Context Protocol.' },
  { date: '2026-04', tag: 'Improved', title: 'Morning Brief digests', body: 'Daily AI-generated summaries now include trend predictions and recommended actions.' },
  { date: '2026-03', tag: 'New', title: 'Draft-first approval workflow', body: 'Every AI-generated change is staged as a draft. Review, edit, approve, or reject — with a full audit trail.' },
  { date: '2026-03', tag: 'Fixed', title: 'Meta API rate limiting', body: 'Improved backoff strategy and request batching to handle Meta\'s stricter rate limits.' },
  { date: '2026-02', tag: 'New', title: 'Multi-platform dashboard', body: 'Unified dashboard aggregating performance across Meta, Google, TikTok, and Snap in real time.' },
];

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  New: { bg: 'rgba(195,245,59,0.15)', color: '#c3f53b' },
  Improved: { bg: 'rgba(37,99,235,0.15)', color: '#2563EB' },
  Fixed: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
};

export function ChangelogTimeline({ entries = DEFAULT_ENTRIES }: { entries?: ChangelogEntry[] }) {
  const { ref, isVisible } = useScrollAnimation(0.1);
  const [filter, setFilter] = useState<string>('All');

  const tags = ['All', ...Array.from(new Set(entries.map((e) => e.tag)))];
  const filtered = filter === 'All' ? entries : entries.filter((e) => e.tag === filter);

  return (
    <div ref={ref}>
      {/* Filter */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease: easeSmooth }}
        className="flex flex-wrap items-center justify-center gap-2 mb-10"
      >
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilter(tag)}
            className="px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
            style={{
              background: filter === tag ? (tag === 'All' ? 'var(--bg-elevated)' : TAG_STYLES[tag]?.bg || 'var(--bg-elevated)') : 'var(--bg-elevated)',
              color: filter === tag ? (tag === 'All' ? '#fff' : TAG_STYLES[tag]?.color || '#fff') : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {tag}
          </button>
        ))}
      </motion.div>

      {/* Timeline */}
      <div className="relative max-w-3xl mx-auto">
        {/* Vertical line */}
        <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px sm:-translate-x-1/2" style={{ background: 'var(--border-subtle)' }} />

        {filtered.map((entry, i) => {
          const isLeft = i % 2 === 0;
          const style = TAG_STYLES[entry.tag] || TAG_STYLES.Improved;
          return (
            <motion.div
              key={entry.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08, ease: easeSmooth }}
              className={`relative flex items-start gap-4 sm:gap-6 mb-8 ${isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
            >
              {/* Dot */}
              <div className="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full -translate-x-1/2 mt-2 z-10" style={{ background: style.color, boxShadow: `0 0 10px ${style.color}40` }} />

              {/* Content */}
              <div className={`ml-10 sm:ml-0 sm:w-[calc(50%-24px)] ${isLeft ? 'sm:pr-0 sm:text-right' : 'sm:pl-0 sm:text-left'}`}>
                <div className="card-surface p-5">
                  <div className={`flex flex-wrap items-center gap-2 mb-2 ${isLeft ? 'sm:justify-end' : ''}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: style.bg, color: style.color }}>
                      {entry.tag}
                    </span>
                    <span className="font-mono-data text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{entry.date}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{entry.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{entry.body}</p>
                </div>
              </div>

              {/* Spacer for opposite side */}
              <div className="hidden sm:block sm:w-[calc(50%-24px)]" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
