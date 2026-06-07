'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { PRICING_TIERS } from '@/lib/marketing/pricing';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/* Build a unified feature list from all tiers */
const ALL_FEATURES = Array.from(
  new Set(PRICING_TIERS.flatMap((t) => t.features))
).sort();

/* Check if a tier includes a feature */
function tierHasFeature(tierIndex: number, feature: string): boolean {
  return PRICING_TIERS[tierIndex].features.includes(feature);
}

/* Categorize features for better organization */
const CATEGORIES: Record<string, string[]> = {
  'Platform & Accounts': [
    '1 ad account (Meta or Google)',
    '3 ad accounts (Meta + Google)',
    'All 4 platforms (Meta, Google, TikTok, Snap)',
    'Unlimited ad accounts',
  ],
  'AI & Automation': [
    'Read-only performance audit',
    'AI Agent with draft-first approval',
    'Unlimited AI drafts',
    'Custom AI automation rules',
    'Draft preview — see what AI would do',
  ],
  'Reporting & Insights': [
    '5 saved reports / month',
    'Weekly Morning Brief digests',
    'Creative fatigue alerts',
    'Creative fatigue + audience saturation',
    'Competitive intelligence',
    'Cross-platform attribution',
  ],
  'Team & Workflow': [
    'Community support',
    '2 team members',
    'Up to 10 team members',
    'Unlimited seats',
    'Multi-tier approval workflows',
    'Priority support',
    'Dedicated success manager',
  ],
  'Data & History': [
    '14-day data history',
    '90-day data history',
    'Unlimited data history',
  ],
  'Advanced': [
    'Campaign dashboard + creation',
    'Full API + MCP access',
    'SSO / SAML + advanced security',
    'White-label client reports',
  ],
};

/* Map each feature to its category */
function getFeatureCategory(feature: string): string {
  for (const [cat, features] of Object.entries(CATEGORIES)) {
    if (features.includes(feature)) return cat;
  }
  return 'Other';
}

/* Group features by category */
const GROUPED_FEATURES = ALL_FEATURES.reduce<Record<string, string[]>>(
  (acc, feature) => {
    const cat = getFeatureCategory(feature);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  },
  {}
);

export function PricingComparisonTable() {
  const { ref, isVisible } = useScrollAnimation(0.1);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Platform & Accounts': true,
    'AI & Automation': true,
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <section ref={ref} className="w-full py-24 px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: easeSmooth }}
          className="text-center mb-12"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4 block" style={{ color: '#2563EB' }}>Compare</span>
          <h2 className="font-space text-4xl font-semibold text-white mb-3">Feature comparison</h2>
          <p className="text-sm max-w-[520px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Everything you get on each plan. All plans include draft-first approval and core security.
          </p>
        </motion.div>

        {/* Desktop table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: easeSmooth }}
          className="hidden md:block rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          {/* Header */}
          <div className="grid items-center" style={{ gridTemplateColumns: '2fr repeat(4, 1fr)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
            <div className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Feature</div>
            {PRICING_TIERS.map((tier) => (
              <div key={tier.id} className="px-3 py-3.5 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tier.popular ? '#c3f53b' : 'var(--text-tertiary)' }}>{tier.name}</div>
              </div>
            ))}
          </div>

          {/* Category groups */}
          {Object.entries(GROUPED_FEATURES).map(([category, features]) => (
            <div key={category}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-1 px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
                style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                  {expandedCategories[category] !== false ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {category}
                </span>
              </button>

              {/* Features */}
              {expandedCategories[category] !== false && features.map((feature) => (
                <div
                  key={feature}
                  className="grid items-center"
                  style={{ gridTemplateColumns: '2fr repeat(4, 1fr)', borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <div className="px-4 py-3 text-[13px] text-white">{feature}</div>
                  {PRICING_TIERS.map((tier, ti) => (
                    <div
                      key={tier.id}
                      className="px-3 py-3 flex justify-center"
                      style={ti === 2 ? { background: 'rgba(195,245,59,0.03)' } : undefined}
                    >
                      {tierHasFeature(ti, feature) ? (
                        <Check size={16} style={{ color: ti === 2 ? '#c3f53b' : 'var(--status-active)' }} aria-label="Included" />
                      ) : (
                        <X size={14} style={{ color: 'var(--text-muted)' }} aria-label="Not included" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </motion.div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {PRICING_TIERS.map((tier) => (
            <div key={tier.id} className="card-surface p-5" style={tier.popular ? { borderColor: 'rgba(195,245,59,0.3)' } : undefined}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">{tier.name}</h3>
                {tier.popular && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#c3f53b', color: '#0a0a0a' }}>Popular</span>
                )}
              </div>
              <ul className="space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: tier.popular ? '#c3f53b' : 'var(--status-active)' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
