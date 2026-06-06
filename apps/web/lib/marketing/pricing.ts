/**
 * Single source of truth for marketing pricing.
 * Consumed by the Home pricing teaser and the full /pricing page so the
 * two never drift apart again.
 *
 * Positioning note: flat monthly pricing that does NOT scale with ad spend
 * (the key wedge vs Madgicx / Revealbot which meter on managed spend).
 */

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  /** Monthly price in USD. null = "Custom". */
  monthlyPrice: number | null;
  /** Effective monthly price when billed annually (≈2 months free). */
  annualMonthlyPrice: number | null;
  cta: string;
  ctaHref: string;
  popular: boolean;
  /** Short feature bullets surfaced on the Home teaser. */
  highlights: string[];
  /** Full feature list for the /pricing page. */
  features: string[];
  /** Things explicitly NOT included (rendered struck-through on /pricing). */
  notIncluded: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Audit one ad account with read-only AI insights.',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    cta: 'Start Free',
    ctaHref: '/auth/signup',
    popular: false,
    highlights: ['1 ad account', 'Read-only AI audit', 'Draft preview (no execution)'],
    features: [
      '1 ad account (Meta or Google)',
      'Read-only performance audit',
      '5 saved reports / month',
      'Draft preview — see what AI would do',
      'Community support',
    ],
    notIncluded: [
      'Campaign creation or edits',
      'TikTok + Snapchat',
      'AI Agent automation',
      'Team members',
      'API access',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For solo marketers and lean teams starting with Meta-first optimization and Google read-only visibility.',
    monthlyPrice: 49,
    annualMonthlyPrice: 39,
    cta: 'Start 14-Day Trial',
    ctaHref: '/auth/signup',
    popular: false,
    highlights: ['3 ad accounts', 'Meta write + Google read-only', 'Weekly Morning Brief'],
    features: [
      '3 ad accounts (Meta write access + Google read-only reporting)',
      'AI Agent with draft-first approval for Meta changes',
      'Campaign dashboard + Meta campaign creation',
      'Weekly Morning Brief digests',
      'Creative fatigue alerts',
      '2 team members',
      '14-day data history',
    ],
    notIncluded: ['Google write access', 'TikTok + Snapchat (Scale+)', 'Approval workflows', 'API access'],
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For growing brands coordinating spend across all four platforms.',
    monthlyPrice: 149,
    annualMonthlyPrice: 119,
    cta: 'Start 14-Day Trial',
    ctaHref: '/auth/signup',
    popular: true,
    highlights: ['All 4 platforms', 'Unlimited AI drafts', 'Approval workflows'],
    features: [
      'All 4 platforms (Meta, Google, TikTok, Snap)',
      'Unlimited AI drafts',
      'Multi-tier approval workflows',
      'Creative fatigue + audience saturation',
      'Competitive intelligence',
      'Cross-platform attribution',
      '90-day data history',
      'Up to 10 team members',
      'Priority support',
    ],
    notIncluded: ['Unlimited seats', 'SSO / SAML', 'Dedicated success manager'],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For agencies and high-spend brands that need full power and control.',
    monthlyPrice: 399,
    annualMonthlyPrice: 329,
    cta: 'Contact Sales',
    ctaHref: '/contact',
    popular: false,
    highlights: ['Unlimited seats + accounts', 'White-label reports', 'SSO + API access'],
    features: [
      'Everything in Scale',
      'Unlimited seats',
      'Unlimited ad accounts',
      'White-label client reports',
      'Custom AI automation rules',
      'Full API + MCP access',
      'SSO / SAML + advanced security',
      'Unlimited data history',
      'Dedicated success manager',
    ],
    notIncluded: [],
  },
];

export function formatPrice(price: number | null): string {
  if (price === null) return 'Custom';
  if (price === 0) return '$0';
  return `$${price}`;
}
