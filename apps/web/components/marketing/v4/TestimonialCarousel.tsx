'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  metric?: string;
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    quote: 'Cut our morning reporting from 2 hours to 15 minutes. The draft-first approach means we never worry about surprise changes.',
    author: 'Performance Agency',
    role: 'Managing 15+ client accounts',
    metric: '-87% reporting time',
  },
  {
    quote: 'Finally an AI tool that asks before it spends. We approve every budget shift and creative refresh — nothing goes live without our say.',
    author: 'E-commerce Brand',
    role: '$2M+ annual ad spend',
    metric: '-35% wasted spend',
  },
  {
    quote: 'One dashboard for all four platforms. Game changer. We used to have four tabs open every morning. Now we have one inbox.',
    author: 'In-house Team',
    role: 'Meta, Google, TikTok, Snap',
    metric: '4 platforms unified',
  },
];

interface TestimonialCarouselProps {
  eyebrow?: string;
  headline?: string;
  testimonials?: Testimonial[];
}

export function TestimonialCarousel({
  eyebrow = 'What teams say',
  headline = 'Teams that switched to draft-first approval',
  testimonials = DEFAULT_TESTIMONIALS,
}: TestimonialCarouselProps) {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const [index, setIndex] = useState(0);

  const next = () => setIndex((i) => (i + 1) % testimonials.length);
  const prev = () => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);

  const t = testimonials[index];

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-12"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#c3f53b' }}>{eyebrow}</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">{headline}</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: easeSmooth }}
          className="relative"
        >
          <div className="card-surface p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="absolute top-4 left-4 opacity-10">
              <Quote size={48} style={{ color: '#c3f53b' }} aria-hidden="true" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: easeSmooth }}
              >
                <p className="text-lg sm:text-xl leading-relaxed text-white mb-6 max-w-2xl mx-auto relative z-10">
                  "{t.quote}"
                </p>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-semibold text-white">{t.author}</span>
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{t.role}</span>
                  {t.metric && (
                    <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(195,245,59,0.1)', color: '#c3f53b', border: '1px solid rgba(195,245,59,0.2)' }}>
                      {t.metric}
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-white"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: i === index ? '#c3f53b' : 'var(--border-subtle)',
                    transform: i === index ? 'scale(1.3)' : 'scale(1)',
                  }}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-white"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              aria-label="Next testimonial"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
