/** Marketing information architecture — shared by header + footer. */

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export interface NavMenu {
  label: string;
  /** If set, the top-level label is itself a link. */
  href?: string;
  items: NavLink[];
}

export const PRODUCT_MENU: NavMenu = {
  label: 'Product',
  items: [
    { label: 'Overview', href: '/', description: 'The intelligent campaign workspace' },
    { label: 'Features', href: '/features', description: 'Everything AdNexus does' },
    { label: 'AI Agent', href: '/features/ai-agent', description: 'Autonomous monitoring, draft-first' },
    { label: 'Draft Approvals', href: '/features/approvals', description: 'Nothing goes live without you' },
    { label: 'Cross-Platform', href: '/features/platforms', description: 'Meta, Google, TikTok, Snap' },
    { label: 'Morning Brief', href: '/features/morning-brief', description: 'Your daily AI briefing' },
    { label: 'Creative Fatigue', href: '/features/creative-fatigue', description: 'Catch tired creative before it burns budget' },
    { label: 'Budget Pacing', href: '/features/budget-pacing', description: 'Smart budget allocation' },
    { label: 'Integrations', href: '/integrations', description: 'Connect your stack' },
    { label: 'Changelog', href: '/changelog', description: "What's new" },
  ],
};

export const SOLUTIONS_MENU: NavMenu = {
  label: 'Solutions',
  href: '/use-cases',
  items: [
    { label: 'For Agencies', href: '/use-cases/agencies', description: 'Manage many clients, one workspace' },
    { label: 'For E-commerce', href: '/use-cases/ecommerce', description: 'Protect ROAS across the funnel' },
    { label: 'For In-house Teams', href: '/use-cases/in-house', description: 'Move faster with guardrails' },
  ],
};

export const COMPARE_MENU: NavMenu = {
  label: 'Compare',
  items: [
    { label: 'vs Pipeboard', href: '/compare/pipeboard' },
    { label: 'vs Madgicx', href: '/compare/madgicx' },
    { label: 'vs Revealbot', href: '/compare/revealbot' },
    { label: 'vs Smartly', href: '/compare/smartly' },
    { label: 'vs AdKit', href: '/compare/adkit' },
  ],
};

export const RESOURCES_MENU: NavMenu = {
  label: 'Resources',
  items: [
    { label: 'Blog', href: '/blog' },
    { label: 'ROAS Calculator', href: '/tools/roas-calculator' },
    { label: 'Security', href: '/security' },
    { label: 'FAQ', href: '/faq' },
  ],
};

export const COMPANY_MENU: NavMenu = {
  label: 'Company',
  items: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
};

/** Header order. Pricing is a flat link rendered between the menus. */
export const HEADER_MENUS: NavMenu[] = [
  PRODUCT_MENU,
  SOLUTIONS_MENU,
  COMPARE_MENU,
  RESOURCES_MENU,
  COMPANY_MENU,
];

/** Footer columns. */
export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Integrations', href: '/integrations' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'For Agencies', href: '/use-cases/agencies' },
      { label: 'For E-commerce', href: '/use-cases/ecommerce' },
      { label: 'For In-house Teams', href: '/use-cases/in-house' },
      { label: 'ROAS Calculator', href: '/tools/roas-calculator' },
    ],
  },
  {
    title: 'Compare',
    links: COMPARE_MENU.items,
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Security', href: '/security' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Terms', href: '/legal/terms' },
  { label: 'DPA', href: '/legal/dpa' },
  { label: 'Cookies', href: '/legal/cookies' },
];
