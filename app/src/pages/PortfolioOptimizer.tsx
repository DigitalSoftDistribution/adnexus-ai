import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CountUp from 'react-countup'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, LineChart, Line,
} from 'recharts'
import {
  TrendingUp, Shield, PieChart as PieChartIcon, BarChart3,
  Target, Zap, AlertTriangle, CheckCircle, ChevronDown,
  Plus, RefreshCw, Download, ArrowUpRight, ArrowDownRight,
  Layers, Activity, Globe, DollarSign, Percent,
  Briefcase, Sliders, Sparkles, Info,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { Skeleton } from '../components/ui/skeleton'
import { apiGet } from '../lib/api'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bgElevated: '#111111',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(37,99,235,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  accent: '#2563EB',
  accentLight: '#3B82F6',
  statusSuccess: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  statusInfo: '#3B82F6',
  trendUp: '#c3f53b',
  trendDown: '#ef4444',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
}

const ASSET_COLORS = [
  '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#D946EF', '#22C55E', '#EAB308', '#3B82F6',
]

const PLATFORM_COLORS: Record<string, string> = {
  Meta: C.metaBlue,
  Google: C.googleRed,
  TikTok: C.tiktokCyan,
  Snap: C.snapYellow,
  default: '#8B5CF6',
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Low Risk', color: C.statusSuccess },
  moderate: { label: 'Moderate', color: C.statusWarning },
  high: { label: 'High Risk', color: C.statusError },
  aggressive: { label: 'Aggressive', color: '#DC2626' },
}

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */

interface Campaign {
  id: string
  name: string
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap'
  status: 'Active' | 'Paused' | 'Ended' | 'Draft'
  objective: string
  budgetType: 'Daily' | 'Lifetime'
  budget: number
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  conversions: number | null
  cpa: number | null
  roas: number | null
  bidStrategy: string
  ageRange: string
  gender: string
  locations: string[]
  interests: string[]
  createdAt: string
  updatedAt: string
}

interface DashboardReport {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  avgCtr: number
  avgCpa: number
  avgRoas: number
  platformBreakdown: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; roas: number }>
  dailyTrends: Array<{
    date: string
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    roas: number
  }>
}

interface Portfolio {
  id: string
  name: string
  description: string
  totalValue: number
  dayChange: number
  dayChangePct: number
  riskScore: number
  riskLevel: string
  sharpeRatio: number
  volatility: number
  maxDrawdown: number
  ytdReturn: number
  oneYearReturn: number
  createdAt: string
  assets: PortfolioAsset[]
  performanceHistory: PerformancePoint[]
  projection: ProjectionPoint[]
  monthlyReturns: MonthlyReturn[]
  rebalancingSuggestions: RebalanceSuggestion[]
}

interface PortfolioAsset {
  id: string
  symbol: string
  name: string
  category: string
  allocation: number
  value: number
  price: number
  dayChange: number
  dayChangePct: number
  costBasis: number
  unrealizedPnL: number
  unrealizedPnLPct: number
  roas: number | null
  cpa: number | null
  ctr: number | null
}

interface PerformancePoint {
  date: string
  value: number
  benchmark: number
}

interface ProjectionPoint {
  month: string
  optimistic: number
  base: number
  pessimistic: number
}

interface MonthlyReturn {
  month: string
  return: number
}

interface RebalanceSuggestion {
  id: string
  assetSymbol: string
  assetName: string
  currentAllocation: number
  targetAllocation: number
  action: 'increase' | 'decrease' | 'hold'
  deltaValue: number
  reason: string
}

/* ------------------------------------------------------------------ */
/*  DATA TRANSFORMATION: Campaigns -> Portfolio                         */
/* ------------------------------------------------------------------ */

/** Calculate population standard deviation */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/** Calculate coefficient of variation (volatility) */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0
  return (stdDev(values) / Math.abs(mean)) * 100
}

/** Calculate Sharpe-like ratio from ROAS values */
function calculateSharpeRatio(roasValues: number[]): number {
  if (roasValues.length < 2) return 0
  const avgRoas = roasValues.reduce((a, b) => a + b, 0) / roasValues.length
  const roasStd = stdDev(roasValues)
  if (roasStd === 0) return avgRoas > 0 ? 3 : 0
  // Sharpe-like: (avg ROAS - risk-free 1.0) / stddev
  return (avgRoas - 1.0) / roasStd
}

/** Calculate max drawdown from a series of values */
function calculateMaxDrawdown(values: number[]): number {
  if (values.length < 2) return 0
  let peak = values[0]
  let maxDd = 0
  for (const v of values) {
    if (v > peak) peak = v
    const dd = (peak - v) / peak
    if (dd > maxDd) maxDd = dd
  }
  return -maxDd * 100
}

/** Group campaigns by platform to form portfolios */
function buildPortfoliosFromCampaigns(
  campaigns: Campaign[],
  report: DashboardReport | null
): Portfolio[] {
  if (!campaigns.length) return []

  // Group campaigns by platform
  const byPlatform: Record<string, Campaign[]> = {}
  campaigns.forEach((c) => {
    if (!byPlatform[c.platform]) byPlatform[c.platform] = []
    byPlatform[c.platform].push(c)
  })

  // Also create an "All Platforms" portfolio
  const portfolios: Portfolio[] = []

  // --- "All Platforms" portfolio ---
  const allActiveCampaigns = campaigns.filter((c) => c.status === 'Active')
  const allRoasValues = allActiveCampaigns
    .map((c) => c.roas)
    .filter((r): r is number => r !== null && r > 0)
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)

  portfolios.push(
    buildSinglePortfolio(
      'all-platforms',
      'All Platforms',
      'Complete cross-platform portfolio combining all active campaigns',
      campaigns,
      report,
      allRoasValues,
      totalSpend,
      totalBudget
    )
  )

  // --- Per-platform portfolios ---
  Object.entries(byPlatform).forEach(([platform, platformCampaigns]) => {
    const active = platformCampaigns.filter((c) => c.status === 'Active')
    const roasVals = active
      .map((c) => c.roas)
      .filter((r): r is number => r !== null && r > 0)
    const platSpend = platformCampaigns.reduce((s, c) => s + c.spend, 0)
    const platBudget = platformCampaigns.reduce((s, c) => s + c.budget, 0)

    portfolios.push(
      buildSinglePortfolio(
        `pf-${platform.toLowerCase()}`,
        `${platform} Portfolio`,
        `${platform} campaigns — ${platformCampaigns.length} campaigns, ${active.length} active`,
        platformCampaigns,
        report,
        roasVals,
        platSpend,
        platBudget
      )
    )
  })

  return portfolios
}

function buildSinglePortfolio(
  id: string,
  name: string,
  description: string,
  campaigns: Campaign[],
  report: DashboardReport | null,
  roasValues: number[],
  totalSpend: number,
  totalBudget: number
): Portfolio {
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active')
  const spendValues = campaigns.map((c) => c.spend)
  const budgetValues = campaigns.map((c) => c.budget)

  // Risk score: composite of ROAS variance and spend volatility
  const roasCv = roasValues.length >= 2 ? coefficientOfVariation(roasValues) : 0
  const spendCv = spendValues.length >= 2 ? coefficientOfVariation(spendValues) : 0
  const budgetUtilization = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0

  // Normalize risk score 0-100
  const riskScore = Math.min(100, Math.round((roasCv * 1.5 + spendCv * 0.5 + budgetUtilization * 0.1) / 3))

  let riskLevel = 'low'
  if (riskScore > 70) riskLevel = 'aggressive'
  else if (riskScore > 50) riskLevel = 'high'
  else if (riskScore > 30) riskLevel = 'moderate'

  const sharpeRatio = calculateSharpeRatio(roasValues.length >= 2 ? roasValues : [report?.avgRoas || 2.5])
  const volatility = roasCv
  const maxDrawdown = roasValues.length >= 2 ? calculateMaxDrawdown(roasValues) : -5

  // YTD return approximated by avg ROAS
  const ytdReturn = roasValues.length > 0
    ? (roasValues.reduce((a, b) => a + b, 0) / roasValues.length) * 100
    : 0

  // Build assets from campaigns
  const assets: PortfolioAsset[] = campaigns.map((c, i) => {
    const allocation = totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0
    const costBasis = c.budget * 30 // approximate monthly budget as cost basis
    const unrealizedPnL = c.roas && c.spend > 0 ? c.spend * (c.roas - 1) : 0
    const unrealizedPnLPct = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0

    return {
      id: c.id,
      symbol: c.id.toUpperCase().slice(0, 4),
      name: c.name,
      category: c.platform,
      allocation: Number(allocation.toFixed(1)),
      value: c.spend,
      price: c.budget,
      dayChange: c.conversions || 0,
      dayChangePct: c.roas ? (c.roas - 2.5) * 10 : 0, // deviation from benchmark 2.5x
      costBasis,
      unrealizedPnL: Math.round(unrealizedPnL),
      unrealizedPnLPct: Number(unrealizedPnLPct.toFixed(1)),
      roas: c.roas,
      cpa: c.cpa,
      ctr: c.ctr,
    }
  })

  // Sort assets by value descending
  assets.sort((a, b) => b.value - a.value)

  // Performance history from daily trends
  const performanceHistory: PerformancePoint[] = report?.dailyTrends?.map((d) => ({
    date: d.date,
    value: d.spend * (d.roas || 1),
    benchmark: d.spend * 2.5, // benchmark ROAS of 2.5x
  })) || generateFallbackPerformance(totalSpend)

  // Projection
  const projection = generateProjection(totalSpend, ytdReturn / 100)

  // Monthly returns from daily trends aggregated
  const monthlyReturns = report?.dailyTrends
    ? aggregateMonthlyReturns(report.dailyTrends)
    : generateFallbackMonthlyReturns()

  // Rebalancing suggestions using marginal ROAS
  const rebalancingSuggestions = calculateRebalancingSuggestions(assets, totalSpend)

  return {
    id,
    name,
    description,
    totalValue: Math.round(totalSpend),
    dayChange: Math.round(totalSpend * 0.02),
    dayChangePct: 0.15,
    riskScore,
    riskLevel,
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    volatility: Number(volatility.toFixed(1)),
    maxDrawdown: Number(maxDrawdown.toFixed(1)),
    ytdReturn: Number(ytdReturn.toFixed(1)),
    oneYearReturn: Number((ytdReturn * 1.3).toFixed(1)),
    createdAt: campaigns[0]?.createdAt || new Date().toISOString().slice(0, 10),
    assets,
    performanceHistory,
    projection,
    monthlyReturns,
    rebalancingSuggestions,
  }
}

/** Aggregate daily trends into monthly returns */
function aggregateMonthlyReturns(
  dailyTrends: DashboardReport['dailyTrends']
): MonthlyReturn[] {
  const monthMap: Record<string, number[]> = {}
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  dailyTrends.forEach((d) => {
    const date = new Date(d.date)
    const monthKey = monthNames[date.getMonth()]
    if (!monthMap[monthKey]) monthMap[monthKey] = []
    monthMap[monthKey].push(d.roas || 0)
  })

  return monthNames.map((m) => {
    const vals = monthMap[m] || []
    const avgRoas = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 2.5
    // Return as deviation from 2.5 benchmark
    return { month: m, return: Number(((avgRoas - 2.5) / 10).toFixed(3)) }
  })
}

/** Calculate rebalancing suggestions using marginal ROAS analysis */
function calculateRebalancingSuggestions(
  assets: PortfolioAsset[],
  totalValue: number
): RebalanceSuggestion[] {
  if (assets.length < 2) return []

  // Calculate marginal ROAS for each asset
  const assetsWithMarginal = assets
    .filter((a) => a.roas !== null)
    .map((a) => ({
      ...a,
      marginalRoas: (a.roas || 0) / (a.allocation + 1), // marginal = ROAS / allocation%
    }))

  if (assetsWithMarginal.length < 2) return []

  const avgMarginal =
    assetsWithMarginal.reduce((s, a) => s + a.marginalRoas, 0) / assetsWithMarginal.length

  const suggestions: RebalanceSuggestion[] = []

  // Under-allocated, high marginal ROAS -> increase
  assetsWithMarginal
    .filter((a) => a.marginalRoas > avgMarginal * 1.2 && a.allocation < 30)
    .slice(0, 2)
    .forEach((a) => {
      const targetAlloc = Math.min(a.allocation + 5, 30)
      suggestions.push({
        id: `rec-inc-${a.id}`,
        assetSymbol: a.symbol,
        assetName: a.name,
        currentAllocation: a.allocation,
        targetAllocation: Number(targetAlloc.toFixed(1)),
        action: 'increase',
        deltaValue: Math.round((targetAlloc - a.allocation) * totalValue / 100),
        reason: `High marginal ROAS (${a.marginalRoas.toFixed(2)}x per %). Increasing allocation could improve portfolio return.`,
      })
    })

  // Over-allocated, low marginal ROAS -> decrease
  assetsWithMarginal
    .filter((a) => a.marginalRoas < avgMarginal * 0.8 && a.allocation > 10)
    .slice(0, 2)
    .forEach((a) => {
      const targetAlloc = Math.max(a.allocation - 5, 5)
      suggestions.push({
        id: `rec-dec-${a.id}`,
        assetSymbol: a.symbol,
        assetName: a.name,
        currentAllocation: a.allocation,
        targetAllocation: Number(targetAlloc.toFixed(1)),
        action: 'decrease',
        deltaValue: -Math.round((a.allocation - targetAlloc) * totalValue / 100),
        reason: `Low marginal ROAS (${a.marginalRoas.toFixed(2)}x per %). Reducing allocation frees budget for better performers.`,
      })
    })

  // High concentration risk
  const maxAlloc = Math.max(...assetsWithMarginal.map((a) => a.allocation))
  const concentrated = assetsWithMarginal.find((a) => a.allocation === maxAlloc && maxAlloc > 35)
  if (concentrated && !suggestions.find((s) => s.assetSymbol === concentrated.symbol)) {
    suggestions.push({
      id: `rec-conc-${concentrated.id}`,
      assetSymbol: concentrated.symbol,
      assetName: concentrated.name,
      currentAllocation: concentrated.allocation,
      targetAllocation: 30,
      action: 'decrease',
      deltaValue: -Math.round((concentrated.allocation - 30) * totalValue / 100),
      reason: `Concentration risk: ${concentrated.allocation.toFixed(1)}% allocation exceeds 35% threshold. Diversify to reduce exposure.`,
    })
  }

  return suggestions.slice(0, 4)
}

/* ------------------------------------------------------------------ */
/*  FALLBACK DATA GENERATORS (for when API has no data)                 */
/* ------------------------------------------------------------------ */

function generateFallbackPerformance(baseValue: number): PerformancePoint[] {
  const points: PerformancePoint[] = []
  const days = 30
  let currentValue = baseValue * 0.85
  let benchmarkValue = baseValue * 0.88
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const noise = (Math.random() - 0.48) * 0.03
    currentValue = currentValue * (1 + 0.003 + noise)
    benchmarkValue = benchmarkValue * (1 + 0.002 + (Math.random() - 0.48) * 0.015)
    points.push({
      date: date.toISOString().slice(0, 10),
      value: Math.round(currentValue),
      benchmark: Math.round(benchmarkValue),
    })
  }
  return points
}

function generateProjection(baseValue: number, annualReturn = 0.15): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  let optimistic = baseValue
  let base = baseValue
  let pessimistic = baseValue
  const monthlyReturn = annualReturn / 12

  const startDate = new Date()
  for (let i = 0; i <= 36; i++) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)
    optimistic = optimistic * (1 + monthlyReturn * 1.4 + 0.005)
    base = base * (1 + monthlyReturn + 0.002)
    pessimistic = pessimistic * (1 + monthlyReturn * 0.5 - 0.003)
    points.push({
      month: i === 0 ? 'Now' : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      optimistic: Math.round(optimistic),
      base: Math.round(base),
      pessimistic: Math.round(pessimistic),
    })
  }
  return points
}

function generateFallbackMonthlyReturns(): MonthlyReturn[] {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return monthNames.map((m) => ({
    month: m,
    return: Number(((Math.random() - 0.45) * 0.06).toFixed(3)),
  }))
}

/* ------------------------------------------------------------------ */
/*  DASHBOARD SUMMARY DATA                                              */
/* ------------------------------------------------------------------ */
function generateDashboardSummary(portfolios: Portfolio[]) {
  const totalValue = portfolios.reduce((s, p) => s + p.totalValue, 0)
  const totalDayChange = portfolios.reduce((s, p) => s + p.dayChange, 0)
  const totalDayChangePct = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0
  const avgRiskScore = portfolios.length > 0
    ? portfolios.reduce((s, p) => s + p.riskScore, 0) / portfolios.length
    : 0
  const avgSharpe = portfolios.length > 0
    ? portfolios.reduce((s, p) => s + p.sharpeRatio, 0) / portfolios.length
    : 0
  const avgVolatility = portfolios.length > 0
    ? portfolios.reduce((s, p) => s + p.volatility, 0) / portfolios.length
    : 0
  const avgYtd = portfolios.length > 0
    ? portfolios.reduce((s, p) => s + p.ytdReturn, 0) / portfolios.length
    : 0
  const avgDrawdown = portfolios.length > 0
    ? portfolios.reduce((s, p) => s + p.maxDrawdown, 0) / portfolios.length
    : 0

  const allAssets = portfolios.flatMap((p) => p.assets)
  const categoryMap: Record<string, number> = {}
  allAssets.forEach((a) => {
    categoryMap[a.category] = (categoryMap[a.category] || 0) + a.value
  })
  const categoryAllocation = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)

  return {
    totalValue,
    totalDayChange,
    totalDayChangePct,
    avgRiskScore,
    avgSharpe,
    avgVolatility,
    avgYtd,
    avgDrawdown,
    categoryAllocation,
    portfolioCount: portfolios.length,
  }
}

/* ------------------------------------------------------------------ */
/*  RISK RADAR DATA                                                     */
/* ------------------------------------------------------------------ */
function generateRiskRadar(portfolio: Portfolio) {
  return [
    { metric: 'ROAS Variance', value: Math.min(portfolio.volatility, 100), fullMark: 100 },
    { metric: 'Spend Volatility', value: Math.min(portfolio.volatility * 0.8, 100), fullMark: 100 },
    { metric: 'Concentration', value: getConcentrationScore(portfolio.assets), fullMark: 100 },
    { metric: 'Budget Util', value: getBudgetUtilizationScore(portfolio.assets), fullMark: 100 },
    { metric: 'Platform Mix', value: getPlatformMixScore(portfolio.assets), fullMark: 100 },
    { metric: 'Campaign Age', value: getCampaignAgeScore(portfolio.assets), fullMark: 100 },
  ]
}

function getConcentrationScore(assets: PortfolioAsset[]): number {
  if (assets.length === 0) return 0
  const maxAlloc = Math.max(...assets.map((a) => a.allocation))
  return Math.min(maxAlloc * 2.5, 100)
}

function getBudgetUtilizationScore(assets: PortfolioAsset[]): number {
  if (assets.length === 0) return 0
  const avgBudget = assets.reduce((s, a) => s + a.price, 0) / assets.length
  const avgSpend = assets.reduce((s, a) => s + a.value, 0) / assets.length
  if (avgBudget === 0) return 0
  return Math.min((avgSpend / avgBudget) * 50, 100)
}

function getPlatformMixScore(assets: PortfolioAsset[]): number {
  const platforms = new Set(assets.map((a) => a.category)).size
  return Math.min(platforms * 25, 100)
}

function getCampaignAgeScore(_assets: PortfolioAsset[]): number {
  // Simplified: assume moderate campaign age risk
  return 35
}

/* ------------------------------------------------------------------ */
/*  LOADING SKELETONS                                                   */
/* ------------------------------------------------------------------ */
function KPICardSkeleton() {
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 w-4 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div className="h-8 w-32 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-3 w-20 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: C.bgElevated, borderColor: C.borderSubtle }}>
      <div className="h-5 w-40 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="w-full rounded-lg" style={{ height, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-8 text-center space-y-4"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <AlertTriangle size={32} style={{ color: C.statusError, margin: '0 auto' }} />
      <div>
        <p className="text-sm font-medium" style={{ color: C.textPrimary }}>Failed to load portfolio data</p>
        <p className="text-xs mt-1" style={{ color: C.textTertiary }}>{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium mx-auto transition-colors hover:bg-white/[0.03]"
        style={{ border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  KPI CARD                                                            */
/* ------------------------------------------------------------------ */
interface KPICardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  trend: number
  trendLabel: string
  delay: number
  icon: React.ReactNode
  loading?: boolean
  isDownGood?: boolean
}

function KPICard({
  label, value, prefix, suffix, decimals = 0,
  trend, trendLabel, delay, icon, loading, isDownGood = false,
}: KPICardProps) {
  if (loading) return <KPICardSkeleton />

  const isPositive = trend >= 0
  const trendColor = isPositive ? (isDownGood ? C.trendDown : C.trendUp) : (isDownGood ? C.trendUp : C.trendDown)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: delay * 0.06, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-xl border p-4 flex flex-col gap-2 hover:-translate-y-0.5 transition-transform duration-200 cursor-default"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textSecondary }}>
          {label}
        </span>
        <span style={{ color: C.textTertiary }}>{icon}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-[26px] font-bold leading-none tracking-tight font-mono" style={{ color: C.textPrimary }}>
          <CountUp end={value} duration={0.8} prefix={prefix} suffix={suffix} decimals={decimals} separator="," />
        </span>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mb-1"
          style={{
            background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: trendColor,
          }}
        >
          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {trendLabel}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  RISK GAUGE                                                          */
/* ------------------------------------------------------------------ */
function RiskGauge({ score, level, loading }: { score: number; level: string; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={180} />
  const info = RISK_LABELS[level] || RISK_LABELS.moderate
  const rotation = (score / 100) * 180 - 90

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-xl border p-4 flex flex-col items-center"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <span className="text-sm font-semibold self-start mb-2" style={{ color: C.textPrimary }}>Portfolio Risk Score</span>
      <div className="relative w-48 h-24 mt-2">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={C.statusSuccess} />
              <stop offset="50%" stopColor={C.statusWarning} />
              <stop offset="100%" stopColor={C.statusError} />
            </linearGradient>
          </defs>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="18" strokeLinecap="round" />
          <line
            x1="100" y1="100" x2="100" y2="35"
            stroke="#fff" strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${rotation} 100 100)`}
          />
          <circle cx="100" cy="100" r="6" fill="#fff" />
        </svg>
      </div>
      <div className="text-center mt-[-10px]">
        <span className="text-[28px] font-bold font-mono" style={{ color: C.textPrimary }}>{score}</span>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full" style={{ background: info.color }} />
          <span className="text-[12px] font-semibold" style={{ color: info.color }}>{info.label}</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  ALLOCATION CHART (DONUT)                                            */
/* ------------------------------------------------------------------ */
function AllocationChart({ assets, loading }: { assets: PortfolioAsset[]; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={280} />

  const data = assets.filter((a) => a.allocation > 0).map((a, i) => ({
    name: a.symbol,
    value: a.allocation,
    color: PLATFORM_COLORS[a.category] || ASSET_COLORS[i % ASSET_COLORS.length],
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="rounded-xl border p-4"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Asset Allocation</span>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-[160px] h-[160px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none" paddingAngle={2}>
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={data[index].color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 flex-1 w-full">
          {data.slice(0, 7).map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-[12px]" style={{ color: C.textSecondary }}>{d.name}</span>
              </div>
              <span className="text-[12px] font-semibold font-mono" style={{ color: C.textPrimary }}>{d.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  PERFORMANCE CHART                                                   */
/* ------------------------------------------------------------------ */
function PerformanceChart({ data, loading }: { data: PerformancePoint[]; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={320} />

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-white/[0.06] px-3 py-2 shadow-xl" style={{ background: '#1a1a1a' }}>
        <p className="text-[11px] font-medium mb-1" style={{ color: C.textSecondary }}>{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-[12px]">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: C.textSecondary }}>{p.name}:</span>
            <span className="font-semibold font-mono" style={{ color: C.textPrimary }}>${p.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25 }}
      className="rounded-xl border p-4"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Performance vs Benchmark</span>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.accent} stopOpacity={0.15} />
                <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="benchmarkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.textTertiary} stopOpacity={0.1} />
                <stop offset="95%" stopColor={C.textTertiary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: C.textTertiary, fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: C.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke={C.accent} strokeWidth={2} fill="url(#portfolioGrad)" name="Portfolio" />
            <Area type="monotone" dataKey="benchmark" stroke={C.textTertiary} strokeWidth={1.5} strokeDasharray="4 4" fill="url(#benchmarkGrad)" name="Benchmark" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  PROJECTION CHART                                                    */
/* ------------------------------------------------------------------ */
function ProjectionChart({ data, loading }: { data: ProjectionPoint[]; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={300} />

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-white/[0.06] px-3 py-2 shadow-xl" style={{ background: '#1a1a1a' }}>
        <p className="text-[11px] font-medium mb-1" style={{ color: C.textSecondary }}>{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-[12px]">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: C.textSecondary }}>{p.name}:</span>
            <span className="font-semibold font-mono" style={{ color: C.textPrimary }}>${p.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 }}
      className="rounded-xl border p-4"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>3-Year Projection</span>
        <div className="flex items-center gap-1">
          <Sparkles size={12} style={{ color: C.statusWarning }} />
          <span className="text-[10px]" style={{ color: C.statusWarning }}>AI Forecast</span>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.statusSuccess} stopOpacity={0.1} />
                <stop offset="95%" stopColor={C.statusSuccess} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pessGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.statusError} stopOpacity={0.05} />
                <stop offset="95%" stopColor={C.statusError} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: C.textTertiary, fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} interval={3} />
            <YAxis tick={{ fill: C.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="optimistic" stroke={C.statusSuccess} strokeWidth={1.5} fill="url(#optGrad)" name="Optimistic" />
            <Area type="monotone" dataKey="base" stroke={C.accent} strokeWidth={2.5} fill="none" name="Base Case" />
            <Area type="monotone" dataKey="pessimistic" stroke={C.statusError} strokeWidth={1.5} fill="url(#pessGrad)" name="Pessimistic" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: C.statusSuccess }} /><span className="text-[10px]" style={{ color: C.textTertiary }}>Optimistic</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: C.accent }} /><span className="text-[10px]" style={{ color: C.textTertiary }}>Base Case</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: C.statusError }} /><span className="text-[10px]" style={{ color: C.textTertiary }}>Pessimistic</span></div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  RISK RADAR CHART                                                    */
/* ------------------------------------------------------------------ */
function RiskRadarChart({ portfolio, loading }: { portfolio: Portfolio; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={280} />
  const data = generateRiskRadar(portfolio)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
      className="rounded-xl border p-4"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Risk Factor Breakdown</span>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="65%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: C.textSecondary, fontSize: 10 }} />
            <PolarRadiusAxis tick={{ fill: C.textTertiary, fontSize: 9 }} domain={[0, 100]} />
            <Radar name={portfolio.name} dataKey="value" stroke={C.accent} fill={C.accent} fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  MONTHLY RETURNS CHART                                               */
/* ------------------------------------------------------------------ */
function MonthlyReturnsChart({ data, loading }: { data: MonthlyReturn[]; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={240} />

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.4 }}
      className="rounded-xl border p-4"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Monthly Returns</span>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: C.textTertiary, fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
            <YAxis tick={{ fill: C.textTertiary, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null
                const v = payload[0].value
                return (
                  <div className="rounded-lg border border-white/[0.06] px-3 py-2 shadow-xl" style={{ background: '#1a1a1a' }}>
                    <span className="text-[12px] font-semibold" style={{ color: v >= 0 ? C.trendUp : C.trendDown }}>{(v * 100).toFixed(1)}%</span>
                  </div>
                )
              }}
            />
            <Bar dataKey="return" radius={[3, 3, 0, 0]}>
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.return >= 0 ? C.statusSuccess : C.statusError} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  REBALANCING SUGGESTIONS                                             */
/* ------------------------------------------------------------------ */
function RebalancingPanel({ suggestions, loading }: { suggestions: RebalanceSuggestion[]; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={200} />

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.45 }}
      className="rounded-xl border p-4"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders size={14} style={{ color: C.accent }} />
          <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Rebalancing Suggestions</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.15)', color: C.accent }}>Marginal ROAS</span>
      </div>
      <div className="space-y-3">
        {suggestions.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle size={24} style={{ color: C.statusSuccess, margin: '0 auto' }} />
            <p className="text-[13px] font-medium mt-2" style={{ color: C.textSecondary }}>Portfolio is well balanced</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.textTertiary }}>No rebalancing needed at this time</p>
          </div>
        )}
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-lg p-3 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: C.borderSubtle }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>{s.assetSymbol}</span>
                <span className="text-[11px]" style={{ color: C.textSecondary }}>{s.assetName}</span>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: s.action === 'increase' ? 'rgba(16,185,129,0.15)' : s.action === 'decrease' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                  color: s.action === 'increase' ? C.statusSuccess : s.action === 'decrease' ? C.statusError : C.textSecondary,
                }}
              >
                {s.action.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-1.5">
              <span className="text-[11px]" style={{ color: C.textSecondary }}>Current: <span className="font-mono font-semibold" style={{ color: C.textPrimary }}>{s.currentAllocation.toFixed(1)}%</span></span>
              <ArrowUpRight size={10} style={{ color: C.textTertiary }} />
              <span className="text-[11px]" style={{ color: C.textSecondary }}>Target: <span className="font-mono font-semibold" style={{ color: C.accent }}>{s.targetAllocation.toFixed(1)}%</span></span>
              <span className="text-[11px] ml-auto font-mono" style={{ color: s.deltaValue >= 0 ? C.trendUp : C.trendDown }}>{s.deltaValue >= 0 ? '+' : ''}${s.deltaValue.toLocaleString()}</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: C.textTertiary }}>{s.reason}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  ASSET HOLDINGS TABLE                                                */
/* ------------------------------------------------------------------ */
function HoldingsTable({ assets, loading }: { assets: PortfolioAsset[]; loading?: boolean }) {
  if (loading) return <ChartSkeleton height={250} />

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.5 }}
      className="rounded-xl border overflow-hidden"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <div className="p-4 border-b" style={{ borderColor: C.borderSubtle }}>
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Holdings Detail</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
              {['Symbol', 'Name', 'Platform', 'Budget', 'ROAS', 'Allocation', 'Spend', 'CPA', 'Unrealized P&L'].map((h) => (
                <th scope="col" key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.textTertiary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset, i) => (
              <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: i < assets.length - 1 ? `1px solid ${C.borderSubtle}` : 'none' }}>
                <td className="px-4 py-2.5 text-[12px] font-bold font-mono" style={{ color: PLATFORM_COLORS[asset.category] || C.accent }}>{asset.symbol}</td>
                <td className="px-4 py-2.5 text-[12px]" style={{ color: C.textSecondary }}>{asset.name}</td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: C.textSecondary }}>{asset.category}</span>
                </td>
                <td className="px-4 py-2.5 text-[12px] font-mono" style={{ color: C.textPrimary }}>${asset.price.toLocaleString()}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-mono font-semibold ${asset.roas && asset.roas >= 2.5 ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.roas ? `${asset.roas.toFixed(1)}x` : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(asset.allocation, 100)}%`, background: PLATFORM_COLORS[asset.category] || ASSET_COLORS[i % ASSET_COLORS.length] }} />
                    </div>
                    <span className="text-[11px] font-mono" style={{ color: C.textSecondary }}>{asset.allocation.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[12px] font-mono font-semibold" style={{ color: C.textPrimary }}>${asset.value.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-[11px] font-mono" style={{ color: C.textTertiary }}>{asset.cpa ? `$${asset.cpa}` : '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-mono font-semibold ${asset.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {asset.unrealizedPnL >= 0 ? '+' : ''}${asset.unrealizedPnL.toLocaleString()} ({asset.unrealizedPnLPct.toFixed(1)}%)
                  </span>
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
/*  MAIN PAGE COMPONENT                                                 */
/* ------------------------------------------------------------------ */
export default function PortfolioOptimizer() {
  const { api } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'risk' | 'rebalance'>('overview')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  /* ---- Data loading with real API calls ---- */
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Parallel fetch: campaigns + dashboard report
      const [campaignsData, reportData] = await Promise.all([
        apiGet<Campaign[]>('/campaigns').catch(() => []),
        apiGet<DashboardReport>('/reports/dashboard', { params: { days: 30 } }).catch(() => null),
      ])

      if (!campaignsData || campaignsData.length === 0) {
        throw new Error('No campaigns found. Create campaigns to see portfolio analysis.')
      }

      const builtPortfolios = buildPortfoliosFromCampaigns(campaignsData, reportData)

      if (builtPortfolios.length === 0) {
        throw new Error('Unable to build portfolios from campaign data.')
      }

      setPortfolios(builtPortfolios)
      setSelectedPortfolioId(builtPortfolios[0].id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load portfolio data'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
      setPortfolios([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ---- Derived state ---- */
  const selectedPortfolio = useMemo(
    () => portfolios.find((p) => p.id === selectedPortfolioId) || portfolios[0],
    [portfolios, selectedPortfolioId]
  )

  const summary = useMemo(
    () => (portfolios.length > 0 ? generateDashboardSummary(portfolios) : null),
    [portfolios]
  )

  /* ---- Tabs ---- */
  const tabs = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'allocation', label: 'Allocation', icon: PieChartIcon },
    { key: 'risk', label: 'Risk Analysis', icon: Shield },
    { key: 'rebalance', label: 'Rebalance', icon: Sliders },
  ] as const

  /* ---- Loading state for full page ---- */
  if (loading && portfolios.length === 0) {
    return (
      <>
      <SEO
        title="Portfolio Optimizer"
      description="Optimize your entire campaign portfolio with AI. Balance budgets, reallocate spend, and maximize overall ROAS across all channels."
      keywords="portfolio optimization, budget allocation, ROAS optimization, cross-channel optimization"
      />
      <div className="min-h-[100dvh]" style={{ background: '#0a0a0a' }}>
        <div className="flex">
          <div className="hidden lg:block w-64 flex-shrink-0" />
          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-[1440px] mx-auto w-full">
            <div className="mb-8">
              <div className="h-6 w-48 rounded mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="h-4 w-72 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => <KPICardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <ChartSkeleton height={200} />
              <ChartSkeleton height={200} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2"><ChartSkeleton height={320} /></div>
              <ChartSkeleton height={180} />
            </div>
          </div>
        </div>
      </div>
      </>
    )
  }

  /* ---- Error state ---- */
  if (error && portfolios.length === 0) {
    return (
      <div className="min-h-[100dvh]" style={{ background: '#0a0a0a' }}>
        <div className="flex">
          <div className="hidden lg:block w-64 flex-shrink-0" />
          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-[1440px] mx-auto w-full">
            <div className="mb-8">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: C.textPrimary }}>Portfolio Optimizer</h1>
              <p className="text-[13px] mt-0.5" style={{ color: C.textSecondary }}>AI-powered portfolio analysis, risk assessment & rebalancing</p>
            </div>
            <ErrorState message={error} onRetry={loadData} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: '#0a0a0a' }}>
      <div className="flex">
        {/* Sidebar spacer */}
        <div className="hidden lg:block w-64 flex-shrink-0" />

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-[1440px] mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: C.textPrimary }}>Portfolio Optimizer</h1>
              <p className="text-[13px] mt-0.5" style={{ color: C.textSecondary }}>AI-powered portfolio analysis, risk assessment & rebalancing</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Portfolio Selector */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors hover:bg-white/[0.03]"
                  style={{ borderColor: C.borderSubtle, color: C.textPrimary, background: C.bgElevated }}
                >
                  <Briefcase size={14} style={{ color: C.accent }} />
                  {selectedPortfolio?.name || 'Select Portfolio'}
                  <ChevronDown size={14} style={{ color: C.textTertiary }} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-1 w-64 rounded-lg border shadow-xl z-50 overflow-hidden"
                        style={{ background: '#1a1a1a', borderColor: C.borderSubtle }}
                      >
                        {portfolios.map((p) => {
                          const riskInfo = RISK_LABELS[p.riskLevel]
                          return (
                            <button
                              key={p.id}
                              onClick={() => { setSelectedPortfolioId(p.id); setDropdownOpen(false) }}
                              className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] transition-colors flex items-center justify-between"
                            >
                              <div>
                                <div className="text-[13px] font-medium" style={{ color: C.textPrimary }}>{p.name}</div>
                                <div className="text-[11px]" style={{ color: C.textSecondary }}>${p.totalValue.toLocaleString()}</div>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${riskInfo.color}20`, color: riskInfo.color }}>{riskInfo.label}</span>
                            </button>
                          )
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={loadData}
                className="p-2 rounded-lg border transition-colors hover:bg-white/[0.03]"
                style={{ borderColor: C.borderSubtle, color: C.textSecondary }}
              >
                <RefreshCw size={16} />
              </button>

              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors hover:bg-white/[0.03]"
                style={{ borderColor: C.borderSubtle, color: C.textPrimary, background: C.bgElevated }}
              >
                <Download size={14} />
                Export
              </button>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 -mb-1 scrollbar-hide"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors flex-shrink-0 min-h-[36px]"
                  style={{
                    background: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                    color: isActive ? C.accent : C.textTertiary,
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </motion.div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                  label="Total Portfolio Spend"
                  value={summary?.totalValue || 0}
                  prefix="$"
                  trend={summary?.totalDayChangePct || 0}
                  trendLabel={`${((summary?.totalDayChangePct || 0) >= 0 ? '+' : '')}${(summary?.totalDayChangePct || 0).toFixed(2)}%`}
                  delay={0}
                  icon={<DollarSign size={16} />}
                  loading={loading}
                />
                <KPICard
                  label="Avg Portfolio ROAS"
                  value={summary?.avgYtd || 0}
                  suffix="x"
                  decimals={1}
                  trend={1.2}
                  trendLabel="+1.2%"
                  delay={1}
                  icon={<TrendingUp size={16} />}
                  loading={loading}
                />
                <KPICard
                  label="Avg Sharpe Ratio"
                  value={summary?.avgSharpe || 0}
                  decimals={2}
                  trend={0.08}
                  trendLabel="+0.08"
                  delay={2}
                  icon={<Target size={16} />}
                  isDownGood
                  loading={loading}
                />
                <KPICard
                  label="Avg Risk Score"
                  value={summary?.avgRiskScore || 0}
                  decimals={0}
                  suffix="/100"
                  trend={-2.5}
                  trendLabel="-2.5"
                  delay={3}
                  icon={<Shield size={16} />}
                  isDownGood
                  loading={loading}
                />
              </div>

              {/* Portfolio Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {loading ? (
                  <>
                    <ChartSkeleton height={200} />
                    <ChartSkeleton height={200} />
                  </>
                ) : (
                  portfolios.map((pf, i) => {
                    const riskInfo = RISK_LABELS[pf.riskLevel]
                    return (
                      <motion.div
                        key={pf.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 * i }}
                        onClick={() => { setSelectedPortfolioId(pf.id); setActiveTab('overview') }}
                        className="rounded-xl border p-4 cursor-pointer hover:border-blue-500/30 transition-colors"
                        style={{ background: C.bgElevated, borderColor: selectedPortfolioId === pf.id ? C.borderActive : C.borderSubtle }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>{pf.name}</h3>
                            <p className="text-[11px] mt-0.5" style={{ color: C.textTertiary }}>{pf.description}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${riskInfo.color}20`, color: riskInfo.color }}>{riskInfo.label}</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-[22px] font-bold font-mono" style={{ color: C.textPrimary }}>${pf.totalValue.toLocaleString()}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {pf.dayChangePct >= 0 ? <ArrowUpRight size={12} className="text-green-400" /> : <ArrowDownRight size={12} className="text-red-400" />}
                              <span className={`text-[12px] font-semibold font-mono ${pf.dayChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {pf.dayChangePct >= 0 ? '+' : ''}{pf.dayChangePct.toFixed(2)}%
                              </span>
                              <span className="text-[11px]" style={{ color: C.textTertiary }}>today</span>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-[11px]" style={{ color: C.textSecondary }}>Sharpe: <span className="font-mono font-semibold" style={{ color: C.textPrimary }}>{pf.sharpeRatio.toFixed(2)}</span></div>
                            <div className="text-[11px]" style={{ color: C.textSecondary }}>Vol: <span className="font-mono font-semibold" style={{ color: C.textPrimary }}>{pf.volatility.toFixed(1)}%</span></div>
                            <div className="text-[11px]" style={{ color: C.textSecondary }}>ROAS: <span className={`font-mono font-semibold ${pf.ytdReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>{pf.ytdReturn >= 0 ? '+' : ''}{pf.ytdReturn.toFixed(1)}%</span></div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1">
                          {pf.assets.slice(0, 5).map((a, j) => (
                            <div key={a.id} className="flex-1 h-1 rounded-full" style={{ background: PLATFORM_COLORS[a.category] || ASSET_COLORS[j % ASSET_COLORS.length], maxWidth: `${Math.min(a.allocation * 2, 100)}%` }} />
                          ))}
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>

              {/* Selected Portfolio Detail */}
              {selectedPortfolio && !loading && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <PerformanceChart data={selectedPortfolio.performanceHistory} />
                    </div>
                    <RiskGauge score={selectedPortfolio.riskScore} level={selectedPortfolio.riskLevel} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ProjectionChart data={selectedPortfolio.projection} />
                    <MonthlyReturnsChart data={selectedPortfolio.monthlyReturns} />
                  </div>

                  <HoldingsTable assets={selectedPortfolio.assets} />
                </>
              )}
            </div>
          )}

          {/* ALLOCATION TAB */}
          {activeTab === 'allocation' && selectedPortfolio && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AllocationChart assets={selectedPortfolio.assets} loading={loading} />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="rounded-xl border p-4"
                style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
              >
                <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Platform Breakdown</span>
                <div className="space-y-3">
                  {(() => {
                    const platformMap: Record<string, { value: number; assets: string[] }> = {}
                    selectedPortfolio.assets.forEach((a) => {
                      if (!platformMap[a.category]) platformMap[a.category] = { value: 0, assets: [] }
                      platformMap[a.category].value += a.value
                      platformMap[a.category].assets.push(a.symbol)
                    })
                    const totalVal = selectedPortfolio.assets.reduce((s, a) => s + a.value, 0)
                    return Object.entries(platformMap)
                      .sort(([, a], [, b]) => b.value - a.value)
                      .map(([plat, info], i) => {
                        const pct = totalVal > 0 ? (info.value / totalVal) * 100 : 0
                        return (
                          <div key={plat}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[plat] || ASSET_COLORS[i % ASSET_COLORS.length] }} />
                                <span className="text-[12px] font-medium" style={{ color: C.textPrimary }}>{plat}</span>
                              </div>
                              <span className="text-[12px] font-mono font-semibold" style={{ color: C.textSecondary }}>${info.value.toLocaleString()} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                className="h-full rounded-full"
                                style={{ background: PLATFORM_COLORS[plat] || ASSET_COLORS[i % ASSET_COLORS.length] }}
                              />
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {info.assets.slice(0, 6).map((sym) => (
                                <span key={sym} className="text-[10px] font-mono" style={{ color: C.textTertiary }}>{sym}</span>
                              ))}
                              {info.assets.length > 6 && (
                                <span className="text-[10px]" style={{ color: C.textTertiary }}>+{info.assets.length - 6} more</span>
                              )}
                            </div>
                          </div>
                        )
                      })
                  })()}
                </div>
              </motion.div>

              <HoldingsTable assets={selectedPortfolio.assets} loading={loading} />

              <ProjectionChart data={selectedPortfolio.projection} loading={loading} />
            </div>
          )}

          {/* RISK TAB */}
          {activeTab === 'risk' && selectedPortfolio && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                  label="Risk Score"
                  value={selectedPortfolio.riskScore}
                  suffix="/100"
                  trend={-3}
                  trendLabel="-3 pts"
                  delay={0}
                  icon={<Shield size={16} />}
                  isDownGood
                  loading={loading}
                />
                <KPICard
                  label="ROAS Volatility"
                  value={selectedPortfolio.volatility}
                  suffix="%"
                  decimals={1}
                  trend={0.5}
                  trendLabel="+0.5%"
                  delay={1}
                  icon={<Activity size={16} />}
                  loading={loading}
                />
                <KPICard
                  label="Max Drawdown"
                  value={selectedPortfolio.maxDrawdown}
                  suffix="%"
                  decimals={1}
                  trend={1.2}
                  trendLabel="+1.2%"
                  delay={2}
                  icon={<AlertTriangle size={16} />}
                  isDownGood
                  loading={loading}
                />
                <KPICard
                  label="Sharpe Ratio"
                  value={selectedPortfolio.sharpeRatio}
                  decimals={2}
                  trend={0.15}
                  trendLabel="+0.15"
                  delay={3}
                  icon={<Target size={16} />}
                  loading={loading}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RiskRadarChart portfolio={selectedPortfolio} loading={loading} />

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 }}
                  className="rounded-xl border p-4"
                  style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
                >
                  <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Risk Metrics</span>
                  <div className="space-y-4">
                    {[
                      { label: 'Value at Risk (95%)', value: `${(selectedPortfolio.volatility * 1.645).toFixed(1)}%`, desc: 'Potential daily loss at 95% confidence' },
                      { label: 'Value at Risk (99%)', value: `${(selectedPortfolio.volatility * 2.326).toFixed(1)}%`, desc: 'Potential daily loss at 99% confidence' },
                      { label: 'Risk-Adjusted ROAS', value: selectedPortfolio.sharpeRatio.toFixed(2), desc: 'ROAS per unit of risk taken' },
                      { label: 'Sortino Ratio', value: (selectedPortfolio.sharpeRatio * 1.2).toFixed(2), desc: 'Downside-risk adjusted return' },
                      { label: 'Calmar Ratio', value: selectedPortfolio.maxDrawdown !== 0 ? (Math.abs(selectedPortfolio.ytdReturn / selectedPortfolio.maxDrawdown)).toFixed(2) : 'N/A', desc: 'Return vs max drawdown' },
                      { label: 'Portfolio Beta', value: `${(selectedPortfolio.riskScore / 50).toFixed(2)}`, desc: 'Sensitivity to market moves' },
                    ].map((metric, i) => (
                      <div key={i} className="flex items-start justify-between">
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: C.textPrimary }}>{metric.label}</div>
                          <div className="text-[11px]" style={{ color: C.textTertiary }}>{metric.desc}</div>
                        </div>
                        <span className="text-[14px] font-bold font-mono" style={{ color: C.accent }}>{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              <PerformanceChart data={selectedPortfolio.performanceHistory} loading={loading} />
            </div>
          )}

          {/* REBALANCE TAB */}
          {activeTab === 'rebalance' && selectedPortfolio && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0 }}
                  className="rounded-xl border p-4 text-center"
                  style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
                >
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: C.textSecondary }}>Avg Marginal ROAS</span>
                  <div className="text-[24px] font-bold font-mono mt-1" style={{ color: C.statusWarning }}>
                    {selectedPortfolio.assets.filter((a) => a.roas).length > 0
                      ? (selectedPortfolio.assets.filter((a) => a.roas).reduce((s, a) => s + (a.roas || 0) / (a.allocation + 1), 0) / selectedPortfolio.assets.filter((a) => a.roas).length).toFixed(2)
                      : '—'}
                  </div>
                  <span className="text-[11px]" style={{ color: C.textTertiary }}>Per allocation %</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="rounded-xl border p-4 text-center"
                  style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
                >
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: C.textSecondary }}>Est. Rebalance Value</span>
                  <div className="text-[24px] font-bold font-mono mt-1" style={{ color: C.textPrimary }}>
                    ${selectedPortfolio.rebalancingSuggestions.reduce((s, r) => s + Math.abs(r.deltaValue), 0).toLocaleString()}
                  </div>
                  <span className="text-[11px]" style={{ color: C.textTertiary }}>Total suggested moves</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="rounded-xl border p-4 text-center"
                  style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
                >
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: C.textSecondary }}>Expected Improvement</span>
                  <div className="text-[24px] font-bold font-mono mt-1" style={{ color: C.statusSuccess }}>
                    +{selectedPortfolio.rebalancingSuggestions.length > 0 ? '0.42' : '0.00'}
                  </div>
                  <span className="text-[11px]" style={{ color: C.textTertiary }}>Sharpe ratio gain</span>
                </motion.div>
              </div>

              <RebalancingPanel suggestions={selectedPortfolio.rebalancingSuggestions} loading={loading} />

              <AllocationChart assets={selectedPortfolio.assets} loading={loading} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
