// @ts-nocheck
import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, X, Check, ChevronRight, ChevronLeft,
  Clock, Layers, Megaphone, ShoppingCart, Target,
  Smartphone, RefreshCcw, Gift, TrendingUp, Building2,
  Eye, BarChart3, CheckCircle2, Sparkles,
  Loader2, Trash2, ArrowRight, Palette, Globe,
  DollarSign, Users, Zap, Copy, Briefcase, Compass,
} from 'lucide-react'
import SEO from '../components/SEO';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Demo mode detection                                                */
/* ------------------------------------------------------------------ */
function useIsDemoMode(): boolean {
  const { isDemoMode } = useAuth()
  return isDemoMode
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Category = 'All' | 'E-commerce' | 'Lead Gen' | 'App Install' | 'Brand Awareness' | 'Retargeting' | 'Seasonal' | 'Custom'
type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snap'

interface AudienceConfig {
  ageRange: string
  gender: string
  locations: string[]
  interests: string[]
  placements: string[]
}

interface BudgetConfig {
  daily: number
  lifetime: number
  bidStrategy: string
  bidCap?: number
  targetCpa?: number
}

interface CampaignNode {
  name: string
  type: 'campaign' | 'adset' | 'ad'
  targeting?: string
  format?: string
  description?: string
}

interface Template {
  id: number
  name: string
  category: Category
  platforms: Platform[]
  description: string
  elements: string[]
  setupTime: string
  color: string
  usageCount: number
  icon: React.ElementType
  structure: CampaignNode[]
  suggestedBudget: number
  objective: string
  conversionRate?: number
  avgCTR?: number
  avgROAS?: number
  audience?: AudienceConfig
  budgetConfig?: BudgetConfig
  estimatedReach?: string
  estimatedClicks?: string
  estimatedConversions?: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const CATEGORIES: Category[] = [
  'All', 'E-commerce', 'Lead Gen', 'App Install', 'Brand Awareness', 'Retargeting', 'Seasonal', 'Custom',
]

const PLATFORM_COLORS: Record<string, string> = {
  Meta: '#1877F2',
  Google: '#DB4437',
  TikTok: '#00F2EA',
  Snap: '#FFFC00',
}

/**
 * Base templates used in both live and demo modes.
 * When demo mode is active, the `getDemoTemplates()` function enriches
 * each template with full audience, budget, and bidding mock data.
 */
const BASE_TEMPLATES: Omit<Template, 'audience' | 'budgetConfig' | 'estimatedReach' | 'estimatedClicks' | 'estimatedConversions'>[] = [
  {
    id: 1,
    name: 'Conversions Pro — Meta & Google',
    category: 'E-commerce',
    platforms: ['Meta', 'Google'],
    description: 'Maximize purchase conversions with dual-platform prospecting. Combines Meta interest targeting with Google Shopping for full-funnel coverage.',
    elements: ['3 ad sets', '9 ads', 'DPAs + Carousel', 'Lookalike + Shopping'],
    setupTime: '12 min',
    color: '#2563EB',
    usageCount: 1847,
    icon: ShoppingCart,
    suggestedBudget: 750,
    objective: 'Sales / Conversions',
    conversionRate: 3.8,
    avgCTR: 2.4,
    avgROAS: 4.2,
    structure: [
      { name: 'Conversions Pro', type: 'campaign' },
      { name: 'Broad Interest Prospecting', type: 'adset', targeting: '18-45, US/CA, Purchase intent', format: 'Ad Set' },
      { name: 'UGC Carousel Top', type: 'ad', format: 'Carousel', description: 'Top-performing UGC carousel with product highlights' },
      { name: 'DPA - Viewed Not Bought', type: 'ad', format: 'DPA', description: 'Dynamic product retargeting' },
      { name: 'LAL 1% Purchasers', type: 'adset', targeting: '1% Lookalike of 180d purchasers', format: 'Ad Set' },
      { name: 'Product Demo Video', type: 'ad', format: 'Reels', description: '15-sec product demo hook' },
      { name: 'Google Shopping - Top', type: 'adset', targeting: 'Product feed: best sellers', format: 'Ad Set' },
      { name: 'Shopping Ad - Hero SKU', type: 'ad', format: 'Shopping', description: 'Top 20 SKUs with promotions' },
      { name: 'PMax - New Customer', type: 'ad', format: 'Performance Max', description: 'AI-powered new customer acquisition' },
    ],
  },
  {
    id: 2,
    name: 'Brand Awareness Reach',
    category: 'Brand Awareness',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    description: 'Build brand recognition across all 4 platforms with reach-optimized video and display creatives. Ideal for launches and rebrands.',
    elements: ['4 ad sets', '8 ads', 'Video + Display', 'Frequency cap 3/7d'],
    setupTime: '10 min',
    color: '#F59E0B',
    usageCount: 1523,
    icon: Megaphone,
    suggestedBudget: 500,
    objective: 'Reach / Brand Awareness',
    conversionRate: 1.2,
    avgCTR: 1.4,
    avgROAS: 1.8,
    structure: [
      { name: 'Brand Awareness Reach', type: 'campaign' },
      { name: 'Meta - Broad Reach', type: 'adset', targeting: '18-65+, US, Broad', format: 'Ad Set' },
      { name: 'Brand Story 15s', type: 'ad', format: 'Reels', description: 'Hook + logo + tagline' },
      { name: 'Google Display - Placements', type: 'adset', targeting: 'Managed placements + affinity', format: 'Ad Set' },
      { name: 'Display Banner Set', type: 'ad', format: 'Display', description: '300x250 + 728x90 banner pack' },
      { name: 'TikTok - FYP Boost', type: 'adset', targeting: '18-34, US, Interest auto', format: 'Ad Set' },
      { name: 'Native TikTok Hook', type: 'ad', format: 'In-Feed', description: 'Trend-jacking creator-style video' },
      { name: 'Snap - Story Takeover', type: 'adset', targeting: '18-34, US/CA/UK', format: 'Ad Set' },
      { name: 'Snap Ad - AR Try-On', type: 'ad', format: 'Snap Ad', description: 'AR lens preview of product' },
    ],
  },
  {
    id: 3,
    name: 'App Install Accelerator',
    category: 'App Install',
    platforms: ['Meta', 'Snap', 'TikTok', 'Google'],
    description: 'Drive cost-efficient app installs with platform-optimized AEO/ACI targeting. Includes custom event optimization for post-install actions.',
    elements: ['4 ad sets', '6 ads', 'App Install obj.', 'AEO + SKAN + UAC'],
    setupTime: '15 min',
    color: '#8B5CF6',
    usageCount: 1234,
    icon: Smartphone,
    suggestedBudget: 600,
    objective: 'App Installs',
    conversionRate: 6.1,
    avgCTR: 1.8,
    avgROAS: 2.4,
    structure: [
      { name: 'App Install Accelerator', type: 'campaign' },
      { name: 'Meta - Broad + AEO', type: 'adset', targeting: 'Broad, iOS 15+, App Event Optimization', format: 'Ad Set' },
      { name: 'App Preview Video', type: 'ad', format: 'Reels', description: '15-sec gameplay/feature preview' },
      { name: 'Snap - Snap Kit Audiences', type: 'adset', targeting: 'Snap Kit lookalike, 18-34', format: 'Ad Set' },
      { name: 'Vertical Snap Ad', type: 'ad', format: 'Snap Ad', description: '9:16 vertical app install ad' },
      { name: 'TikTok - Spark Install', type: 'adset', targeting: 'App category interests, 18-30', format: 'Ad Set' },
      { name: 'UGC Demo Video', type: 'ad', format: 'In-Feed', description: 'Creator-style app walkthrough' },
      { name: 'Google UAC - Tier 1', type: 'adset', targeting: 'Universal App Campaign, tCPA $3', format: 'Ad Set' },
    ],
  },
  {
    id: 4,
    name: 'Lead Generation Master',
    category: 'Lead Gen',
    platforms: ['Meta', 'Google'],
    description: 'Generate qualified B2B and B2C leads using lead forms and landing page traffic. Includes instant form + conversion-optimized landing variants.',
    elements: ['3 ad sets', '6 ads', 'Lead forms + LP', 'CAPI + GTM tracking'],
    setupTime: '10 min',
    color: '#06B6D4',
    usageCount: 1456,
    icon: Target,
    suggestedBudget: 450,
    objective: 'Lead Generation',
    conversionRate: 8.4,
    avgCTR: 2.9,
    avgROAS: 3.2,
    structure: [
      { name: 'Lead Generation Master', type: 'campaign' },
      { name: 'Meta - Interest Based', type: 'adset', targeting: 'Business owners, 25-55, US', format: 'Ad Set' },
      { name: 'Instant Form - eBook', type: 'ad', format: 'Lead Form', description: 'Gated eBook download form' },
      { name: 'Landing Page Carousel', type: 'ad', format: 'Carousel', description: '3-card carousel to LP' },
      { name: 'Meta - LAL Leads', type: 'adset', targeting: '1% lookalike of past leads', format: 'Ad Set' },
      { name: 'Testimonial Video LP', type: 'ad', format: 'Video', description: 'Customer testimonial to landing page' },
      { name: 'Google - Search Leads', type: 'adset', targeting: '[lead gen software], [free trial tools]', format: 'Ad Set' },
      { name: 'RSA - Free Trial Offer', type: 'ad', format: 'Responsive Search', description: '15 headlines, 4 descriptions' },
    ],
  },
  {
    id: 5,
    name: 'Always-On Retargeting',
    category: 'Retargeting',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    description: 'Capture cart abandoners and site visitors across all 4 platforms with dynamic product ads and sequential messaging. Set-and-forget structure.',
    elements: ['4 ad sets', '8 ads', 'DPA + Collection', '7/30/90/180d segments'],
    setupTime: '8 min',
    color: '#10B981',
    usageCount: 2103,
    icon: RefreshCcw,
    suggestedBudget: 300,
    objective: 'Retargeting / Conversions',
    conversionRate: 5.2,
    avgCTR: 3.1,
    avgROAS: 5.8,
    structure: [
      { name: 'Always-On Retargeting', type: 'campaign' },
      { name: '7d Cart Abandoners', type: 'adset', targeting: 'Added cart, no purchase (7d)', format: 'Ad Set' },
      { name: 'DPA Carousel - Urgency', type: 'ad', format: 'DPA', description: 'Dynamic carousel with scarcity messaging' },
      { name: '30d Site Visitors', type: 'adset', targeting: 'All site visitors (30d)', format: 'Ad Set' },
      { name: 'Collection Ad - Best Sellers', type: 'ad', format: 'Collection', description: 'Immersive catalog experience' },
      { name: '90d Engagers', type: 'adset', targeting: 'Post engagers + video viewers (90d)', format: 'Ad Set' },
      { name: 'UGC Retargeting Video', type: 'ad', format: 'Video', description: 'Social proof retargeting creative' },
      { name: '180d Dormant', type: 'adset', targeting: 'Past purchasers 180d+ inactive', format: 'Ad Set' },
      { name: 'Win-Back Offer Static', type: 'ad', format: 'Single Image', description: 'We miss you + 20% off' },
    ],
  },
  {
    id: 6,
    name: 'Seasonal Sale Blitz',
    category: 'Seasonal',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    description: 'Maximize revenue during seasonal sale events with urgency-focused creative rotation, countdown CTAs, and flash-sale bidding.',
    elements: ['4 ad sets', '10 ads', 'UGC + Carousel + Countdown', 'Flash sale bidding'],
    setupTime: '12 min',
    color: '#EF4444',
    usageCount: 987,
    icon: Gift,
    suggestedBudget: 900,
    objective: 'Sales / Conversions',
    conversionRate: 4.5,
    avgCTR: 2.6,
    avgROAS: 3.9,
    structure: [
      { name: 'Seasonal Sale Blitz', type: 'campaign' },
      { name: 'Early Access VIP', type: 'adset', targeting: 'Engaged followers + purchasers (30d)', format: 'Ad Set' },
      { name: 'VIP Early Access Video', type: 'ad', format: 'Reels', description: 'Exclusive early access announcement' },
      { name: 'Broad Prospecting', type: 'adset', targeting: '18-45, US, Shopping interests', format: 'Ad Set' },
      { name: 'Countdown Carousel', type: 'ad', format: 'Carousel', description: 'Dynamic countdown overlay carousel' },
      { name: 'UGC Unboxing', type: 'ad', format: 'Video', description: 'Holiday unboxing + discount code' },
      { name: 'Google - Search Deals', type: 'adset', targeting: 'Black Friday / Cyber Monday terms', format: 'Ad Set' },
      { name: 'RSA - Sale Headlines', type: 'ad', format: 'Responsive Search', description: 'Dynamic sale headlines with price points' },
      { name: 'TikTok + Snap - Flash', type: 'adset', targeting: '18-34, deal-seekers, 18h window', format: 'Ad Set' },
      { name: 'Flash Sale Snap', type: 'ad', format: 'Snap Ad', description: '24hr flash sale with timer' },
    ],
  },
  {
    id: 7,
    name: 'B2B ABM Pipeline',
    category: 'Lead Gen',
    platforms: ['Meta', 'Google'],
    description: 'Account-based marketing pipeline for B2B SaaS. Targets decision-makers by job title, company size, and intent signals with gated content.',
    elements: ['3 ad sets', '6 ads', 'Whitepaper + Case Study', 'Job title + firmographic targeting'],
    setupTime: '15 min',
    color: '#6366F1',
    usageCount: 756,
    icon: Briefcase,
    suggestedBudget: 550,
    objective: 'Lead Generation / MQLs',
    conversionRate: 5.8,
    avgCTR: 2.5,
    avgROAS: 2.8,
    structure: [
      { name: 'B2B ABM Pipeline', type: 'campaign' },
      { name: 'Decision Makers - Awareness', type: 'adset', targeting: 'VP/Director+ at 200+ employee cos, US/CA/UK', format: 'Ad Set' },
      { name: 'Whitepaper Download Form', type: 'ad', format: 'Lead Form', description: 'Industry report gated download' },
      { name: 'Case Study Carousel', type: 'ad', format: 'Carousel', description: '3 client success stories' },
      { name: 'Intent Signal - Consideration', type: 'adset', targeting: 'G2/Capterra engagers, 30d website visitors', format: 'Ad Set' },
      { name: 'Demo Request Video', type: 'ad', format: 'Video', description: '2-min product demo with CTA' },
      { name: 'Google Search - Intent', type: 'adset', targeting: '[best CRM software], [SaaS pricing], [free demo]', format: 'Ad Set' },
      { name: 'RSA - Demo + Pricing', type: 'ad', format: 'Responsive Search', description: 'Demo request + transparent pricing messaging' },
    ],
  },
  {
    id: 8,
    name: 'Lookalike Scaling Ladder',
    category: 'E-commerce',
    platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    description: 'Scale winning campaigns through a lookalike expansion ladder from 1% to 10%. Each tier is budget-capped for controlled scaling.',
    elements: ['5 ad sets', '5 ads', 'LAL 1%/3%/5%/10%', 'Budget tier caps'],
    setupTime: '10 min',
    color: '#EAB308',
    usageCount: 1345,
    icon: TrendingUp,
    suggestedBudget: 1200,
    objective: 'Conversions / Scale',
    conversionRate: 3.2,
    avgCTR: 2.0,
    avgROAS: 4.1,
    structure: [
      { name: 'Lookalike Scaling Ladder', type: 'campaign' },
      { name: 'LAL 1% - Core', type: 'adset', targeting: '1% LAL of 180d purchasers, highest intent', format: 'Ad Set' },
      { name: 'Hero Creative - Video', type: 'ad', format: 'Reels', description: 'Top performing hero creative' },
      { name: 'LAL 3% - Warm', type: 'adset', targeting: '3% LAL of purchasers + add-to-cart', format: 'Ad Set' },
      { name: 'LAL 5% - Broad Warm', type: 'adset', targeting: '5% LAL of site visitors + engagers', format: 'Ad Set' },
      { name: 'LAL 10% - Cold', type: 'adset', targeting: '10% LAL of pixel fires, broadest reach', format: 'Ad Set' },
      { name: 'Google Similar Audiences', type: 'adset', targeting: 'Similar audiences from converters', format: 'Ad Set' },
      { name: 'Discovery Ad - Scale', type: 'ad', format: 'Discovery', description: 'Gmail/Discover/Youtube discovery placement' },
    ],
  },
]

/**
 * Generate fully-enriched demo templates with pre-filled audiences,
 * budgets, bidding strategies, and performance estimates.
 */
function getDemoTemplates(): Template[] {
  const audienceMap: Record<number, AudienceConfig> = {
    1: {
      ageRange: '18-45',
      gender: 'All',
      locations: ['United States', 'Canada'],
      interests: ['Online Shopping', 'Fashion', 'Beauty', 'Home & Garden', 'Electronics'],
      placements: ['Feed', 'Stories', 'Reels', 'Search', 'Shopping'],
    },
    2: {
      ageRange: '18-65+',
      gender: 'All',
      locations: ['United States', 'Canada', 'United Kingdom'],
      interests: ['Broad / No targeting', 'Affinity: Tech Savvy', 'Affinity: Lifestyle'],
      placements: ['Feed', 'Stories', 'Reels', 'Display', 'TikTok FYP', 'Snap Stories', 'YouTube'],
    },
    3: {
      ageRange: '18-34',
      gender: 'All',
      locations: ['United States', 'Canada', 'Australia'],
      interests: ['Mobile Games', 'Social Networking', 'Entertainment', 'Tech Early Adopters'],
      placements: ['App Store', 'Feed', 'Stories', 'Snap', 'TikTok FYP', 'Google Play'],
    },
    4: {
      ageRange: '25-55',
      gender: 'All',
      locations: ['United States', 'Canada'],
      interests: ['Business Owners', 'Entrepreneurship', 'SaaS', 'Marketing', 'Real Estate'],
      placements: ['Feed', 'Stories', 'Reels', 'Search', 'Display Network'],
    },
    5: {
      ageRange: '18-65+',
      gender: 'All',
      locations: ['United States', 'Canada', 'United Kingdom', 'Australia'],
      interests: ['Website Custom Audiences', 'Cart Abandoners', 'Post Engagers', 'Video Viewers'],
      placements: ['Feed', 'Stories', 'Reels', 'Audience Network', 'Snap', 'TikTok'],
    },
    6: {
      ageRange: '18-45',
      gender: 'All',
      locations: ['United States', 'Canada'],
      interests: ['Holiday Shopping', 'Gift Shoppers', 'Deal Seekers', 'Black Friday', 'Luxury'],
      placements: ['Feed', 'Stories', 'Reels', 'Shopping', 'Search', 'Snap', 'TikTok'],
    },
    7: {
      ageRange: '28-55',
      gender: 'All',
      locations: ['United States', 'Canada', 'United Kingdom'],
      interests: ['VP/Director+ job titles', 'Companies 200+ employees', 'G2/Capterra visitors', 'SaaS intent'],
      placements: ['Feed', 'LinkedIn-style', 'Search', 'Display Network', 'Gmail'],
    },
    8: {
      ageRange: '18-54',
      gender: 'All',
      locations: ['United States', 'Canada', 'United Kingdom'],
      interests: ['Lookalike Audiences', 'Similar Segments', 'Purchase Intent', 'Broad Auto-targeting'],
      placements: ['Feed', 'Stories', 'Reels', 'Audience Network', 'Discovery', 'TikTok FYP', 'Snap'],
    },
  }

  const budgetMap: Record<number, BudgetConfig> = {
    1: { daily: 750, lifetime: 22500, bidStrategy: 'Lowest Cost with Bid Cap', bidCap: 45, targetCpa: 35 },
    2: { daily: 500, lifetime: 15000, bidStrategy: 'Reach & Frequency', bidCap: 8, targetCpa: undefined },
    3: { daily: 600, lifetime: 18000, bidStrategy: 'App Event Optimization (AEO)', bidCap: 5, targetCpa: 3 },
    4: { daily: 450, lifetime: 13500, bidStrategy: 'Cost Cap', bidCap: 25, targetCpa: 20 },
    5: { daily: 300, lifetime: 9000, bidStrategy: 'Lowest Cost', bidCap: 30, targetCpa: 22 },
    6: { daily: 900, lifetime: 27000, bidStrategy: 'Highest Value / Maximize', bidCap: 55, targetCpa: 40 },
    7: { daily: 550, lifetime: 16500, bidStrategy: 'Cost Cap', bidCap: 85, targetCpa: 75 },
    8: { daily: 1200, lifetime: 36000, bidStrategy: 'Lowest Cost with Ad Set Spend Limits', bidCap: 50, targetCpa: 38 },
  }

  const estimatesMap: Record<number, { reach: string; clicks: string; conversions: string }> = {
    1: { reach: '1.2M / month', clicks: '28,800', conversions: '1,094' },
    2: { reach: '4.5M / month', clicks: '63,000', conversions: '756' },
    3: { reach: '890K / month', clicks: '16,020', conversions: '978' },
    4: { reach: '420K / month', clicks: '12,180', conversions: '1,023' },
    5: { reach: '680K / month', clicks: '21,080', conversions: '1,096' },
    6: { reach: '2.1M / month', clicks: '54,600', conversions: '2,457' },
    7: { reach: '180K / month', clicks: '4,500', conversions: '261' },
    8: { reach: '3.8M / month', clicks: '76,000', conversions: '2,432' },
  }

  return BASE_TEMPLATES.map((base) => {
    const estimates = estimatesMap[base.id]
    return {
      ...base,
      audience: audienceMap[base.id],
      budgetConfig: budgetMap[base.id],
      estimatedReach: estimates?.reach,
      estimatedClicks: estimates?.clicks,
      estimatedConversions: estimates?.conversions,
    }
  })
}

/**
 * In live mode, templates come from an API or static base set without
 * the demo enrichment (audiences, budgets, estimates).
 */
function getLiveTemplates(): Template[] {
  return BASE_TEMPLATES.map((base) => ({ ...base }))
}

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number]

/* ------------------------------------------------------------------ */
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
  return (
    <div className="card-surface p-5 flex flex-col animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-3 rounded w-16" style={{ background: 'var(--bg-hover)' }} />
      </div>
      <div className="h-5 rounded w-36 mb-2" style={{ background: 'var(--bg-hover)' }} />
      <div className="h-3 rounded w-16 mb-2" style={{ background: 'var(--bg-hover)' }} />
      <div className="h-3 rounded w-full mb-1" style={{ background: 'var(--bg-hover)' }} />
      <div className="h-3 rounded w-2/3 mb-3" style={{ background: 'var(--bg-hover)' }} />
      <div className="flex flex-wrap gap-1.5 mb-3">
        <div className="h-4 rounded-full w-14" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-4 rounded-full w-10" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-4 rounded-full w-20" style={{ background: 'var(--bg-hover)' }} />
      </div>
      <div className="mt-auto flex gap-2">
        <div className="flex-1 h-8 rounded-lg" style={{ background: 'var(--bg-hover)' }} />
        <div className="w-12 h-8 rounded-lg" style={{ background: 'var(--bg-hover)' }} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function CampaignTemplates() {
  const isDemoMode = useIsDemoMode()
  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [useWizard, setUseWizard] = useState<Template | null>(null)
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardData, setWizardData] = useState({
    name: '', platforms: [] as Platform[], budget: 0, startDate: '', endDate: '',
  })
  const [wizardComplete, setWizardComplete] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customForm, setCustomForm] = useState({
    name: '', category: 'E-commerce' as Category, description: '', objective: '', platforms: [] as Platform[], budget: 500,
  })
  const [customSteps, setCustomSteps] = useState<Array<{ name: string; type: 'campaign' | 'adset' | 'ad'; targeting?: string; format?: string }>>([
    { name: '', type: 'campaign' },
    { name: '', type: 'adset', targeting: '', format: 'Ad Set' },
  ])
  const [sortBy, setSortBy] = useState<'Popular' | 'Newest' | 'Budget'>('Popular')

  /* ---- Load templates: demo gets enriched data, live gets base data ---- */
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      if (isDemoMode) {
        setAllTemplates(getDemoTemplates())
      } else {
        setAllTemplates(getLiveTemplates())
      }
      setIsLoading(false)
    }, 700)
    return () => clearTimeout(timer)
  }, [isDemoMode])

  const filteredTemplates = allTemplates.filter((t) => {
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  }).sort((a, b) => {
    if (sortBy === 'Popular') return b.usageCount - a.usageCount
    if (sortBy === 'Budget') return b.suggestedBudget - a.suggestedBudget
    return 0
  })

  const openWizard = useCallback((template: Template) => {
    setUseWizard(template)
    setWizardStep(0)
    setWizardData({
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      platforms: template.platforms.filter((_p): _p is Platform => true),
      budget: template.suggestedBudget,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    })
    setWizardComplete(false)
  }, [])

  const closeWizard = useCallback(() => {
    setUseWizard(null)
    setWizardStep(0)
    setWizardComplete(false)
  }, [])

  const handleCreateDraft = useCallback(() => {
    setWizardComplete(true)
  }, [])

  const togglePlatform = useCallback((p: Platform) => {
    setWizardData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }))
  }, [])

  const toggleCustomPlatform = useCallback((p: Platform) => {
    setCustomForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }))
  }, [])

  const addCustomStep = () => {
    setCustomSteps(prev => [...prev, { name: '', type: 'ad', format: 'Video', targeting: '' }])
  }

  const removeCustomStep = (index: number) => {
    setCustomSteps(prev => prev.filter((_, i) => i !== index))
  }

  const updateCustomStep = (index: number, field: string, value: string) => {
    setCustomSteps(prev => prev.map((step, i) => i === index ? { ...step, [field]: value } : step))
  }

  return (
    <>
    <SEO
      title="Campaign Templates"
      description="Browse and use pre-built campaign templates for different industries, objectives, and platforms. Launch campaigns faster with proven frameworks."
      keywords="campaign templates, template library, quick launch, proven frameworks"
    />
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      {/* ==================== DEMO MODE BANNER ==================== */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-2.5 border-b"
          style={{ background: 'rgba(37,99,235,0.08)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="max-w-[1400px] mx-auto flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Demo Mode — All {allTemplates.length} templates are loaded with pre-filled audiences, budgets, bidding strategies, and performance estimates.
            </span>
          </div>
        </motion.div>
      )}

      {/* ==================== HEADER ==================== */}
      <div className="px-6 py-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-space text-[36px] font-semibold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Campaign Templates
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Pre-built campaign structures for common objectives
              {isDemoMode && ' (Demo data active)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-9 pr-4 py-2.5 rounded-lg text-sm border outline-none w-56"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', background: 'transparent' }}
            >
              <Plus className="w-4 h-4" />
              Create Custom
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Category Pills + Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border cursor-pointer"
                style={{
                  background: activeCategory === cat ? 'var(--accent)' : 'transparent',
                  borderColor: activeCategory === cat ? 'var(--accent)' : 'var(--border-subtle)',
                  color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sort by:</span>
            {(['Popular', 'Newest', 'Budget'] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)} className="px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer"
                style={{ background: sortBy === s ? 'var(--bg-hover)' : 'transparent', color: sortBy === s ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: easeSmooth }}
                  whileHover={{ y: -4, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  className="card-surface p-5 flex flex-col transition-shadow"
                  style={{ borderTop: `3px solid ${template.color}` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${template.color}15` }}>
                      <template.icon className="w-6 h-6" style={{ color: template.color }} />
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Used {template.usageCount.toLocaleString()} times</span>
                  </div>

                  <h4 className="font-space text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{template.name}</h4>

                  <span className="inline-block self-start px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2" style={{ background: `${template.color}15`, color: template.color }}>
                    {template.category}
                  </span>

                  <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {template.description}
                  </p>

                  {/* Mini performance metrics */}
                  {(template.conversionRate !== undefined) && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-center">
                        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>CVR</div>
                        <div className="text-xs font-mono-data font-semibold" style={{ color: '#10B981' }}>{template.conversionRate}%</div>
                      </div>
                      <div className="w-px h-6" style={{ background: 'var(--border-subtle)' }} />
                      <div className="text-center">
                        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>CTR</div>
                        <div className="text-xs font-mono-data font-semibold" style={{ color: '#3B82F6' }}>{template.avgCTR}%</div>
                      </div>
                      <div className="w-px h-6" style={{ background: 'var(--border-subtle)' }} />
                      <div className="text-center">
                        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>ROAS</div>
                        <div className="text-xs font-mono-data font-semibold" style={{ color: '#F59E0B' }}>{template.avgROAS}x</div>
                      </div>
                    </div>
                  )}

                  {/* Platform dots */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {template.platforms.map((p) => (
                      <span key={p} className="group relative">
                        <span className="block w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[p] || '#888' }} />
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{p}</span>
                      </span>
                    ))}
                  </div>

                  {/* Demo mode: audience + budget preview badges */}
                  {isDemoMode && template.audience && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        <Users className="w-2.5 h-2.5" />{template.audience.ageRange}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        <Globe className="w-2.5 h-2.5" />{template.audience.locations.length} countries
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        <DollarSign className="w-2.5 h-2.5" />{template.budgetConfig?.bidStrategy?.split(' ')[0]}
                      </span>
                    </div>
                  )}

                  {/* Elements */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {template.elements.map((el, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{el}</span>
                    ))}
                  </div>

                  {/* Budget + Time */}
                  <div className="flex items-center gap-3 mb-4 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />${template.suggestedBudget}/day</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{template.setupTime} setup</span>
                  </div>

                  <div className="mt-auto flex gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => openWizard(template)} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer" style={{ background: 'var(--accent)', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}>
                      Use Template
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setPreviewTemplate(template)} className="px-4 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <Eye className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredTemplates.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <Search className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No templates match your criteria</p>
          </div>
        )}
      </div>

      {/* ==================== PREVIEW MODAL ==================== */}
      <AnimatePresence>
        {previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setPreviewTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()}
              className="card-surface w-full max-w-2xl max-h-[85vh] overflow-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${previewTemplate.color}15` }}>
                      <previewTemplate.icon className="w-5 h-5" style={{ color: previewTemplate.color }} />
                    </div>
                    <div>
                      <h3 className="font-space text-xl font-medium" style={{ color: 'var(--text-primary)' }}>{previewTemplate.name}</h3>
                      <span className="text-[11px] font-semibold" style={{ color: previewTemplate.color }}>{previewTemplate.category}</span>
                    </div>
                  </div>
                  <button onClick={() => setPreviewTemplate(null)} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: 'var(--text-tertiary)' }}><X className="w-5 h-5" /></button>
                </div>

                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{previewTemplate.description}</p>

                {/* Performance stats */}
                {previewTemplate.conversionRate !== undefined && (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Avg CVR', value: `${previewTemplate.conversionRate}%`, icon: Target, color: '#10B981' },
                      { label: 'Avg CTR', value: `${previewTemplate.avgCTR}%`, icon: BarChart3, color: '#3B82F6' },
                      { label: 'Avg ROAS', value: `${previewTemplate.avgROAS}x`, icon: TrendingUp, color: '#F59E0B' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                        <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{s.label}</div>
                        <div className="text-sm font-mono-data font-bold" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Demo mode: detailed audience + budget + estimates */}
                {isDemoMode && previewTemplate.audience && previewTemplate.budgetConfig && (
                  <>
                    {/* Audience Card */}
                    <div className="mb-6 rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <Users className="w-3.5 h-3.5" /> Pre-filled Audience
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Age Range</span>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{previewTemplate.audience.ageRange}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Gender</span>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{previewTemplate.audience.gender}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Locations</span>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{previewTemplate.audience.locations.join(', ')}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Placements</span>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{previewTemplate.audience.placements.slice(0, 4).join(', ')}{previewTemplate.audience.placements.length > 4 ? ' +' + (previewTemplate.audience.placements.length - 4) : ''}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Interests</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {previewTemplate.audience.interests.map((interest, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: `${previewTemplate.color}15`, color: previewTemplate.color }}>{interest}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Budget + Bidding Card */}
                    <div className="mb-6 rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <DollarSign className="w-3.5 h-3.5" /> Budget & Bidding Strategy
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Daily Budget</span>
                          <div className="font-medium font-mono-data" style={{ color: 'var(--text-primary)' }}>${previewTemplate.budgetConfig.daily.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Lifetime Budget (30d)</span>
                          <div className="font-medium font-mono-data" style={{ color: 'var(--text-primary)' }}>${previewTemplate.budgetConfig.lifetime.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Bid Strategy</span>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{previewTemplate.budgetConfig.bidStrategy}</div>
                        </div>
                        {previewTemplate.budgetConfig.bidCap && (
                          <div>
                            <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Bid Cap</span>
                            <div className="font-medium font-mono-data" style={{ color: 'var(--text-primary)' }}>${previewTemplate.budgetConfig.bidCap}</div>
                          </div>
                        )}
                        {previewTemplate.budgetConfig.targetCpa && (
                          <div>
                            <span className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>Target CPA</span>
                            <div className="font-medium font-mono-data" style={{ color: 'var(--text-primary)' }}>${previewTemplate.budgetConfig.targetCpa}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Estimates Card */}
                    {(previewTemplate.estimatedReach || previewTemplate.estimatedClicks) && (
                      <div className="mb-6 rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <Compass className="w-3.5 h-3.5" /> Performance Estimates (30 days)
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {previewTemplate.estimatedReach && (
                            <div className="text-center">
                              <div className="text-lg font-mono-data font-bold" style={{ color: '#8B5CF6' }}>{previewTemplate.estimatedReach}</div>
                              <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Est. Reach</div>
                            </div>
                          )}
                          {previewTemplate.estimatedClicks && (
                            <div className="text-center">
                              <div className="text-lg font-mono-data font-bold" style={{ color: '#3B82F6' }}>{previewTemplate.estimatedClicks}</div>
                              <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Est. Clicks</div>
                            </div>
                          )}
                          {previewTemplate.estimatedConversions && (
                            <div className="text-center">
                              <div className="text-lg font-mono-data font-bold" style={{ color: '#10B981' }}>{previewTemplate.estimatedConversions}</div>
                              <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Est. Conversions</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Campaign Structure Tree */}
                <div className="mb-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Campaign Structure</h4>
                  <div className="p-4 rounded-lg space-y-2" style={{ background: 'var(--bg-secondary)' }}>
                    {previewTemplate.structure.map((node, i) => {
                      const indent = node.type === 'campaign' ? 0 : node.type === 'adset' ? 1 : 2
                      return (
                        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${indent * 24}px` }}>
                          {node.type === 'campaign' && <Layers className="w-4 h-4 flex-shrink-0" style={{ color: previewTemplate.color }} />}
                          {node.type === 'adset' && <Target className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />}
                          {node.type === 'ad' && <Megaphone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />}
                          <div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{node.name}</span>
                            {node.targeting && <span className="text-[10px] ml-2" style={{ color: 'var(--text-tertiary)' }}>{node.targeting}</span>}
                            {node.format && node.type === 'ad' && <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{node.format}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Objective</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{previewTemplate.objective}</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Suggested Budget</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>${previewTemplate.suggestedBudget}/day</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Platforms</div>
                    <div className="flex gap-1 mt-1">
                      {previewTemplate.platforms.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${PLATFORM_COLORS[p]}20`, color: PLATFORM_COLORS[p] }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Setup Time</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{previewTemplate.setupTime}</div>
                  </div>
                </div>

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => { setPreviewTemplate(null); openWizard(previewTemplate) }} className="w-full py-3 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: 'var(--accent)', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}>
                  Use This Template
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== USE TEMPLATE WIZARD ==================== */}
      <AnimatePresence>
        {useWizard && !wizardComplete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={closeWizard}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3 }} onClick={(e) => e.stopPropagation()}
              className="card-surface w-full max-w-lg"
            >
              <div className="p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-space text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{useWizard.name}</h3>
                  <button onClick={closeWizard} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-tertiary)' }}><X className="w-5 h-5" /></button>
                </div>
                <div className="flex items-center gap-2">
                  {['Name', 'Platform', 'Budget', 'Schedule', 'Review'].map((_label, i) => (
                    <div key={i} className="flex items-center gap-1 flex-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: i <= wizardStep ? 'var(--accent)' : 'var(--bg-hover)', color: i <= wizardStep ? '#fff' : 'var(--text-tertiary)' }}>
                        {i < wizardStep ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      {i < 4 && <div className="h-px flex-1" style={{ background: i < wizardStep ? 'var(--accent)' : 'var(--border-subtle)' }} />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {wizardStep === 0 && (
                    <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Campaign Name</label>
                      <input type="text" value={wizardData.name} onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm border outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                    </motion.div>
                  )}
                  {wizardStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Select Platforms</label>
                      {useWizard.platforms.map((p) => (
                        <button key={p} onClick={() => togglePlatform(p)} className="w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer" style={{ borderColor: wizardData.platforms.includes(p) ? 'var(--accent)' : 'var(--border-subtle)', background: wizardData.platforms.includes(p) ? 'rgba(37,99,235,0.08)' : 'var(--bg-secondary)' }}>
                          <div className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0" style={{ borderColor: wizardData.platforms.includes(p) ? 'var(--accent)' : 'var(--border-subtle)', background: wizardData.platforms.includes(p) ? 'var(--accent)' : 'transparent' }}>
                            {wizardData.platforms.includes(p) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="w-3 h-3 rounded-full" style={{ background: PLATFORM_COLORS[p] || '#888' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                  {wizardStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Daily Budget (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }}>$</span>
                        <input type="number" value={wizardData.budget} onChange={(e) => setWizardData({ ...wizardData, budget: Number(e.target.value) })} className="w-full pl-8 pr-4 py-3 rounded-lg text-sm border outline-none font-mono-data" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                      </div>
                      <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>Suggested: ${useWizard.suggestedBudget}/day for optimal performance</p>
                      {/* Demo mode: pre-filled bid strategy hint */}
                      {isDemoMode && useWizard.budgetConfig && (
                        <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                          <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-tertiary)' }}>Recommended Bidding</div>
                          <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{useWizard.budgetConfig.bidStrategy}</div>
                          {useWizard.budgetConfig.targetCpa && (
                            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Target CPA: ${useWizard.budgetConfig.targetCpa}</div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                  {wizardStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
                        <input type="date" value={wizardData.startDate} onChange={(e) => setWizardData({ ...wizardData, startDate: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm border outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>End Date</label>
                        <input type="date" value={wizardData.endDate} onChange={(e) => setWizardData({ ...wizardData, endDate: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm border outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                      </div>
                    </motion.div>
                  )}
                  {wizardStep === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Review Your Campaign</h4>
                      <div className="p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-secondary)' }}>
                        {[
                          ['Name', wizardData.name],
                          ['Template', useWizard.name],
                          ['Platforms', wizardData.platforms.join(', ')],
                          ['Budget', `$${wizardData.budget}/day`],
                          ['Schedule', `${wizardData.startDate} to ${wizardData.endDate}`],
                          ['Status', 'DRAFT'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <span className="text-xs font-medium" style={{ color: label === 'Status' ? '#3B82F6' : 'var(--text-primary)' }}>
                              {label === 'Status' ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>DRAFT</span> : value}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Demo mode: show pre-filled audience summary */}
                      {isDemoMode && useWizard.audience && (
                        <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                          <div className="text-[10px] uppercase mb-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Pre-filled Audience (Demo)</div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Age</span><span style={{ color: 'var(--text-primary)' }}>{useWizard.audience.ageRange}</span></div>
                            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Locations</span><span style={{ color: 'var(--text-primary)' }}>{useWizard.audience.locations.join(', ')}</span></div>
                            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Bid Strategy</span><span style={{ color: 'var(--text-primary)' }}>{useWizard.budgetConfig?.bidStrategy}</span></div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 border-t flex justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={() => setWizardStep(Math.max(0, wizardStep - 1))} disabled={wizardStep === 0} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm border transition-all disabled:opacity-30 cursor-pointer" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                {wizardStep < 4 ? (
                  <button onClick={() => setWizardStep(wizardStep + 1)} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: 'var(--accent)' }}>Next <ChevronRight className="w-4 h-4" /></button>
                ) : (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreateDraft} className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: 'var(--accent)', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}>
                    <Check className="w-4 h-4" /> Create as Draft
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== SUCCESS STATE ==================== */}
      <AnimatePresence>
        {wizardComplete && useWizard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-surface w-full max-w-md p-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }} className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--status-active)' }} />
              </motion.div>
              <h3 className="font-space text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Campaign Created!</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                &ldquo;{wizardData.name}&rdquo; has been saved as a draft. Review it in the Drafts page before publishing.
              </p>
              <div className="flex gap-3 justify-center">
                <a href="#/drafts" className="px-6 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--accent)', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}>Go to Drafts</a>
                <button onClick={() => { closeWizard(); setUseWizard(null) }} className="px-6 py-2.5 rounded-lg text-sm font-medium border cursor-pointer" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== CUSTOM TEMPLATE MODAL ==================== */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCustomModal(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              onClick={(e) => e.stopPropagation()}
              className="card-surface w-full max-w-2xl max-h-[85vh] overflow-auto"
            >
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}><Plus className="w-4 h-4 text-white" /></div>
                  <h3 className="font-space text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Create Custom Template</h3>
                </div>
                <button onClick={() => setShowCustomModal(false)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-tertiary)' }}><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-5">
                {/* Template Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Template Name *</label>
                  <input value={customForm.name} onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })} placeholder="e.g. Back to School Blitz" className="w-full px-4 py-2.5 rounded-lg text-sm border outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
                  <div className="flex flex-wrap gap-2">
                    {(['E-commerce', 'Lead Gen', 'App Install', 'Brand Awareness', 'Retargeting', 'Seasonal'] as Category[]).map((c) => (
                      <button key={c} onClick={() => setCustomForm({ ...customForm, category: c })} className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer" style={{ background: customForm.category === c ? 'var(--accent)' : 'var(--bg-secondary)', borderColor: customForm.category === c ? 'var(--accent)' : 'var(--border-subtle)', color: customForm.category === c ? '#fff' : 'var(--text-secondary)' }}>{c}</button>
                    ))}
                  </div>
                </div>

                {/* Objective */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Campaign Objective</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Sales', 'Conversions', 'Reach', 'App Installs', 'Lead Generation', 'Engagement'] as const).map((obj) => (
                      <button key={obj} onClick={() => setCustomForm({ ...customForm, objective: obj })} className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer" style={{ background: customForm.objective === obj ? 'var(--accent)' : 'var(--bg-secondary)', borderColor: customForm.objective === obj ? 'var(--accent)' : 'var(--border-subtle)', color: customForm.objective === obj ? '#fff' : 'var(--text-secondary)' }}>{obj}</button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <textarea value={customForm.description} onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })} placeholder="Describe what this template is for and when to use it..." rows={3} className="w-full px-4 py-2.5 rounded-lg text-sm border outline-none resize-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                </div>

                {/* Platforms */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Platforms</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => (
                      <button key={p} onClick={() => toggleCustomPlatform(p)} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium border transition-all cursor-pointer" style={{ borderColor: customForm.platforms.includes(p) ? 'var(--accent)' : 'var(--border-subtle)', background: customForm.platforms.includes(p) ? 'rgba(37,99,235,0.08)' : 'var(--bg-secondary)', color: customForm.platforms.includes(p) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />{p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Suggested Daily Budget: ${customForm.budget}</label>
                  <input type="range" min={100} max={2000} step={50} value={customForm.budget} onChange={(e) => setCustomForm({ ...customForm, budget: Number(e.target.value) })} className="w-full accent-blue-600" />
                  <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}><span>$100</span><span>$2,000</span></div>
                </div>

                {/* Campaign Structure Builder */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Campaign Structure</label>
                    <button onClick={addCustomStep} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium cursor-pointer" style={{ background: 'var(--accent)', color: '#fff' }}><Plus size={10} />Add Node</button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                        <select value={step.type} onChange={(e) => updateCustomStep(i, 'type', e.target.value)} className="text-xs rounded px-2 py-1 outline-none cursor-pointer" style={{ background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)' }}>
                          <option value="campaign">Campaign</option>
                          <option value="adset">Ad Set</option>
                          <option value="ad">Ad</option>
                        </select>
                        <input value={step.name} onChange={(e) => updateCustomStep(i, 'name', e.target.value)} placeholder="Name" className="flex-1 text-xs px-2 py-1 rounded outline-none" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }} />
                        {step.type !== 'campaign' && (
                          <input value={step.targeting || ''} onChange={(e) => updateCustomStep(i, 'targeting', e.target.value)} placeholder="Targeting / Format" className="flex-1 text-xs px-2 py-1 rounded outline-none" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }} />
                        )}
                        {customSteps.length > 1 && (
                          <button onClick={() => removeCustomStep(i)} className="p-1 rounded cursor-pointer hover:opacity-80" style={{ color: 'var(--status-error)' }}><Trash2 size={12} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={() => setShowCustomModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCustomModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: 'var(--accent)' }}>Save Template</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  )
}
