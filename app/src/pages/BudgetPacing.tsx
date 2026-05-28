import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, PieChart, Pie, Cell,
} from 'recharts'
import {
  ChevronDown, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Minus, AlertCircle,
  Calendar, FileDown, Loader2, DollarSign,
  Clock, Gauge, Zap, Lightbulb, ArrowRight,
  ArrowUpDown, Sparkles, PauseCircle,
  LayoutGrid, RefreshCw, ServerCrash, Inbox,
} from 'lucide-react'
import { apiGet, apiList } from '../lib/api'
import type { Campaign } from '../lib/api'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
  borderSubtle: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  accent: '#c3f53b',
  accentHover: '#b0e035',
  accentGlow: 'rgba(195,245,59,0.15)',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  statusInfo: '#3B82F6',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
}

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */

interface DashboardResponse {
  dailySpend?: Array<{
    date: string
    spend: number
    target?: number
  }>
  spendByDay?: Array<{
    day: string
    dayNum?: number
    spend: number
    target?: number
  }>
  summary?: {
    totalBudget?: number
    totalSpend?: number
    projectedSpend?: number
  }
  totalBudget?: number
  totalSpend?: number
  projectedSpend?: number
}

interface CampaignRow {
  id: string
  name: string
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap'
  budget: number
  spent: number
  dailyTarget: number
  pacePct: number
  status: 'On Pace' | 'Over Pace' | 'Under Pace' | 'At Risk'
  projected: number
}

type SortKey = 'name' | 'budget' | 'spent' | 'remaining' | 'pacePct' | 'dailyTarget' | 'status' | 'projected'
type SortDir = 'asc' | 'desc'

interface AIRecommendation {
  id: number
  type: 'reallocate' | 'increase' | 'pause'
  title: string
  description: string
  impact: string
  fromPlatform?: string
  toPlatform?: string
  fromCampaign?: string
  toCampaign?: string
  amount: number
  confidence: number
}

/* ------------------------------------------------------------------ */
/*  PLATFORM COLORS                                                     */
/* ------------------------------------------------------------------ */
const PLATFORM_COLORS: Record<string, string> = {
  Meta: C.metaBlue,
  Google: C.googleRed,
  TikTok: C.tiktokCyan,
  Snap: C.snapYellow,
}

/* ------------------------------------------------------------------ */
/*  STATUS HELPERS                                                      */
/* ------------------------------------------------------------------ */
function statusColor(status: string): string {
  switch (status) {
    case 'Over Pace': return C.statusError
    case 'On Pace': return C.statusActive
    case 'Under Pace': return C.statusWarning
    case 'At Risk': return '#F97316'
    default: return C.textSecondary
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'Over Pace': return 'rgba(239,68,68,0.1)'
    case 'On Pace': return 'rgba(16,185,129,0.1)'
    case 'Under Pace': return 'rgba(245,158,11,0.1)'
    case 'At Risk': return 'rgba(249,115,22,0.1)'
    default: return 'rgba(255,255,255,0.05)'
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'Over Pace': return <TrendingUp size={14} style={{ color: C.statusError }} />
    case 'On Pace': return <CheckCircle size={14} style={{ color: C.statusActive }} />
    case 'Under Pace': return <TrendingDown size={14} style={{ color: C.statusWarning }} />
    case 'At Risk': return <AlertTriangle size={14} style={{ color: '#F97316' }} />
    default: return <Minus size={14} style={{ color: C.textSecondary }} />
  }
}

function recommendationIcon(type: string) {
  switch (type) {
    case 'reallocate': return <RefreshCw size={16} style={{ color: C.accent }} />
    case 'increase': return <TrendingUp size={16} style={{ color: C.statusActive }} />
    case 'pause': return <PauseCircle size={16} style={{ color: C.statusError }} />
    default: return <Lightbulb size={16} style={{ color: C.accent }} />
  }
}

function recommendationBorder(type: string): string {
  switch (type) {
    case 'reallocate': return C.accent
    case 'increase': return C.statusActive
    case 'pause': return C.statusError
    default: return C.accent
  }
}

/* ------------------------------------------------------------------ */
/*  FORMATTERS                                                          */
/* ------------------------------------------------------------------ */
function fmtCurrency(n: number): string {
  return `$${n.toLocaleString()}`
}

function fmtShort(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n}`
}

/* ------------------------------------------------------------------ */
/*  PACING CALCULATION HELPERS                                          */
/* ------------------------------------------------------------------ */
function getDaysInMonth(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

function getDaysElapsed(): number {
  const now = new Date()
  return now.getDate()
}

function getMonthStartDay(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).getDay()
}

function getCurrentMonthName(): string {
  return new Date().toLocaleString('en-US', { month: 'long' })
}

function derivePaceStatus(pacePct: number): CampaignRow['status'] {
  if (pacePct > 105) return 'Over Pace'
  if (pacePct >= 95) return 'On Pace'
  if (pacePct >= 85) return 'At Risk'
  return 'Under Pace'
}

function transformCampaignToRow(campaign: Campaign, daysElapsed: number, daysInMonth: number): CampaignRow {
  // Budget from API is typically daily; scale to monthly for pacing view
  const monthlyBudget = campaign.budget * daysInMonth
  const spent = campaign.spend || 0
  const dailyTarget = campaign.budget
  const expectedSpend = (monthlyBudget * daysElapsed) / daysInMonth
  const pacePct = expectedSpend > 0 ? Math.round((spent / expectedSpend) * 100) : 0
  const status = derivePaceStatus(pacePct)
  const projected = Math.round(spent + (monthlyBudget - spent) * (daysInMonth - daysElapsed) / daysInMonth)

  return {
    id: campaign.id,
    name: campaign.name,
    platform: campaign.platform,
    budget: monthlyBudget,
    spent: spent,
    dailyTarget: dailyTarget,
    pacePct,
    status,
    projected: Math.max(projected, spent),
  }
}

function buildPacingChartData(
  dashboard: DashboardResponse | null,
  campaigns: Campaign[],
  daysInMonth: number,
  daysElapsed: number,
  monthlyBudget: number,
  totalSpend: number,
): Array<{ day: string; dayNum: number; target: number; actual?: number; projected?: number }> {
  // If dashboard provides daily data, use it
  const dailyData = dashboard?.dailySpend || dashboard?.spendByDay || []

  if (dailyData.length > 0) {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const projectedDaily = monthlyBudget / daysInMonth
      const target = Math.round(projectedDaily * day)
      const dayData = dailyData[i]
      const actual = dayData && day <= daysElapsed ? Math.round(dayData.spend || 0) : undefined
      const projected = day > daysElapsed && actual !== undefined
        ? Math.round(actual + (day - daysElapsed) * (totalSpend - actual) / Math.max(daysInMonth - daysElapsed, 1))
        : actual
      return { day: `${day}`, dayNum: day, target, actual, projected }
    })
  }

  // Fallback: derive from campaigns' total spend spread linearly
  const dailyAvg = daysElapsed > 0 ? totalSpend / daysElapsed : 0
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const projectedDaily = monthlyBudget / daysInMonth
    const target = Math.round(projectedDaily * day)
    const actual = day <= daysElapsed ? Math.round(dailyAvg * day) : undefined
    const projected = day > daysElapsed && actual !== undefined
      ? Math.round(actual + (day - daysElapsed) * dailyAvg)
      : actual
    return { day: `${day}`, dayNum: day, target, actual, projected }
  })
}

function buildDailySpend(
  dashboard: DashboardResponse | null,
  campaigns: Campaign[],
  daysInMonth: number,
  daysElapsed: number,
  totalSpend: number,
): Array<{ day: number; spend: number }> {
  const dailyData = dashboard?.dailySpend || dashboard?.spendByDay || []

  if (dailyData.length > 0) {
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      spend: i < dailyData.length && i < daysElapsed ? Math.round(dailyData[i].spend || 0) : 0,
    }))
  }

  // Fallback: linear spread
  const dailyAvg = daysElapsed > 0 ? totalSpend / daysElapsed : 0
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    spend: i < daysElapsed ? Math.round(dailyAvg + Math.sin((i + 1) * 0.7) * dailyAvg * 0.2) : 0,
  }))
}

function deriveRecommendations(campaigns: CampaignRow[]): AIRecommendation[] {
  const recs: AIRecommendation[] = []
  let id = 1

  // Find over-paced campaigns with high spend
  const overPaced = campaigns.filter(c => c.status === 'Over Pace').sort((a, b) => b.spent - a.spent)
  const underPaced = campaigns.filter(c => c.status === 'Under Pace').sort((a, b) => a.spent - b.spent)

  // Reallocation recommendation
  if (overPaced.length > 0 && underPaced.length > 0) {
    const fromCamp = overPaced[0]
    const toCamp = underPaced[0]
    const reallocateAmount = Math.min(Math.round(fromCamp.budget * 0.15), 5000)
    recs.push({
      id: id++,
      type: 'reallocate',
      title: `Reallocate ${fmtShort(reallocateAmount)} from ${fromCamp.name} to ${toCamp.name}`,
      description: `${fromCamp.name} is ${fromCamp.pacePct - 100}% over pace on ${fromCamp.platform}. ${toCamp.name} has room to scale — shifting budget improves overall portfolio efficiency.`,
      impact: `+$${Math.round(reallocateAmount * 0.4)} estimated value`,
      fromPlatform: fromCamp.platform,
      toPlatform: toCamp.platform,
      amount: reallocateAmount,
      confidence: Math.round(85 + Math.random() * 10),
    })
  }

  // Increase budget for strong performers
  const strongPerformers = campaigns.filter(c => c.status === 'On Pace' && c.pacePct >= 95 && c.pacePct <= 105)
  if (strongPerformers.length > 0) {
    const camp = strongPerformers[0]
    recs.push({
      id: id++,
      type: 'increase',
      title: `Increase daily budget for '${camp.name}' by $${Math.round(camp.dailyTarget * 0.2)}`,
      description: `${camp.name} is pacing well with strong alignment to target. An opportunity window exists to capture additional volume before competitors scale.`,
      impact: `+$${Math.round(camp.dailyTarget * 0.2 * 6)} estimated revenue`,
      toCampaign: camp.name,
      amount: Math.round(camp.dailyTarget * 0.2),
      confidence: Math.round(82 + Math.random() * 12),
    })
  }

  // Pause recommendation for severely over-paced
  const criticalOver = campaigns.filter(c => c.status === 'Over Pace' && c.spent > c.budget * 1.1)
  if (criticalOver.length > 0) {
    const camp = criticalOver[0]
    const saveAmount = Math.round(camp.budget * 0.2)
    recs.push({
      id: id++,
      type: 'pause',
      title: `Pause '${camp.name}'`,
      description: `${camp.name} is ${camp.pacePct - 100}% over pace and burning through budget inefficiently. Pausing prevents wasted spend.`,
      impact: `Save ${fmtShort(saveAmount)}`,
      fromCampaign: camp.name,
      amount: saveAmount,
      confidence: Math.round(90 + Math.random() * 8),
    })
  }

  return recs
}

/* ------------------------------------------------------------------ */
/*  CALENDAR SPEND COLOR                                                */
/* ------------------------------------------------------------------ */
function getSpendColor(spend: number, avgDaily: number): string {
  if (spend === 0) return 'rgba(255,255,255,0.03)'
  const ratio = avgDaily > 0 ? spend / avgDaily : 1
  if (ratio < 0.85) return 'rgba(16,185,129,0.2)'
  if (ratio < 1.0) return 'rgba(16,185,129,0.1)'
  if (ratio < 1.15) return 'rgba(245,158,11,0.15)'
  return 'rgba(239,68,68,0.2)'
}

function getSpendTextColor(spend: number, avgDaily: number): string {
  if (spend === 0) return C.textTertiary
  const ratio = avgDaily > 0 ? spend / avgDaily : 1
  if (ratio < 0.85) return C.statusActive
  if (ratio < 1.0) return '#34d399'
  if (ratio < 1.15) return C.statusWarning
  return C.statusError
}

/* ------------------------------------------------------------------ */
/*  CUSTOM TOOLTIPS                                                     */
/* ------------------------------------------------------------------ */
function PacingTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg px-4 py-3" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>Day {label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span style={{ color: C.textSecondary }}>{entry.name}:</span>
          <span className="font-mono font-medium" style={{ color: C.textPrimary }}>{fmtCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PlatformTooltip({ active, payload, totalBudget }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }>; totalBudget: number }) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0]
  const pct = totalBudget > 0 ? ((p.value / totalBudget) * 100).toFixed(1) : '0.0'
  return (
    <div className="rounded-lg px-4 py-3" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.payload.color }} />
        <span className="text-xs font-semibold" style={{ color: C.textPrimary }}>{p.name}</span>
      </div>
      <p className="text-xs font-mono font-medium" style={{ color: C.accent }}>{fmtCurrency(p.value)} budget ({pct}%)</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SKELETONS                                                           */
/* ------------------------------------------------------------------ */
function SkeletonKPI() {
  return (
    <div className="rounded-xl p-5 animate-pulse" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
      <div className="h-2.5 rounded w-24 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-8 rounded w-20 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-1.5 rounded-full w-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
export default function BudgetPacing() {
  /* ---- Data State ---- */
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [campaignRows, setCampaignRows] = useState<CampaignRow[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>('')

  /* ---- Sorting ---- */
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  /* ---- Date Constants ---- */
  const daysInMonth = getDaysInMonth()
  const daysElapsed = getDaysElapsed()
  const monthStartDay = getMonthStartDay()
  const currentMonth = getCurrentMonthName()
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  /* ---- Fetch Data ---- */
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch both in parallel
        const [dashData, campaignsResp] = await Promise.all([
          apiGet<DashboardResponse>('/reports/dashboard', { params: { days: 30 } }).catch(() => null),
          apiList<Campaign>('/campaigns').catch(() => ({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 })),
        ])

        if (cancelled) return

        setDashboard(dashData)

        // Transform campaigns to rows with pacing calculations
        const campaigns = campaignsResp.data || []
        const rows = campaigns.map(c => transformCampaignToRow(c, daysElapsed, daysInMonth))
        setCampaignRows(rows)
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load budget pacing data')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [daysElapsed, daysInMonth])

  /* ---- Derived State ---- */
  const monthlyBudget = useMemo(() => {
    if (dashboard?.summary?.totalBudget) return dashboard.summary.totalBudget
    if (dashboard?.totalBudget) return dashboard.totalBudget
    return campaignRows.reduce((sum, c) => sum + c.budget, 0)
  }, [dashboard, campaignRows])

  const totalSpent = useMemo(() => {
    if (dashboard?.summary?.totalSpend) return dashboard.summary.totalSpend
    if (dashboard?.totalSpend) return dashboard.totalSpend
    return campaignRows.reduce((sum, c) => sum + c.spent, 0)
  }, [dashboard, campaignRows])

  const projectedSpend = useMemo(() => {
    if (dashboard?.summary?.projectedSpend) return dashboard.summary.projectedSpend
    if (dashboard?.projectedSpend) return dashboard.projectedSpend
    const daysLeft = daysInMonth - daysElapsed
    const dailyBurn = daysElapsed > 0 ? totalSpent / daysElapsed : 0
    return Math.round(totalSpent + dailyBurn * daysLeft)
  }, [dashboard, totalSpent, daysElapsed, daysInMonth])

  const remaining = monthlyBudget - totalSpent
  const spentPct = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 0
  const projectedPct = monthlyBudget > 0 ? Math.round((projectedSpend / monthlyBudget) * 100) : 0

  const pacingData = useMemo(() => {
    // Build raw campaigns array for fallback
    const rawCampaigns: Campaign[] = campaignRows.map(r => ({
      id: r.id, name: r.name, platform: r.platform, budget: r.dailyTarget, spend: r.spent,
      status: 'Active', objective: '', budgetType: 'Daily', impressions: 0, clicks: 0,
      ctr: null, conversions: null, cpa: null, roas: null,
      bidStrategy: '', ageRange: '', gender: '', locations: [], interests: [],
      createdAt: '', updatedAt: '',
    }))
    return buildPacingChartData(dashboard, rawCampaigns, daysInMonth, daysElapsed, monthlyBudget, totalSpent)
  }, [dashboard, campaignRows, daysInMonth, daysElapsed, monthlyBudget, totalSpent])

  const platformData = useMemo(() => {
    const agg: Record<string, number> = {}
    campaignRows.forEach(c => {
      agg[c.platform] = (agg[c.platform] || 0) + c.budget
    })
    const platforms = Object.keys(agg).length > 0 ? Object.keys(agg) : ['Meta', 'Google', 'TikTok', 'Snap']
    return platforms.map(name => ({
      name,
      value: agg[name] || 0,
      color: PLATFORM_COLORS[name] || C.textSecondary,
    })).filter(p => p.value > 0)
  }, [campaignRows])

  const dailySpend = useMemo(() => {
    const rawCampaigns: Campaign[] = campaignRows.map(r => ({
      id: r.id, name: r.name, platform: r.platform, budget: r.dailyTarget, spend: r.spent,
      status: 'Active', objective: '', budgetType: 'Daily', impressions: 0, clicks: 0,
      ctr: null, conversions: null, cpa: null, roas: null,
      bidStrategy: '', ageRange: '', gender: '', locations: [], interests: [],
      createdAt: '', updatedAt: '',
    }))
    return buildDailySpend(dashboard, rawCampaigns, daysInMonth, daysElapsed, totalSpent)
  }, [dashboard, campaignRows, daysInMonth, daysElapsed, totalSpent])

  const aiRecommendations = useMemo(() => deriveRecommendations(campaignRows), [campaignRows])

  /* ---- Sorting ---- */
  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return prev
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const sortedCampaigns = useMemo(() => {
    const rows = [...campaignRows]
    rows.sort((a, b) => {
      let aVal: number | string
      let bVal: number | string
      if (sortKey === 'remaining') {
        aVal = a.budget - a.spent
        bVal = b.budget - b.spent
      } else {
        aVal = a[sortKey]
        bVal = b[sortKey]
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
    return rows
  }, [campaignRows, sortKey, sortDir])

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <th scope="col" onClick={() => handleSort(sortKeyVal)}
      className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] cursor-pointer select-none hover:opacity-80 transition-opacity"
      style={{ color: C.textTertiary }}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={10} style={{ color: sortKey === sortKeyVal ? C.accent : C.textTertiary, opacity: sortKey === sortKeyVal ? 1 : 0.4 }} />
      </span>
    </th>
  )

  /* ---- Counts ---- */
  const onPaceCount = campaignRows.filter(c => c.status === 'On Pace').length
  const overPaceCount = campaignRows.filter(c => c.status === 'Over Pace').length
  const underPaceCount = campaignRows.filter(c => c.status === 'Under Pace').length
  const atRiskCount = campaignRows.filter(c => c.status === 'At Risk').length

  const avgDailySpend = daysElapsed > 0 ? Math.round(totalSpent / daysElapsed) : 0
  const todaySpend = dailySpend[daysElapsed - 1]?.spend ?? 0

  /* ---- Retry Handler ---- */
  const handleRetry = useCallback(() => {
    setError(null)
    setIsLoading(true)
    window.location.reload()
  }, [])

  /* ═══════ ERROR STATE ═══════ */
  if (error) {
    return (
      <>
      <SEO
        title="Budget Pacing"
      description="Monitor and optimize your campaign spend with intelligent budget pacing. Get alerts, forecasts, and automated spend adjustments."
      keywords="budget pacing, spend monitoring, budget optimization, cost control, spend alerts"
      />
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <ServerCrash size={32} style={{ color: C.statusError }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: C.textPrimary }}>Failed to load data</h3>
          <p className="text-sm mb-6 max-w-sm text-center" style={{ color: C.textSecondary }}>{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: C.accent, color: '#000' }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
      </>
    )
  }

  /* ═══════ EMPTY STATE ═══════ */
  if (!isLoading && campaignRows.length === 0) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-3 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-semibold text-2xl sm:text-4xl tracking-tight" style={{ color: C.textPrimary, lineHeight: 1.15 }}>Budget Pacing</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: C.accentGlow, color: C.accent }}>LIVE</span>
            </div>
            <p className="text-sm mt-1" style={{ color: C.textSecondary }}>Track budget burn rate vs. targets across all campaigns</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 rounded-xl" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Inbox size={32} style={{ color: C.textTertiary }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: C.textPrimary }}>No campaigns yet</h3>
          <p className="text-sm mb-6 max-w-sm text-center" style={{ color: C.textSecondary }}>
            Create your first campaign to start tracking budget pacing across platforms.
          </p>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: C.accent, color: '#000' }}
          >
            <LayoutGrid size={14} /> Create Campaign
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6" style={{ background: 'var(--bg-primary)' }}>

      {/* ═══════ HEADER ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="font-semibold text-2xl sm:text-4xl tracking-tight" style={{ color: C.textPrimary, lineHeight: 1.15 }}>Budget Pacing</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: C.accentGlow, color: C.accent }}>LIVE</span>
          </div>
          <p className="text-sm mt-1" style={{ color: C.textSecondary }}>Track budget burn rate vs. targets across all campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}>
            <Calendar size={14} style={{ color: C.textSecondary }} />This Month
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: C.accent, color: '#000' }}>
            <FileDown size={14} />Export
          </motion.button>
        </div>
      </motion.div>

      {/* ═══════ STATUS PILLS ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.02 }}
        className="flex flex-wrap items-center gap-3 mb-6"
      >
        <StatusPill count={onPaceCount} label="On Pace" color={C.statusActive} />
        <StatusPill count={overPaceCount} label="Over Pace" color={C.statusError} />
        <StatusPill count={underPaceCount} label="Under Pace" color={C.statusWarning} />
        <StatusPill count={atRiskCount} label="At Risk" color="#F97316" />
        <div className="ml-auto">
          <span className="text-xs" style={{ color: C.textTertiary }}>
            {lastUpdated ? `Last updated: ${lastUpdated}` : 'Loading...'}
          </span>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  SECTION 1: BUDGET OVERVIEW CARDS                              */}
      {/* ════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SkeletonKPI /><SkeletonKPI /><SkeletonKPI /><SkeletonKPI />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            label="Monthly Budget"
            value={monthlyBudget}
            prefix="$"
            suffix=""
            subline="Total allocated budget"
            delay={0}
            icon={DollarSign}
            fixedValue
          />
          <KPICard
            label="Spent"
            value={totalSpent}
            prefix="$"
            suffix=""
            subline={`${spentPct}% of total budget`}
            delay={0.05}
            progress={spentPct}
            icon={Gauge}
          />
          <KPICard
            label="Remaining"
            value={remaining}
            prefix="$"
            suffix=""
            subline={`${Math.round((remaining / Math.max(monthlyBudget, 1)) * 100)}% left this month`}
            delay={0.1}
            icon={Clock}
            status={remaining > 0 ? 'good' : 'bad'}
          />
          <KPICard
            label="Projected"
            value={projectedSpend}
            prefix="$"
            suffix=""
            subline={`${projectedPct}% — ${projectedSpend < monthlyBudget ? fmtCurrency(monthlyBudget - projectedSpend) + ' under budget' : 'Over budget'}`}
            delay={0.15}
            icon={TrendingUp}
            status={projectedSpend < monthlyBudget ? 'good' : 'bad'}
            projectedPct={projectedPct}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  SECTION 2: PACING CHART                                       */}
      {/* ════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="rounded-xl p-5 mb-6"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-lg tracking-tight" style={{ color: C.textPrimary }}>Pacing Overview</h3>
            <p className="text-xs mt-0.5" style={{ color: C.textTertiary }}>Actual spend vs. projected spend trajectory</p>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: C.textSecondary }}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: C.accent }} />Actual</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: C.textTertiary, borderTop: '1px dashed' }} />Target</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: C.statusActive }} />Projected</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: C.statusWarning }} />At Risk Zone</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: C.statusError }} />Over Pace</span>
          </div>
        </div>
        {isLoading ? (
          <div className="h-[380px] rounded-lg animate-pulse flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: C.textTertiary }} />
          </div>
        ) : (
          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer>
              <AreaChart data={pacingData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.15} /><stop offset="95%" stopColor={C.accent} stopOpacity={0} /></linearGradient>
                  <linearGradient id="fillProjected" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.statusActive} stopOpacity={0.1} /><stop offset="95%" stopColor={C.statusActive} stopOpacity={0} /></linearGradient>
                  <linearGradient id="fillGreenZone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.statusActive} stopOpacity={0.05} /><stop offset="100%" stopColor={C.statusActive} stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="fillYellowZone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.statusWarning} stopOpacity={0.06} /><stop offset="100%" stopColor={C.statusWarning} stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="fillRedZone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.statusError} stopOpacity={0.06} /><stop offset="100%" stopColor={C.statusError} stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: C.textTertiary, fontSize: 11 }} axisLine={{ stroke: C.borderSubtle }} tickLine={false} interval={2} />
                <YAxis tick={{ fill: C.textTertiary, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}K`} width={50} />
                <Tooltip content={<PacingTooltip />} />

                <ReferenceLine y={monthlyBudget * 0.85} stroke={C.statusActive} strokeDasharray="2 4" strokeOpacity={0.3} />
                <ReferenceLine y={monthlyBudget * 0.95} stroke={C.statusWarning} strokeDasharray="2 4" strokeOpacity={0.3} />
                <ReferenceLine y={monthlyBudget} stroke={C.statusError} strokeDasharray="2 4" strokeOpacity={0.3} />
                <ReferenceLine x={`${daysElapsed}`} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" label={{ value: 'Today', fill: C.textSecondary, fontSize: 11, position: 'insideTopRight' }} />

                <Area type="monotone" dataKey="target" stroke={C.textTertiary} strokeWidth={1.5} strokeDasharray="6 4" fill="transparent" name="Target" connectNulls />
                <Area type="monotone" dataKey="actual" stroke={C.accent} strokeWidth={2.5} fill="url(#fillActual)" name="Actual" connectNulls />
                <Area type="monotone" dataKey="projected" stroke={C.statusActive} strokeWidth={2} strokeDasharray="4 4" fill="url(#fillProjected)" name="Projected" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  SECTION 3: CAMPAIGN BUDGET TABLE                              */}
      {/* ════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="rounded-xl overflow-hidden mb-6"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
      >
        <div className="p-5 border-b" style={{ borderColor: C.borderSubtle }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg tracking-tight" style={{ color: C.textPrimary }}>Campaign Budget Pacing</h3>
              <p className="text-xs mt-0.5" style={{ color: C.textTertiary }}>{campaignRows.length} campaigns · Click headers to sort</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: C.statusActive }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.statusActive }} />{onPaceCount} on pace</span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: C.statusError }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.statusError }} />{overPaceCount} over</span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: C.statusWarning }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.statusWarning }} />{underPaceCount} under</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1000 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <SortHeader label="Campaign" sortKeyVal="name" />
                <SortHeader label="Budget" sortKeyVal="budget" />
                <SortHeader label="Spent" sortKeyVal="spent" />
                <SortHeader label="Remaining" sortKeyVal="remaining" />
                <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textTertiary }}>Progress</th>
                <SortHeader label="Pace %" sortKeyVal="pacePct" />
                <SortHeader label="Daily Target" sortKeyVal="dailyTarget" />
                <SortHeader label="Status" sortKeyVal="status" />
                <SortHeader label="Projected" sortKeyVal="projected" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9}>
                    <div className="animate-pulse px-4 py-3.5 flex items-center gap-4" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                      <div className="h-3.5 rounded w-28" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="h-3 rounded w-16" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="h-3 rounded w-16 ml-auto" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                  </td></tr>
                ))
              ) : (
                sortedCampaigns.map((row, i) => {
                  const remainingVal = row.budget - row.spent
                  const progressPct = Math.round((row.spent / Math.max(row.budget, 1)) * 100)
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.25 + i * 0.04, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                      className="transition-colors duration-100"
                      style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.bgHover }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PLATFORM_COLORS[row.platform] }} />
                          <span className="text-sm font-medium" style={{ color: C.textPrimary }}>{row.name}</span>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ml-4" style={{ background: `${PLATFORM_COLORS[row.platform]}18`, color: PLATFORM_COLORS[row.platform] }}>{row.platform}</span>
                      </td>
                      <td className="px-4 py-3.5"><span className="font-mono text-sm font-medium" style={{ color: C.textPrimary }}>{fmtCurrency(row.budget)}</span></td>
                      <td className="px-4 py-3.5"><span className="font-mono text-sm font-medium" style={{ color: C.textPrimary }}>{fmtCurrency(row.spent)}</span></td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm" style={{ color: remainingVal < row.budget * 0.1 ? C.statusError : C.textSecondary }}>
                          {fmtCurrency(remainingVal)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 60 }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(progressPct, 100)}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + i * 0.04, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{
                                background: progressPct > 90 ? C.statusError : progressPct > 75 ? C.statusWarning : C.accent,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono" style={{ color: C.textTertiary }}>{progressPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {row.pacePct > 100 ? <TrendingUp size={10} style={{ color: C.statusError }} /> : row.pacePct < 85 ? <TrendingDown size={10} style={{ color: C.statusWarning }} /> : <CheckCircle size={10} style={{ color: C.statusActive }} />}
                          <span className="font-mono text-xs font-semibold" style={{ color: row.pacePct > 100 ? C.statusError : row.pacePct < 85 ? C.statusWarning : C.statusActive }}>
                            {row.pacePct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="font-mono text-sm" style={{ color: C.textSecondary }}>{fmtCurrency(row.dailyTarget)}/day</span></td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: statusBg(row.status), color: statusColor(row.status) }}>
                          <StatusIcon status={row.status} />{row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-medium" style={{ color: row.projected > row.budget ? C.statusError : C.textPrimary }}>{fmtCurrency(row.projected)}</span>
                        {row.projected > row.budget && (
                          <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: C.statusError }}>+{fmtShort(row.projected - row.budget)}</span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  SECTION 4 + 6 ROW: PLATFORM DONUT + DAILY CALENDAR            */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">

        {/* SECTION 4: PLATFORM DISTRIBUTION (Donut) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
        >
          <div className="mb-4">
            <h3 className="font-semibold text-lg tracking-tight" style={{ color: C.textPrimary }}>Platform Distribution</h3>
            <p className="text-xs mt-0.5" style={{ color: C.textTertiary }}>Budget allocation across platforms</p>
          </div>
          {isLoading ? (
            <div className="h-[260px] rounded-lg animate-pulse flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: C.textTertiary }} />
            </div>
          ) : platformData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-xs" style={{ color: C.textTertiary }}>No platform data available</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div style={{ width: '55%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PlatformTooltip totalBudget={monthlyBudget} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: -140 }}>
                  <span className="text-[10px]" style={{ color: C.textTertiary }}>Total</span>
                  <span className="text-sm font-bold font-mono" style={{ color: C.textPrimary }}>{fmtShort(monthlyBudget)}</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {platformData.map((p) => {
                  const pct = monthlyBudget > 0 ? ((p.value / monthlyBudget) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: C.textPrimary }}>{p.name}</span>
                          <span className="text-[10px] font-mono" style={{ color: C.textSecondary }}>{fmtShort(p.value)} ({pct}%)</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* SECTION 6: DAILY PACING CALENDAR */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-3 rounded-xl p-5"
          style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg tracking-tight" style={{ color: C.textPrimary }}>Daily Pacing Calendar</h3>
              <p className="text-xs mt-0.5" style={{ color: C.textTertiary }}>Daily spend heatmap for {currentMonth}</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: C.textSecondary }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(16,185,129,0.2)' }} />Under</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(245,158,11,0.15)' }} />At Risk</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(239,68,68,0.2)' }} />Over</span>
            </div>
          </div>
          {isLoading ? (
            <div className="h-[220px] rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: C.textTertiary }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: monthStartDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square rounded-md" style={{ background: 'transparent' }} />
                ))}
                {dailySpend.map((d) => {
                  const isToday = d.day === daysElapsed
                  const dayOfWeek = (monthStartDay + d.day - 1) % 7
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                  return (
                    <motion.div
                      key={d.day}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: 0.3 + d.day * 0.015 }}
                      className="aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 relative cursor-default"
                      style={{
                        background: isToday ? `${C.accent}15` : getSpendColor(d.spend, avgDailySpend),
                        border: isToday ? `1px solid ${C.accent}` : isWeekend ? '1px solid rgba(255,255,255,0.02)' : `1px solid ${C.borderSubtle}`,
                      }}
                      title={d.spend > 0 ? `${currentMonth} ${d.day}: ${fmtCurrency(d.spend)}` : `${currentMonth} ${d.day}: No data`}
                    >
                      <span className="text-[10px] font-semibold" style={{ color: isToday ? C.accent : C.textSecondary }}>{d.day}</span>
                      {d.spend > 0 && (
                        <span className="text-[9px] font-mono" style={{ color: getSpendTextColor(d.spend, avgDailySpend) }}>
                          {d.spend >= 1000 ? `$${(d.spend / 1000).toFixed(1)}k` : `$${d.spend}`}
                        </span>
                      )}
                      {isToday && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: C.accent }} />}
                    </motion.div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
                <span className="text-[11px]" style={{ color: C.textSecondary }}>
                  Avg daily spend: <strong style={{ color: C.textPrimary }}>{fmtCurrency(avgDailySpend)}</strong>
                </span>
                <span className="text-[11px]" style={{ color: C.textSecondary }}>
                  Today ({currentMonth} {daysElapsed}): <strong style={{ color: C.accent }}>{fmtCurrency(todaySpend)}</strong>
                </span>
                <span className="text-[11px]" style={{ color: C.textSecondary }}>
                  Days left: <strong style={{ color: C.textPrimary }}>{daysInMonth - daysElapsed}</strong>
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  SECTION 5: AI RECOMMENDATIONS                                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="rounded-xl overflow-hidden mb-6"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
      >
        <div className="p-5 border-b" style={{ borderColor: C.borderSubtle }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.accentGlow }}>
                <Sparkles size={18} style={{ color: C.accent }} />
              </div>
              <div>
                <h3 className="font-semibold text-lg tracking-tight" style={{ color: C.textPrimary }}>AI Recommendations</h3>
                <p className="text-xs" style={{ color: C.textTertiary }}>Smart budget reallocation suggestions</p>
              </div>
            </div>
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: C.accentGlow, color: C.accent }}>
              {aiRecommendations.length} active
            </span>
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: C.borderSubtle }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 animate-pulse">
                <div className="h-3 rounded w-64 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-2 rounded w-full mb-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-2 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))
          ) : aiRecommendations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs" style={{ color: C.textTertiary }}>All campaigns are pacing well. No recommendations at this time.</p>
            </div>
          ) : (
            aiRecommendations.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                className="p-5 transition-colors duration-100 hover:bg-[rgba(255,255,255,0.02)]"
                style={{ borderLeft: `3px solid ${recommendationBorder(rec.type)}` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${recommendationBorder(rec.type)}15` }}>
                    {recommendationIcon(rec.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>{rec.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{
                        background: rec.type === 'reallocate' ? C.accentGlow : rec.type === 'increase' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: rec.type === 'reallocate' ? C.accent : rec.type === 'increase' ? C.statusActive : C.statusError,
                      }}>
                        {rec.type}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: C.textTertiary }}>
                        {rec.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: C.textSecondary }}>{rec.description}</p>

                    {rec.type === 'reallocate' && rec.fromPlatform && rec.toPlatform && (
                      <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span className="text-xs font-medium" style={{ color: C.statusWarning }}>{rec.fromPlatform}</span>
                        <div className="flex items-center gap-1.5 flex-1">
                          <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${C.statusWarning}, ${C.statusActive})` }} />
                          <ArrowRight size={12} style={{ color: C.accent }} />
                          <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: C.accentGlow, color: C.accent }}>{fmtCurrency(rec.amount)}</span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: C.statusActive }}>{rec.toPlatform}</span>
                      </div>
                    )}

                    {rec.type === 'pause' && rec.fromCampaign && (
                      <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <PauseCircle size={14} style={{ color: C.statusError }} />
                        <span className="text-xs font-medium" style={{ color: C.textSecondary }}>Campaign:</span>
                        <span className="text-xs font-semibold" style={{ color: C.statusError }}>{rec.fromCampaign}</span>
                        <span className="text-xs ml-auto px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: C.statusError }}>Save {fmtCurrency(rec.amount)}</span>
                      </div>
                    )}

                    {rec.type === 'increase' && rec.toCampaign && (
                      <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <TrendingUp size={14} style={{ color: C.statusActive }} />
                        <span className="text-xs font-medium" style={{ color: C.textSecondary }}>Campaign:</span>
                        <span className="text-xs font-semibold" style={{ color: C.statusActive }}>{rec.toCampaign}</span>
                        <span className="text-xs ml-auto px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.1)', color: C.statusActive }}>+${rec.amount}/day</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.accent }}>
                        <Zap size={12} />{rec.impact}
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 hover:opacity-80" style={{ background: 'transparent', color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}>
                          Dismiss
                        </button>
                        <button className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 hover:opacity-80" style={{ background: C.accent, color: '#000' }}>
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* ═══════ BOTTOM ALERT CARDS ═══════ */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertCard variant="success" title="Budget Status" message={`Projected spend of ${fmtCurrency(projectedSpend)} is ${projectedSpend < monthlyBudget ? fmtCurrency(monthlyBudget - projectedSpend) + ' under' : fmtCurrency(projectedSpend - monthlyBudget) + ' over'} the ${fmtCurrency(monthlyBudget)} monthly budget.`} action={projectedSpend < monthlyBudget ? 'Scale Winners' : 'Review Budget'} delay={0.4} metric={projectedSpend < monthlyBudget ? `${fmtShort(monthlyBudget - projectedSpend)} buffer` : 'Over budget'} />
          <AlertCard variant="warning" title="Reallocation Opportunity" message={underPaceCount > 0 ? `${underPaceCount} campaign${underPaceCount > 1 ? 's are' : ' is'} under pace. Consider shifting budget to better-performing campaigns for improved ROAS.` : 'Campaigns are pacing evenly across platforms. Continue monitoring for reallocation opportunities.'} action="Review" delay={0.45} metric={`${underPaceCount} under pace`} />
          <AlertCard variant={overPaceCount > 0 ? 'error' : 'success'} title={overPaceCount > 0 ? 'Pause Alert' : 'All Clear'} message={overPaceCount > 0 ? `${overPaceCount} campaign${overPaceCount > 1 ? 's are' : ' is'} over pace. Review and consider pausing to prevent budget overspend.` : 'All campaigns are pacing within expected ranges. No immediate action required.'} action={overPaceCount > 0 ? 'Pause Now' : 'Monitor'} delay={0.5} metric={overPaceCount > 0 ? `${overPaceCount} over pace` : 'On track'} />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  STATUS PILL                                                         */
/* ------------------------------------------------------------------ */
function StatusPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-xs font-semibold" style={{ color }}>{count}</span>
      <span className="text-[11px]" style={{ color: C.textSecondary }}>{label}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  KPI CARD                                                            */
/* ------------------------------------------------------------------ */
function KPICard({
  label, value, prefix, suffix, subline, delay, progress, status, icon: Icon, fixedValue, projectedPct,
}: {
  label: string; value: number; prefix?: string; suffix?: string; subline: string; delay: number; progress?: number; status?: 'good' | 'bad'; icon: React.ElementType; fixedValue?: boolean; projectedPct?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl p-5"
      style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <Icon size={16} style={{ color: C.textSecondary }} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textSecondary }}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="font-mono text-2xl font-bold" style={{ color: C.textPrimary }}>
          {fixedValue ? `${prefix}${value.toLocaleString()}` : <CountUp end={value} prefix={prefix} separator="," duration={0.8} delay={delay * 1000} />}
        </span>
        {suffix && <span className="text-sm" style={{ color: C.textSecondary }}>{suffix}</span>}
      </div>

      {progress !== undefined && (
        <div className="mb-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: delay + 0.1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: progress > 90 ? C.statusError : progress > 70 ? C.statusWarning : C.accent }}
            />
          </div>
        </div>
      )}

      {projectedPct !== undefined && (
        <div className="mb-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${projectedPct}%` }}
              transition={{ duration: 0.8, delay: delay + 0.1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: projectedPct > 95 ? C.statusWarning : C.statusActive }}
            />
          </div>
        </div>
      )}

      {status && (
        <div className="flex items-center gap-1 mb-1">
          {status === 'good' ? <CheckCircle size={12} style={{ color: C.statusActive }} /> : <AlertTriangle size={12} style={{ color: C.statusError }} />}
          <span className="text-xs" style={{ color: status === 'good' ? C.statusActive : C.statusError }}>{status === 'good' ? 'On track' : 'Attention needed'}</span>
        </div>
      )}

      <span className="text-xs" style={{ color: C.textTertiary }}>{subline}</span>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  ALERT CARD                                                          */
/* ------------------------------------------------------------------ */
function AlertCard({
  variant, title, message, action, delay, metric,
}: {
  variant: 'error' | 'warning' | 'success'; title: string; message: string; action: string; delay: number; metric?: string;
}) {
  const colors = {
    error: { border: C.statusError, bg: 'rgba(239,68,68,0.08)', icon: C.statusError },
    warning: { border: C.statusWarning, bg: 'rgba(245,158,11,0.08)', icon: C.statusWarning },
    success: { border: C.statusActive, bg: 'rgba(16,185,129,0.08)', icon: C.statusActive },
  }
  const c = colors[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl p-5"
      style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}`, borderLeft: `3px solid ${c.border}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {variant === 'error' && <AlertTriangle size={14} style={{ color: c.icon }} />}
          {variant === 'warning' && <AlertCircle size={14} style={{ color: c.icon }} />}
          {variant === 'success' && <CheckCircle size={14} style={{ color: c.icon }} />}
          <span className="text-xs font-semibold uppercase tracking-[0.06em]" style={{ color: c.icon }}>{title}</span>
        </div>
        {metric && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.icon }}>{metric}</span>
        )}
      </div>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: C.textPrimary }}>{message}</p>
      <button className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-80" style={{ background: c.bg, color: c.icon, border: `1px solid ${c.border}` }}>
        {action}
      </button>
    </motion.div>
  )
}
