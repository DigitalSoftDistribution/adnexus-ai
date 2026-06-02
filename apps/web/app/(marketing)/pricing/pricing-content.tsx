'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ChevronDown } from 'lucide-react';
import {
  PRICING_TIERS,
  PRICING_FAQS,
  priceForPeriod,
  annualSavings,
  type BillingPeriod,
} from '@/lib/pricing';
import { cn } from '@/lib/utils';

export function PricingContent() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center rounded-full border border-[#c3f53b]/30 bg-[#c3f53b]/10 px-3 py-1 text-xs font-medium text-[#c3f53b]">
          Simple, transparent pricing
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Plans that scale with your ad spend
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Start free with a read-only audit. Upgrade when you&apos;re ready to let AI draft
          optimizations for your approval. No credit card required.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium transition-colors',
              period === 'monthly' ? 'bg-white text-black' : 'text-gray-400 hover:text-white',
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod('annual')}
            className={cn(
              'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors',
              period === 'annual' ? 'bg-white text-black' : 'text-gray-400 hover:text-white',
            )}
          >
            Annual
            <span className="rounded-full bg-[#c3f53b]/20 px-2 py-0.5 text-[10px] font-semibold text-[#c3f53b]">
              2 months free
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="mt-16 grid gap-6 lg:grid-cols-4">
        {PRICING_TIERS.map((tier) => {
          const displayPrice = priceForPeriod(tier, period);
          const savings = annualSavings(tier);
          return (
            <div
              key={tier.id}
              className={cn(
                'relative flex flex-col rounded-2xl border p-6',
                tier.popular
                  ? 'border-[#c3f53b]/40 bg-[#c3f53b]/[0.04] shadow-[0_0_40px_-12px_rgba(195,245,59,0.3)]'
                  : 'border-white/10 bg-white/[0.02]',
              )}
            >
              {tier.popular && tier.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#c3f53b] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                  {tier.badge}
                </span>
              )}

              <h2 className="text-lg font-semibold">{tier.name}</h2>
              <p className="mt-1 min-h-[40px] text-sm text-gray-400">{tier.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${displayPrice}</span>
                {tier.monthlyPrice > 0 && <span className="text-sm text-gray-400">/mo</span>}
              </div>
              {period === 'annual' && savings > 0 ? (
                <p className="mt-1 text-xs text-[#c3f53b]">Save ${savings} with annual billing</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  {tier.monthlyPrice === 0 ? 'Free forever' : 'Billed monthly'}
                </p>
              )}

              <Link
                href={tier.ctaLink}
                className={cn(
                  'mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-opacity hover:opacity-90',
                  tier.popular
                    ? 'bg-[#c3f53b] text-black'
                    : 'border border-white/15 bg-white/5 text-white',
                )}
              >
                {tier.cta}
              </Link>

              <ul className="mt-6 space-y-3 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 flex-shrink-0 text-[#c3f53b]" aria-hidden="true" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
                {tier.nonFeatures.map((nonFeature) => (
                  <li key={nonFeature} className="flex items-start gap-2.5">
                    <X size={16} className="mt-0.5 flex-shrink-0 text-gray-600" aria-hidden="true" />
                    <span className="text-gray-600">{nonFeature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-center text-3xl font-bold">Frequently asked questions</h2>
        <div className="mt-8 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
          {PRICING_FAQS.map((faq, i) => (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={openFaq === i}
              >
                <span className="font-medium">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={cn(
                    'flex-shrink-0 text-gray-400 transition-transform',
                    openFaq === i && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
              {openFaq === i && <p className="px-6 pb-5 text-sm text-gray-400">{faq.a}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mx-auto mt-24 max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-10 text-center">
        <h2 className="text-2xl font-bold">Still have questions?</h2>
        <p className="mt-2 text-gray-400">
          Start your free read-only audit in 2 minutes — no credit card required.
        </p>
        <Link
          href="/auth/signup"
          className="mt-6 inline-flex rounded-lg bg-[#c3f53b] px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Start Free Audit
        </Link>
      </div>
    </div>
  );
}
