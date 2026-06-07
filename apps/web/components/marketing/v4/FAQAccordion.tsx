'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface FAQItem {
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    question: 'Does the AI publish changes automatically?',
    answer: 'No. Every change is a draft awaiting your approval. The AI proposes, explains, and waits. You review, edit if needed, and approve. Nothing reaches your live campaigns until you say so.',
  },
  {
    question: 'Which platforms are supported?',
    answer: 'Meta (Facebook & Instagram), Google Ads, TikTok, and Snap. All four platforms are supported in the Scale plan. Growth includes Meta and Google. Free is read-only for one account.',
  },
  {
    question: 'How does pricing work?',
    answer: 'Flat monthly fee based on your plan. No percentage of ad spend, no hidden fees, no surprise bills. Your cost stays predictable no matter how much you spend on ads.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. No contracts, no penalties, no cancellation fees. You can downgrade, upgrade, or cancel at any time from your account settings.',
  },
];

interface FAQAccordionProps {
  eyebrow?: string;
  headline?: string;
  items?: FAQItem[];
}

export function FAQAccordion({
  eyebrow = 'Questions',
  headline = 'Everything you need to know',
  items = DEFAULT_FAQS,
}: FAQAccordionProps) {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-12"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#2563EB' }}>{eyebrow}</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">{headline}</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: easeSmooth }}
          className="space-y-3"
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                aria-expanded={openIndex === i}
              >
                <span className="text-sm font-semibold text-white">{item.question}</span>
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
                      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
