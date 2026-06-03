'use client';

import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Check, Minus, ChevronRight } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/**
 * Compact at-a-glance comparison against the three competitor archetypes.
 * Honest: every claim here is also defended on the dedicated /compare pages.
 * "yes/no/partial" only — no invented metrics.
 */

type Cell = 'yes' | 'no' | 'partial';

const COLUMNS = ['AdNexus', 'MCP chat tools', 'Meta-only suites', 'Rule engines'];

const ROWS: { feature: string; cells: Cell[] }[] = [
  { feature: 'Visual dashboard, not just chat', cells: ['yes', 'no', 'yes', 'yes'] },
  { feature: 'All 4 platforms (Meta, Google, TikTok, Snap)', cells: ['yes', 'partial', 'no', 'partial'] },
  { feature: 'AI proposes the changes for you', cells: ['yes', 'yes', 'partial', 'no'] },
  { feature: 'Draft-first approval on every write', cells: ['yes', 'partial', 'no', 'no'] },
  { feature: 'Flat price that ignores your ad spend', cells: ['yes', 'yes', 'no', 'no'] },
  { feature: 'Works with Claude, ChatGPT, Cursor', cells: ['yes', 'yes', 'no', 'no'] },
];

function CellMark({ value, highlight }: { value: Cell; highlight: boolean }) {
  if (value === 'yes') {
    return <Check size={16} aria-label="Yes" style={{ color: highlight ? '#c3f53b' : 'var(--status-active)' }} />;
  }
  if (value === 'partial') {
    return <Minus size={16} aria-label="Partial" style={{ color: '#F59E0B' }} />;
  }
  return <span aria-label="No" className="block w-3 h-px" style={{ background: 'var(--text-muted)' }} />;
}

export function HomeComparison() {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-12"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#2563EB' }}>How we compare</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">One column says yes to everything</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Every other category forces a trade-off. See the full, category-by-category breakdown on the compare pages.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: easeSmooth }}
          className="overflow-x-auto rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <div style={{ minWidth: '640px' }}>
            {/* Header */}
            <div className="grid items-center" style={{ gridTemplateColumns: '1.6fr repeat(4, 1fr)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
              <div className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>What you get</div>
              {COLUMNS.map((c, i) => (
                <div
                  key={c}
                  className="px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: i === 0 ? '#c3f53b' : 'var(--text-tertiary)' }}
                >
                  {c}
                </div>
              ))}
            </div>

            {/* Rows */}
            {ROWS.map((row, ri) => (
              <div
                key={row.feature}
                className="grid items-center"
                style={{ gridTemplateColumns: '1.6fr repeat(4, 1fr)', borderBottom: ri < ROWS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <div className="px-4 py-3.5 text-[13px] text-white">{row.feature}</div>
                {row.cells.map((cell, ci) => (
                  <div
                    key={ci}
                    className="px-3 py-3.5 flex justify-center"
                    style={ci === 0 ? { background: 'rgba(195,245,59,0.04)' } : undefined}
                  >
                    <CellMark value={cell} highlight={ci === 0} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-center mt-8"
        >
          <Link href="/compare/pipeboard" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#2563EB' }}>
            See the detailed comparisons
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
