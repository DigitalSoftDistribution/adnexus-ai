'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, Sparkles, CreditCard, Shield, Headphones, CheckCircle2, ArrowRight } from 'lucide-react';
import { PRICING_TIERS, formatPrice } from '@/lib/marketing/pricing';

const FAQS = [
  {
    q: 'Can I switch plans or cancel anytime?',
    a: "Yes. Upgrade, downgrade, or cancel at any time from billing settings. If you cancel, you keep access until the end of your current period.",
  },
  {
    q: 'How does the 14-day free trial work?',
    a: 'Start any paid plan with a 14-day free trial — no credit card required. At the end you can subscribe, or your account drops to the free tier automatically.',
  },
  {
    q: 'Does pricing scale with my ad spend?',
    a: "No — and that's the point. Our pricing is flat. Unlike Madgicx or Revealbot, your bill does not grow when your managed ad spend grows.",
  },
  {
    q: 'Which ad platforms are supported?',
    a: 'Growth is Meta-first: Meta write access plus Google read-only reporting. Scale and Agency add Google write access plus TikTok and Snapchat, so all four major platforms are available in one unified dashboard.',
  },
  {
    q: 'Do you offer agency or volume pricing?',
    a: 'The Agency plan is built for agencies and high-spend brands. For custom requirements or very large teams, contact sales for tailored pricing.',
  },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-[var(--bg-hover)]"
      >
        <span className="text-white font-medium text-sm pr-4">{q}</span>
        <ChevronDown size={18} style={{ color: '#c3f53b', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="px-5 pb-5 text-sm leading-relaxed pt-4" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PricingContent() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div style={{ background: 'var(--bg-primary)' }}>
      {/* Hero */}
      <section className="relative pt-24 sm:pt-32 pb-12 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none" style={{ background: 'rgba(195,245,59,0.04)', filter: 'blur(120px)' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6" style={{ background: 'rgba(195,245,59,0.1)', border: '1px solid rgba(195,245,59,0.2)', color: '#c3f53b' }}>
            <Sparkles size={13} aria-hidden="true" />
            Flat, transparent pricing
          </span>
          <h1 className="font-space text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-5">
            Pricing that scales with your <span style={{ color: '#c3f53b' }}>strategy</span>, not your spend
          </h1>
          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Start free for 14 days. No credit card required. Your bill never rises just because your ad budget does.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => setIsAnnual(false)} className="text-sm font-medium transition-colors" style={{ color: !isAnnual ? '#fff' : 'var(--text-tertiary)' }}>Monthly</button>
            <button type="button" onClick={() => setIsAnnual((v) => !v)} aria-label="Toggle annual billing" className="relative w-14 h-7 rounded-full transition-colors duration-300" style={{ background: isAnnual ? '#c3f53b' : 'var(--bg-hover)' }}>
              <motion.div animate={{ x: isAnnual ? 28 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-1 w-5 h-5 rounded-full shadow-md" style={{ background: '#0d0e10' }} />
            </button>
            <button type="button" onClick={() => setIsAnnual(true)} className="text-sm font-medium transition-colors" style={{ color: isAnnual ? '#fff' : 'var(--text-tertiary)' }}>Annual</button>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ml-1" style={{ background: 'rgba(195,245,59,0.15)', color: '#c3f53b' }}>2 months free</span>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="pb-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {[
            { icon: <CheckCircle2 size={15} style={{ color: '#c3f53b' }} aria-hidden="true" />, label: '14-day free trial' },
            { icon: <CreditCard size={15} style={{ color: '#c3f53b' }} aria-hidden="true" />, label: 'No credit card required' },
            { icon: <Shield size={15} style={{ color: '#c3f53b' }} aria-hidden="true" />, label: 'Cancel anytime' },
            { icon: <Headphones size={15} style={{ color: '#c3f53b' }} aria-hidden="true" />, label: 'Support included' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {b.icon}
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tier cards */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PRICING_TIERS.map((tier, index) => {
            const monthly = tier.monthlyPrice;
            const annualMonthly = tier.annualMonthlyPrice;
            const displayPrice = isAnnual ? annualMonthly : monthly;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="relative rounded-2xl overflow-hidden flex flex-col p-6"
                style={{ border: tier.popular ? '1px solid rgba(195,245,59,0.4)' : '1px solid var(--border-subtle)', background: tier.popular ? 'rgba(195,245,59,0.03)' : 'var(--bg-elevated)', boxShadow: tier.popular ? '0 0 40px rgba(195,245,59,0.08)' : undefined }}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase" style={{ background: '#c3f53b', color: '#0d0e10' }}>Most Popular</div>
                )}
                <h3 className="text-xl font-semibold text-white mb-1">{tier.name}</h3>
                <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{tier.description}</p>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono-data text-4xl font-bold text-white">{formatPrice(displayPrice)}</span>
                    {displayPrice !== null && displayPrice > 0 && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>/mo</span>}
                  </div>
                  {isAnnual && monthly !== null && monthly > 0 && (
                    <span className="text-xs mt-1 block" style={{ color: '#c3f53b' }}>billed annually</span>
                  )}
                </div>
                <Link href={tier.ctaHref} className="block w-full text-center py-3 px-5 rounded-xl font-semibold text-sm transition-all duration-200 mb-6" style={{ background: tier.popular ? '#c3f53b' : 'var(--bg-hover)', color: tier.popular ? '#0d0e10' : '#fff', border: tier.popular ? 'none' : '1px solid var(--border-subtle)' }}>
                  {tier.cta}
                </Link>
                <div className="pt-5 flex-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest mb-3 block" style={{ color: 'var(--text-tertiary)' }}>What&apos;s included</span>
                  <ul className="space-y-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#c3f53b' }} aria-hidden="true" />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {tier.notIncluded.length > 0 && (
                    <>
                      <span className="text-[10px] font-semibold uppercase tracking-widest mt-5 mb-3 block" style={{ color: 'var(--text-tertiary)' }}>Not included</span>
                      <ul className="space-y-2">
                        {tier.notIncluded.map((nf) => (
                          <li key={nf} className="flex items-start gap-2.5">
                            <X size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                            <span className="text-sm line-through" style={{ color: 'var(--text-tertiary)' }}>{nf}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-center text-xs mt-8" style={{ color: 'var(--text-tertiary)' }}>All prices in USD. Taxes may apply based on your region.</p>
      </section>

      {/* FAQ */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-space text-2xl sm:text-3xl font-bold text-white">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
          <div className="mt-12 text-center p-8 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-lg font-semibold text-white mb-2">Still have questions?</h3>
            <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>Our team responds within one business day. Reach out and we&apos;ll help you find the right plan.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm" style={{ background: '#c3f53b', color: '#0d0e10' }}>
                Start Free Trial
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
