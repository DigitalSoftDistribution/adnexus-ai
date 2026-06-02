/**
 * Canonical pricing source of truth for the marketing site.
 *
 * Previously prices were hardcoded and divergent across Home.tsx,
 * spa-pages/Pricing.tsx and views/Pricing.tsx ($49/$79/$199 stale copies).
 * This module is the single place SSR marketing pages (home teaser, /pricing,
 * JSON-LD Offer) read from. Growth is $39/mo (undercuts Madgicx $49 /
 * Revealbot $99). Annual billing = 2 months free (monthly x 10), except the
 * Free tier.
 */

export type BillingPeriod = 'monthly' | 'annual';

export interface PricingTier {
  id: 'free' | 'growth' | 'team' | 'agency';
  name: string;
  /** One-line positioning shown under the tier name. */
  description: string;
  /** USD per month on the monthly plan. */
  monthlyPrice: number;
  /** USD total billed per year on the annual plan (monthly x 10 = 2 months free). */
  annualPrice: number;
  /** Number of ad accounts included. */
  accounts: number;
  /** Primary CTA label. */
  cta: string;
  /** Where the CTA links to. */
  ctaLink: string;
  /** Highlight as the recommended tier. */
  popular: boolean;
  /** Optional ribbon label when popular. */
  badge?: string;
  /** Included capabilities, shown with a check. */
  features: string[];
  /** Capabilities NOT included on this tier, shown muted. */
  nonFeatures: string[];
}

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Explore with a read-only audit of your ad accounts',
    monthlyPrice: 0,
    annualPrice: 0,
    accounts: 1,
    cta: 'Start Free Audit',
    ctaLink: '/auth/signup',
    popular: false,
    features: [
      '1 ad account (Meta or Google)',
      '~100 AI credits / month',
      'Read-only performance audit',
      '5 saved reports / month',
      'Draft preview (no execution)',
      'Community support',
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
    monthlyPrice: 39,
    annualPrice: 390,
    accounts: 3,
    cta: 'Start 14-Day Trial',
    ctaLink: '/auth/signup',
    popular: false,
    features: [
      '3 ad accounts (Meta + Google)',
      '~1,500 AI credits / month',
      'AI Agent with draft-first approval',
      'Campaign dashboard + creation',
      'Weekly email digests',
      '2 team members',
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
    annualPrice: 1490,
    accounts: 10,
    cta: 'Start 14-Day Trial',
    ctaLink: '/auth/signup',
    popular: true,
    badge: 'BEST VALUE',
    features: [
      'Everything in Growth +',
      '~6,000 AI credits / month',
      '10 pooled ad accounts',
      'All 4 platforms (Meta, Google, TikTok, Snap)',
      'Full AI Agent with optimization',
      'Morning Brief + daily digests',
      'Creative fatigue detection',
      'Slack integration',
      '5 team seats',
    ],
    nonFeatures: ['White-label portal', 'API access', 'Custom AI rules'],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For agencies managing $200K+/mo across clients',
    monthlyPrice: 399,
    annualPrice: 3990,
    accounts: 25,
    cta: 'Start 14-Day Trial',
    ctaLink: '/auth/signup',
    popular: false,
    features: [
      'Everything in Team +',
      '~20,000 AI credits / month + top-ups',
      '25 pooled ad accounts',
      'White-label client portal',
      'API access + webhooks',
      'Custom AI rules',
      'Advanced approval chains',
      'Priority support',
      'Unlimited team seats',
    ],
    nonFeatures: [],
  },
] as const;

/** The lowest non-zero monthly price, useful for "from $X/mo" copy + JSON-LD. */
export const STARTING_PRICE = 39;

/** Display price for a tier given the selected billing period (USD/mo equivalent). */
export function priceForPeriod(tier: PricingTier, period: BillingPeriod): number {
  if (period === 'monthly') return tier.monthlyPrice;
  // Annual is billed yearly; show the effective monthly equivalent.
  return Math.round(tier.annualPrice / 12);
}

/** Dollars saved per year by choosing annual over monthly for a tier. */
export function annualSavings(tier: PricingTier): number {
  return tier.monthlyPrice * 12 - tier.annualPrice;
}

export const PRICING_FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Can I switch plans later?',
    a: 'Yes — upgrade, downgrade, or cancel anytime from your billing settings. Changes take effect at the start of your next billing cycle.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'Every paid plan (Growth, Team, Agency) includes a 14-day free trial. No credit card is required to start your read-only Free audit.',
  },
  {
    q: 'How does annual billing work?',
    a: 'Annual plans are billed once per year and give you 2 months free compared to paying monthly.',
  },
  {
    q: 'Which ad platforms are supported?',
    a: 'Meta and Google on Growth; all four platforms (Meta, Google, TikTok, and Snapchat) on Team and Agency.',
  },
  {
    q: 'Do you offer custom agency pricing?',
    a: 'The Agency plan covers most agencies managing $200K+/mo in spend. For larger or white-label needs, contact us for a custom quote.',
  },
];
