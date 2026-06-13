'use client';

import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { PRICING_TIERS, formatPrice } from '@/lib/marketing/pricing';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface PricingPreviewProps {
  eyebrow?: string;
  headline?: string;
  subtitle?: string;
  differentiator?: string;
  comparisonHref?: string | null;
  /** Hero: above-the-fold on /pricing — visible immediately, tighter spacing. */
  variant?: 'section' | 'hero';
}

export function PricingPreview({
  eyebrow = 'Pricing',
  headline = 'Your bill never grows with your ad spend',
  subtitle = 'Start free. Upgrade as your strategy grows — not as your budget does.',
  differentiator = 'Unlike Madgicx or Revealbot, we don\'t take a percentage.',
  comparisonHref = '/pricing',
  variant = 'section',
}: PricingPreviewProps) {
  const scrollAnim = useScrollAnimation(0.2);
  const isHero = variant === 'hero';
  const isVisible = isHero ? true : scrollAnim.isVisible;
  const tiers = PRICING_TIERS;

  return (
    <section
      ref={isHero ? undefined : scrollAnim.ref}
      className={isHero ? 'w-full pt-10 pb-16 px-6' : 'w-full py-24 px-6'}
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-14"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#2563EB' }}>{eyebrow}</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">{headline}</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 40 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: tier.popular ? 0.2 : i * 0.1, ease: easeSmooth }}
              className="card-surface p-6 relative flex flex-col"
              style={{
                borderColor: tier.popular ? 'rgba(195,245,59,0.4)' : 'var(--border-subtle)',
                boxShadow: tier.popular ? '0 0 30px rgba(195,245,59,0.08)' : undefined,
              }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: '#c3f53b', color: '#0a0a0a' }}>Most Popular</div>
              )}
              <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
              <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>{tier.description}</p>
              <div className="mb-5">
                <span className="font-mono-data text-4xl font-bold text-white">{formatPrice(tier.monthlyPrice)}</span>
                {tier.monthlyPrice !== null && tier.monthlyPrice > 0 && (
                  <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>/mo</span>
                )}
              </div>
              <div className="flex flex-col gap-2.5 mb-6 flex-1">
                {tier.highlights.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: tier.popular ? '#c3f53b' : 'var(--status-active)' }} aria-hidden="true" />
                    <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href={tier.ctaHref}
                className="w-full text-center py-2.5 text-sm font-bold rounded-lg transition-all duration-150 hover:scale-[1.01]"
                style={{
                  background: tier.popular ? '#c3f53b' : 'transparent',
                  color: tier.popular ? '#0a0a0a' : 'var(--text-secondary)',
                  border: tier.popular ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-center space-y-3"
        >
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{differentiator}</p>
          {comparisonHref && (
            <Link href={comparisonHref} className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#2563EB' }}>
              View full pricing &amp; feature comparison
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}
