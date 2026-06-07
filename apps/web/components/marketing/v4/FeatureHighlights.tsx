'use client';

import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Bot, CheckCircle2, Globe, FileText, ChevronRight } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const FEATURES = [
  {
    icon: <Bot size={22} style={{ color: '#c3f53b' }} aria-hidden="true" />,
    title: 'AI Agent',
    desc: 'An analyst that watches your campaigns 24/7 and drafts improvements before problems become expensive.',
    href: '/features/ai-agent',
  },
  {
    icon: <CheckCircle2 size={22} style={{ color: '#2563EB' }} aria-hidden="true" />,
    title: 'Draft Approvals',
    desc: 'Nothing goes live without your say. Review, edit, and approve every AI recommendation with one click.',
    href: '/features/approvals',
  },
  {
    icon: <Globe size={22} style={{ color: '#A78BFA' }} aria-hidden="true" />,
    title: 'Cross-Platform',
    desc: 'Meta, Google, TikTok, and Snap — unified in one workspace with consistent workflows across all four.',
    href: '/features/platforms',
  },
  {
    icon: <FileText size={22} style={{ color: '#F59E0B' }} aria-hidden="true" />,
    title: 'Morning Brief',
    desc: 'A concise daily digest of what changed, what needs attention, and what the AI recommends doing next.',
    href: '/features',
  },
];

interface FeatureHighlightsProps {
  eyebrow?: string;
  headline?: string;
  subtitle?: string;
  features?: typeof FEATURES;
}

export function FeatureHighlights({
  eyebrow = 'Features',
  headline = 'From morning brief to final approval',
  subtitle = 'Everything you need to run smarter campaigns — in one workspace.',
  features = FEATURES,
}: FeatureHighlightsProps) {
  const { ref, isVisible } = useScrollAnimation(0.15);

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-14"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#2563EB' }}>{eyebrow}</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">{headline}</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08, ease: easeSmooth }}
              className="card-surface p-6 hover-lift group"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{feature.desc}</p>
              <Link
                href={feature.href}
                className="inline-flex items-center gap-1 text-[13px] font-medium transition-colors group-hover:text-white"
                style={{ color: '#2563EB' }}
              >
                Learn more
                <ChevronRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-center"
        >
          <Link href="/features" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#2563EB' }}>
            Explore all features
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
