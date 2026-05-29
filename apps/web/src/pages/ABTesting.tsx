import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Pause,
  Play,
  Copy,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Beaker,
  Trophy,
  TrendingUp,
  DollarSign,
  BarChart3,
  Zap,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from 'recharts'
import CountUp from 'react-countup'
import { apiGet } from '../lib/api'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type TestStatus = 'Running' | 'Paused' | 'Scheduled' | 'Ended'
type TestType = 'Creative' | 'Audience' | 'Placement' | 'Landing Page'
type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snap'

interface Ad {
  id: string
  name: string
  campaign: string
  platform: Platform
  status: 'Active' | 'Paused' | 'Ended' | 'Draft'
  adSetId?: string
  impressions: number
  clicks: number
  ctr: number | null
  conversions: number | null
  cpa: number | null
  roas: number | null
  spend: number
  createdAt: string
  updatedAt: string
}

interface AdPerformance {
  adId: string
  daily: Array<{
    date: string
    impressions: number
    clicks: number
    conversions: number
    spend: number
    ctr: number
    cvr: number
  }>
}

interface VariantData {
  name: string
  ctr: number
  cvr: number
  impressions: number
  clicks: number
  conversions: number
  spend: number
  cpa: number
  roas: number
  confidenceInterval: [number, number]
}

interface ABTest {
  id: string
  name: string
  type: TestType
  platform: Platform
  status: TestStatus
  campaign: string
  dateRange: string
  startDate: string
  endDate: string
  durationDays: number
  controlMetric: string
  variantMetric: string
  metricLabel: string
  winner: 'Control' | 'Variant' | 'TBD'
  confidence: number
  chartData: { day: string; control: number; variant: number }[]
  ctrData: { metric: string; control: number; variant: number }[]
  cvrData: { day: string; control: number; variant: number }[]
  controlVariant: VariantData
  testVariant: VariantData
  aiInsight: string
  sampleSize: number
  minimumDetectableEffect: number
}

/* ------------------------------------------------------------------ */
/*  Color maps                                                         */
/* ------------------------------------------------------------------ */
const PLATFORM_COLORS: Record<Platform, string> = {
  Meta: '#1877F2',
  Google: '#DB4437',
  TikTok: '#00F2EA',
  Snap: '#FFFC00',
}

const STATUS_COLORS: Record<TestStatus, string> = {
  Running: '#10B981',
  Paused: '#F59E0B',
  Scheduled: '#3B82F6',
  Ended: '#8A8F98',
}

const TYPE_COLORS: Record<TestType, string> = {
  Creative: 'rgba(37,99,235,0.15)',
  Audience: 'rgba(16,185,129,0.15)',
  Placement: 'rgba(245,158,11,0.15)',
  'Landing Page': 'rgba(239,68,68,0.15)',
}

const TYPE_TEXT_COLORS: Record<TestType, string> = {
  Creative: '#3B82F6',
  Audience: '#10B981',
  Placement: '#F59E0B',
  'Landing Page': '#EF4444',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const platforms: (Platform | 'All')[] = ['All', 'Meta', 'Google', 'TikTok', 'Snap']

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number]

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(1, Math.round(ms / 86400000))
}

/** Infer test type from ad name heuristics */
function inferTestType(name: string): TestType {
  const n = name.toLowerCase()
  if (n.includes('audience') || n.includes('lookalike') || n.includes('interest') || n.includes('retarget') || n.includes('demographic')) return 'Audience'
  if (n.includes('placement') || n.includes('feed') || n.includes('story') || n.includes('in-feed') || n.includes('topview') || n.includes('reels')) return 'Placement'
  if (n.includes('landing') || n.includes('lp ') || n.includes('page')) return 'Landing Page'
  return 'Creative'
}

/** Map ad status to test status */
function mapAdStatus(ads: Ad[]): TestStatus {
  const statuses = new Set(ads.map((a) => a.status))
  if (statuses.has('Active')) return 'Running'
  if (statuses.has('Draft')) return 'Scheduled'
  if (statuses.has('Paused')) return 'Paused'
  return 'Ended'
}

/** Two-proportion z-test for CTR difference.
 *  Returns confidence percentage (0-100).
 */
function calcZTestConfidence(
  clicks1: number,
  impressions1: number,
  clicks2: number,
  impressions2: number
): number {
  const n1 = Math.max(1, impressions1)
  const n2 = Math.max(1, impressions2)
  const p1 = clicks1 / n1
  const p2 = clicks2 / n2
  const p = (clicks1 + clicks2) / (n1 + n2)
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
  if (se === 0) return 0
  const z = Math.abs(p1 - p2) / se
  // Approximate cumulative normal
  const confidence = phi(z) * 100
  return Math.min(99.9, Math.round(confidence * 10) / 10)
}

/** Standard normal CDF approximation */
function phi(z: number): number {
  const b1 = 0.31938153
  const b2 = -0.356563782
  const b3 = 1.781477937
  const b4 = -1.821255978
  const b5 = 1.330274429
  const p = 0.2316419
  const c = 0.39894228

  if (z >= 0) {
    const t = 1 / (1 + p * z)
    return 1 - c * Math.exp((-z * z) / 2) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1)
  }
  return 1 - phi(-z)
}

/** 95% confidence interval for a proportion */
function proportionCI(clicks: number, impressions: number): [number, number] {
  const n = Math.max(1, impressions)
  const p = Math.min(1, Math.max(0, clicks / n))
  const se = Math.sqrt((p * (1 - p)) / n)
  const z95 = 1.96
  const lo = Math.max(0, (p - z95 * se) * 100)
  const hi = Math.min(100, (p + z95 * se) * 100)
  return [Math.round(lo * 10) / 10, Math.round(hi * 10) / 10]
}

/** Detect variant suffix in ad name to extract base name */
function extractBaseName(name: string): { base: string; variant: 'A' | 'B' | 'control' | 'variant' | null } {
  const patterns = [
    /\s*[-_\s]*\s*(?:variant\s*)?B\s*$/i,
    /\s*[-_\s]*\s*(?:variant\s*)?A\s*$/i,
    /\s*[-_\s]*\s*control\s*$/i,
    /\s*[-_\s]*\s*variant\s*$/i,
    /\s*[-_\s]*\s*v\s*2\s*$/i,
    /\s*[-_\s]*\s*v\s*1\s*$/i,
    /\s*[-_\s]*\s*#\s*2\s*$/i,
    /\s*[-_\s]*\s*#\s*1\s*$/i,
    /\s*[-_\s]*\s*\(B\)\s*$/i,
    /\s*[-_\s]*\s*\(A\)\s*$/i,
  ]
  for (const pat of patterns) {
    const m = name.match(pat)
    if (m) {
      const base = name.slice(0, m.index).trim()
      const suffix = m[0].toLowerCase()
      if (suffix.includes('b') || suffix.includes('2') || suffix.includes('variant')) return { base, variant: 'B' }
      return { base, variant: 'A' }
    }
  }
  // Check if one ad name contains the other (subset matching)
  return { base: name, variant: null }
}

/** Group ads by campaign + base name similarity into test pairs */
function groupAdsIntoTests(ads: Ad[]): Array<{ campaign: string; platform: Platform; baseName: string; type: TestType; control: Ad | null; variant: Ad | null }> {
  const byCampaign = new Map<string, Ad[]>()
  for (const ad of ads) {
    if (!byCampaign.has(ad.campaign)) byCampaign.set(ad.campaign, [])
    byCampaign.get(ad.campaign).push(ad)
  }

  const tests: Array<{ campaign: string; platform: Platform; baseName: string; type: TestType; control: Ad | null; variant: Ad | null }> = []

  for (const [campaign, campaignAds] of byCampaign) {
    const matched = new Set<string>()

    // Try suffix-based pairing first
    const baseMap = new Map<string, { a?: Ad; b?: Ad }>()
    for (const ad of campaignAds) {
      const { base, variant } = extractBaseName(ad.name)
      if (variant && base) {
        if (!baseMap.has(base)) baseMap.set(base, {})
        const entry = baseMap.get(base)
        if (variant === 'A' || variant === 'control') entry.a = ad
        else entry.b = ad
      }
    }
    for (const [baseName, entry] of baseMap) {
      if (entry.a || entry.b) {
        tests.push({
          campaign,
          platform: (entry.a || entry.b).platform,
          baseName,
          type: inferTestType(baseName),
          control: entry.a || null,
          variant: entry.b || null,
        })
        if (entry.a) matched.add(entry.a.id)
        if (entry.b) matched.add(entry.b.id)
      }
    }

    // Fallback: pair remaining ads within campaign by edit distance / word overlap
    const unmatched = campaignAds.filter((a) => !matched.has(a.id))
    unmatched.sort((a, b) => a.name.localeCompare(b.name))
    for (let i = 0; i < unmatched.length - 1; i += 2) {
      const a = unmatched[i]
      const b = unmatched[i + 1]
      const baseName = longestCommonPrefix(a.name, b.name) || a.campaign
      tests.push({
        campaign,
        platform: a.platform,
        baseName,
        type: inferTestType(baseName),
        control: a,
        variant: b,
      })
      matched.add(a.id)
      matched.add(b.id)
    }

    // Solo ads become a single-variant test (Scheduled)
    for (const ad of unmatched) {
      if (!matched.has(ad.id)) {
        tests.push({
          campaign,
          platform: ad.platform,
          baseName: ad.name,
          type: inferTestType(ad.name),
          control: ad,
          variant: null,
        })
      }
    }
  }

  return tests
}

function longestCommonPrefix(a: string, b: string): string {
  let i = 0
  while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++
  const prefix = a.slice(0, i).trim()
  return prefix.length > 3 ? prefix : ''
}

function mapTestStatus(ads: Ad[]): TestStatus {
  const s = new Set(ads.map((a) => a.status))
  if (s.has('Active')) return 'Running'
  if (s.has('Draft')) return 'Scheduled'
  if (s.has('Paused')) return 'Paused'
  return 'Ended'
}

/** Build ABTest from grouped ads + optional performance data */
async function buildABTest(
  group: { campaign: string; platform: Platform; baseName: string; type: TestType; control: Ad | null; variant: Ad | null },
  perfCache: Map<string, AdPerformance>
): Promise<ABTest | null> {
  const control = group.control
  const variant = group.variant
  const allAds = [control, variant].filter(Boolean) as Ad[]
  if (allAds.length === 0) return null

  const cAd = control || variant!
  const vAd = variant || control!

  const status = mapTestStatus(allAds)
  const minDate = allAds.reduce((min, a) => (a.createdAt < min ? a.createdAt : min), allAds[0].createdAt)
  const maxDate = allAds.reduce((max, a) => (a.updatedAt > max ? a.updatedAt : max), allAds[0].updatedAt)
  const duration = daysBetween(minDate, maxDate)

  const cClicks = control?.clicks ?? 0
  const cImps = control?.impressions ?? 1
  const vClicks = variant?.clicks ?? 0
  const vImps = variant?.impressions ?? 1

  const cCtr = control?.ctr ?? (cImps > 0 ? (cClicks / cImps) * 100 : 0)
  const vCtr = variant?.ctr ?? (vImps > 0 ? (vClicks / vImps) * 100 : 0)
  const cCvr = control?.conversions && cClicks > 0 ? (control.conversions / cClicks) * 100 : 0
  const vCvr = variant?.conversions && vClicks > 0 ? (variant.conversions / vClicks) * 100 : 0

  const confidence = (control && variant)
    ? calcZTestConfidence(cClicks, cImps, vClicks, vImps)
    : 0

  const winner: 'Control' | 'Variant' | 'TBD' =
    !control || !variant
      ? 'TBD'
      : confidence >= 95
        ? vCtr > cCtr
          ? 'Variant'
          : 'Control'
        : 'TBD'

  // Fetch performance data for chart building
  const cPerf = control ? perfCache.get(control.id) : undefined
  const vPerf = variant ? perfCache.get(variant.id) : undefined

  // Build chart data from performance daily series
  const dailyMap = new Map<string, { control: number; variant: number }>()
  const cvrMap = new Map<string, { control: number; variant: number }>()

  if (cPerf?.daily) {
    for (const d of cPerf.daily) {
      const key = formatDateShort(d.date)
      const entry = dailyMap.get(key) || { control: 0, variant: 0 }
      entry.control = d.ctr * 100 || (d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0)
      dailyMap.set(key, entry)
      const cvrEntry = cvrMap.get(key) || { control: 0, variant: 0 }
      cvrEntry.control = d.cvr * 100 || (d.clicks > 0 ? (d.conversions / d.clicks) * 100 : 0)
      cvrMap.set(key, cvrEntry)
    }
  }
  if (vPerf?.daily) {
    for (const d of vPerf.daily) {
      const key = formatDateShort(d.date)
      const entry = dailyMap.get(key) || { control: 0, variant: 0 }
      entry.variant = d.ctr * 100 || (d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0)
      dailyMap.set(key, entry)
      const cvrEntry = cvrMap.get(key) || { control: 0, variant: 0 }
      cvrEntry.variant = d.cvr * 100 || (d.clicks > 0 ? (d.conversions / d.clicks) * 100 : 0)
      cvrMap.set(key, cvrEntry)
    }
  }

  // Sort by date; limit to last 14 days
  const sortedKeys = Array.from(dailyMap.keys()).slice(-14)
  const chartData = sortedKeys.map((k) => ({ day: k, control: dailyMap.get(k)?.control ?? 0, variant: dailyMap.get(k)?.variant ?? 0 }))
  const cvrData = sortedKeys.map((k) => ({ day: k, control: cvrMap.get(k)?.control ?? 0, variant: cvrMap.get(k)?.variant ?? 0 }))

  // Fallback: if no perf data, generate minimal entries from totals spread across duration
  if (chartData.length === 0 && duration > 0) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for (let i = 0; i < Math.min(duration, 7); i++) {
      const frac = 1 / Math.min(duration, 7)
      chartData.push({
        day: days[i % 7],
        control: cCtr * frac * (0.9 + Math.random() * 0.2),
        variant: vCtr * frac * (0.9 + Math.random() * 0.2),
      })
      cvrData.push({
        day: days[i % 7],
        control: cCvr * frac * (0.9 + Math.random() * 0.2),
        variant: vCvr * frac * (0.9 + Math.random() * 0.2),
      })
    }
  }

  const cCI = proportionCI(cClicks, cImps)
  const vCI = proportionCI(vClicks, vImps)

  const sampleSize = cImps + vImps

  const controlVariant: VariantData = {
    name: control?.name || 'Control',
    ctr: Math.round(cCtr * 10) / 10,
    cvr: Math.round(cCvr * 10) / 10,
    impressions: cImps,
    clicks: cClicks,
    conversions: control?.conversions ?? 0,
    spend: control?.spend ?? 0,
    cpa: control?.cpa ?? (control?.conversions ? Math.round(control.spend / control.conversions) : 0),
    roas: control?.roas ?? 0,
    confidenceInterval: cCI,
  }

  const testVariant: VariantData = {
    name: variant?.name || 'Variant',
    ctr: Math.round(vCtr * 10) / 10,
    cvr: Math.round(vCvr * 10) / 10,
    impressions: vImps,
    clicks: vClicks,
    conversions: variant?.conversions ?? 0,
    spend: variant?.spend ?? 0,
    cpa: variant?.cpa ?? (variant?.conversions ? Math.round(variant.spend / variant.conversions) : 0),
    roas: variant?.roas ?? 0,
    confidenceInterval: vCI,
  }

  const metricLabel = 'CTR'
  const controlMetric = `CTR ${controlVariant.ctr}%`
  const variantMetric = `CTR ${testVariant.ctr}%`

  const ctrData = [
    { metric: 'CTR (%)', control: controlVariant.ctr, variant: testVariant.ctr },
    { metric: 'CVR (%)', control: controlVariant.cvr, variant: testVariant.cvr },
  ]

  const aiInsight = generateInsight(winner, confidence, controlVariant, testVariant, group.baseName)

  const id = `ab-${group.campaign}-${group.baseName}`.replace(/\s+/g, '-').toLowerCase().slice(0, 60)

  return {
    id,
    name: group.baseName || `${group.campaign} Test`,
    type: group.type,
    platform: group.platform,
    status,
    campaign: group.campaign,
    dateRange: `${formatDateShort(minDate)} \u2192 ${formatDateShort(maxDate)}`,
    startDate: formatDateShort(minDate),
    endDate: formatDateShort(maxDate),
    durationDays: duration,
    controlMetric,
    variantMetric,
    metricLabel,
    winner,
    confidence: Math.round(confidence),
    chartData,
    ctrData,
    cvrData,
    controlVariant,
    testVariant,
    aiInsight,
    sampleSize,
    minimumDetectableEffect: Math.round((1.96 * Math.sqrt((0.02 * 0.98) / Math.max(1, Math.floor(sampleSize / 2)))) * 10000) / 100,
  }
}

function generateInsight(
  winner: 'Control' | 'Variant' | 'TBD',
  confidence: number,
  control: VariantData,
  variant: VariantData,
  testName: string
): string {
  const lift = control.ctr > 0 ? Math.round(((variant.ctr - control.ctr) / control.ctr) * 100) : 0

  if (winner === 'Variant' && confidence >= 95) {
    return `Variant wins with ${Math.round(confidence)}% confidence. CTR lift of ${lift > 0 ? '+' : ''}${lift}% (${control.ctr}% vs ${variant.ctr}%). Recommend applying winner to full budget. Estimated CPA: $${variant.cpa} vs $${control.cpa}.`
  }
  if (winner === 'Control' && confidence >= 95) {
    return `Control maintains performance with ${Math.round(confidence)}% confidence. Variant underperforms by ${Math.abs(lift)}% on CTR. Keep current variant running. CPA: $${control.cpa} vs $${variant.cpa}.`
  }
  if (confidence >= 70) {
    return `Early trend: ${variant.ctr > control.ctr ? 'variant leading' : 'control leading'} (${Math.round(confidence)}% confidence). Need more data to reach 95% threshold. Continue test for ${Math.ceil((95 - confidence) / 5)} more days.`
  }
  if (control.impressions === 0 && variant.impressions === 0) {
    return `Test "${testName}" scheduled. Ensure creatives are approved 48h before launch.`
  }
  return `Insufficient data for "${testName}" (${Math.round(confidence)}% confidence). Continue collecting impressions. Target: at least 5,000 per variant.`
}

/* ------------------------------------------------------------------ */
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */
function SkeletonRow() {
  return (
    <div className="grid gap-4 px-4 py-3 items-center animate-pulse" style={{ gridTemplateColumns: '2fr 0.8fr 0.9fr 1.1fr 1fr 1.4fr 1fr 0.8fr', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full" style={{ background: 'var(--bg-hover)' }} />
        <div className="space-y-1">
          <div className="h-3.5 rounded w-32" style={{ background: 'var(--bg-hover)' }} />
          <div className="h-2.5 rounded w-16" style={{ background: 'var(--bg-hover)' }} />
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-3 rounded w-16" style={{ background: 'var(--bg-hover)' }} />
      ))}
      <div className="h-3 rounded w-12 ml-auto" style={{ background: 'var(--bg-hover)' }} />
    </div>
  )
}

function SkeletonStat() {
  return (
    <div className="card-surface p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-3 rounded w-20" style={{ background: 'var(--bg-hover)' }} />
      </div>
      <div className="h-8 rounded w-24 mb-2" style={{ background: 'var(--bg-hover)' }} />
      <div className="h-2.5 rounded w-16" style={{ background: 'var(--bg-hover)' }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Significance Badge                                                 */
/* ------------------------------------------------------------------ */
function SignificanceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 95) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
        <ShieldCheck size={10} /> Sig. ({confidence}%)
      </span>
    )
  }
  if (confidence >= 80) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
        <TrendingUp size={10} /> Trend ({confidence}%)
      </span>
    )
  }
  if (confidence > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(138,143,152,0.15)', color: '#8A8F98' }}>
        {confidence}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>
      Pending
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Confidence Interval Bar                                            */
/* ------------------------------------------------------------------ */
function ConfidenceIntervalBar({ value, interval, color }: { value: number; interval: [number, number]; color: string }) {
  const [min, max] = interval
  const range = max - min
  if (range === 0) return null
  const leftPct = ((min - Math.min(min * 0.8, 0)) / (max * 1.2)) * 100
  const widthPct = ((value - min) / (max * 1.2 - min * 0.8)) * 100
  const ciWidthPct = ((max - min) / (max * 1.2 - min * 0.8)) * 100

  return (
    <div className="w-full">
      <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="absolute h-full rounded-full opacity-30"
          style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.max(8, ciWidthPct)}%`, background: color }}
        />
        <div
          className="absolute h-full rounded-full"
          style={{ left: `${Math.max(0, Math.min(92, widthPct))}%`, width: 6, background: color, transform: 'translateX(-50%)' }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono-data" style={{ color: 'var(--text-tertiary)' }}>{min}</span>
        <span className="text-[9px] font-mono-data font-semibold" style={{ color }}>{value}</span>
        <span className="text-[9px] font-mono-data" style={{ color: 'var(--text-tertiary)' }}>{max}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Error State                                                        */
/* ------------------------------------------------------------------ */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface p-8 text-center"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
          <AlertTriangle size={24} style={{ color: '#EF4444' }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Failed to load A/B Tests</h3>
        <p className="text-xs max-w-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all cursor-pointer hover:opacity-80"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mock data fallback for demo mode                                   */
/* ------------------------------------------------------------------ */
function makeVariant(
  name: string,
  ctr: number,
  cvr: number,
  impressions: number,
  spend: number,
  roas: number,
  ci: [number, number]
): VariantData {
  const clicks = Math.round((impressions * ctr) / 100)
  const conversions = Math.round((clicks * cvr) / 100)
  return {
    name,
    ctr,
    cvr,
    impressions,
    clicks,
    conversions,
    spend,
    cpa: Math.round(spend / Math.max(conversions, 1)),
    roas,
    confidenceInterval: ci,
  }
}

function getMockTests(): ABTest[] {
  return [
    {
      id: '1', name: 'Video Hook Test', type: 'Creative', platform: 'Meta', status: 'Running',
      campaign: 'Summer Sale', dateRange: 'May 18 \u2192 25', startDate: 'May 18', endDate: 'May 25', durationDays: 7,
      controlMetric: 'CTR 2.1%', variantMetric: 'CTR 3.4%', metricLabel: 'CTR',
      winner: 'Variant', confidence: 95, sampleSize: 48200, minimumDetectableEffect: 0.5,
      chartData: [
        { day: 'Mon', control: 2.0, variant: 2.8 },
        { day: 'Tue', control: 2.1, variant: 3.0 },
        { day: 'Wed', control: 2.0, variant: 3.2 },
        { day: 'Thu', control: 2.2, variant: 3.3 },
        { day: 'Fri', control: 2.1, variant: 3.4 },
        { day: 'Sat', control: 2.1, variant: 3.5 },
        { day: 'Sun', control: 2.1, variant: 3.4 },
      ],
      ctrData: [
        { metric: 'CTR (%)', control: 2.1, variant: 3.4 },
        { metric: 'CVR (%)', control: 3.2, variant: 4.1 },
      ],
      cvrData: [
        { day: 'Mon', control: 2.8, variant: 3.5 },
        { day: 'Tue', control: 3.0, variant: 3.8 },
        { day: 'Wed', control: 3.1, variant: 4.0 },
        { day: 'Thu', control: 3.2, variant: 4.1 },
        { day: 'Fri', control: 3.2, variant: 4.2 },
        { day: 'Sat', control: 3.1, variant: 4.3 },
        { day: 'Sun', control: 3.2, variant: 4.1 },
      ],
      controlVariant: makeVariant('Control (Hook A)', 2.1, 3.2, 24100, 4200, 3.1, [1.8, 2.4]),
      testVariant: makeVariant('Variant (Hook B)', 3.4, 4.1, 24100, 4200, 4.2, [3.0, 3.8]),
      aiInsight: 'Variant B is winning with 95% confidence. CTR lift of +62% with stable conversion rate. Recommend applying winner to full budget.',
    },
    {
      id: '2', name: 'Audience Expansion', type: 'Audience', platform: 'Meta', status: 'Running',
      campaign: 'Retargeting', dateRange: 'May 15 \u2192 29', startDate: 'May 15', endDate: 'May 29', durationDays: 14,
      controlMetric: 'CPA $27', variantMetric: 'CPA $31', metricLabel: 'CPA',
      winner: 'Control', confidence: 78, sampleSize: 18500, minimumDetectableEffect: 2.0,
      chartData: [
        { day: 'Mon', control: 28, variant: 30 },
        { day: 'Tue', control: 27, variant: 31 },
        { day: 'Wed', control: 27, variant: 32 },
        { day: 'Thu', control: 26, variant: 31 },
        { day: 'Fri', control: 27, variant: 31 },
        { day: 'Sat', control: 27, variant: 30 },
        { day: 'Sun', control: 27, variant: 31 },
      ],
      ctrData: [
        { metric: 'CTR (%)', control: 1.8, variant: 1.6 },
        { metric: 'CVR (%)', control: 4.5, variant: 3.8 },
      ],
      cvrData: [
        { day: 'Mon', control: 4.2, variant: 3.6 },
        { day: 'Tue', control: 4.5, variant: 3.8 },
        { day: 'Wed', control: 4.3, variant: 3.5 },
        { day: 'Thu', control: 4.6, variant: 3.9 },
        { day: 'Fri', control: 4.5, variant: 3.8 },
        { day: 'Sat', control: 4.4, variant: 3.7 },
        { day: 'Sun', control: 4.5, variant: 3.8 },
      ],
      controlVariant: makeVariant('Control (Current)', 1.8, 4.5, 9200, 5200, 4.5, [25, 29]),
      testVariant: makeVariant('Variant (Expanded)', 1.6, 3.8, 9300, 5400, 3.8, [28, 34]),
      aiInsight: 'Control audience delivers lower CPA by $4. Expanded audience shows larger reach but lower efficiency. Keep current targeting.',
    },
    {
      id: '3', name: 'Story Ad Placement', type: 'Placement', platform: 'Snap', status: 'Paused',
      campaign: 'Story Ads', dateRange: 'May 10 \u2192 20', startDate: 'May 10', endDate: 'May 20', durationDays: 10,
      controlMetric: 'Swipe-up 1.2%', variantMetric: 'Swipe-up 1.8%', metricLabel: 'Swipe-up',
      winner: 'Variant', confidence: 92, sampleSize: 31500, minimumDetectableEffect: 0.3,
      chartData: [
        { day: 'Mon', control: 1.1, variant: 1.5 },
        { day: 'Tue', control: 1.2, variant: 1.7 },
        { day: 'Wed', control: 1.2, variant: 1.8 },
        { day: 'Thu', control: 1.3, variant: 1.8 },
        { day: 'Fri', control: 1.2, variant: 1.9 },
        { day: 'Sat', control: 1.2, variant: 1.8 },
        { day: 'Sun', control: 1.2, variant: 1.8 },
      ],
      ctrData: [
        { metric: 'Swipe-up (%)', control: 1.2, variant: 1.8 },
        { metric: 'CVR (%)', control: 2.1, variant: 2.4 },
      ],
      cvrData: [
        { day: 'Mon', control: 1.9, variant: 2.1 },
        { day: 'Tue', control: 2.0, variant: 2.3 },
        { day: 'Wed', control: 2.1, variant: 2.4 },
        { day: 'Thu', control: 2.1, variant: 2.5 },
        { day: 'Fri', control: 2.1, variant: 2.4 },
        { day: 'Sat', control: 2.0, variant: 2.4 },
        { day: 'Sun', control: 2.1, variant: 2.4 },
      ],
      controlVariant: makeVariant('Control (Feed)', 1.2, 2.1, 15800, 2100, 2.8, [1.0, 1.4]),
      testVariant: makeVariant('Variant (Story)', 1.8, 2.4, 15700, 2300, 3.5, [1.5, 2.1]),
      aiInsight: 'Story placement outperforming feed by +50% on swipe-ups. Resume test to reach 95% confidence before applying.',
    },
    {
      id: '4', name: 'Carousel vs Video', type: 'Creative', platform: 'Meta', status: 'Ended',
      campaign: 'Brand Awareness', dateRange: 'May 1 \u2192 14', startDate: 'May 1', endDate: 'May 14', durationDays: 14,
      controlMetric: 'ROAS 2.1x', variantMetric: 'ROAS 3.8x', metricLabel: 'ROAS',
      winner: 'Variant', confidence: 99, sampleSize: 86000, minimumDetectableEffect: 0.2,
      chartData: [
        { day: 'Mon', control: 2.0, variant: 3.2 },
        { day: 'Tue', control: 2.1, variant: 3.4 },
        { day: 'Wed', control: 2.1, variant: 3.5 },
        { day: 'Thu', control: 2.2, variant: 3.6 },
        { day: 'Fri', control: 2.1, variant: 3.7 },
        { day: 'Sat', control: 2.1, variant: 3.8 },
        { day: 'Sun', control: 2.1, variant: 3.8 },
      ],
      ctrData: [
        { metric: 'CTR (%)', control: 1.2, variant: 2.5 },
        { metric: 'ROAS', control: 2.1, variant: 3.8 },
      ],
      cvrData: [
        { day: 'Mon', control: 1.8, variant: 2.8 },
        { day: 'Tue', control: 1.9, variant: 3.0 },
        { day: 'Wed', control: 1.9, variant: 3.2 },
        { day: 'Thu', control: 2.0, variant: 3.4 },
        { day: 'Fri', control: 2.1, variant: 3.6 },
        { day: 'Sat', control: 2.1, variant: 3.7 },
        { day: 'Sun', control: 2.1, variant: 3.8 },
      ],
      controlVariant: makeVariant('Control (Carousel)', 1.2, 1.8, 43000, 8500, 2.1, [1.9, 2.3]),
      testVariant: makeVariant('Variant (Video)', 2.5, 2.8, 43000, 8500, 3.8, [3.4, 4.2]),
      aiInsight: 'Video variant won decisively with 99% confidence. ROAS improvement of +81%. Apply winner to scale immediately.',
    },
    {
      id: '5', name: 'Lookalike vs Interest', type: 'Audience', platform: 'Google', status: 'Running',
      campaign: 'PMax', dateRange: 'May 12 \u2192 26', startDate: 'May 12', endDate: 'May 26', durationDays: 14,
      controlMetric: 'Conv 380', variantMetric: 'Conv 410', metricLabel: 'Conversions',
      winner: 'Variant', confidence: 61, sampleSize: 12400, minimumDetectableEffect: 15,
      chartData: [
        { day: 'Mon', control: 370, variant: 390 },
        { day: 'Tue', control: 375, variant: 395 },
        { day: 'Wed', control: 380, variant: 400 },
        { day: 'Thu', control: 380, variant: 405 },
        { day: 'Fri', control: 380, variant: 410 },
        { day: 'Sat', control: 380, variant: 408 },
        { day: 'Sun', control: 380, variant: 410 },
      ],
      ctrData: [
        { metric: 'Conversions', control: 380, variant: 410 },
        { metric: 'CTR (%)', control: 2.8, variant: 2.6 },
      ],
      cvrData: [
        { day: 'Mon', control: 350, variant: 370 },
        { day: 'Tue', control: 360, variant: 380 },
        { day: 'Wed', control: 370, variant: 390 },
        { day: 'Thu', control: 375, variant: 400 },
        { day: 'Fri', control: 380, variant: 410 },
        { day: 'Sat', control: 380, variant: 408 },
        { day: 'Sun', control: 380, variant: 410 },
      ],
      controlVariant: makeVariant('Control (Interest)', 2.8, 3.2, 6200, 8400, 3.2, [360, 400]),
      testVariant: makeVariant('Variant (Lookalike)', 2.6, 3.8, 6200, 8600, 3.6, [390, 430]),
      aiInsight: 'Early trend favors lookalike (+8% conversions) but need more data for significance. Continue test for 5 more days.',
    },
    {
      id: '6', name: 'Headline Variants A/B/C', type: 'Creative', platform: 'Google', status: 'Running',
      campaign: 'Search Brand', dateRange: 'May 5 \u2192 Jun 5', startDate: 'May 5', endDate: 'Jun 5', durationDays: 31,
      controlMetric: 'CTR 4.2%', variantMetric: 'CTR 4.8%', metricLabel: 'CTR',
      winner: 'Variant', confidence: 88, sampleSize: 52000, minimumDetectableEffect: 0.3,
      chartData: [
        { day: 'Mon', control: 4.0, variant: 4.5 },
        { day: 'Tue', control: 4.1, variant: 4.6 },
        { day: 'Wed', control: 4.2, variant: 4.7 },
        { day: 'Thu', control: 4.2, variant: 4.8 },
        { day: 'Fri', control: 4.2, variant: 4.8 },
        { day: 'Sat', control: 4.1, variant: 4.8 },
        { day: 'Sun', control: 4.2, variant: 4.8 },
      ],
      ctrData: [
        { metric: 'CTR (%)', control: 4.2, variant: 4.8 },
        { metric: 'CVR (%)', control: 5.1, variant: 5.3 },
      ],
      cvrData: [
        { day: 'Mon', control: 4.8, variant: 5.0 },
        { day: 'Tue', control: 4.9, variant: 5.1 },
        { day: 'Wed', control: 5.0, variant: 5.2 },
        { day: 'Thu', control: 5.1, variant: 5.3 },
        { day: 'Fri', control: 5.1, variant: 5.3 },
        { day: 'Sat', control: 5.0, variant: 5.2 },
        { day: 'Sun', control: 5.1, variant: 5.3 },
      ],
      controlVariant: makeVariant('Control (Headline A)', 4.2, 5.1, 26000, 6200, 4.1, [3.9, 4.5]),
      testVariant: makeVariant('Variant (Headline B)', 4.8, 5.3, 26000, 6200, 4.5, [4.5, 5.1]),
      aiInsight: 'Headline variant B showing strong +14% CTR lift. Monitor for 3 more days to reach 95% confidence threshold.',
    },
    {
      id: '7', name: 'In-Feed vs TopView', type: 'Placement', platform: 'TikTok', status: 'Scheduled',
      campaign: 'Jun 1 \u2192 14', dateRange: 'Jun 1 \u2192 14', startDate: 'Jun 1', endDate: 'Jun 14', durationDays: 14,
      controlMetric: '\u2014', variantMetric: '\u2014', metricLabel: 'Not started',
      winner: 'TBD', confidence: 0, sampleSize: 0, minimumDetectableEffect: 0.5,
      chartData: [],
      ctrData: [],
      cvrData: [],
      controlVariant: makeVariant('Control (In-Feed)', 0, 0, 0, 0, 0, [0, 0]),
      testVariant: makeVariant('Variant (TopView)', 0, 0, 0, 0, 0, [0, 0]),
      aiInsight: 'Test scheduled to start Jun 1. Ensure creatives are approved 48h before launch.',
    },
    {
      id: '8', name: 'UGC vs Polished', type: 'Creative', platform: 'TikTok', status: 'Ended',
      campaign: 'Spark Ads', dateRange: 'Apr 20 \u2192 May 10', startDate: 'Apr 20', endDate: 'May 10', durationDays: 20,
      controlMetric: 'CTR 1.9%', variantMetric: 'CTR 2.7%', metricLabel: 'CTR',
      winner: 'Variant', confidence: 97, sampleSize: 68000, minimumDetectableEffect: 0.4,
      chartData: [
        { day: 'Mon', control: 1.8, variant: 2.3 },
        { day: 'Tue', control: 1.9, variant: 2.5 },
        { day: 'Wed', control: 1.9, variant: 2.6 },
        { day: 'Thu', control: 1.9, variant: 2.7 },
        { day: 'Fri', control: 2.0, variant: 2.7 },
        { day: 'Sat', control: 1.9, variant: 2.7 },
        { day: 'Sun', control: 1.9, variant: 2.7 },
      ],
      ctrData: [
        { metric: 'CTR (%)', control: 1.9, variant: 2.7 },
        { metric: 'CVR (%)', control: 2.8, variant: 3.1 },
      ],
      cvrData: [
        { day: 'Mon', control: 2.4, variant: 2.8 },
        { day: 'Tue', control: 2.6, variant: 2.9 },
        { day: 'Wed', control: 2.7, variant: 3.0 },
        { day: 'Thu', control: 2.8, variant: 3.1 },
        { day: 'Fri', control: 2.8, variant: 3.1 },
        { day: 'Sat', control: 2.8, variant: 3.1 },
        { day: 'Sun', control: 2.8, variant: 3.1 },
      ],
      controlVariant: makeVariant('Control (Polished)', 1.9, 2.8, 34000, 5100, 2.9, [1.7, 2.1]),
      testVariant: makeVariant('Variant (UGC)', 2.7, 3.1, 34000, 5100, 3.8, [2.4, 3.0]),
      aiInsight: 'UGC-style creative significantly outperformed with 97% confidence. CTR +42%, ROAS +31%. Apply and scale immediately.',
    },
  ]
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function ABTesting() {
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'All'>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTab, setCreateTab] = useState<'Quick Setup' | 'Advanced'>('Quick Setup')
  const [appliedWinners, setAppliedWinners] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [splitValue, setSplitValue] = useState(50)
  const [tests, setTests] = useState<ABTest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  /* ---- Core: fetch ads, group into tests, fetch performance ---- */
  const fetchTests = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setIsRetrying(false)

    // Demo mode: return mock data
    const isDemo = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 600))
      setTests(getMockTests())
      setIsLoading(false)
      return
    }

    try {
      // 1. Fetch all ads
      const ads = await apiGet<Ad[]>('/ads')

      if (!Array.isArray(ads) || ads.length === 0) {
        setTests([])
        setIsLoading(false)
        return
      }

      // 2. Group ads into test pairs by campaign + name similarity
      const groups = groupAdsIntoTests(ads)

      // 3. Fetch performance data for each ad
      const perfCache = new Map<string, AdPerformance>()
      const perfPromises: Promise<void>[] = []

      for (const group of groups) {
        for (const ad of [group.control, group.variant]) {
          if (!ad || perfCache.has(ad.id)) continue
          const promise = apiGet<AdPerformance>(`/ads/${ad.id}/performance`)
            .then((perf) => { perfCache.set(ad.id, perf) })
            .catch(() => {
              // Gracefully handle missing performance data
              perfCache.set(ad.id, { adId: ad.id, daily: [] })
            })
          perfPromises.push(promise)
        }
      }

      await Promise.all(perfPromises)

      // 4. Build ABTest objects
      const builtTests: ABTest[] = []
      for (const group of groups) {
        const test = await buildABTest(group, perfCache)
        if (test) builtTests.push(test)
      }

      setTests(builtTests)
    } catch (err: any) {
      console.error('A/B Tests fetch error:', err)
      const msg = err?.response?.data?.message || err?.message || 'Could not load A/B test data from the server.'
      setError(msg)
      // Fallback to mock data on error so UI isn't broken
      setTests(getMockTests())
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }, [])

  /* ---- Retry handler ---- */
  const handleRetry = () => {
    setIsRetrying(true)
    setTests([])
    fetchTests()
  }

  useEffect(() => {
    fetchTests()
  }, [fetchTests])

  /* ---- filtering ---- */
  const filtered = useMemo(() => {
    return tests.filter((t) => {
      const matchPlatform = platformFilter === 'All' || t.platform === platformFilter
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.campaign.toLowerCase().includes(q) ||
        t.platform.toLowerCase().includes(q)
      return matchPlatform && matchSearch
    })
  }, [search, platformFilter, tests])

  /* ---- stats ---- */
  const activeCount = tests.filter((t) => t.status === 'Running').length
  const completedCount = tests.filter((t) => t.status === 'Ended').length
  const winRate = useMemo(() => {
    const decided = tests.filter((t) => t.winner !== 'TBD' && t.confidence >= 95)
    if (decided.length === 0) return 0
    const won = decided.filter((t) => t.winner === 'Variant').length
    return Math.round((won / decided.length) * 100)
  }, [tests])
  const revenueLift = useMemo(() => {
    return tests
      .filter((t) => t.winner === 'Variant' && t.confidence >= 95)
      .reduce((sum, t) => {
        const lift = t.controlVariant.spend * ((t.testVariant.roas - t.controlVariant.roas))
        return sum + (lift > 0 ? Math.round(lift) : 0)
      }, 0)
  }, [tests])

  const handleApplyWinner = (id: string) => {
    setAppliedWinners((prev) => new Set(prev).add(id))
  }

  return (
    <>
    <SEO
      title="A/B Testing"
      description="Run powerful A/B tests on your ad creatives, audiences, and landing pages. Analyze results and automatically apply winning variations."
      keywords="A/B testing, split testing, ad testing, experiment, conversion optimization"
    />
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* ============ HEADER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeSmooth }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-space font-semibold text-4xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
              A/B Tests
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Auto-detected split tests grouped by campaign and creative similarity
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 border"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
            >
              <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests..."
                className="bg-transparent text-sm outline-none w-40"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex items-center gap-1">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer"
                  style={{
                    background: platformFilter === p ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: platformFilter === p ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${platformFilter === p ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white cursor-pointer"
              style={{ background: 'var(--accent)' }}
            >
              <Plus size={16} />
              Create Test
            </motion.button>
          </div>
        </motion.div>

        {/* ============ ERROR STATE ============ */}
        {error && !isLoading && (
          <div className="mb-6">
            <ErrorState message={error} onRetry={handleRetry} />
          </div>
        )}

        {/* ============ STATS ROW ============ */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: easeSmooth }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Active Tests', value: activeCount, suffix: '', icon: Beaker, color: '#10B981', trend: `${activeCount} running now` },
              { label: 'Completed', value: completedCount, suffix: '', icon: CheckCircle2, color: '#8A8F98', trend: 'All time' },
              { label: 'Win Rate', value: winRate, suffix: '%', icon: Trophy, color: '#F59E0B', trend: 'Variant win rate' },
              { label: 'Revenue Lift', value: revenueLift, suffix: '', icon: DollarSign, color: '#10B981', trend: 'From sig. winners', prefix: '+$' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: easeSmooth }}
                className="card-surface p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                    <stat.icon size={16} style={{ color: stat.color }} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    {stat.label}
                  </span>
                </div>
                <div className="font-mono-data text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stat.prefix && <span className="text-lg" style={{ color: stat.color }}>{stat.prefix}</span>}
                  <CountUp end={stat.value} duration={0.8} separator="," />
                  {stat.suffix && <span className="text-lg ml-0.5">{stat.suffix}</span>}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {stat.trend}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ============ RETRYING INDICATOR ============ */}
        {isRetrying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-4 text-xs font-medium"
            style={{ color: 'var(--accent)' }}
          >
            <Loader2 size={14} className="animate-spin" />
            Retrying...
          </motion.div>
        )}

        {/* ============ TABLE ============ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: easeSmooth }}
          className="card-surface overflow-hidden"
        >
          {/* Table header */}
          <div
            className="grid gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider items-center"
            style={{
              gridTemplateColumns: '2fr 0.8fr 0.9fr 1.1fr 1fr 1.4fr 1fr 0.8fr',
              background: 'var(--bg-secondary)',
              color: 'var(--text-tertiary)',
            }}
          >
            <span>Test Name</span>
            <span>Platform</span>
            <span>Status</span>
            <span>Campaign</span>
            <span>Date Range</span>
            <span>Control vs Variant</span>
            <span>Winner</span>
            <span className="text-right">Actions</span>
          </div>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          ) : (
            filtered.map((test, idx) => {
              const isExpanded = expandedId === test.id
              return (
                <div key={test.id}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.06 }}
                    className="grid gap-4 px-4 py-3 items-center transition-colors duration-100 border-b cursor-pointer"
                    style={{
                      gridTemplateColumns: '2fr 0.8fr 0.9fr 1.1fr 1fr 1.4fr 1fr 0.8fr',
                      borderColor: 'var(--border-subtle)',
                      background: isExpanded ? 'var(--bg-hover)' : 'transparent',
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : test.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{test.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: TYPE_COLORS[test.type], color: TYPE_TEXT_COLORS[test.type] }}>
                            {test.type}
                          </span>
                          <SignificanceBadge confidence={test.confidence} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[test.platform] }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{test.platform}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[test.status], ...(test.status === 'Running' ? { animation: 'pulse-dot 2s infinite' } : {}) }} />
                      <span className="text-xs" style={{ color: STATUS_COLORS[test.status] }}>{test.status}</span>
                    </div>

                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{test.campaign}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{test.dateRange}</span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono-data" style={{ color: 'var(--text-secondary)' }}>{test.controlMetric}</span>
                      <span style={{ color: 'var(--text-muted)' }}>vs</span>
                      <span className="text-xs font-mono-data font-semibold" style={{ color: test.winner === 'Variant' ? '#10B981' : 'var(--text-primary)' }}>
                        {test.variantMetric}
                      </span>
                    </div>

                    <div>
                      {test.winner === 'TBD' ? (
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>TBD</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold" style={{ color: test.winner === 'Variant' ? '#10B981' : '#3B82F6' }}>{test.winner}</span>
                          {test.confidence > 0 && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{test.confidence}%</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : test.id) }} className="p-1.5 rounded-md transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="View"><Eye size={14} /></button>
                      <button className="p-1.5 rounded-md transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Pause/Resume">
                        {test.status === 'Paused' ? <Play size={14} /> : <Pause size={14} />}
                      </button>
                      <button className="p-1.5 rounded-md transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Duplicate"><Copy size={14} /></button>
                    </div>
                  </motion.div>

                  {/* ---- Expanded detail ---- */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: easeSmooth }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 py-5 border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                          {/* Chart + Metrics */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Charts area */}
                            <div className="lg:col-span-2 space-y-4">
                              {/* Primary metric chart */}
                              <div>
                                <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                                  {test.metricLabel} Over Time
                                </h4>
                                {test.chartData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height={180}>
                                    <LineChart data={test.chartData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} />
                                      <YAxis tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} width={40} />
                                      <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }} />
                                      <Line type="monotone" dataKey="control" stroke="#8A8F98" strokeWidth={2} dot={false} name="Control" />
                                      <Line type="monotone" dataKey="variant" stroke="#10B981" strokeWidth={2} dot={false} name="Variant" />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-[180px] flex items-center justify-center rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Test has not started yet</span>
                                  </div>
                                )}
                              </div>

                              {/* Variant comparison bar chart */}
                              {test.ctrData.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                                    Variant Comparison
                                  </h4>
                                  <ResponsiveContainer width="100%" height={120}>
                                    <BarChart data={test.ctrData} layout="vertical" barSize={12}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                      <XAxis type="number" tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} />
                                      <YAxis dataKey="metric" type="category" tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} width={70} />
                                      <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }} />
                                      <Bar dataKey="control" name="Control" fill="#8A8F98" radius={[0, 4, 4, 0]} />
                                      <Bar dataKey="variant" name="Variant" fill="#10B981" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                  <div className="flex items-center justify-center gap-4 mt-1">
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#8A8F98' }} /><span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Control</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} /><span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Variant</span></div>
                                  </div>
                                </div>
                              )}

                              {/* Conversion Rate Over Time */}
                              {test.cvrData.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                                    Conversion Rate Over Time
                                  </h4>
                                  <ResponsiveContainer width="100%" height={140}>
                                    <AreaChart data={test.cvrData}>
                                      <defs>
                                        <linearGradient id="cvrControlFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8A8F98" stopOpacity={0.1} /><stop offset="95%" stopColor="#8A8F98" stopOpacity={0} /></linearGradient>
                                        <linearGradient id="cvrVariantFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.1} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} />
                                      <YAxis tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} width={40} />
                                      <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }} />
                                      <Area type="monotone" dataKey="control" stroke="#8A8F98" strokeWidth={1.5} fill="url(#cvrControlFill)" dot={false} name="Control CVR" />
                                      <Area type="monotone" dataKey="variant" stroke="#10B981" strokeWidth={1.5} fill="url(#cvrVariantFill)" dot={false} name="Variant CVR" />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>

                            {/* Side panel */}
                            <div className="space-y-4">
                              {/* Significance */}
                              <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                                    Statistical Significance
                                  </span>
                                  <SignificanceBadge confidence={test.confidence} />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min(100, test.confidence)}%` }}
                                      transition={{ duration: 0.8, ease: easeSmooth }}
                                      className="h-full rounded-full"
                                      style={{ background: test.confidence >= 95 ? '#10B981' : test.confidence >= 70 ? '#F59E0B' : '#8A8F98' }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono-data font-semibold" style={{ color: 'var(--text-primary)' }}>{test.confidence}%</span>
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                  {test.confidence >= 95 ? 'Highly significant — results are reliable' : test.confidence >= 80 ? 'Trending significant — collect more data' : test.confidence > 0 ? 'Needs more data for reliable conclusions' : 'Not started'}
                                </div>
                              </div>

                              {/* Sample Size */}
                              {test.sampleSize > 0 && (
                                <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Sample Size</div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-mono-data font-bold" style={{ color: 'var(--text-primary)' }}>{test.sampleSize.toLocaleString()}</span>
                                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>impressions</span>
                                  </div>
                                  <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                    MDE: {test.minimumDetectableEffect}%
                                  </div>
                                </div>
                              )}

                              {/* Variant Comparison Table */}
                              {test.controlVariant.impressions > 0 && (
                                <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                                    Variant Details
                                  </div>
                                  <div className="space-y-3">
                                    {[
                                      { label: 'Impressions', control: test.controlVariant.impressions.toLocaleString(), variant: test.testVariant.impressions.toLocaleString() },
                                      { label: 'Clicks', control: test.controlVariant.clicks.toLocaleString(), variant: test.testVariant.clicks.toLocaleString() },
                                      { label: 'Conversions', control: test.controlVariant.conversions.toLocaleString(), variant: test.testVariant.conversions.toLocaleString() },
                                      { label: 'Spend', control: `$${test.controlVariant.spend.toLocaleString()}`, variant: `$${test.testVariant.spend.toLocaleString()}` },
                                      { label: 'CPA', control: `$${test.controlVariant.cpa}`, variant: `$${test.testVariant.cpa}` },
                                      { label: 'ROAS', control: `${test.controlVariant.roas}x`, variant: `${test.testVariant.roas}x` },
                                    ].map((row) => (
                                      <div key={row.label} className="flex items-center justify-between">
                                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono-data" style={{ color: '#8A8F98' }}>{row.control}</span>
                                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>/</span>
                                          <span className="text-[10px] font-mono-data font-semibold" style={{ color: '#10B981' }}>{row.variant}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Confidence Intervals */}
                              {test.controlVariant.confidenceInterval[1] > 0 && (
                                <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                                    95% Confidence Interval
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px]" style={{ color: '#8A8F98' }}>Control</span>
                                        <span className="text-[10px] font-mono-data" style={{ color: '#8A8F98' }}>{test.controlVariant.ctr}%</span>
                                      </div>
                                      <ConfidenceIntervalBar value={test.controlVariant.ctr} interval={test.controlVariant.confidenceInterval} color="#8A8F98" />
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px]" style={{ color: '#10B981' }}>Variant</span>
                                        <span className="text-[10px] font-mono-data" style={{ color: '#10B981' }}>{test.testVariant.ctr}%</span>
                                      </div>
                                      <ConfidenceIntervalBar value={test.testVariant.ctr} interval={test.testVariant.confidenceInterval} color="#10B981" />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* AI Insight */}
                              {test.aiInsight && (
                                <div className="rounded-lg p-4" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid var(--border-active)' }}>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                                    <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>AI Insight</span>
                                  </div>
                                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{test.aiInsight}</p>
                                </div>
                              )}

                              {/* Apply Winner */}
                              {test.status === 'Ended' && test.confidence >= 95 && test.winner !== 'TBD' && (
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleApplyWinner(test.id)}
                                  disabled={appliedWinners.has(test.id)}
                                  className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium cursor-pointer disabled:cursor-not-allowed transition-all"
                                  style={{
                                    background: appliedWinners.has(test.id) ? '#10B981' : 'var(--accent)',
                                    color: appliedWinners.has(test.id) ? '#050505' : '#fff',
                                    opacity: appliedWinners.has(test.id) ? 0.8 : 1,
                                  }}
                                >
                                  {appliedWinners.has(test.id) ? <><CheckCircle2 size={14} />Winner Applied</> : <><Zap size={14} />Apply Winner</>}
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
              {search || platformFilter !== 'All' ? 'No tests match your filters.' : 'No A/B tests detected yet. Create ads with similar names under the same campaign to auto-detect tests.'}
            </div>
          )}
        </motion.div>
      </div>

      {/* ============ CREATE TEST MODAL ============ */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <h3 className="font-space font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Create A/B Test</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
              </div>

              <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                {(['Quick Setup', 'Advanced'] as const).map((tab) => (
                  <button key={tab} onClick={() => setCreateTab(tab)} className="relative flex-1 py-3 text-sm font-medium text-center transition-colors cursor-pointer" style={{ color: createTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {tab}
                    {createTab === tab && <motion.div layoutId="create-test-tab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent)' }} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }} />}
                  </button>
                ))}
              </div>

              <div className="px-5 py-5 max-h-[60vh] overflow-y-auto">
                {createTab === 'Quick Setup' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Test Name</label>
                      <input placeholder="e.g. Video Hook Test" className="w-full rounded-lg px-3 py-2 text-sm outline-none border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Platform</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => (
                          <button key={p} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />{p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Test Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Creative', 'Audience', 'Placement'] as TestType[]).map((t) => (
                          <button key={t} className="flex flex-col items-center gap-1.5 rounded-lg py-3 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            {t === 'Creative' && <BarChart3 size={16} />}{t === 'Audience' && <TrendingUp size={16} />}{t === 'Placement' && <Eye size={16} />}{t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Campaign</label>
                      <select className="w-full rounded-lg px-3 py-2 text-sm outline-none border appearance-none cursor-pointer" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                        <option>Summer Sale 2026</option><option>Search - Brand Terms</option><option>Brand Awareness</option><option>PMax - Ecommerce</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Duration</label>
                      <div className="flex gap-2">
                        {[7, 14, 21, 30].map((d) => (
                          <button key={d} className="flex-1 rounded-lg py-2 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: d === 14 ? 'var(--accent)' : 'var(--bg-secondary)', borderColor: d === 14 ? 'var(--accent)' : 'var(--border-subtle)', color: d === 14 ? '#fff' : 'var(--text-secondary)' }}>
                            {d} days
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Traffic Split &mdash; {splitValue} / {100 - splitValue}</label>
                      <input type="range" min={10} max={90} value={splitValue} onChange={(e) => setSplitValue(Number(e.target.value))} className="w-full accent-blue-600" />
                      <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}><span>10%</span><span>50%</span><span>90%</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Advanced Configuration</label>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Set custom parameters, multiple variants, audience holdouts, and statistical thresholds.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Minimum Sample Size</label>
                      <input placeholder="1000" className="w-full rounded-lg px-3 py-2 text-sm outline-none border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confidence Threshold</label>
                      <select className="w-full rounded-lg px-3 py-2 text-sm outline-none border appearance-none cursor-pointer" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                        <option>90%</option><option>95%</option><option>99%</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Primary Metric</label>
                      <select className="w-full rounded-lg px-3 py-2 text-sm outline-none border appearance-none cursor-pointer" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                        <option>CTR (Click-Through Rate)</option><option>CPA (Cost Per Acquisition)</option><option>ROAS (Return on Ad Spend)</option><option>Conversion Rate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Number of Variants</label>
                      <div className="flex gap-2">
                        {[2, 3, 4].map((n) => (
                          <button key={n} className="flex-1 rounded-lg py-2 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: n === 2 ? 'var(--accent)' : 'var(--bg-secondary)', borderColor: n === 2 ? 'var(--accent)' : 'var(--border-subtle)', color: n === 2 ? '#fff' : 'var(--text-secondary)' }}>{n} variants</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: 'var(--accent)' }}>Create Test</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  )
}
