'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface FaqEntry {
  q: string;
  a: string;
}

export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {items.map((item, i) => (
        <FaqRow key={item.q} item={item} index={i} />
      ))}
    </div>
  );
}

function FaqRow({ item, index }: { item: FaqEntry; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-[var(--bg-hover)]"
      >
        <span className="text-white font-medium text-sm pr-4">{item.q}</span>
        <ChevronDown
          size={18}
          style={{ color: '#c3f53b', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="px-5 pb-5 text-sm leading-relaxed pt-4" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
              {item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
