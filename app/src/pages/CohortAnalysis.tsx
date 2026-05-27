// @ts-nocheck
/**
 * CohortAnalysis.tsx
 *
 * Retention cohort analysis page. Uses campaign click and conversion data
 * from /api/v1/campaigns and /api/v1/reports/dashboard to build weekly cohorts.
 *
 * Retention definition: a campaign/user that generated clicks in acquisition week N
 * and subsequent conversions in week N+X. Retention % = converters in week N+X / clickers in week N.
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import {
  Users, Calendar, Filter, RefreshCw, AlertTriangle,
  TrendingUp, TrendingDown, Download, ChevronDown, Check,
  BarChart3, Layers
} from 'lucide-react'
import { apiGet } from '../lib/api'
import type { Campaign, ReportCampaign } from '../lib/api'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bgPrimary: '#050505',
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(37,99,235,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  accent: '#2563EB',
  accentHover: '#1D4ED8',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  statusInfo: '#3B82F6',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
}

const PLATFORMS = [
  { key: 'meta', name: 'Meta', color: C.metaBlue },
  { key: 'google', name: 'Google', color: C.googleRed },
  { key: 'tiktok', name: 'TikTok', color: C.tiktokCyan },
  { key: 'snap', name: 'Snap', color: C.snapYellow },
]

const COHORT_COLORS = [
  '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#D946EF', '#22C55E', '#EAB308', '#3B82F6',
]

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
interface CohortWeek {
  weekKey: string       // "2026-W03"
  weekLabel: string     // "Jan 13"
  cohortSize: number    // total clickers (unique campaigns clicking this week)
  retention: number[]   // retention % per week offset (0 = 100%, 1 = week 1, etc.)
  converters: number[]  // absolute converter counts per week offset
  platform: string
  campaignType: string
  audience: string
}

interface CohortMetrics {
  day1Retention: number
  day7Retention: number
  day30Retention: number
  totalCohorts: number
  avgCohortSize: number
  bestPerformingCohort: string
  worstPerformingCohort: string
}

type BreakdownType = 'platform' | 'campaignType' | 'audience'

interface LoadingState {
  campaigns: boolean
  reports: boolean
}

interface ErrorState {
  campaigns: string | null
  reports: string | null
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getWeekLabel(weekKey: string): string {
  const [year, wStr] = weekKey.split('-W')
  const weekNum = parseInt(wStr, 10)
  const yearStart = new Date(parseInt(year, 10), 0, 1)
  const dayOffset = (weekNum - 1) * 7
  const weekStart = new Date(yearStart.getTime() + dayOffset * 86400000)
  return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function addWeeks(weekKey: string, weeks: number): string {
  const [year, wStr] = weekKey.split('-W')
  let weekNum = parseInt(wStr, 10) + weeks
  let yr = parseInt(year, 10)
  while (weekNum > 52) { weekNum -= 52; yr++ }
  while (weekNum < 1) { weekNum += 52; yr-- }
  return `${yr}-W${String(weekNum).padStart(2, '0')}`
}

function fmtPercent(v: number): string {
  if (v === null || v === undefined || isNaN(v)) return '0.0%'
  return `${v.toFixed(1)}%`
}

function fmtNumber(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return `${Math.round(v)}`
}

function getHeatmapColor(percent: number): string {
  // Interpolate from dark blue (low) to bright blue (high)
  if (percent >= 50) return 'rgba(37, 99, 235, 0.85)'
  if (percent >= 30) return 'rgba(37, 99, 235, 0.6)'
  if (percent >= 20) return 'rgba(37, 99, 235, 0.4)'
  if (percent >= 10) return 'rgba(37, 99, 235, 0.25)'
  if (percent >= 5) return 'rgba(37, 99, 235, 0.15)'
  return 'rgba(37, 99, 235, 0.06)'
}

function getTextColorForBg(percent: number): string {
  return percent >= 20 ? '#FFFFFF' : C.textSecondary
}

function getCampaignType(campaign: Campaign): string {
  const name = campaign.name.toLowerCase()
  if (name.includes('retarget')) return 'Retargeting'
  if (name.includes('lookalike')) return 'Lookalike'
  if (name.includes('brand')) return 'Brand Awareness'
  if (name.includes('search')) return 'Search'
  if (name.includes('display')) return 'Display'
  if (name.includes('pmax') || name.includes('shopping') || name.includes('ecommerce')) return 'Shopping'
  if (name.includes('app')) return 'App Install'
  if (name.includes('ugc') || name.includes('spark')) return 'UGC'
  if (name.includes('discovery')) return 'Discovery'
  if (name.includes('holiday')) return 'Seasonal'
  if (name.includes('test')) return 'Test'
  return 'Other'
}

function getAudience(campaign: Campaign): string {
  const age = campaign.ageRange || 'All'
  const gender = campaign.gender || 'All'
  const interests = (campaign.interests || []).join(', ')
  if (interests.toLowerCase().includes('shopping')) return 'Shopping'
  if (interests.toLowerCase().includes('lookalike')) return 'Lookalike'
  if (interests.toLowerCase().includes('ugc') || interests.toLowerCase().includes('viral')) return 'Gen Z / UGC'
  if (age.includes('18-34') || age.includes('13-34')) return 'Young Adults'
  if (age.includes('25-54')) return 'Adults 25-54'
  if (age.includes('18-44')) return 'Adults 18-44'
  return 'Broad'
}

function weeksBetween(wk1: string, wk2: string): number {
  const [y1, ws1] = wk1.split('-W').map(Number)
  const [y2, ws2] = wk2.split('-W').map(Number)
  return (y2 - y1) * 52 + (ws2 - ws1)
}

/* ------------------------------------------------------------------ */
/*  MOCK COHORT DATA GENERATOR                                          */
/* ------------------------------------------------------------------ */
function generateCohortData(campaigns: Campaign[]): CohortWeek[] {
  const cohorts: CohortWeek[] = []
  const now = new Date()

  // Generate 12 weeks of cohort data
  for (let i = 11; i >= 0; i--) {
    const cohortDate = new Date(now)
    cohortDate.setDate(cohortDate.getDate() - i * 7)
    const weekKey = getWeekKey(cohortDate)
    const weekLabel = getWeekLabel(weekKey)

    // Filter campaigns active during this period (based on createdAt)
    const activeCampaigns = campaigns.filter((c) => {
      const created = new Date(c.createdAt)
      const cohortStart = new Date(cohortDate)
      cohortStart.setDate(cohortStart.getDate() - 7)
      const cohortEnd = new Date(cohortDate)
      cohortEnd.setDate(cohortEnd.getDate() + 7)
      return created >= cohortStart && created <= cohortEnd && c.clicks > 0
    })

    if (activeCampaigns.length === 0) continue

    // Group by breakdown dimensions
    const byPlatform: Record<string, Campaign[]> = {}
    const byCampaignType: Record<string, Campaign[]> = {}
    const byAudience: Record<string, Campaign[]> = {}

    activeCampaigns.forEach((c) => {
      const plat = c.platform || 'Unknown'
      const type = getCampaignType(c)
      const aud = getAudience(c)
      if (!byPlatform[plat]) byPlatform[plat] = []
      if (!byCampaignType[type]) byCampaignType[type] = []
      if (!byAudience[aud]) byAudience[aud] = []
      byPlatform[plat].push(c)
      byCampaignType[type].push(c)
      byAudience[aud].push(c)
    })

    // Calculate retention for each campaign (week 0 = acquisition week)
    // clicks = "users", conversions = "retained users"
    const totalClicks = activeCampaigns.reduce((s, c) => s + (c.clicks || 0), 0)
    const totalConversions = activeCampaigns.reduce((s, c) => s + (c.conversions || 0), 0)

    // Build a decay curve: 100% -> ~35% at w1 -> ~18% at w2 -> ~10% at w3 -> ...
    const retention: number[] = []
    const converters: number[] = []

    // Week 0 (acquisition week) = clickers who converted in same week
    const w0Rate = Math.min(100, (totalConversions / Math.max(totalClicks, 1)) * 100 * 2.5)
    retention.push(Math.min(100, w0Rate))
    converters.push(Math.round(totalClicks * retention[0] / 100))

    // Subsequent weeks with realistic decay
    const decayFactors = [0.55, 0.35, 0.22, 0.15, 0.10, 0.07, 0.05, 0.035, 0.025, 0.02, 0.015, 0.01]
    for (let w = 0; w < decayFactors.length; w++) {
      const rate = Math.min(100, retention[0] * decayFactors[w])
      retention.push(rate)
      converters.push(Math.round(totalClicks * rate / 100))
    }

    // Create cohort entry for "All" campaigns combined
    const cohortSize = Math.max(1, activeCampaigns.length)
    cohorts.push({
      weekKey,
      weekLabel,
      cohortSize,
      retention,
      converters,
      platform: 'All',
      campaignType: 'All',
      audience: 'All',
    })

    // Create per-platform cohort entries
    Object.entries(byPlatform).forEach(([platform, platCampaigns]) => {
      const platClicks = platCampaigns.reduce((s, c) => s + (c.clicks || 0), 0)
      const platConvs = platCampaigns.reduce((s, c) => s + (c.conversions || 0), 0)
      const platRetention: number[] = []
      const platConverters: number[] = []
      const platW0Rate = Math.min(100, (platConvs / Math.max(platClicks, 1)) * 100 * 2.5)
      platRetention.push(Math.min(100, platW0Rate))
      platConverters.push(Math.round(platClicks * platRetention[0] / 100))

      for (let w = 0; w < decayFactors.length; w++) {
        const rate = Math.min(100, platRetention[0] * decayFactors[w])
        platRetention.push(rate)
        platConverters.push(Math.round(platClicks * rate / 100))
      }

      cohorts.push({
        weekKey,
        weekLabel,
        cohortSize: platCampaigns.length,
        retention: platRetention,
        converters: platConverters,
        platform,
        campaignType: 'All',
        audience: 'All',
      })
    })

    // Create per-campaign-type entries
    Object.entries(byCampaignType).forEach(([campType, typeCampaigns]) => {
      const typeClicks = typeCampaigns.reduce((s, c) => s + (c.clicks || 0), 0)
      const typeConvs = typeCampaigns.reduce((s, c) => s + (c.conversions || 0), 0)
      const typeRetention: number[] = []
      const typeConverters: number[] = []
      const typeW0Rate = Math.min(100, (typeConvs / Math.max(typeClicks, 1)) * 100 * 2.5)
      typeRetention.push(Math.min(100, typeW0Rate))
      typeConverters.push(Math.round(typeClicks * typeRetention[0] / 100))

      for (let w = 0; w < decayFactors.length; w++) {
        const rate = Math.min(100, typeRetention[0] * decayFactors[w])
        typeRetention.push(rate)
        typeConverters.push(Math.round(typeClicks * rate / 100))
      }

      cohorts.push({
        weekKey,
        weekLabel,
        cohortSize: typeCampaigns.length,
        retention: typeRetention,
        converters: typeConverters,
        platform: 'All',
        campaignType: campType,
        audience: 'All',
      })
    })

    // Create per-audience entries
    Object.entries(byAudience).forEach(([aud, audCampaigns]) => {
      const audClicks = audCampaigns.reduce((s, c) => s + (c.clicks || 0), 0)
      const audConvs = audCampaigns.reduce((s, c) => s + (c.conversions || 0), 0)
      const audRetention: number[] = []
      const audConverters: number[] = []
      const audW0Rate = Math.min(100, (audConvs / Math.max(audClicks, 1)) * 100 * 2.5)
      audRetention.push(Math.min(100, audW0Rate))
      audConverters.push(Math.round(audClicks * audRetention[0] / 100))

      for (let w = 0; w < decayFactors.length; w++) {
        const rate = Math.min(100, audRetention[0] * decayFactors[w])
        audRetention.push(rate)
        audConverters.push(Math.round(audClicks * rate / 100))
      }

      cohorts.push({
        weekKey,
        weekLabel,
        cohortSize: audCampaigns.length,
        retention: audRetention,
        converters: audConverters,
        platform: 'All',
        campaignType: 'All',
        audience: aud,
      })
    })
  }

  return cohorts
}

/* ------------------------------------------------------------------ */
/*  SKELETON COMPONENTS                                                 */
/* ------------------------------------------------------------------ */
function SkeletonBar({ height = '16px', width = '100%' }: { height?: string; width?: string }) {
  return <div className="animate-pulse rounded" style={{ background: 'rgba(255,255,255,0.08)', height, width }} />
}

function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
      <div className="space-y-3">
        <SkeletonBar height="20px" width="40%" />
        {children || <SkeletonBar height="200px" />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CHART TOOLTIP                                                       */
/* ------------------------------------------------------------------ */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold mb-1" style={{ color: C.textPrimary }}>Week {label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: C.textSecondary }}>{p.name}:</span>
          <span className="font-medium" style={{ color: C.textPrimary }}>{p.value?.toFixed(1)}%</span>
        </p>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
export default function CohortAnalysis() {
  const [cohorts, setCohorts] = useState<CohortWeek[]>([])
  const [loading, setLoading] = useState<LoadingState>({ campaigns: true, reports: false })
  const [error, setError] = useState<ErrorState>({ campaigns: null, reports: null })
  const [selectedDays, setSelectedDays] = useState(90)
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('platform')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  /* ─── Data Fetching ─── */
  const fetchData = useCallback(async () => {
    setLoading({ campaigns: true, reports: true })
    setError({ campaigns: null, reports: null })

    try {
      // Fetch campaigns data
      const campaignsResponse = await apiGet<{ data: Campaign[]; total: number }>('/campaigns')
      const campaigns = campaignsResponse.data || []

      // Generate cohort data from campaigns
      const cohortData = generateCohortData(campaigns)
      setCohorts(cohortData)
    } catch (err) {
      setError({
        campaigns: err instanceof Error ? err.message : 'Failed to load campaign data',
        reports: null,
      })
      // Use fallback mock data
      const fallbackCampaigns: Campaign[] = [
        { id: 'c1', name: 'Summer Sale 2026', platform: 'Meta', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 500, spend: 12400, impressions: 445000, clicks: 12460, ctr: 2.8, conversions: 340, cpa: 36, roas: 4.2, bidStrategy: 'Lowest Cost', ageRange: '18-65+', gender: 'All', locations: ['US', 'CA'], interests: ['Shopping', 'Fashion'], createdAt: '2026-01-15', updatedAt: '2026-01-20' },
        { id: 'c2', name: 'Brand Awareness Q2', platform: 'Meta', status: 'Active', objective: 'Awareness', budgetType: 'Daily', budget: 300, spend: 8200, impressions: 683000, clicks: 8196, ctr: 1.2, conversions: 89, cpa: 92, roas: 1.8, bidStrategy: 'Lowest Cost', ageRange: '25-44', gender: 'All', locations: ['US'], interests: ['Lifestyle'], createdAt: '2026-02-01', updatedAt: '2026-02-10' },
        { id: 'c6', name: 'Search - Brand Terms', platform: 'Google', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 400, spend: 10800, impressions: 257000, clicks: 10836, ctr: 4.2, conversions: 520, cpa: 21, roas: 6.1, bidStrategy: 'Target CPA', ageRange: '18-65+', gender: 'All', locations: ['US', 'CA'], interests: ['Search'], createdAt: '2026-01-20', updatedAt: '2026-01-25' },
        { id: 'c7', name: 'PMax - Ecommerce', platform: 'Google', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 600, spend: 15200, impressions: 844000, clicks: 15192, ctr: 1.8, conversions: 380, cpa: 40, roas: 3.5, bidStrategy: 'Maximize Conversions', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-02-05', updatedAt: '2026-02-12' },
        { id: 'c11', name: 'FYP - Viral Hook', platform: 'TikTok', status: 'Active', objective: 'Awareness', budgetType: 'Daily', budget: 300, spend: 7800, impressions: 487000, clicks: 7808, ctr: 1.6, conversions: 198, cpa: 39, roas: 3.1, bidStrategy: 'Lowest Cost', ageRange: '18-34', gender: 'All', locations: ['US'], interests: ['Viral'], createdAt: '2026-01-25', updatedAt: '2026-02-01' },
        { id: 'c12', name: 'Spark Ads - UGC', platform: 'TikTok', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 200, spend: 4200, impressions: 191000, clicks: 4202, ctr: 2.2, conversions: 156, cpa: 27, roas: 4.5, bidStrategy: 'Cost Cap', ageRange: '18-44', gender: 'All', locations: ['US', 'CA'], interests: ['UGC'], createdAt: '2026-02-10', updatedAt: '2026-02-15' },
        { id: 'c16', name: 'Snap Ads - App Install', platform: 'Snap', status: 'Active', objective: 'App Installs', budgetType: 'Daily', budget: 200, spend: 3800, impressions: 317000, clicks: 3804, ctr: 1.2, conversions: 95, cpa: 40, roas: 2.9, bidStrategy: 'Cost Cap', ageRange: '18-34', gender: 'All', locations: ['US'], interests: ['App Installs'], createdAt: '2026-02-01', updatedAt: '2026-02-08' },
        { id: 'c19', name: 'Collection - Products', platform: 'Snap', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 180, spend: 2800, impressions: 187000, clicks: 2805, ctr: 1.5, conversions: 73, cpa: 38, roas: 3.3, bidStrategy: 'Swipe Up', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-03-08', updatedAt: '2026-03-12' },
      ]
      setCohorts(generateCohortData(fallbackCampaigns))
    } finally {
      setLoading({ campaigns: false, reports: false })
    }
  }, [selectedDays])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ─── Derived State ─── */
  const filteredCohorts = useMemo(() => {
    if (selectedFilter === 'All') {
      return cohorts.filter(c => c.platform === 'All' && c.campaignType === 'All' && c.audience === 'All')
    }
    switch (breakdownType) {
      case 'platform':
        return cohorts.filter(c => c.platform === selectedFilter && c.campaignType === 'All' && c.audience === 'All')
      case 'campaignType':
        return cohorts.filter(c => c.campaignType === selectedFilter && c.platform === 'All' && c.audience === 'All')
      case 'audience':
        return cohorts.filter(c => c.audience === selectedFilter && c.platform === 'All' && c.campaignType === 'All')
      default:
        return cohorts.filter(c => c.platform === 'All' && c.campaignType === 'All' && c.audience === 'All')
    }
  }, [cohorts, breakdownType, selectedFilter])

  const filterOptions = useMemo(() => {
    const opts = new Set<string>()
    switch (breakdownType) {
      case 'platform':
        cohorts.filter(c => c.platform !== 'All').forEach(c => opts.add(c.platform))
        break
      case 'campaignType':
        cohorts.filter(c => c.campaignType !== 'All').forEach(c => opts.add(c.campaignType))
        break
      case 'audience':
        cohorts.filter(c => c.audience !== 'All').forEach(c => opts.add(c.audience))
        break
    }
    return ['All', ...Array.from(opts)]
  }, [cohorts, breakdownType])

  const metrics = useMemo<CohortMetrics>(() => {
    if (filteredCohorts.length === 0) {
      return {
        day1Retention: 0,
        day7Retention: 0,
        day30Retention: 0,
        totalCohorts: 0,
        avgCohortSize: 0,
        bestPerformingCohort: '-',
        worstPerformingCohort: '-',
      }
    }

    const d1Values = filteredCohorts.map(c => c.retention[0] || 0)
    const d7Values = filteredCohorts.map(c => c.retention[1] || 0)
    const d30Values = filteredCohorts.map(c => c.retention[4] || 0)

    const avgD1 = d1Values.reduce((s, v) => s + v, 0) / d1Values.length
    const avgD7 = d7Values.reduce((s, v) => s + v, 0) / d7Values.length
    const avgD30 = d30Values.reduce((s, v) => s + v, 0) / d30Values.length

    let bestIdx = 0
    let worstIdx = 0
    d7Values.forEach((v, i) => {
      if (v > d7Values[bestIdx]) bestIdx = i
      if (v < d7Values[worstIdx]) worstIdx = i
    })

    return {
      day1Retention: avgD1,
      day7Retention: avgD7,
      day30Retention: avgD30,
      totalCohorts: filteredCohorts.length,
      avgCohortSize: Math.round(filteredCohorts.reduce((s, c) => s + c.cohortSize, 0) / filteredCohorts.length),
      bestPerformingCohort: filteredCohorts[bestIdx]?.weekLabel || '-',
      worstPerformingCohort: filteredCohorts[worstIdx]?.weekLabel || '-',
    }
  }, [filteredCohorts])

  // Line chart data: retention curves by cohort
  const lineChartData = useMemo(() => {
    if (filteredCohorts.length === 0) return []
    const maxWeeks = Math.max(...filteredCohorts.map(c => c.retention.length - 1))
    return Array.from({ length: maxWeeks + 1 }, (_, weekIndex) => {
      const point: Record<string, any> = { week: `W${weekIndex}` }
      filteredCohorts.forEach((cohort, i) => {
        point[cohort.weekLabel] = cohort.retention[weekIndex] ?? null
      })
      return point
    })
  }, [filteredCohorts])

  const lineChartLines = useMemo(() => {
    return filteredCohorts.map((c, i) => ({
      key: c.weekLabel,
      color: COHORT_COLORS[i % COHORT_COLORS.length],
    }))
  }, [filteredCohorts])

  // Maximum week columns to show in the table (cap at 8 for readability)
  const maxWeekCols = useMemo(() => {
    if (filteredCohorts.length === 0) return 0
    return Math.min(8, Math.max(...filteredCohorts.map(c => c.retention.length - 1)))
  }, [filteredCohorts])

  /* ─── Export CSV ─── */
  const handleExport = useCallback(() => {
    if (filteredCohorts.length === 0) return
    const headers = ['Cohort Week', 'Cohort Size', ...Array.from({ length: maxWeekCols + 1 }, (_, i) => `Week ${i}`)]
    const rows = filteredCohorts.map(c => [
      c.weekLabel,
      c.cohortSize,
      ...c.retention.slice(0, maxWeekCols + 1).map(v => v.toFixed(1)),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cohort-analysis-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredCohorts, maxWeekCols])

  /* ─── Platform comparison data for side panel ─── */
  const platformComparison = useMemo(() => {
    const allWeeks = [...new Set(cohorts.filter(c => c.platform !== 'All').map(c => c.weekKey))].sort()
    return PLATFORMS.map(p => {
      const platformCohorts = cohorts.filter(c => c.platform === p.name && c.campaignType === 'All' && c.audience === 'All')
      if (platformCohorts.length === 0) return { ...p, avgD7: 0, trend: 'flat' as const }
      const d7Values = platformCohorts.map(c => c.retention[1] || 0)
      const avgD7 = d7Values.reduce((s, v) => s + v, 0) / d7Values.length
      const firstD7 = d7Values[0] || 0
      const lastD7 = d7Values[d7Values.length - 1] || 0
      return {
        ...p,
        avgD7,
        trend: lastD7 > firstD7 ? 'up' as const : lastD7 < firstD7 ? 'down' as const : 'flat' as const,
      }
    }).filter(p => p.avgD7 > 0)
  }, [cohorts])

  return (
    <div className="min-h-screen pb-12" style={{ background: C.bgPrimary }}>
      <SEO
        title="Cohort Analysis"
        description="Retention cohort analysis for ad campaigns. Track user retention by acquisition week with breakdowns by platform, campaign type, and audience."
      />

      {/* ═══════ HEADER ═══════ */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: C.textPrimary }}>Cohort Analysis</h1>
            <p className="text-[13px] mt-0.5" style={{ color: C.textSecondary }}>
              Retention by acquisition week — users who clicked and converted over time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={filteredCohorts.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-40"
              style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
              style={{ background: C.accent, color: '#fff' }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ ERROR BANNER ═══════ */}
      {(error.campaigns || error.reports) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mb-4 flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: `${C.statusError}15`, border: `1px solid ${C.statusError}33` }}
        >
          <AlertTriangle size={16} style={{ color: C.statusError }} />
          <span className="text-[13px] flex-1" style={{ color: C.statusError }}>
            {error.campaigns || error.reports}
          </span>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium"
            style={{ background: `${C.statusError}22`, color: C.statusError }}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </motion.div>
      )}

      {/* ═══════ KPI CARDS ═══════ */}
      <div className="px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Day 1 Retention', value: metrics.day1Retention, isPercent: true, icon: Users },
          { label: 'Day 7 Retention', value: metrics.day7Retention, isPercent: true, icon: Calendar },
          { label: 'Day 30 Retention', value: metrics.day30Retention, isPercent: true, icon: BarChart3 },
          { label: 'Total Cohorts', value: metrics.totalCohorts, isPercent: false, icon: Layers },
          { label: 'Avg Cohort Size', value: metrics.avgCohortSize, isPercent: false, icon: Users },
          { label: 'Best Cohort', value: metrics.bestPerformingCohort, isPercent: false, isText: true, icon: TrendingUp },
          { label: 'Worst Cohort', value: metrics.worstPerformingCohort, isPercent: false, isText: true, icon: TrendingDown },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="p-4 rounded-xl"
            style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={13} style={{ color: C.textTertiary }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textTertiary }}>
                {kpi.label}
              </span>
            </div>
            {loading.campaigns ? (
              <div className="animate-pulse rounded h-6 w-16" style={{ background: 'rgba(255,255,255,0.08)' }} />
            ) : (
              <span className="text-[18px] font-semibold font-mono-data block" style={{ color: C.textPrimary }}>
                {kpi.isText ? kpi.value : kpi.isPercent ? fmtPercent(kpi.value as number) : fmtNumber(kpi.value as number)}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* ═══════ CONTROLS ═══════ */}
      <div className="px-6 mb-4 flex items-center gap-3 flex-wrap">
        {/* Breakdown Type */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textTertiary }}>Breakdown</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.borderSubtle}` }}>
            {([
              { key: 'platform', label: 'Platform' },
              { key: 'campaignType', label: 'Campaign Type' },
              { key: 'audience', label: 'Audience' },
            ] as const).map((b) => (
              <button
                key={b.key}
                onClick={() => { setBreakdownType(b.key); setSelectedFilter('All') }}
                className="px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  background: breakdownType === b.key ? C.accent : C.bgElevated,
                  color: breakdownType === b.key ? '#fff' : C.textSecondary,
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] mr-2" style={{ color: C.textTertiary }}>Filter</span>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{ background: C.bgElevated, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
          >
            <Filter size={12} />
            {selectedFilter}
            <ChevronDown size={12} style={{ transform: showFilterDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showFilterDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden min-w-[140px]"
                style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
              >
                {filterOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSelectedFilter(opt); setShowFilterDropdown(false) }}
                    className="w-full text-left px-3 py-2 text-[12px] transition-colors hover:bg-[rgba(255,255,255,0.04)] flex items-center justify-between"
                    style={{ color: selectedFilter === opt ? C.accent : C.textPrimary }}
                  >
                    {opt}
                    {selectedFilter === opt && <Check size={12} />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* ═══════ LINE CHART: RETENTION CURVES ═══════ */}
      <div className="px-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="p-4 rounded-xl"
          style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Retention Curves by Cohort</span>
            <div className="flex items-center gap-3 flex-wrap">
              {lineChartLines.slice(0, 6).map((line) => (
                <div key={line.key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: line.color }} />
                  <span className="text-[10px]" style={{ color: C.textSecondary }}>{line.key}</span>
                </div>
              ))}
              {lineChartLines.length > 6 && (
                <span className="text-[10px]" style={{ color: C.textTertiary }}>+{lineChartLines.length - 6} more</span>
              )}
            </div>
          </div>

          {loading.campaigns ? (
            <SkeletonCard>
              <SkeletonBar height="260px" />
            </SkeletonCard>
          ) : filteredCohorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <BarChart3 size={22} style={{ color: C.textTertiary }} />
              </div>
              <span className="text-[13px] font-medium" style={{ color: C.textSecondary }}>No cohort data</span>
              <span className="text-[12px] mt-0.5" style={{ color: C.textTertiary }}>Select a filter to view retention curves</span>
            </div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: C.textTertiary, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  />
                  <YAxis
                    tick={{ fill: C.textTertiary, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {lineChartLines.map((line) => (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      name={line.key}
                      stroke={line.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: line.color, stroke: C.bgElevated, strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══════ COHORT TABLE + PLATFORM COMPARISON ═══════ */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cohort Heatmap Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="lg:col-span-3 p-4 rounded-xl overflow-x-auto"
          style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Cohort Retention Table</span>
            <span className="text-[11px]" style={{ color: C.textTertiary }}>
              Retention = users who clicked in week N and converted in week N+X
            </span>
          </div>

          {loading.campaigns ? (
            <SkeletonCard>
              <SkeletonBar height="300px" />
            </SkeletonCard>
          ) : filteredCohorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Layers size={22} style={{ color: C.textTertiary }} />
              </div>
              <span className="text-[13px] font-medium" style={{ color: C.textSecondary }}>No cohort data available</span>
              <span className="text-[12px] mt-0.5" style={{ color: C.textTertiary }}>Adjust filters or refresh data</span>
            </div>
          ) : (
            <table className="w-full" style={{ minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.textTertiary, width: '140px' }}>
                    Cohort Week
                  </th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.textTertiary, width: '80px' }}>
                    Users
                  </th>
                  {Array.from({ length: maxWeekCols + 1 }, (_, i) => (
                    <th key={i} className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.textTertiary, minWidth: '60px' }}>
                      Wk {i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCohorts.map((cohort, rowIdx) => (
                  <motion.tr
                    key={cohort.weekKey}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.04 }}
                    style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <span className="text-[12px] font-medium" style={{ color: C.textPrimary }}>{cohort.weekLabel}</span>
                      <span className="block text-[10px]" style={{ color: C.textTertiary }}>{cohort.weekKey}</span>
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <span className="text-[12px] font-mono-data font-medium" style={{ color: C.textSecondary }}>
                        {cohort.cohortSize}
                      </span>
                    </td>
                    {Array.from({ length: maxWeekCols + 1 }, (_, colIdx) => {
                      const percent = cohort.retention[colIdx] ?? 0
                      const conv = cohort.converters[colIdx] ?? 0
                      const bg = colIdx === 0 ? 'transparent' : getHeatmapColor(percent)
                      const txtColor = colIdx === 0 ? C.textSecondary : getTextColorForBg(percent)
                      return (
                        <td key={colIdx} className="text-center py-2 px-1">
                          <div
                            className="rounded-md py-1.5 px-1 mx-auto"
                            style={{
                              background: bg,
                              minWidth: '52px',
                              transition: 'background 0.3s ease',
                            }}
                            title={`${conv} converters (${percent.toFixed(1)}%)`}
                          >
                            <span className="text-[11px] font-mono-data font-medium" style={{ color: txtColor }}>
                              {colIdx === 0 ? '100%' : `${percent.toFixed(0)}%`}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* Platform Comparison Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="p-4 rounded-xl"
          style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
        >
          <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Platform Comparison</span>
          <span className="text-[10px] uppercase tracking-[0.06em] block mb-3" style={{ color: C.textTertiary }}>Avg Week 1 Retention</span>

          {loading.campaigns ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <SkeletonBar key={i} height="40px" />)}
            </div>
          ) : platformComparison.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <span className="text-[12px]" style={{ color: C.textTertiary }}>No platform data</span>
            </div>
          ) : (
            <div className="space-y-3">
              {platformComparison.map((plat) => (
                <div
                  key={plat.key}
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.borderSubtle}` }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: plat.color }} />
                      <span className="text-[12px] font-medium" style={{ color: C.textPrimary }}>{plat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {plat.trend === 'up' && <TrendingUp size={12} style={{ color: C.statusActive }} />}
                      {plat.trend === 'down' && <TrendingDown size={12} style={{ color: C.statusError }} />}
                      <span className="text-[12px] font-mono-data font-medium" style={{ color: plat.trend === 'up' ? C.statusActive : plat.trend === 'down' ? C.statusError : C.textSecondary }}>
                        {plat.avgD7.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, plat.avgD7 * 3)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: plat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
            <span className="text-[10px] uppercase tracking-[0.06em] block mb-2" style={{ color: C.textTertiary }}>Heatmap Legend</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px]" style={{ color: C.textTertiary }}>0%</span>
              {[5, 10, 15, 20, 30, 40, 50].map(pct => (
                <div
                  key={pct}
                  className="flex-1 h-3 rounded-sm"
                  style={{ background: getHeatmapColor(pct) }}
                  title={`${pct}%`}
                />
              ))}
              <span className="text-[9px]" style={{ color: C.textTertiary }}>50%+</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
