'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

export interface FaqEntry {
  q: string;
  a: string;
  category: string;
}

const CATEGORIES = ['All', 'Getting Started', 'Pricing', 'Platforms', 'Security', 'AI Agent', 'Billing'];

const DEFAULT_FAQS: FaqEntry[] = [
  { q: 'What is AdNexus AI?', a: 'AdNexus is an AI-powered campaign workspace for managing ads across Meta, Google, TikTok, and Snap. An autonomous agent monitors performance and drafts optimizations that you review and approve.', category: 'Getting Started' },
  { q: 'How does the 14-day free trial work?', a: 'Start any paid plan with a 14-day free trial — no credit card required. At the end you can subscribe, or your account drops to the free tier automatically.', category: 'Getting Started' },
  { q: 'How long does setup take?', a: 'About two minutes. Connect your ad accounts via secure OAuth and the AI begins auditing immediately. No credit card required to start.', category: 'Getting Started' },
  { q: 'Does pricing scale with my ad spend?', a: 'No. Pricing is flat and never increases just because your managed ad spend grows — unlike spend-based tools such as Madgicx or Revealbot.', category: 'Pricing' },
  { q: 'Can I switch plans or cancel anytime?', a: 'Yes. Upgrade, downgrade, or cancel at any time from billing settings. If you cancel, you keep access until the end of your current period.', category: 'Pricing' },
  { q: 'Do I need a credit card to start?', a: 'No credit card is required for the 14-day free trial. You only enter payment details when you choose to subscribe.', category: 'Pricing' },
  { q: 'Which platforms are supported?', a: 'Meta (Facebook & Instagram), Google Ads, TikTok Ads, and Snap Ads. All four platforms are supported in the Scale plan. Growth includes Meta and Google.', category: 'Platforms' },
  { q: 'Does it work with Claude or ChatGPT?', a: 'Yes. AdNexus is MCP-native, so you can connect it to Claude, ChatGPT, Cursor, or any MCP-compatible assistant.', category: 'Platforms' },
  { q: 'Is my data secure?', a: 'We use OAuth (never your passwords), encrypt data in transit and at rest, enforce least-privilege role-based access, and log every action.', category: 'Security' },
  { q: 'What does "draft-first" mean?', a: 'Every change the AI proposes is staged as a draft. Nothing publishes to your live campaigns until a person reviews and approves it.', category: 'AI Agent' },
  { q: 'Does the AI publish changes automatically?', a: 'No. Every change is a draft awaiting your approval. The AI proposes, explains, and waits. You review, edit if needed, and approve.', category: 'AI Agent' },
  { q: 'What happens after the 14-day trial ends?', a: 'You can subscribe to keep your paid features, or your account automatically drops to the Free tier with read-only access. No data is lost.', category: 'Billing' },
];

export function FAQCategoryTabs({ items = DEFAULT_FAQS }: { items?: FaqEntry[] }) {
  const { ref, isVisible } = useScrollAnimation(0.1);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = useMemo(() => {
    let result = items;
    if (activeCategory !== 'All') {
      result = result.filter((f) => f.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
    }
    return result;
  }, [items, activeCategory, searchQuery]);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div ref={ref}>
      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, ease: easeSmooth }}
        className="relative max-w-xl mx-auto mb-8"
      >
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm text-white outline-none"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        />
      </motion.div>

      {/* Category tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1, ease: easeSmooth }}
        className="flex flex-wrap items-center justify-center gap-2 mb-8"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setOpenIndex(0); }}
            className="px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
            style={{
              background: activeCategory === cat ? 'rgba(195,245,59,0.1)' : 'var(--bg-elevated)',
              color: activeCategory === cat ? '#c3f53b' : 'var(--text-secondary)',
              border: activeCategory === cat ? '1px solid rgba(195,245,59,0.3)' : '1px solid var(--border-subtle)',
            }}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.2, ease: easeSmooth }}
        className="space-y-3"
      >
        <AnimatePresence mode="wait">
          {filtered.map((item, i) => (
            <motion.div
              key={item.q}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                aria-expanded={openIndex === i}
              >
                <span className="text-sm font-semibold text-white">{item.q}</span>
                <motion.span
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <ChevronDown size={16} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeSmooth }}
                  >
                    <div className="px-5 pb-5">
                      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.a}</p>
                      <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Was this helpful?</span>
                        <button className="text-[11px] px-2 py-1 rounded transition-colors hover:text-white" style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>Yes</button>
                        <button className="text-[11px] px-2 py-1 rounded transition-colors hover:text-white" style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>No</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No questions found. Try a different search or category.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
