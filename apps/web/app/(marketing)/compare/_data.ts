import type { LucideIcon } from 'lucide-react';
import {
  Layers,
  Cpu,
  Shield,
  BarChart3,
  Zap,
  DollarSign,
  Users,
  Bell,
  Globe,
  Code2,
  Clock,
  Sparkles,
} from 'lucide-react';

export type ComparisonValue = boolean | string;

export interface ComparisonRow {
  feature: string;
  adnexus: ComparisonValue;
  competitor: ComparisonValue;
  note?: string;
}

export interface ComparisonCategory {
  name: string;
  icon: LucideIcon;
  rows: ComparisonRow[];
}

export interface Differentiator {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
}

export interface ComparePill {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}

export interface CompetitorStrength {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface Testimonial {
  quote: string;
  initials: string;
  name: string;
  role: string;
}

export interface ScoreSummary {
  adnexus: number;
  competitor: number;
}

export interface CompareData {
  slug: string;
  /** Competitor display name (column header). */
  competitor: string;
  /** Page <title> / metadata title. */
  metaTitle: string;
  metaDescription: string;
  /** Hero pill label, e.g. "Pipeboard Alternative". */
  badge: string;
  /** Hero headline highlight (lime) + plain second line. */
  headlineAccent: string;
  headlineRest: string;
  subtitle: string;
  /** Primary CTA label in the hero. */
  ctaLabel: string;
  differentiators: Differentiator[];
  categories: ComparisonCategory[];
  score?: ScoreSummary;
  whyHeading: string;
  whySubtitle: string;
  whyPills: ComparePill[];
  /** Acknowledge competitor strengths (AdKit-style "where they shine"). */
  competitorStrengths?: CompetitorStrength[];
  testimonial?: Testimonial;
  ctaHeading: string;
  ctaSubtitle: string;
}

export const COMPARE_DATA: Record<string, CompareData> = {
  pipeboard: {
    slug: 'pipeboard',
    competitor: 'Pipeboard',
    metaTitle: 'AdNexus AI vs Pipeboard',
    metaDescription:
      'Compare AdNexus AI with Pipeboard. See why marketing teams choose AdNexus AI for AI-powered campaign management and optimization.',
    badge: 'Pipeboard Alternative',
    headlineAccent: 'The Pipeboard Alternative',
    headlineRest: 'Built for Agencies',
    subtitle:
      'Draft-first safety. Proactive agents. 30 tools your AI can actually reason about. All at a fraction of the cost.',
    ctaLabel: 'Start Free',
    differentiators: [
      {
        icon: Shield,
        title: 'Drafts, Not Deploys',
        description:
          'Every change is staged for your approval. Nothing touches live accounts without explicit sign-off. Pipeboard deploys paused; we deploy drafts.',
        iconColor: '#34D399',
      },
      {
        icon: Cpu,
        title: '30 Tools, Not 120',
        description:
          'Curated tool surface designed for LLM reasoning. Lower token costs, higher accuracy, faster responses.',
        iconColor: '#60A5FA',
      },
      {
        icon: Bell,
        title: 'Proactive, Not Reactive',
        description:
          'Morning Briefs, anomaly detection, and creative fatigue alerts delivered to your inbox daily. Pipeboard waits for you to ask.',
        iconColor: '#FBBF24',
      },
    ],
    categories: [
      {
        name: 'Platforms',
        icon: Layers,
        rows: [
          { feature: 'Meta Ads', adnexus: true, competitor: true, note: 'Native + MCP passthrough' },
          { feature: 'Google Ads', adnexus: true, competitor: true },
          { feature: 'TikTok Ads', adnexus: true, competitor: true },
          { feature: 'Snap Ads', adnexus: true, competitor: true },
          { feature: 'MCP Server', adnexus: true, competitor: true, note: 'Official Meta MCP' },
        ],
      },
      {
        name: 'AI Features',
        icon: Cpu,
        rows: [
          { feature: 'Creative Fatigue Detection', adnexus: true, competitor: false },
          { feature: 'Anomaly Detection', adnexus: true, competitor: false, note: 'Statistical + ML' },
          { feature: 'Morning Brief', adnexus: true, competitor: false, note: 'Daily AI summary' },
          { feature: 'AI Recommendations', adnexus: true, competitor: false },
          { feature: 'Curated Tool Surface', adnexus: '30 tools', competitor: '120+ tools', note: '30 beats 120 for LLM reasoning' },
        ],
      },
      {
        name: 'Draft Workflow',
        icon: Shield,
        rows: [
          { feature: 'Draft-First Workflow', adnexus: true, competitor: false, note: 'All writes staged for approval' },
          { feature: 'Visual Dashboard', adnexus: true, competitor: false, note: 'Bento grid vs chat only' },
          { feature: 'Campaign Management UI', adnexus: true, competitor: false, note: 'Full CRUD interface' },
          { feature: 'Audit Log', adnexus: true, competitor: false, note: 'Full audit trail' },
        ],
      },
      {
        name: 'Reporting',
        icon: BarChart3,
        rows: [
          { feature: 'Performance Dashboard', adnexus: true, competitor: true },
          { feature: 'White-Label Reports', adnexus: true, competitor: false },
          { feature: 'Scheduled Reports', adnexus: true, competitor: true },
          { feature: 'Cross-Platform Attribution', adnexus: true, competitor: false },
        ],
      },
      {
        name: 'Pricing',
        icon: DollarSign,
        rows: [
          { feature: 'Free Tier', adnexus: true, competitor: true },
          { feature: 'Pro Plan', adnexus: '$99/mo flat', competitor: '$149/mo' },
          { feature: 'Agency Plan', adnexus: '$499/mo flat', competitor: 'Custom pricing' },
          { feature: 'Hidden Fees', adnexus: false, competitor: true, note: 'Tracking costs extra' },
        ],
      },
      {
        name: 'Integrations',
        icon: Zap,
        rows: [
          { feature: 'Slack Notifications', adnexus: true, competitor: false },
          { feature: 'Multi-Account Scoping', adnexus: true, competitor: false, note: 'Per-client isolation' },
          { feature: 'API Access', adnexus: true, competitor: true },
          { feature: 'Webhook Support', adnexus: true, competitor: false },
        ],
      },
    ],
    score: { adnexus: 20, competitor: 8 },
    whyHeading: 'Why Agencies Choose AdNexus AI',
    whySubtitle: 'Built from the ground up for agencies managing multiple clients across platforms.',
    whyPills: [
      { icon: Users, title: 'Multi-Account', desc: 'Isolate clients with scoped access and per-account dashboards.', color: '#60A5FA' },
      { icon: Shield, title: 'Draft-First', desc: 'Every change staged for approval. No accidental deployments.', color: '#34D399' },
      { icon: Bell, title: 'Proactive Alerts', desc: 'Morning briefs, anomaly detection, and fatigue alerts daily.', color: '#FBBF24' },
      { icon: DollarSign, title: 'Flat Pricing', desc: 'Predictable costs. No per-account fees or hidden charges.', color: '#A78BFA' },
    ],
    testimonial: {
      quote:
        'We switched from Pipeboard because we needed to SEE our data, not just chat about it. AdNexus\u2019s dashboard + proactive alerts caught a $400/day budget leak in 12 minutes.',
      initials: 'SC',
      name: 'Sarah Chen',
      role: 'Solo Media Buyer, 12 clients',
    },
    ctaHeading: 'Switching is Easy',
    ctaSubtitle:
      'Connect your accounts and import all campaigns in under 5 minutes. Our team handles the rest.',
  },
  madgicx: {
    slug: 'madgicx',
    competitor: 'Madgicx',
    metaTitle: 'AdNexus AI vs Madgicx',
    metaDescription:
      'Compare AdNexus AI with Madgicx. Discover the intelligent campaign workspace that outperforms with AI-driven optimization.',
    badge: 'Madgicx Alternative',
    headlineAccent: 'The Madgicx Alternative',
    headlineRest: 'for Cross-Platform Teams',
    subtitle:
      'Madgicx is Meta-only. We cover Meta, Google, TikTok, and Snap \u2014 with MCP integration for AI agents. All at one flat price.',
    ctaLabel: 'Start Free',
    differentiators: [
      {
        icon: Globe,
        title: '4 Platforms, Not 1',
        description:
          'Meta, Google, TikTok, Snap in one dashboard. No more switching between tools. Madgicx is Meta-only.',
        iconColor: '#60A5FA',
      },
      {
        icon: Zap,
        title: 'MCP-Native Architecture',
        description:
          'Connect Claude, ChatGPT, Cursor directly to your ad data via the Model Context Protocol. Madgicx has no MCP layer.',
        iconColor: '#FBBF24',
      },
      {
        icon: DollarSign,
        title: 'Truly Flat Pricing',
        description:
          '$99/mo for everything. Madgicx charges $49-$99 PLUS $49 for tracking, and prices scale with ad spend.',
        iconColor: '#34D399',
      },
    ],
    categories: [
      {
        name: 'Platforms',
        icon: Layers,
        rows: [
          { feature: 'Meta Ads', adnexus: true, competitor: true, note: 'Both native' },
          { feature: 'Google Ads', adnexus: true, competitor: false },
          { feature: 'TikTok Ads', adnexus: true, competitor: false },
          { feature: 'Snap Ads', adnexus: true, competitor: false },
          { feature: 'MCP Server', adnexus: true, competitor: false, note: 'AI-native protocol' },
          { feature: 'Cross-Platform', adnexus: true, competitor: false, note: 'Single dashboard vs Meta-only' },
        ],
      },
      {
        name: 'AI Features',
        icon: Cpu,
        rows: [
          { feature: 'Creative Fatigue Detection', adnexus: true, competitor: true },
          { feature: 'Anomaly Detection', adnexus: true, competitor: false, note: 'Statistical + ML models' },
          { feature: 'Morning Brief', adnexus: true, competitor: false, note: 'Daily AI summary to inbox' },
          { feature: 'AI Agent Integration', adnexus: true, competitor: false, note: 'Claude, ChatGPT, Cursor' },
          { feature: 'AI Recommendations', adnexus: true, competitor: true },
          { feature: 'Curated Tool Surface', adnexus: '30 tools', competitor: 'N/A', note: 'MCP-native tool design' },
        ],
      },
      {
        name: 'Draft Workflow',
        icon: Shield,
        rows: [
          { feature: 'Draft-First Workflow', adnexus: true, competitor: false, note: 'All writes staged for approval' },
          { feature: 'Visual Dashboard', adnexus: true, competitor: true },
          { feature: 'Campaign Management UI', adnexus: true, competitor: true },
          { feature: 'Audit Log', adnexus: true, competitor: false, note: 'Full audit trail vs basic' },
        ],
      },
      {
        name: 'Reporting',
        icon: BarChart3,
        rows: [
          { feature: 'Performance Dashboard', adnexus: true, competitor: true },
          { feature: 'White-Label Reports', adnexus: true, competitor: true },
          { feature: 'Scheduled Reports', adnexus: true, competitor: true },
          { feature: 'Cross-Platform Attribution', adnexus: true, competitor: false },
        ],
      },
      {
        name: 'Pricing',
        icon: DollarSign,
        rows: [
          { feature: 'Free Tier', adnexus: true, competitor: false },
          { feature: 'Pro Plan', adnexus: '$99/mo flat', competitor: '$99 + $49 tracking' },
          { feature: 'Agency Plan', adnexus: '$499/mo flat', competitor: '$298+/mo' },
          { feature: 'Price Scales with Spend', adnexus: false, competitor: true, note: 'Hidden cost escalation' },
        ],
      },
      {
        name: 'Integrations',
        icon: Code2,
        rows: [
          { feature: 'Slack Notifications', adnexus: true, competitor: false },
          { feature: 'Multi-Account Scoping', adnexus: true, competitor: true, note: 'Per-client isolation' },
          { feature: 'API Access', adnexus: true, competitor: true },
          { feature: 'Webhook Support', adnexus: true, competitor: false },
          { feature: 'MCP Client Support', adnexus: true, competitor: false, note: 'Any MCP-compatible AI' },
        ],
      },
    ],
    score: { adnexus: 22, competitor: 7 },
    whyHeading: 'Why Teams Switch to AdNexus AI',
    whySubtitle: 'Built for modern multi-platform teams who need AI-native workflows.',
    whyPills: [
      { icon: Globe, title: '4 Platforms', desc: 'Manage Meta, Google, TikTok, and Snap from one dashboard.', color: '#60A5FA' },
      { icon: Code2, title: 'MCP Support', desc: 'Connect any MCP-compatible AI agent directly to your ad data.', color: '#A78BFA' },
      { icon: Shield, title: 'Draft-First', desc: 'Every AI action is staged for approval before deployment.', color: '#34D399' },
      { icon: DollarSign, title: 'Flat Pricing', desc: 'No per-account fees. No hidden charges. Predictable costs.', color: '#FBBF24' },
    ],
    testimonial: {
      quote:
        'We were paying Madgicx $148/month for Meta-only. AdNexus gives us four platforms, MCP integration with Claude, and we caught a creative fatigue issue before it burned $2K in spend.',
      initials: 'MR',
      name: 'Marcus Rivera',
      role: 'Growth Lead, 3-Platform Agency',
    },
    ctaHeading: 'Switching is Easy',
    ctaSubtitle:
      'Connect your accounts and import all campaigns in under 5 minutes. Our team handles the rest.',
  },
  birch: {
    slug: 'birch',
    competitor: 'Birch',
    metaTitle: 'AdNexus AI vs Birch',
    metaDescription:
      'Compare AdNexus AI with Birch. Discover why teams choose AdNexus for draft-first approval, AI-native ad management, and simpler pricing.',
    badge: 'Birch Alternative',
    headlineAccent: 'The Birch Alternative',
    headlineRest: 'With AI at the Core',
    subtitle:
      'Draft-first approval. AI agents built in. MCP-native integration. Simple, predictable pricing with no hidden fees.',
    ctaLabel: 'Start Free Audit',
    differentiators: [
      {
        icon: Shield,
        title: 'Draft-First Safety',
        description:
          'Every change is staged for approval before touching live campaigns. Birch deploys directly; we deploy drafts.',
        iconColor: '#34D399',
      },
      {
        icon: Cpu,
        title: 'AI-Native Architecture',
        description:
          'Built from the ground up with AI agents at the core. MCP support, creative fatigue detection, and anomaly alerts \u2014 not bolted on.',
        iconColor: '#60A5FA',
      },
      {
        icon: DollarSign,
        title: 'Simple, Predictable Pricing',
        description:
          'Flat-rate plans with no hidden fees or add-on costs. Birch charges extra for advanced features that we include standard.',
        iconColor: '#FBBF24',
      },
    ],
    categories: [
      {
        name: 'Platforms',
        icon: Layers,
        rows: [
          { feature: 'Meta Ads', adnexus: true, competitor: true },
          { feature: 'Google Ads', adnexus: true, competitor: true },
          { feature: 'TikTok Ads', adnexus: true, competitor: true },
          { feature: 'Snap Ads', adnexus: true, competitor: false },
          { feature: 'MCP Server', adnexus: true, competitor: false, note: 'Native AI integration' },
        ],
      },
      {
        name: 'AI Features',
        icon: Cpu,
        rows: [
          { feature: 'AI Agent Native', adnexus: true, competitor: false, note: 'Built-in AI from day one' },
          { feature: 'Creative Fatigue Detection', adnexus: true, competitor: false },
          { feature: 'Anomaly Detection', adnexus: true, competitor: false },
          { feature: 'Morning Brief', adnexus: true, competitor: false, note: 'Daily AI summary' },
          { feature: 'MCP/AI Native Integration', adnexus: true, competitor: false, note: 'Model Context Protocol support' },
        ],
      },
      {
        name: 'Draft Workflow',
        icon: Shield,
        rows: [
          { feature: 'Draft-First Approval', adnexus: true, competitor: false, note: 'All changes staged for review' },
          { feature: 'Visual Dashboard', adnexus: true, competitor: true },
          { feature: 'Campaign Management UI', adnexus: true, competitor: true },
          { feature: 'Audit Log', adnexus: true, competitor: true },
        ],
      },
      {
        name: 'Automation & Audience',
        icon: Zap,
        rows: [
          { feature: 'Rule-Based Automation', adnexus: true, competitor: true, note: 'Birch excels here' },
          { feature: 'Audience Management', adnexus: true, competitor: true, note: 'Birch has strong audience tools' },
          { feature: 'Automated Rules Engine', adnexus: true, competitor: true },
          { feature: 'Cross-Platform Rules', adnexus: true, competitor: true },
        ],
      },
      {
        name: 'Reporting',
        icon: BarChart3,
        rows: [
          { feature: 'Performance Dashboard', adnexus: true, competitor: true },
          { feature: 'White-Label Reports', adnexus: true, competitor: false },
          { feature: 'Scheduled Reports', adnexus: true, competitor: true },
          { feature: 'Cross-Platform Attribution', adnexus: true, competitor: false },
        ],
      },
      {
        name: 'Pricing',
        icon: DollarSign,
        rows: [
          { feature: 'Free Tier', adnexus: true, competitor: false },
          { feature: 'Starter Plan', adnexus: '$49/mo', competitor: '$49/mo' },
          { feature: 'Pro Plan', adnexus: '$99/mo flat', competitor: '$99/mo' },
          { feature: 'Agency Plan', adnexus: '$399/mo flat', competitor: 'Limited' },
          { feature: 'Hidden Fees', adnexus: false, competitor: true, note: 'Add-ons for advanced features' },
        ],
      },
    ],
    score: { adnexus: 22, competitor: 12 },
    whyHeading: 'Why Teams Choose AdNexus AI',
    whySubtitle:
      'Birch is strong on rules and audiences. But if you want AI-native workflows with draft-first safety, AdNexus delivers.',
    whyPills: [
      { icon: Users, title: 'Multi-Account', desc: 'Scoped per-client access with isolated dashboards.', color: '#60A5FA' },
      { icon: Shield, title: 'Draft-First', desc: 'Every change staged for approval. Birch skips this.', color: '#34D399' },
      { icon: Bell, title: 'Proactive AI', desc: 'Morning briefs, anomaly detection, fatigue alerts.', color: '#FBBF24' },
      { icon: DollarSign, title: 'Flat Pricing', desc: 'No hidden fees. All features included at every tier.', color: '#A78BFA' },
    ],
    testimonial: {
      quote:
        'Birch was fine for rules, but we needed AI that actually thinks about our campaigns. AdNexus\u2019s draft-first approval caught a misconfigured audience that would have wasted $2,000 in a weekend.',
      initials: 'MR',
      name: 'Marcus Rivera',
      role: 'Performance Marketer, D2C Brands',
    },
    ctaHeading: 'Get Your Free Ad Account Audit',
    ctaSubtitle:
      'Connect your accounts in 2 minutes. Our AI audits your campaigns and finds opportunities Birch would never surface.',
  },
  smartly: {
    slug: 'smartly',
    competitor: 'Smartly.io',
    metaTitle: 'AdNexus AI vs Smartly.io',
    metaDescription:
      'Compare AdNexus AI with Smartly.io. Self-serve pricing, 2-minute setup, and AI-native campaign management without enterprise contracts.',
    badge: 'Smartly.io Alternative',
    headlineAccent: 'The Smartly.io Alternative',
    headlineRest: 'Without the Enterprise Price',
    subtitle:
      'Self-serve pricing. 2-minute setup. AI agents built in. No sales calls, no contracts, no surprises.',
    ctaLabel: 'Try Free',
    differentiators: [
      {
        icon: Clock,
        title: '2-Minute Setup',
        description:
          'Sign up, connect your ad accounts, and start managing campaigns in under 2 minutes. Smartly requires a sales demo, contract negotiation, and onboarding.',
        iconColor: '#34D399',
      },
      {
        icon: DollarSign,
        title: 'Transparent Self-Serve Pricing',
        description:
          'See our prices, pick a plan, upgrade when ready. No enterprise contracts, no hidden fees, no "contact sales" walls.',
        iconColor: '#60A5FA',
      },
      {
        icon: Cpu,
        title: 'AI Agent Native',
        description:
          'Our AI agent proactively monitors campaigns, detects anomalies, and delivers morning briefs. Smartly focuses on creative automation, not intelligent agents.',
        iconColor: '#FBBF24',
      },
    ],
    categories: [
      {
        name: 'Platforms',
        icon: Layers,
        rows: [
          { feature: 'Meta Ads', adnexus: true, competitor: true },
          { feature: 'Google Ads', adnexus: true, competitor: true },
          { feature: 'TikTok Ads', adnexus: true, competitor: true },
          { feature: 'Snap Ads', adnexus: true, competitor: true },
          { feature: 'Pinterest Ads', adnexus: true, competitor: true },
          { feature: 'Channel Coverage', adnexus: '4 platforms', competitor: '8+ platforms', note: 'Smartly covers more channels' },
        ],
      },
      {
        name: 'AI Features',
        icon: Cpu,
        rows: [
          { feature: 'AI Agent Native', adnexus: true, competitor: false, note: 'Built-in conversational AI' },
          { feature: 'Creative Fatigue Detection', adnexus: true, competitor: false },
          { feature: 'Anomaly Detection', adnexus: true, competitor: false },
          { feature: 'Morning Brief', adnexus: true, competitor: false },
          { feature: 'MCP Integration', adnexus: true, competitor: false },
        ],
      },
      {
        name: 'Creative Production',
        icon: Zap,
        rows: [
          { feature: 'AI Creative Studio', adnexus: true, competitor: true, note: 'Smartly excels at enterprise creative' },
          { feature: 'Template-Based Ads', adnexus: true, competitor: true },
          { feature: 'Dynamic Creative', adnexus: true, competitor: true },
          { feature: 'Video Templates', adnexus: true, competitor: true, note: 'Smartly has broader video options' },
        ],
      },
      {
        name: 'Setup & Onboarding',
        icon: Clock,
        rows: [
          { feature: 'Quick Setup', adnexus: '2 minutes', competitor: 'Custom', note: 'Self-serve vs sales-led' },
          { feature: 'Self-Serve Signup', adnexus: true, competitor: false },
          { feature: 'Free Tier', adnexus: true, competitor: false },
          { feature: 'No Sales Call Required', adnexus: true, competitor: false },
          { feature: 'Demo-Only Access', adnexus: false, competitor: true, note: 'Smartly requires talking to sales' },
        ],
      },
      {
        name: 'Reporting',
        icon: BarChart3,
        rows: [
          { feature: 'Performance Dashboard', adnexus: true, competitor: true },
          { feature: 'White-Label Reports', adnexus: true, competitor: true },
          { feature: 'Scheduled Reports', adnexus: true, competitor: true },
          { feature: 'Cross-Platform Attribution', adnexus: true, competitor: true },
        ],
      },
      {
        name: 'Pricing',
        icon: DollarSign,
        rows: [
          { feature: 'Free Tier', adnexus: true, competitor: false },
          { feature: 'Starter Plan', adnexus: '$49/mo', competitor: 'Custom' },
          { feature: 'Pro Plan', adnexus: '$99/mo flat', competitor: 'Custom', note: 'Enterprise pricing only' },
          { feature: 'Transparent Pricing', adnexus: true, competitor: false, note: 'No pricing page on Smartly' },
          { feature: 'Self-Serve Checkout', adnexus: true, competitor: false },
        ],
      },
    ],
    score: { adnexus: 24, competitor: 14 },
    whyHeading: 'Why Teams Choose AdNexus AI',
    whySubtitle:
      'Smartly.io is great for enterprise creative. But if you want AI-native campaign management you can start using today, AdNexus is the move.',
    whyPills: [
      { icon: Clock, title: '2-Min Setup', desc: 'Sign up and start managing campaigns instantly.', color: '#34D399' },
      { icon: DollarSign, title: 'Self-Serve Pricing', desc: 'Transparent plans. No sales call needed.', color: '#60A5FA' },
      { icon: Cpu, title: 'AI Agent', desc: 'Proactive monitoring, anomaly detection, morning briefs.', color: '#FBBF24' },
      { icon: Users, title: 'Team Friendly', desc: 'Multi-account, scoped access, flat pricing.', color: '#A78BFA' },
    ],
    testimonial: {
      quote:
        'We spent 3 weeks in Smartly\u2019s sales process before even seeing the product. With AdNexus, I signed up during a coffee break and had my first AI optimization running 10 minutes later.',
      initials: 'JL',
      name: 'Jamie Liu',
      role: 'Growth Lead, Series A SaaS',
    },
    ctaHeading: 'Start Managing Smarter Today',
    ctaSubtitle:
      'No sales call. No contract. No waiting. Try AdNexus AI free and see why teams are switching from Smartly.io.',
  },
  adkit: {
    slug: 'adkit',
    competitor: 'AdKit',
    metaTitle: 'AdNexus AI vs AdKit \u2014 4 Platforms, Team Workspaces, White-Label Reports',
    metaDescription:
      'Compare AdNexus AI vs AdKit. Broader platform support, team workspaces, scheduled reports, and MCP-native AI agent integration.',
    badge: 'AdKit Alternative',
    headlineAccent: 'The AdKit Alternative',
    headlineRest: 'For Teams That Scale',
    subtitle:
      'Both platforms offer draft-first approval workflows and AI recommendations. AdNexus AI goes further with 4 platform support, team workspaces, white-label reports, and MCP-native AI agent integration.',
    ctaLabel: 'Start Free Audit',
    differentiators: [
      {
        icon: Globe,
        title: '4 Platforms, Not 3',
        description:
          'Meta, Google, TikTok, and Snapchat in one dashboard. AdKit covers three platforms; we add Snapchat for full coverage.',
        iconColor: '#60A5FA',
      },
      {
        icon: Users,
        title: 'Team Workspaces',
        description:
          'Up to 25 team workspaces with role-based access, comments, and approval workflows. AdKit has no team workspaces.',
        iconColor: '#34D399',
      },
      {
        icon: Code2,
        title: 'MCP-Native AI Agents',
        description:
          'Connect Claude, ChatGPT, and Cursor directly to your ad data plus creative fatigue detection. AdKit has neither.',
        iconColor: '#FBBF24',
      },
    ],
    categories: [
      {
        name: 'Platforms',
        icon: Layers,
        rows: [
          { feature: 'Meta Ads', adnexus: true, competitor: true },
          { feature: 'Google Ads', adnexus: true, competitor: true },
          { feature: 'TikTok Ads', adnexus: true, competitor: false },
          { feature: 'Snapchat Ads', adnexus: true, competitor: false },
          { feature: 'Platforms total', adnexus: '4 platforms', competitor: '3 platforms' },
        ],
      },
      {
        name: 'AI & Automation',
        icon: Cpu,
        rows: [
          { feature: 'Draft-first approval workflow', adnexus: true, competitor: true },
          { feature: 'AI-powered recommendations', adnexus: true, competitor: true },
          { feature: 'MCP/AI agent native integration', adnexus: true, competitor: false },
          { feature: 'Creative fatigue detection', adnexus: true, competitor: false },
          { feature: 'Anomaly detection', adnexus: true, competitor: true },
          { feature: 'Automated budget pacing', adnexus: true, competitor: true },
        ],
      },
      {
        name: 'Reporting & Insights',
        icon: BarChart3,
        rows: [
          { feature: 'Scheduled reports', adnexus: true, competitor: false },
          { feature: 'White-label reports', adnexus: true, competitor: false },
          { feature: 'Morning brief email', adnexus: true, competitor: false },
          { feature: 'Cross-account dashboards', adnexus: true, competitor: true },
          { feature: 'Custom report builder', adnexus: true, competitor: false },
          { feature: 'PDF export', adnexus: true, competitor: true },
        ],
      },
      {
        name: 'Collaboration',
        icon: Users,
        rows: [
          { feature: 'Team workspaces', adnexus: true, competitor: false },
          { feature: 'Role-based access (RBAC)', adnexus: true, competitor: false },
          { feature: 'Comment & annotation on drafts', adnexus: true, competitor: false },
          { feature: 'Slack notifications', adnexus: true, competitor: false },
          { feature: 'Approval workflows', adnexus: true, competitor: true },
        ],
      },
      {
        name: 'Competitor Intelligence',
        icon: Shield,
        rows: [
          { feature: 'Ad library / competitor tracking', adnexus: false, competitor: true, note: 'AdKit strength' },
          { feature: 'Competitor spend estimates', adnexus: false, competitor: true },
          { feature: 'Creative inspiration feed', adnexus: false, competitor: true },
        ],
      },
      {
        name: 'Pricing',
        icon: DollarSign,
        rows: [
          { feature: 'Free tier', adnexus: true, competitor: true },
          { feature: 'Starting price', adnexus: '$49/mo', competitor: '$49/mo' },
          { feature: 'Team plan', adnexus: '$149/mo', competitor: '$97/mo' },
          { feature: 'Agency plan', adnexus: '$399/mo', competitor: 'N/A' },
          { feature: 'Transparent self-serve pricing', adnexus: true, competitor: true },
        ],
      },
    ],
    whyHeading: 'Why Teams Choose AdNexus AI',
    whySubtitle:
      'AdKit is strong on competitor intelligence. But for broader platform coverage, team workspaces, and MCP-native AI, AdNexus pulls ahead.',
    whyPills: [
      { icon: Globe, title: '4 Platforms', desc: 'Meta, Google, TikTok, and Snapchat in one place.', color: '#60A5FA' },
      { icon: Users, title: 'Team Workspaces', desc: 'Up to 25 workspaces with role-based access.', color: '#34D399' },
      { icon: BarChart3, title: 'White-Label Reports', desc: 'Scheduled, branded reports AdKit lacks.', color: '#FBBF24' },
      { icon: Code2, title: 'MCP Native', desc: 'Connect any MCP-compatible AI agent to your data.', color: '#A78BFA' },
    ],
    competitorStrengths: [
      { icon: Shield, title: 'Ad Library', desc: 'Comprehensive competitor creative tracking and ad library for inspiration.' },
      { icon: BarChart3, title: 'Spend Intelligence', desc: 'Estimates competitor spend and provides market-level benchmarks.' },
      { icon: Sparkles, title: 'Draft-First Workflow', desc: 'Both platforms offer draft-first approval, showing market alignment.' },
    ],
    ctaHeading: 'See Your Ad Opportunities Today',
    ctaSubtitle: 'Get a free AI-powered audit of your ad accounts. No credit card required.',
  },
};

export const COMPARE_SLUGS = Object.keys(COMPARE_DATA);
