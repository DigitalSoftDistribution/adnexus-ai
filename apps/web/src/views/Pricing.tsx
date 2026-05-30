// @ts-nocheck
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import SEO from '../components/SEO';
import {
  Check, HelpCircle, ChevronDown, Zap, Shield,
  Users, TrendingUp, Sparkles, CreditCard, X,
  BarChart3, Bell, Bot, Layers, Slack,
  Infinity, Headphones, Globe, Lock, Star,
  ArrowRight, Building2,
} from 'lucide-react'

/* ═══════════════════════════════════
   Animation helpers
   ═══════════════════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.4, 0, 0.2, 1] },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
}

/* ═══════════════════════════════════
   Data — Pricing Tiers
   ═══════════════════════════════════ */
const tiers = [
  {
    id: 'free',
    name: 'Free',
    description: 'Explore with a read-only audit of your ad accounts',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Start Free Audit',
    ctaLink: '/signup',
    ctaStyle: 'secondary' as const,
    popular: false,
    icon: Shield,
    features: [
      { text: '1 ad account (Meta or Google)', icon: Globe },
      { text: 'Read-only performance audit', icon: BarChart3 },
      { text: '5 saved reports / month', icon: Bell },
      { text: 'Draft preview (no execution)', icon: Bot },
      { text: 'Community support', icon: Users },
    ],
    nonFeatures: [
      'Campaign creation or edits',
      'TikTok + Snapchat',
      'AI Agent automation',
      'Scheduled digests',
      'Team members',
      'API access',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For solo marketers with $5–50K/mo ad spend',
    monthlyPrice: 49,
    annualPrice: 408,
    cta: 'Start 14-Day Trial',
    ctaLink: '/signup',
    ctaStyle: 'secondary' as const,
    popular: false,
    icon: TrendingUp,
    features: [
      { text: '3 ad accounts (Meta + Google)', icon: Globe },
      { text: 'AI Agent with draft-first approval', icon: Bot },
      { text: 'Campaign dashboard + creation', icon: BarChart3 },
      { text: 'Weekly email digests', icon: Bell },
      { text: '2 team members', icon: Users },
    ],
    nonFeatures: [
      'TikTok + Snapchat',
      'Full AI optimization',
      'Creative fatigue detection',
      'Competitive intelligence',
      'Slack integration',
      'White-label portal',
      'API access',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For growth teams with $50–200K/mo ad spend',
    monthlyPrice: 149,
    annualPrice: 1240,
    cta: 'Start 14-Day Trial',
    ctaLink: '/signup',
    ctaStyle: 'primary' as const,
    popular: true,
    badge: 'BEST VALUE',
    icon: Zap,
    features: [
      { text: 'Everything in Growth +', icon: Star, highlight: true },
      { text: '10 pooled ad accounts', icon: Globe },
      { text: 'All 4 platforms (Meta, Google, TikTok, Snap)', icon: Layers },
      { text: 'Full AI Agent with optimization', icon: Bot },
      { text: 'Morning Brief + daily digests', icon: Bell },
      { text: 'Creative fatigue detection', icon: Sparkles },
      { text: 'Slack integration', icon: Slack },
      { text: '5 team seats', icon: Users },
    ],
    nonFeatures: [
      'White-label portal',
      'API access',
      'Custom AI rules',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For agencies managing $200K+/mo across clients',
    monthlyPrice: 399,
    annualPrice: 3324,
    cta: 'Start 14-Day Trial',
    ctaLink: '/signup',
    ctaStyle: 'accent' as const,
    popular: false,
    icon: Building2,
    features: [
      { text: 'Everything in Team +', icon: Star, highlight: true },
      { text: '25 pooled ad accounts', icon: Globe },
      { text: 'White-label client portal', icon: Globe },
      { text: 'API access + webhooks', icon: Lock },
      { text: 'Custom AI rules', icon: Sparkles },
      { text: 'Advanced approval chains', icon: Shield },
      { text: 'Priority support', icon: Headphones },
      { text: 'Unlimited team seats', icon: Infinity },
    ],
    nonFeatures: [],
  },
]

/* ═══════════════════════════════════
   Data — FAQs
   ═══════════════════════════════════ */
const faqs = [
  {
    q: 'Can I switch plans or cancel anytime?',
    a: 'Absolutely. You can upgrade, downgrade, or cancel your subscription at any time from your billing settings. If you cancel, you\'ll retain access until the end of your current billing period.',
  },
  {
    q: 'How does the 14-day free trial work?',
    a: 'Start any plan with a 14-day free trial — no credit card required. You\'ll get full access to all included features. At the end of the trial, choose to subscribe or your account automatically downgrades to a limited free tier.',
  },
  {
    q: 'Is there a discount for annual billing?',
    a: 'Yes! Annual billing gives you 2 months free — that\'s 12 months for the price of 10. You can toggle between monthly and annual at the top of this page to see the savings.',
  },
  {
    q: 'What ad platforms do you support?',
    a: 'Growth supports Meta (Facebook/Instagram) and Google Ads. Scale and Accelerate add TikTok and Snapchat — all 4 major platforms in one unified dashboard.',
  },
  {
    q: 'Do you offer agency or volume pricing?',
    a: 'Accelerate is built specifically for agencies managing $200K+/mo in ad spend. For larger teams or custom requirements, contact our sales team for tailored pricing.',
  },
]

/* ═══════════════════════════════════
   FAQ Item Component
   ═══════════════════════════════════ */
function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      custom={index}
      variants={fadeUp}
      className="border border-[#23252a] rounded-xl overflow-hidden bg-[#141618]/60 backdrop-blur-sm"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-[#1a1c20] transition-colors duration-200"
      >
        <span className="text-[#e8e8e8] font-medium text-sm sm:text-base pr-4">{faq.q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={18} className="text-[#c3f53b]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-[#9b9c9e] text-sm leading-relaxed border-t border-[#23252a] pt-4">
              {faq.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════
   Pricing Card Component
   ═══════════════════════════════════ */
function PricingCard({
  tier,
  isAnnual,
  index,
}: {
  tier: typeof tiers[0]
  isAnnual: boolean
  index: number
}) {
  const Icon = tier.icon
  const price = isAnnual ? tier.annualPrice : tier.monthlyPrice
  const periodLabel = isAnnual ? '/yr' : '/mo'
  const savings = isAnnual ? `Save $${(tier.monthlyPrice * 12 - tier.annualPrice).toLocaleString()}` : null

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      custom={index}
      variants={scaleIn}
      className={`relative rounded-2xl border overflow-hidden flex flex-col ${
        tier.popular
          ? 'border-[#c3f53b]/40 bg-[#c3f53b]/[0.03] shadow-[0_0_40px_rgba(195,245,59,0.08)]'
          : 'border-[#2a2c30] bg-[#141618]/80'
      }`}
    >
      {/* Popular Badge */}
      {tier.popular && tier.badge && (
        <div className="absolute top-0 left-0 right-0 flex justify-center">
          <div className="bg-[#c3f53b] text-[#0d0e10] text-[11px] font-bold px-5 py-1.5 rounded-b-lg tracking-wider uppercase">
            {tier.badge}
          </div>
        </div>
      )}

      <div className={`p-6 sm:p-8 flex flex-col flex-1 ${tier.popular ? 'pt-12' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            tier.popular ? 'bg-[#c3f53b]/15' : 'bg-[#23252a]'
          }`}>
            <Icon size={20} className={tier.popular ? 'text-[#c3f53b]' : 'text-[#9b9c9e]'} />
          </div>
          <h3 className="text-xl font-semibold text-[#f1f1f1]">{tier.name}</h3>
        </div>

        <p className="text-[#9b9c9e] text-sm mb-5">{tier.description}</p>

        {/* Price */}
        <div className="mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={isAnnual ? 'annual' : 'monthly'}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="flex items-baseline gap-1"
            >
              <span className="text-4xl sm:text-5xl font-bold text-[#f1f1f1]">
                ${price.toLocaleString()}
              </span>
              <span className="text-[#9b9c9e] text-sm font-medium">{periodLabel}</span>
            </motion.div>
          </AnimatePresence>
          {savings && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[#c3f53b] text-xs font-medium mt-1 block"
            >
              {savings} with annual billing
            </motion.span>
          )}
          {!isAnnual && (
            <span className="text-[#5a5c60] text-xs mt-1 block">
              or ${tier.annualPrice.toLocaleString()}/yr (2 months free)
            </span>
          )}
        </div>

        {/* CTA Button */}
        <Link
          to={tier.ctaLink}
          className={`block w-full text-center py-3 px-5 rounded-xl font-semibold text-sm transition-all duration-200 mb-6 ${
            tier.ctaStyle === 'primary'
              ? 'bg-[#c3f53b] text-[#0d0e10] hover:bg-[#d4ff4d] hover:shadow-[0_0_24px_rgba(195,245,59,0.3)]'
              : tier.ctaStyle === 'accent'
              ? 'border-2 border-[#c3f53b] text-[#c3f53b] hover:bg-[#c3f53b]/10'
              : 'bg-[#23252a] text-[#f1f1f1] hover:bg-[#2c2e32] border border-[#2a2c30]'
          }`}
        >
          {tier.cta}
        </Link>

        {/* Divider */}
        <div className="border-t border-[#23252a] pt-5 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5a5c60] mb-3 block">
            What&apos;s included
          </span>

          {/* Features List */}
          <ul className="space-y-2.5">
            {tier.features.map((f, i) => {
              const FeatureIcon = f.icon
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <Check
                    size={16}
                    className={`flex-shrink-0 mt-0.5 ${f.highlight ? 'text-[#c3f53b]' : 'text-[#c3f53b]/80'}`}
                  />
                  <div className="flex items-center gap-1.5">
                    <FeatureIcon size={13} className="text-[#5a5c60] flex-shrink-0" />
                    <span className={`text-sm ${f.highlight ? 'text-[#c3f53b] font-medium' : 'text-[#c8c8c9]'}`}>
                      {f.text}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Non-features (excluded items) */}
          {tier.nonFeatures.length > 0 && (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5a5c60] mt-5 mb-3 block">
                Not included
              </span>
              <ul className="space-y-2">
                {tier.nonFeatures.map((nf, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <X size={14} className="flex-shrink-0 mt-0.5 text-[#3a3c40]" />
                    <span className="text-sm text-[#5a5c60] line-through">{nf}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════
   Main Pricing Page
   ═══════════════════════════════════ */
export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const isHeroInView = useInView(heroRef, { once: true })

  return (
    <>
    <SEO
      title="Pricing"
      description="AdNexus AI pricing plans for individuals, teams, and agencies. Start free, upgrade for AI optimization, advanced reporting, and team collaboration."
      keywords="pricing, plans, free trial, subscription, agency pricing, AdNexus AI cost"
    />
    <div className="min-h-screen bg-[#0d0e10] text-[#f1f1f1] overflow-hidden">
      {/* ═══ Hero Header ═══ */}
      <section ref={heroRef} className="relative pt-24 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#c3f53b]/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial="hidden"
          animate={isHeroInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.div variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 bg-[#c3f53b]/10 border border-[#c3f53b]/20 text-[#c3f53b] text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6">
              <Sparkles size={13} />
              Simple, transparent pricing
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#f1f1f1] mb-5"
          >
            Plans that scale with{' '}
            <span className="text-[#c3f53b]">your growth</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-[#9b9c9e] text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed"
          >
            Start free for 14 days. No credit card required. Upgrade or downgrade anytime.
          </motion.p>

          {/* Monthly / Annual Toggle */}
          <motion.div variants={fadeUp} custom={3} className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsAnnual(false)}
              className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-[#f1f1f1]' : 'text-[#5a5c60] hover:text-[#9b9c9e]'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                isAnnual ? 'bg-[#c3f53b]' : 'bg-[#2a2c30]'
              }`}
              aria-label="Toggle annual billing"
            >
              <motion.div
                animate={{ x: isAnnual ? 28 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 rounded-full bg-[#0d0e10] shadow-md"
              />
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`text-sm font-medium transition-colors ${isAnnual ? 'text-[#f1f1f1]' : 'text-[#5a5c60] hover:text-[#9b9c9e]'}`}
            >
              Annual
            </button>
            <span className="bg-[#c3f53b]/15 text-[#c3f53b] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ml-1">
              2 months free
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ Trust Badges ═══ */}
      <section className="pb-10 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <div className="flex items-center gap-2 text-[#5a5c60] text-xs sm:text-sm">
            <CheckCircle2 size={15} className="text-[#c3f53b]" />
            <span>14-day free trial</span>
          </div>
          <div className="flex items-center gap-2 text-[#5a5c60] text-xs sm:text-sm">
            <CreditCard size={15} className="text-[#c3f53b]" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2 text-[#5a5c60] text-xs sm:text-sm">
            <Shield size={15} className="text-[#c3f53b]" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-[#5a5c60] text-xs sm:text-sm">
            <Headphones size={15} className="text-[#c3f53b]" />
            <span>Support included</span>
          </div>
        </motion.div>
      </section>

      {/* ═══ Pricing Cards ═══ */}
      <section className="pb-20 sm:pb-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {tiers.map((tier, index) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              isAnnual={isAnnual}
              index={index}
            />
          ))}
        </div>

        {/* Bottom microcopy */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-[#5a5c60] text-xs mt-8"
        >
          All prices in USD. Taxes may apply based on your region.
        </motion.p>
      </section>

      {/* ═══ Comparison Feature Strip ═══ */}
      <section className="pb-20 sm:pb-28 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f1f1f1] mb-3">
              Everything you need to scale
            </h2>
            <p className="text-[#9b9c9e] text-sm sm:text-base max-w-lg mx-auto">
              All plans include core analytics, automated reporting, and our secure infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: BarChart3, label: 'Campaign Dashboard', sub: 'All plans' },
              { icon: Bot, label: 'AI Assistant', sub: 'Scale & up' },
              { icon: Bell, label: 'Email Reports', sub: 'All plans' },
              { icon: Shield, label: 'SOC-2 Security', sub: 'All plans' },
              { icon: Users, label: 'Team Collaboration', sub: 'All plans' },
              { icon: Sparkles, label: 'Creative Insights', sub: 'Scale & up' },
              { icon: Lock, label: 'SSO / SAML', sub: 'Accelerate' },
              { icon: Headphones, label: 'Priority Support', sub: 'Accelerate' },
            ].map((item, i) => {
              const ItemIcon = item.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  custom={i}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-[#23252a] bg-[#141618]/60 hover:border-[#2f3136] transition-colors duration-200"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#c3f53b]/10 flex items-center justify-center flex-shrink-0">
                    <ItemIcon size={17} className="text-[#c3f53b]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#e8e8e8] text-sm font-medium truncate">{item.label}</p>
                    <p className="text-[#5a5c60] text-[11px]">{item.sub}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </section>

      {/* ═══ FAQ Section ═══ */}
      <section className="pb-24 sm:pb-32 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 bg-[#23252a] border border-[#2a2c30] text-[#9b9c9e] text-xs font-medium px-4 py-1.5 rounded-full mb-5">
              <HelpCircle size={13} />
              Frequently Asked Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f1f1f1]">
              Got questions? We&apos;ve got answers.
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>

          {/* CTA Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 text-center p-8 rounded-2xl border border-[#23252a] bg-[#141618]/60"
          >
            <h3 className="text-lg font-semibold text-[#f1f1f1] mb-2">
              Still have questions?
            </h3>
            <p className="text-[#9b9c9e] text-sm mb-5 max-w-md mx-auto">
              Our team is here to help you find the perfect plan for your needs. Reach out and we&apos;ll respond within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-[#c3f53b] text-[#0d0e10] px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#d4ff4d] transition-colors duration-200"
              >
                Start Free Trial
                <ArrowRight size={15} />
              </Link>
              <a
                href="mailto:support@campaignagent.ai"
                className="inline-flex items-center gap-2 border border-[#2a2c30] text-[#9b9c9e] px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-[#1a1c20] hover:text-[#f1f1f1] transition-colors duration-200"
              >
                Contact Support
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
    </>
  )
}
