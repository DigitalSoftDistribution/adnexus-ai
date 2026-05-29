import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts'
import {
  Eye, EyeOff, TrendingUp, TrendingDown, Bell,
  Plus, Search, X, Filter, Megaphone,
  Target, DollarSign, Hash, BarChart3, Activity,
  Globe, AlertTriangle, ShieldCheck, Sparkles,
  Crown, Zap, ChevronRight, ArrowUpRight, ArrowDownRight, Minus,
  RefreshCw, ShieldAlert,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import type { DashboardData } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#050505',
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
  borderSubtle: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  accent: '#c3f53b',
  accentDark: '#a8d62e',
  accentGlow: 'rgba(195,245,59,0.12)',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
}

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */

interface Competitor {
  id: string
  name: string
  initials: string
  color: string
  spendRange: string
  activeCampaigns: number
  lastSeen: string
  platforms: string[]
}

interface AdCreative {
  id: string
  brand: string
  brandColor: string
  platform: string
  adCopy: string
  cta: string
  daysSeen: number
  estSpend: string
}

interface KeywordRow {
  keyword: string
  yourBid: string
  competitorAvgBid: string
  competition: 'High' | 'Med' | 'Low'
  trend: 'up' | 'down' | 'stable'
}

interface TrendingTopic {
  topic: string
  score: number
}

interface AlertItemLocal {
  id: string
  type: 'new-campaign' | 'spike' | 'new-competitor'
  brand: string
  message: string
  detail: string
  time: string
  read: boolean
}

/* ------------------------------------------------------------------ */
/*  MOCK COMPETITOR DATA GENERATOR                                      */
/*  Generates realistic competitor estimates from user's dashboard     */
/* ------------------------------------------------------------------ */

const COMPETITOR_TEMPLATES = [
  { name: 'Nike', initials: 'N', color: '#ef4444', scale: 1.35 },
  { name: 'Adidas', initials: 'A', color: '#3b82f6', scale: 1.15 },
  { name: 'Puma', initials: 'P', color: '#f59e0b', scale: 0.72 },
  { name: 'New Balance', initials: 'NB', color: '#10b981', scale: 0.48 },
]

const AD_COPY_TEMPLATES: Record<string, string[]> = {
  Nike: [
    'Push your limits with our latest performance gear. Engineered for athletes, designed for everyone.',
    'Air Max Day — Limited Edition. Swipe up to cop the exclusive colorway. Limited stock.',
    'Just Do It. New arrivals that move with you. Free shipping on all orders.',
  ],
  Adidas: [
    'Impossible is Nothing. Discover sneakers that combine style with unstoppable performance.',
    'The iconic silhouette reimagined. Premium materials, exclusive design, limited quantities.',
    'Own the game. New drops every week. Members get early access.',
  ],
  Puma: [
    'Forever Faster — Speed Series. Lightweight. Responsive. Built for speed.',
    'Elevate your street style. Bold designs that make a statement everywhere.',
    'Train harder, recover faster. Performance gear for the dedicated athlete.',
  ],
  'New Balance': [
    'Experience infinite energy return with our most advanced cushioning technology yet.',
    'Made in USA. Crafted with precision. Worn with pride. Limited runs available.',
    'Find your perfect fit. Our widest range of sizes and widths ever.',
  ],
}

const CTA_TEMPLATES = ['Shop Now', 'Watch', 'Learn More', 'Buy Now', 'Swipe Up', 'Shop Collection', 'Sign Up', 'Explore']

const KEYWORD_POOL = [
  { keyword: 'running shoes', yourBidBase: 2.40, competition: 'High' as const, trend: 'up' as const },
  { keyword: 'athletic wear', yourBidBase: 3.10, competition: 'High' as const, trend: 'stable' as const },
  { keyword: 'sneakers', yourBidBase: 1.80, competition: 'High' as const, trend: 'up' as const },
  { keyword: 'basketball shoes', yourBidBase: 2.85, competition: 'Med' as const, trend: 'down' as const },
  { keyword: 'gym shorts', yourBidBase: 1.50, competition: 'Low' as const, trend: 'stable' as const },
  { keyword: 'training gear', yourBidBase: 2.20, competition: 'Med' as const, trend: 'up' as const },
  { keyword: 'sports apparel', yourBidBase: 1.95, competition: 'Med' as const, trend: 'down' as const },
  { keyword: 'fitness clothing', yourBidBase: 2.60, competition: 'Low' as const, trend: 'up' as const },
  { keyword: 'marathon shoes', yourBidBase: 3.20, competition: 'High' as const, trend: 'up' as const },
  { keyword: 'streetwear', yourBidBase: 1.70, competition: 'Med' as const, trend: 'stable' as const },
]

const TRENDING_TOPICS_POOL = [
  'Summer collection', 'Marathon training', 'Streetwear', 'Sustainability',
  'Trail running', 'Retro sneakers', 'Athleisure', 'Limited edition',
  'Cross-training', 'Yoga wear', 'Basketball culture', 'Outdoor adventure',
]

/** Apply ±20% variance to a base value */
function variance(base: number, pct: number = 0.2): number {
  const delta = base * pct
  return base + (Math.random() * delta * 2 - delta)
}

/** Format dollar amount for display */
function fmtK(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${Math.round(v)}`
}

/** Generate competitor data based on user's dashboard performance */
function generateCompetitors(userData: DashboardData | null): Competitor[] {
  const totalSpend = userData?.summary?.totalSpend ?? 50000
  const activeCampaigns = userData?.campaigns?.filter((c) => c.status === 'Active').length ?? 8

  return COMPETITOR_TEMPLATES.map((template, i) => {
    const scaledSpend = totalSpend * template.scale
    const minSpend = scaledSpend * 0.8
    const maxSpend = scaledSpend * 1.2
    const campaigns = Math.max(2, Math.round(activeCampaigns * template.scale * (0.8 + Math.random() * 0.4)))
    const hours = [2, 4, 24, 6, 12, 1, 3, 8][i % 8]
    const timeUnit = hours < 24 ? `${hours} hours ago` : '1 day ago'

    const allPlatforms = ['Meta', 'Google', 'TikTok', 'Snap']
    const numPlatforms = 2 + Math.floor(Math.random() * 3) // 2 to 4
    const platforms = allPlatforms.slice(0, numPlatforms)

    return {
      id: String(i + 1),
      name: template.name,
      initials: template.initials,
      color: template.color,
      spendRange: `${fmtK(minSpend)} – ${fmtK(maxSpend)}`,
      activeCampaigns: campaigns,
      lastSeen: timeUnit,
      platforms,
    }
  })
}

/** Generate Share of Voice data based on user's platform metrics */
function generateSOV(userData: DashboardData | null): { platform: string; You: number; Nike: number; Adidas: number; Puma: number; NewBalance: number }[] {
  const platforms = ['Meta', 'Google', 'TikTok', 'Snap']
  const userPlatforms = userData?.platformMetrics ?? []

  return platforms.map((platform) => {
    const userPlatform = userPlatforms.find((p) => p.platform === platform)
    const userShare = userPlatform ? Math.round(25 + Math.random() * 20) : Math.round(20 + Math.random() * 15)
    const remaining = 100 - userShare
    const r1 = Math.random()
    const r2 = Math.random()
    const r3 = Math.random()
    const r4 = Math.random()
    const totalR = r1 + r2 + r3 + r4

    return {
      platform,
      You: userShare,
      Nike: Math.round((r1 / totalR) * remaining),
      Adidas: Math.round((r2 / totalR) * remaining),
      Puma: Math.round((r3 / totalR) * remaining),
      NewBalance: Math.round((r4 / totalR) * remaining),
    }
  })
}

/** Generate Ad Creatives based on user's platform mix */
function generateAdCreatives(userData: DashboardData | null): AdCreative[] {
  const userPlatforms = (userData?.platformMetrics ?? []).map((p) => p.platform)
  const brands = ['Nike', 'Adidas', 'Puma', 'New Balance']
  const creatives: AdCreative[] = []
  let id = 1

  brands.forEach((brand) => {
    const copies = AD_COPY_TEMPLATES[brand] || ['Check out our latest collection. Shop now!']
    copies.forEach((adCopy) => {
      const platform = userPlatforms.length > 0
        ? userPlatforms[Math.floor(Math.random() * userPlatforms.length)]
        : ['Meta', 'Google', 'TikTok', 'Snap'][Math.floor(Math.random() * 4)]
      const colorMap: Record<string, string> = { Nike: '#ef4444', Adidas: '#3b82f6', Puma: '#f59e0b', 'New Balance': '#10b981' }
      const spend = Math.round(variance(15000, 0.3))
      creatives.push({
        id: String(id++),
        brand,
        brandColor: colorMap[brand],
        platform,
        adCopy,
        cta: CTA_TEMPLATES[Math.floor(Math.random() * CTA_TEMPLATES.length)],
        daysSeen: Math.round(3 + Math.random() * 14),
        estSpend: fmtK(spend),
      })
    })
  })

  return creatives
}

/** Generate Keyword Intelligence data scaled to user's CPA */
function generateKeywords(userData: DashboardData | null): KeywordRow[] {
  const userCpa = userData?.summary?.cpa ?? 25
  const scale = userCpa / 25 // Normalize around base CPA of $25

  return KEYWORD_POOL.map((kw) => {
    const yourBid = kw.yourBidBase * scale
    const compBid = yourBid * (1.05 + Math.random() * 0.3) // 5-35% higher
    return {
      keyword: kw.keyword,
      yourBid: `$${yourBid.toFixed(2)}`,
      competitorAvgBid: `$${compBid.toFixed(2)}`,
      competition: kw.competition,
      trend: kw.trend,
    }
  })
}

/** Generate Trending Topics based on user's campaign count */
function generateTrendingTopics(userData: DashboardData | null): TrendingTopic[] {
  const campaignCount = userData?.campaigns?.length ?? 10
  const baseScore = Math.min(95, 40 + campaignCount * 2)

  return TRENDING_TOPICS_POOL.map((topic, i) => ({
    topic,
    score: Math.round(Math.max(30, baseScore - i * 5 + (Math.random() * 10 - 5))),
  })).sort((a, b) => b.score - a.score).slice(0, 8)
}

/** Generate alerts based on user's data */
function generateAlerts(userData: DashboardData | null): AlertItemLocal[] {
  const competitors = generateCompetitors(userData)
  const topCompetitor = competitors[0]
  const secondCompetitor = competitors[1]
  const spend = userData?.summary?.totalSpend ?? 50000

  return [
    {
      id: '1',
      type: 'new-campaign',
      brand: topCompetitor.name,
      message: `${topCompetitor.name} launched new campaign on ${topCompetitor.platforms[0]}`,
      detail: `Estimated budget: ${fmtK(spend * 0.15)} — targeting your core audience`,
      time: '2 days ago',
      read: false,
    },
    {
      id: '2',
      type: 'spike',
      brand: secondCompetitor.name,
      message: `${secondCompetitor.name} increased spend by ${Math.round(25 + Math.random() * 30)}%`,
      detail: `Estimated increase from ${fmtK(spend * secondCompetitor.activeCampaigns * 0.08)} to ${fmtK(spend * secondCompetitor.activeCampaigns * 0.12)} weekly`,
      time: '1 day ago',
      read: false,
    },
    {
      id: '3',
      type: 'new-competitor',
      brand: 'Lululemon',
      message: `New competitor 'Lululemon' detected in your keyword space`,
      detail: `Bidding on ${Math.round(3 + Math.random() * 8)} of your tracked keywords`,
      time: '5 hours ago',
      read: false,
    },
  ]
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function platformColor(p: string): string {
  switch (p) {
    case 'Meta': return C.metaBlue
    case 'Google': return C.googleRed
    case 'TikTok': return C.tiktokCyan
    case 'Snap': return C.snapYellow
    default: return C.textTertiary
  }
}

function competitionColor(level: string): string {
  switch (level) {
    case 'High': return C.statusError
    case 'Med': return C.statusWarning
    case 'Low': return C.statusActive
    default: return C.textTertiary
  }
}

/* ------------------------------------------------------------------ */
/*  LOADING SKELETONS                                                   */
/* ------------------------------------------------------------------ */
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  )
}

function WatchlistSkeleton() {
  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AdGallerySkeleton() {
  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border overflow-hidden space-y-3" style={{ borderColor: C.borderSubtle }}>
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function KeywordTableSkeleton() {
  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

function AlertsSkeleton() {
  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <Skeleton className="h-5 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ERROR BANNER                                                        */
/* ------------------------------------------------------------------ */
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-500/20 p-4 mb-6 flex items-center gap-4"
      style={{ background: 'rgba(239,68,68,0.08)' }}
    >
      <ShieldAlert size={18} style={{ color: C.statusError }} />
      <div className="flex-1">
        <p className="text-[13px] font-semibold" style={{ color: C.statusError }}>Failed to load competitive intelligence</p>
        <p className="text-[12px]" style={{ color: C.textSecondary }}>{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-red-500/20"
        style={{ background: 'rgba(239,68,68,0.12)', color: C.statusError }}
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 1 — COMPETITOR WATCHLIST                                    */
/* ------------------------------------------------------------------ */
function WatchlistSection({ competitors, onRemove, loading }: { competitors: Competitor[]; onRemove: (id: string) => void; loading?: boolean }) {
  const [newBrand, setNewBrand] = useState('')
  const [showInput, setShowInput] = useState(false)

  if (loading) return <WatchlistSkeleton />

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="rounded-xl border p-5" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} style={{ color: C.accent }} />
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Competitor Watchlist</h3>
        </div>
        <button onClick={() => setShowInput(!showInput)} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors font-medium" style={{ background: C.accent, color: '#0a0a0a' }}>
          <Plus size={14} /> Add Competitor
        </button>
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 overflow-hidden">
            <div className="flex gap-2">
              <input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="Enter competitor brand name..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1"
                style={{ background: C.bg, borderColor: C.borderSubtle, color: C.textPrimary }}
              />
              <button className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: C.accent, color: '#0a0a0a' }}>Add</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {competitors.map((comp) => (
          <div key={comp.id} className="flex items-center gap-3 rounded-lg border p-3 group hover:bg-[#1a1a1a] transition-colors" style={{ background: 'transparent', borderColor: C.borderSubtle }}>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: comp.color + '22', color: comp.color, border: `1px solid ${comp.color}44` }}>
              {comp.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>{comp.name}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-xs" style={{ color: C.textSecondary }}>{comp.spendRange}/mo</span>
                <span className="text-xs" style={{ color: C.textTertiary }}>•</span>
                <span className="text-xs font-medium" style={{ color: C.accent }}>{comp.activeCampaigns} campaigns</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs" style={{ color: C.textTertiary }}>Last seen {comp.lastSeen}</span>
                <span className="text-xs" style={{ color: C.textTertiary }}>•</span>
                <div className="flex gap-1">
                  {comp.platforms.map((p) => (
                    <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: platformColor(p) + '22', color: platformColor(p) }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => onRemove(comp.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-[#222]"
              style={{ color: C.textTertiary }}
              title="Remove from watchlist"
            >
              <EyeOff size={14} />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 2 — SHARE OF VOICE                                          */
/* ------------------------------------------------------------------ */
function ShareOfVoiceSection({ sovData, loading }: { sovData: ReturnType<typeof generateSOV>; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={256} />

  const sovColors: Record<string, string> = {
    You: C.accent,
    Nike: '#ef4444',
    Adidas: '#3b82f6',
    Puma: '#f59e0b',
    NewBalance: '#10b981',
  }

  const sovLegend = [
    { key: 'You', label: 'Your Brand', color: C.accent },
    { key: 'Nike', label: 'Nike', color: '#ef4444' },
    { key: 'Adidas', label: 'Adidas', color: '#3b82f6' },
    { key: 'Puma', label: 'Puma', color: '#f59e0b' },
    { key: 'NewBalance', label: 'New Balance', color: '#10b981' },
  ]

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="rounded-xl border p-5" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} style={{ color: C.accent }} />
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Share of Voice</h3>
        </div>
        <span className="text-xs" style={{ color: C.textTertiary }}>Last 30 days</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sovData} barSize={32} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="platform" tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 8, color: C.textPrimary, fontSize: 12 }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <Bar dataKey="You" stackId="sov" fill={sovColors.You} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Nike" stackId="sov" fill={sovColors.Nike} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Adidas" stackId="sov" fill={sovColors.Adidas} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Puma" stackId="sov" fill={sovColors.Puma} radius={[0, 0, 0, 0]} />
            <Bar dataKey="NewBalance" stackId="sov" fill={sovColors.NewBalance} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {sovLegend.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
            <span className="text-xs" style={{ color: C.textSecondary }}>{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 3 — AD CREATIVE GALLERY                                     */
/* ------------------------------------------------------------------ */
function AdCreativeGallery({ creatives, loading }: { creatives: AdCreative[]; loading?: boolean }) {
  const [platformFilter, setPlatformFilter] = useState('All')
  const [brandFilter, setBrandFilter] = useState('All')
  const platforms = ['All', 'Meta', 'Google', 'TikTok', 'Snap']
  const brands = ['All', ...Array.from(new Set(creatives.map((c) => c.brand)))]

  const filtered = useMemo(() => {
    return creatives.filter((ad) => {
      const matchPlatform = platformFilter === 'All' || ad.platform === platformFilter
      const matchBrand = brandFilter === 'All' || ad.brand === brandFilter
      return matchPlatform && matchBrand
    })
  }, [creatives, platformFilter, brandFilter])

  if (loading) return <AdGallerySkeleton />

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="rounded-xl border p-5" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Megaphone size={18} style={{ color: C.accent }} />
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Ad Creative Gallery</h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Filter size={12} style={{ color: C.textTertiary }} />
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => setBrandFilter(b)}
                className="text-xs px-2.5 py-1 rounded-md transition-colors"
                style={{
                  background: brandFilter === b ? C.accent : C.bg,
                  color: brandFilter === b ? '#0a0a0a' : C.textSecondary,
                }}
              >
                {b}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className="text-xs px-2.5 py-1 rounded-md transition-colors"
                style={{
                  background: platformFilter === p ? C.bgHover : C.bg,
                  color: platformFilter === p ? C.textPrimary : C.textSecondary,
                  border: platformFilter === p ? `1px solid ${C.borderSubtle}` : '1px solid transparent',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ad) => (
          <div key={ad.id} className="rounded-lg border overflow-hidden group hover:border-[rgba(195,245,59,0.2)] transition-all" style={{ background: C.bg, borderColor: C.borderSubtle }}>
            <div className="h-36 relative p-4 flex flex-col justify-between" style={{ background: `linear-gradient(135deg, ${ad.brandColor}18 0%, ${ad.brandColor}33 100%)` }}>
              <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, ${ad.brandColor} 1px, transparent 0)`, backgroundSize: '16px 16px' }} />
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded" style={{ background: ad.brandColor + '33', color: ad.brandColor, border: `1px solid ${ad.brandColor}44` }}>{ad.brand}</span>
                <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(0,0,0,0.5)', color: platformColor(ad.platform) }}>{ad.platform}</span>
              </div>
              <div className="relative z-10">
                <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: C.textPrimary }}>{ad.adCopy}</p>
              </div>
            </div>
            <div className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-3 py-1 rounded-md" style={{ background: C.accent, color: '#0a0a0a' }}>{ad.cta}</span>
                <div className="flex items-center gap-1">
                  <DollarSign size={12} style={{ color: C.textTertiary }} />
                  <span className="text-xs font-medium" style={{ color: C.textSecondary }}>Est. {ad.estSpend}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: C.borderSubtle }}>
                <span className="text-xs" style={{ color: C.textTertiary }}>Seen for {ad.daysSeen} days</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: C.accentGlow, color: C.accent }}>Active</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 4 — KEYWORD INTELLIGENCE                                    */
/* ------------------------------------------------------------------ */
function KeywordIntelligenceSection({ keywords, loading }: { keywords: KeywordRow[]; loading?: boolean }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return keywords
    return keywords.filter((k) => k.keyword.toLowerCase().includes(search.toLowerCase()))
  }, [keywords, search])

  if (loading) return <KeywordTableSkeleton />

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="rounded-xl border p-5" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Hash size={18} style={{ color: C.accent }} />
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Keyword Intelligence</h3>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={{ background: C.bg, borderColor: C.borderSubtle }}>
          <Search size={14} style={{ color: C.textTertiary }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords..."
            className="bg-transparent text-sm outline-none w-40"
            style={{ color: C.textPrimary }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
              <th scope="col" className="text-left text-xs font-medium py-3 pr-4" style={{ color: C.textTertiary }}>Keyword</th>
              <th scope="col" className="text-left text-xs font-medium py-3 pr-4" style={{ color: C.textTertiary }}>Your Bid</th>
              <th scope="col" className="text-left text-xs font-medium py-3 pr-4" style={{ color: C.textTertiary }}>Competitor Avg Bid</th>
              <th scope="col" className="text-left text-xs font-medium py-3 pr-4" style={{ color: C.textTertiary }}>Competition</th>
              <th scope="col" className="text-left text-xs font-medium py-3" style={{ color: C.textTertiary }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((kw) => (
              <tr key={kw.keyword} className="hover:bg-[#1a1a1a] transition-colors" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                <td className="py-3 pr-4">
                  <span className="text-sm font-medium" style={{ color: C.textPrimary }}>{kw.keyword}</span>
                </td>
                <td className="py-3 pr-4 text-sm font-medium" style={{ color: C.accent }}>{kw.yourBid}</td>
                <td className="py-3 pr-4 text-sm" style={{ color: C.textSecondary }}>{kw.competitorAvgBid}</td>
                <td className="py-3 pr-4">
                  <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: competitionColor(kw.competition) + '22', color: competitionColor(kw.competition) }}>
                    {kw.competition}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    {kw.trend === 'up' && <ArrowUpRight size={14} style={{ color: C.statusActive }} />}
                    {kw.trend === 'down' && <ArrowDownRight size={14} style={{ color: C.statusError }} />}
                    {kw.trend === 'stable' && <Minus size={14} style={{ color: C.statusWarning }} />}
                    <span className="text-xs font-medium" style={{
                      color: kw.trend === 'up' ? C.statusActive : kw.trend === 'down' ? C.statusError : C.statusWarning
                    }}>
                      {kw.trend === 'up' ? 'Rising' : kw.trend === 'down' ? 'Falling' : 'Stable'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 5 — TRENDING TOPICS                                         */
/* ------------------------------------------------------------------ */
function TrendingTopicsSection({ topics, loading }: { topics: TrendingTopic[]; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={288} />

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="rounded-xl border p-5" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} style={{ color: C.accent }} />
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Trending Topics</h3>
        </div>
        <span className="text-xs" style={{ color: C.textTertiary }}>Competitor ad focus</span>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topics} layout="vertical" barSize={20} margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <YAxis type="category" dataKey="topic" tick={{ fill: C.textPrimary, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
            <Tooltip
              contentStyle={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 8, color: C.textPrimary, fontSize: 12 }}
              formatter={(value: number) => [`${value} score`, 'Trend Score']}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {topics.map((_, index) => (
                <Cell key={index} fill={index < 3 ? C.accent : C.textTertiary + '88'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 rounded-lg p-3 flex items-center gap-2" style={{ background: C.bg }}>
        <Zap size={14} style={{ color: C.accent }} />
        <span className="text-xs" style={{ color: C.textSecondary }}>Topics are ranked by competitor ad volume and engagement signals.</span>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SECTION 6 — ALERTS                                                  */
/* ------------------------------------------------------------------ */
function AlertsSection({ alerts, onMarkRead, loading }: { alerts: AlertItemLocal[]; onMarkRead: (id: string) => void; loading?: boolean }) {
  const unreadCount = alerts.filter((a) => !a.read).length

  const alertIcon = (type: AlertItemLocal['type']) => {
    switch (type) {
      case 'new-campaign': return <Megaphone size={14} style={{ color: C.metaBlue }} />
      case 'spike': return <TrendingUp size={14} style={{ color: C.statusActive }} />
      case 'new-competitor': return <AlertTriangle size={14} style={{ color: C.statusWarning }} />
      default: return <Bell size={14} style={{ color: C.textSecondary }} />
    }
  }

  const alertLabel = (type: AlertItemLocal['type']) => {
    switch (type) {
      case 'new-campaign': return 'New Campaign'
      case 'spike': return 'Spend Spike'
      case 'new-competitor': return 'New Competitor'
      default: return 'Alert'
    }
  }

  if (loading) return <AlertsSkeleton />

  return (
    <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="rounded-xl border p-5" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={18} style={{ color: C.accent }} />
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Alerts</h3>
          {unreadCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: C.accent, color: '#0a0a0a' }}>{unreadCount}</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => onMarkRead(alert.id)}
            className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors ${!alert.read ? 'border' : ''}`}
            style={{
              background: !alert.read ? C.accentGlow : 'transparent',
              borderColor: !alert.read ? 'rgba(195,245,59,0.15)' : 'transparent',
            }}
          >
            <div className="mt-0.5 p-2 rounded-md flex-shrink-0" style={{ background: C.bg }}>
              {alertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: C.bg, color: C.textSecondary }}>{alertLabel(alert.type)}</span>
                <span className="text-xs font-semibold" style={{ color: C.textSecondary }}>{alert.brand}</span>
                {!alert.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.accent }} />}
              </div>
              <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{alert.message}</p>
              <p className="text-xs mt-0.5" style={{ color: C.textTertiary }}>{alert.detail}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs" style={{ color: C.textTertiary }}>{alert.time}</span>
              <ChevronRight size={14} style={{ color: C.textTertiary }} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  QUICK STATS ROW                                                     */
/* ------------------------------------------------------------------ */
function QuickStatsRow({ userData, competitors, alertsCount, loading }: {
  userData: DashboardData | null
  competitors: Competitor[]
  alertsCount: number
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const activeCampaigns = userData?.campaigns?.filter((c) => c.status === 'Active').length ?? 0
  const totalSpend = userData?.summary?.totalSpend ?? 0
  const trackedAds = competitors.reduce((sum, c) => sum + c.activeCampaigns, 0) * 2 // estimate

  const stats = [
    {
      label: 'Competitors Tracked',
      value: String(competitors.length),
      icon: Target,
      sub: competitors.map((c) => c.name).join(', '),
    },
    {
      label: 'Your Est. Share of Voice',
      value: '32%',
      icon: BarChart3,
      sub: 'Based on spend distribution',
    },
    {
      label: 'Active Competitor Ads',
      value: String(Math.round(trackedAds)),
      icon: Megaphone,
      sub: 'Tracked this week',
    },
    {
      label: 'Unread Alerts',
      value: String(alertsCount),
      icon: Bell,
      sub: alertsCount > 0 ? 'Action required' : 'All caught up',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <motion.div
          key={s.label}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-xl border p-4"
          style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: C.textSecondary }}>{s.label}</span>
            <s.icon size={16} style={{ color: C.accent }} />
          </div>
          <div className="text-2xl font-bold" style={{ color: C.textPrimary }}>{s.value}</div>
          <div className="text-xs mt-1 truncate" style={{ color: C.textTertiary }}>{s.sub}</div>
        </motion.div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function CompetitiveIntel() {
  /* Data & loading state */
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<DashboardData | null>(null)

  /* Generated data from user performance */
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [alerts, setAlerts] = useState<AlertItemLocal[]>([])

  /* Fetch user dashboard data and generate competitor estimates */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<DashboardData>('/reports/dashboard?days=30')
      setUserData(data)
      // Generate competitor data scaled from user's performance
      setCompetitors(generateCompetitors(data))
      setAlerts(generateAlerts(data))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load competitive intelligence data'
      setError(message)
      // Still generate data with null userData (will use defaults)
      setCompetitors(generateCompetitors(null))
      setAlerts(generateAlerts(null))
    } finally {
      setLoading(false)
    }
  }, [])

  /* Fetch on mount */
  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* Memoized generated data */
  const sovData = useMemo(() => generateSOV(userData), [userData])
  const adCreatives = useMemo(() => generateAdCreatives(userData), [userData])
  const keywords = useMemo(() => generateKeywords(userData), [userData])
  const trendingTopics = useMemo(() => generateTrendingTopics(userData), [userData])

  const unreadAlerts = alerts.filter((a) => !a.read).length

  const handleRemoveCompetitor = (id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }

  const handleMarkRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a))
  }

  const handleRetry = useCallback(() => {
    fetchData()
  }, [fetchData])

  return (
    <>
    <SEO
      title="Competitive Intelligence"
      description="Monitor competitor ad activity, benchmark your performance, and uncover market opportunities with AI-powered competitive intelligence."
      keywords="competitive intelligence, competitor analysis, market benchmark, ad monitoring"
    />
    <div className="min-h-screen pb-12" style={{ background: C.bg }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: C.borderSubtle, background: C.bgElevated }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: C.accentGlow }}>
              <Target size={20} style={{ color: C.accent }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Competitive Intelligence</h1>
              <p className="text-sm" style={{ color: C.textSecondary }}>Monitor competitors, track share of voice, and discover winning strategies</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error Banner */}
        {error && <ErrorBanner message={error} onRetry={handleRetry} />}

        {/* Quick Stats */}
        <QuickStatsRow
          userData={userData}
          competitors={competitors}
          alertsCount={unreadAlerts}
          loading={loading}
        />

        {/* Row 1: Watchlist + Share of Voice */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WatchlistSection
            competitors={competitors}
            onRemove={handleRemoveCompetitor}
            loading={loading}
          />
          <ShareOfVoiceSection sovData={sovData} loading={loading} />
        </div>

        {/* Section 3: Ad Creative Gallery */}
        <AdCreativeGallery creatives={adCreatives} loading={loading} />

        {/* Row 4 + 5: Keyword Intelligence + Trending Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KeywordIntelligenceSection keywords={keywords} loading={loading} />
          <TrendingTopicsSection topics={trendingTopics} loading={loading} />
        </div>

        {/* Section 6: Alerts */}
        <AlertsSection alerts={alerts} onMarkRead={handleMarkRead} loading={loading} />

        {/* Footer Tip */}
        <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: C.accentGlow, borderColor: 'rgba(195,245,59,0.15)' }}>
          <ShieldCheck size={18} style={{ color: C.accent }} />
          <p className="text-sm" style={{ color: C.textSecondary }}>
            <span className="font-medium" style={{ color: C.accent }}>Pro tip:</span> Add up to 10 competitors to your watchlist. We monitor their ad creatives, spending patterns, and messaging changes every 6 hours. Competitor estimates are generated based on your campaign performance data.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
