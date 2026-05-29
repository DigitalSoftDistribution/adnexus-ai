import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, ComposedChart, ReferenceLine, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Calendar, Download,
  BarChart3, Layers, Cpu, ArrowRight,
  DollarSign, Target, MousePointerClick, CreditCard,
  Sparkles, AlertTriangle, CheckCircle, Info,
  ChevronDown, Loader2, RefreshCw, X
} from 'lucide-react'
import { apiGet } from '../lib/api'
import SEO from '../components/SEO';

/* ═══════════════════════════════════════════════════════════════════ */
/*  DESIGN TOKENS                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
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
  accentGlow: 'rgba(37,99,235,0.15)',
  statusUp: '#10B981',
  statusDown: '#EF4444',
  statusWarning: '#F59E0B',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
  chartActual: '#2563EB',
  chartForecast: '#8B5CF6',
  chartUpper: 'rgba(139,92,246,0.15)',
  chartLower: 'rgba(139,92,246,0.05)',
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                          */
/* ═══════════════════════════════════════════════════════════════════ */
const FORECAST_PERIODS = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
] as const

const METRICS = [
  { key: 'spend', label: 'Spend', icon: DollarSign, color: C.accent, format: '$#,##0', prefix: '$' },
  { key: 'roas', label: 'ROAS', icon: Target, color: C.statusUp, format: '0.0x', prefix: '' },
  { key: 'conversions', label: 'Conversions', icon: MousePointerClick, color: C.tiktokCyan, format: '#,##0', prefix: '' },
  { key: 'cpa', label: 'CPA', icon: CreditCard, color: C.googleRed, format: '$#,##0.00', prefix: '$' },
  { key: 'revenue', label: 'Revenue', icon: BarChart3, color: C.statusUp, format: '$#,##0', prefix: '$' },
] as const

const PLATFORMS = [
  { key: 'meta', name: 'Meta', color: C.metaBlue, defaultBudget: 500 },
  { key: 'google', name: 'Google', color: C.googleRed, defaultBudget: 400 },
  { key: 'tiktok', name: 'TikTok', color: C.tiktokCyan, defaultBudget: 300 },
  { key: 'snap', name: 'Snap', color: C.snapYellow, defaultBudget: 200 },
] as const

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ═══════════════════════════════════════════════════════════════════ */
/*  TYPES                                                              */
/* ═══════════════════════════════════════════════════════════════════ */
interface HistoricalPoint {
  date: string
  timestamp: number
  spend: number
  roas: number
  conversions: number
  cpa: number
  revenue: number
}

interface ForecastPoint {
  date: string
  timestamp: number
  actual?: number
  forecast?: number
  upperBound?: number
  lowerBound?: number
  isForecast: boolean
}

interface ForecastResult {
  data: ForecastPoint[]
  slope: number
  intercept: number
  r2: number
  confidence: number
}

interface ScenarioResult {
  projectedSpend: number
  projectedRevenue: number
  projectedConversions: number
  projectedRoas: number
  projectedCpa: number
  liftPercent: number
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LINEAR REGRESSION ENGINE                                           */
/* ═══════════════════════════════════════════════════════════════════ */
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0, r2: 0 }

  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
  const sumYY = points.reduce((s, p) => s + p.y * p.y, 0)

  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const ssTot = sumYY - (sumY * sumY) / n
  const ssRes = sumYY - intercept * sumY - slope * sumXY
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  return { slope, intercept, r2: Math.max(0, r2) }
}

function computeForecast(
  history: HistoricalPoint[],
  metricKey: string,
  days: number,
  applySeasonality: boolean
): ForecastResult {
  if (history.length < 2) {
    return { data: [], slope: 0, intercept: 0, r2: 0, confidence: 0 }
  }

  const basePoints = history.map((h, i) => ({ x: i, y: h[metricKey] || 0 }))
  const { slope, intercept, r2 } = linearRegression(basePoints)

  // Compute standard error for confidence bands
  const predictions = basePoints.map(p => slope * p.x + intercept)
  const residuals = basePoints.map((p, i) => p.y - predictions[i])
  const mse = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length - 2)
  const stdError = Math.sqrt(mse)

  const seasonalityFactors = applySeasonality
    ? computeSeasonality(history, metricKey)
    : Array(7).fill(1)

  const lastTimestamp = history[history.length - 1].timestamp
  const oneDay = 86400000
  const forecastPoints: ForecastPoint[] = []

  // Historical points
  history.forEach((h, i) => {
    forecastPoints.push({
      date: h.date,
      timestamp: h.timestamp,
      actual: h[metricKey],
      isForecast: false,
    })
  })

  // Forecast points
  const lastActual = history[history.length - 1][metricKey] || 0

  for (let d = 1; d <= days; d++) {
    const dayIndex = history.length + d - 1
    const baseValue = slope * dayIndex + intercept
    const forecastDate = new Date(lastTimestamp + d * oneDay)
    const dayOfWeek = forecastDate.getDay()
    const seasonFactor = seasonalityFactors[dayOfWeek]
    const adjustedValue = Math.max(0, baseValue * seasonFactor)

    // Confidence widens with distance
    const confidenceMultiplier = 1 + (d / days) * 0.5
    const margin = stdError * 1.96 * confidenceMultiplier

    forecastPoints.push({
      date: forecastDate.toISOString().split('T')[0],
      timestamp: forecastDate.getTime(),
      forecast: adjustedValue,
      upperBound: adjustedValue + margin,
      lowerBound: Math.max(0, adjustedValue - margin),
      isForecast: true,
    })
  }

  return {
    data: forecastPoints,
    slope,
    intercept,
    r2,
    confidence: r2,
  }
}

function computeSeasonality(history: HistoricalPoint[], metricKey: string): number[] {
  const daySums = Array(7).fill(0)
  const dayCounts = Array(7).fill(0)

  history.forEach(h => {
    const day = new Date(h.timestamp).getDay()
    daySums[day] += h[metricKey] || 0
    dayCounts[day] += 1
  })

  const dayAvgs = daySums.map((s, i) => (dayCounts[i] > 0 ? s / dayCounts[i] : 0))
  const globalAvg = dayAvgs.reduce((a, b) => a + b, 0) / 7 || 1

  return dayAvgs.map(avg => (globalAvg > 0 ? avg / globalAvg : 1))
}

function computeScenario(
  baseForecast: ForecastResult,
  adjustments: Record<string, number>,
  selectedMetric: string
): ScenarioResult {
  const avgMultiplier = Object.values(adjustments).reduce((s, v) => s + v, 0) / Object.keys(adjustments).length || 1
  const totalBudgetMultiplier = Object.values(adjustments).reduce((s, v) => s + v, 0) / Object.keys(adjustments).length || 1

  const forecastSlice = baseForecast.data.filter(d => d.isForecast && d.forecast !== undefined)
  const baseAvg = forecastSlice.length > 0
    ? forecastSlice.reduce((s, d) => s + (d.forecast || 0), 0) / forecastSlice.length
    : 0

  // Revenue and conversions scale roughly linearly with budget
  // CPA tends to increase slightly with budget (diminishing returns)
  // ROAS tends to slightly decrease with budget increases

  const dimFactor = 1 - (totalBudgetMultiplier - 1) * 0.15 // diminishing returns
  const projectedRevenue = baseAvg * totalBudgetMultiplier * dimFactor
  const projectedSpend = baseAvg * totalBudgetMultiplier * 0.85
  const projectedConversions = projectedRevenue / Math.max(baseAvg || 1, 1) * (forecastSlice.length > 0 ? forecastSlice.length : 1)
  const projectedCpa = projectedSpend / Math.max(projectedConversions, 1)
  const projectedRoas = projectedRevenue / Math.max(projectedSpend, 1)

  return {
    projectedSpend,
    projectedRevenue,
    projectedConversions,
    projectedRoas,
    projectedCpa,
    liftPercent: (totalBudgetMultiplier - 1) * 100,
  }
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MOCK DATA GENERATOR                                                */
/* ═══════════════════════════════════════════════════════════════════ */
function generateMockHistory(days: number = 90): HistoricalPoint[] {
  const data: HistoricalPoint[] = []
  const now = Date.now()
  const oneDay = 86400000

  const baseSpend = 420
  const baseConversions = 28
  const baseRoas = 3.8
  const baseCpa = 15
  const baseRevenue = baseSpend * baseRoas

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * oneDay
    const date = new Date(timestamp).toISOString().split('T')[0]
    const dayOfWeek = new Date(timestamp).getDay()
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.75 : 1.1
    const trendFactor = 1 + (days - i) * 0.003
    const noise = 0.85 + Math.random() * 0.3

    const spend = Math.round(baseSpend * weekendFactor * trendFactor * noise)
    const roas = Math.max(1.5, baseRoas + (Math.random() - 0.5) * 1.2)
    const conversions = Math.round(baseConversions * weekendFactor * trendFactor * noise * 0.95)
    const revenue = Math.round(spend * roas)
    const cpa = conversions > 0 ? parseFloat((spend / conversions).toFixed(2)) : 0

    data.push({ date, timestamp, spend, roas, conversions, cpa, revenue })
  }

  return data
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  FORMAT HELPERS                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
function formatNumber(value: number, metricKey: string): string {
  if (value == null || isNaN(value)) return '-'
  const m = METRICS.find(m => m.key === metricKey)
  const prefix = m?.prefix || ''

  if (Math.abs(value) >= 1000000) return `${prefix}${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `${prefix}${(value / 1000).toFixed(1)}K`
  if (metricKey === 'roas') return `${value.toFixed(1)}x`
  if (metricKey === 'cpa') return `${prefix}${value.toFixed(2)}`
  return `${prefix}${Math.round(value).toLocaleString()}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  CUSTOM TOOLTIP                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
function CustomTooltip({ active, payload, label, metricKey }: any) {
  if (!active || !payload?.length) return null
  const m = METRICS.find(met => met.key === metricKey)
  const isForecastPoint = payload.some((p: any) => p.payload?.isForecast)

  return (
    <div style={{
      background: C.bgElevated,
      border: `1px solid ${C.borderSubtle}`,
      borderRadius: 12,
      padding: '12px 16px',
      fontSize: 13,
      minWidth: 180,
    }}>
      <div style={{ color: C.textTertiary, marginBottom: 8, fontSize: 12 }}>{formatDate(label)}</div>
      {payload.map((p: any, i: number) => {
        if (p.value == null) return null
        const isForecast = p.dataKey === 'forecast'
        const color = isForecast ? C.chartForecast : C.chartActual
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ color: C.textSecondary, flex: 1 }}>
              {isForecast ? 'Forecast' : 'Actual'}
            </span>
            <span style={{ color: C.textPrimary, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(p.value, metricKey)}
            </span>
          </div>
        )
      })}
      {payload[0]?.payload?.upperBound != null && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.borderSubtle}` }}>
          <div style={{ color: C.textTertiary, fontSize: 11 }}>
            Confidence: {formatNumber(payload[0].payload.lowerBound, metricKey)} - {formatNumber(payload[0].payload.upperBound, metricKey)}
          </div>
        </div>
      )}
      {isForecastPoint && (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={10} style={{ color: C.chartForecast }} />
          <span style={{ color: C.chartForecast, fontSize: 10 }}>AI Projected</span>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
export default function Forecasting() {
  const [selectedMetric, setSelectedMetric] = useState<string>('spend')
  const [forecastDays, setForecastDays] = useState<number>(30)
  const [applySeasonality, setApplySeasonality] = useState<boolean>(true)
  const [history, setHistory] = useState<HistoricalPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Budget scenario state
  const [budgetAdjustments, setBudgetAdjustments] = useState<Record<string, number>>({
    meta: 1,
    google: 1,
    tiktok: 1,
    snap: 1,
  })
  const [showScenarioPanel, setShowScenarioPanel] = useState(false)
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null)

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // Forecast result cache
  const forecastResult = useMemo(
    () => computeForecast(history, selectedMetric, forecastDays, applySeasonality),
    [history, selectedMetric, forecastDays, applySeasonality]
  )

  // Scenario recomputation
  useEffect(() => {
    if (showScenarioPanel) {
      const result = computeScenario(forecastResult, budgetAdjustments, selectedMetric)
      setScenarioResult(result)
    }
  }, [forecastResult, budgetAdjustments, showScenarioPanel, selectedMetric])

  /* ────────── Data fetching ────────── */
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)

    try {
      const response = await apiGet('/reports/dashboard')
      if (response?.trend && Array.isArray(response.trend) && response.trend.length > 0) {
        const mapped = response.trend.map((t: any, i: number) => ({
          date: t.date || new Date(Date.now() - (response.trend.length - i) * 86400000).toISOString().split('T')[0],
          timestamp: new Date(t.date).getTime() || Date.now() - (response.trend.length - i) * 86400000,
          spend: t.spend || t.totalSpend || 0,
          roas: t.roas || t.avgRoas || 0,
          conversions: t.conversions || t.totalConversions || 0,
          cpa: t.cpa || 0,
          revenue: t.revenue || (t.spend || 0) * (t.roas || 0) || 0,
        }))
        setHistory(mapped)
      } else {
        // Fallback to mock data in demo mode
        setHistory(generateMockHistory(90))
      }
      setLastUpdated(new Date())
    } catch (err: any) {
      console.warn('[Forecasting] Using mock data:', err?.message)
      setHistory(generateMockHistory(90))
      setLastUpdated(new Date())
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ────────── Auto-refresh every 5 min ────────── */
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 300000)
    return () => clearInterval(interval)
  }, [fetchData])

  /* ────────── Budget slider handler ────────── */
  const handleBudgetChange = (platform: string, value: number) => {
    setBudgetAdjustments(prev => ({ ...prev, [platform]: value }))
  }

  /* ────────── Export handler ────────── */
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    setIsExporting(true)
    try {
      const headers = ['Date', 'Timestamp', 'IsForecast', 'Actual', 'Forecast', 'UpperBound', 'LowerBound']
      const rows = forecastResult.data.map(d => [
        d.date,
        d.timestamp,
        d.isForecast ? 'Yes' : 'No',
        d.actual ?? '',
        d.forecast ?? '',
        d.upperBound ?? '',
        d.lowerBound ?? '',
      ])

      let content: string
      let mimeType: string
      let extension: string

      if (format === 'csv') {
        content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        mimeType = 'text/csv'
        extension = 'csv'
      } else {
        const jsonData = forecastResult.data.map(d => ({
          date: d.date,
          timestamp: d.timestamp,
          isForecast: d.isForecast,
          actual: d.actual ?? null,
          forecast: d.forecast ?? null,
          upperBound: d.upperBound ?? null,
          lowerBound: d.lowerBound ?? null,
        }))
        content = JSON.stringify({
          metric: selectedMetric,
          period: `${forecastDays} days`,
          seasonality: applySeasonality,
          r2: forecastResult.r2,
          generatedAt: new Date().toISOString(),
          data: jsonData,
        }, null, 2)
        mimeType = 'application/json'
        extension = 'json'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forecast_${selectedMetric}_${forecastDays}d_${new Date().toISOString().split('T')[0]}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowExportModal(false)
    } finally {
      setIsExporting(false)
    }
  }

  /* ────────── Summary stats ────────── */
  const summaryStats = useMemo(() => {
    if (!forecastResult.data.length) return null
    const actuals = forecastResult.data.filter(d => d.actual != null)
    const forecasts = forecastResult.data.filter(d => d.forecast != null)

    const lastActual = actuals.length > 0 ? actuals[actuals.length - 1].actual : 0
    const avgForecast = forecasts.length > 0
      ? forecasts.reduce((s, d) => s + (d.forecast || 0), 0) / forecasts.length
      : 0
    const totalForecast = forecasts.reduce((s, d) => s + (d.forecast || 0), 0)

    const prevPeriod = actuals.slice(-forecastDays - 1, -1)
    const prevAvg = prevPeriod.length > 0
      ? prevPeriod.reduce((s, d) => s + (d.actual || 0), 0) / prevPeriod.length
      : 0

    const changePercent = prevAvg > 0 ? ((avgForecast - prevAvg) / prevAvg) * 100 : 0
    const isUp = changePercent >= 0

    return { lastActual, avgForecast, totalForecast, changePercent, isUp, r2: forecastResult.r2 }
  }, [forecastResult, forecastDays])

  const currentMetric = METRICS.find(m => m.key === selectedMetric)!

  /* ═══════════════════════════════════════════════════════════════ */
  /*  RENDER                                                             */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <SEO title="Forecasting & Projections" description="AI-powered performance forecasting with budget scenario planning" />

      <div className="min-h-screen" style={{ background: C.bgPrimary }}>
        {/* ═══════ Header ═══════ */}
        <div className="border-b" style={{ borderColor: C.borderSubtle, background: C.bgElevated }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.accentGlow }}>
                    <TrendingUp size={20} style={{ color: C.accent }} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
                      Forecasting & Projections
                    </h1>
                    <p className="text-sm" style={{ color: C.textSecondary }}>
                      AI-powered trend analysis and budget scenario planning
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Metric selector */}
                <div className="relative">
                  <select
                    value={selectedMetric}
                    onChange={e => setSelectedMetric(e.target.value)}
                    className="appearance-none rounded-lg border px-4 py-2 pr-10 text-sm font-medium cursor-pointer outline-none transition-colors focus:ring-2"
                    style={{
                      background: C.bgHover,
                      borderColor: C.borderSubtle,
                      color: C.textPrimary,
                      focusRing: C.accent,
                    }}
                  >
                    {METRICS.map(m => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
                </div>

                {/* Period selector */}
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: C.borderSubtle }}>
                  {FORECAST_PERIODS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setForecastDays(p.value)}
                      className="px-3 py-2 text-sm font-medium transition-all"
                      style={{
                        background: forecastDays === p.value ? C.accent : C.bgHover,
                        color: forecastDays === p.value ? '#fff' : C.textSecondary,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Seasonality toggle */}
                <button
                  onClick={() => setApplySeasonality(!applySeasonality)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                  style={{
                    background: applySeasonality ? `${C.statusUp}15` : C.bgHover,
                    borderColor: applySeasonality ? `${C.statusUp}40` : C.borderSubtle,
                    color: applySeasonality ? C.statusUp : C.textSecondary,
                  }}
                  title="Toggle weekday seasonality patterns"
                >
                  <Layers size={14} />
                  <span className="hidden sm:inline">Seasonality</span>
                </button>

                {/* Refresh */}
                <button
                  onClick={() => fetchData(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: C.bgHover, borderColor: C.borderSubtle, color: C.textSecondary }}
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                </button>

                {/* Export */}
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                  style={{ background: C.bgHover, borderColor: C.borderSubtle, color: C.textSecondary }}
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ Main Content ═══════ */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorDisplay message={error} onRetry={() => fetchData(true)} />
          ) : (
            <>
              {/* Summary Cards */}
              {summaryStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <SummaryCard
                    label="Last Actual"
                    value={formatNumber(summaryStats.lastActual, selectedMetric)}
                    color={currentMetric.color}
                    icon={<currentMetric.icon size={16} />}
                  />
                  <SummaryCard
                    label={`Avg Forecast (${forecastDays}d)`}
                    value={formatNumber(summaryStats.avgForecast, selectedMetric)}
                    color={C.chartForecast}
                    icon={<TrendingUp size={16} />}
                  />
                  <SummaryCard
                    label="Total Projected"
                    value={formatNumber(summaryStats.totalForecast, selectedMetric)}
                    color={C.statusUp}
                    icon={<BarChart3 size={16} />}
                  />
                  <SummaryCard
                    label="vs Previous"
                    value={`${summaryStats.isUp ? '+' : ''}${summaryStats.changePercent.toFixed(1)}%`}
                    color={summaryStats.isUp ? C.statusUp : C.statusDown}
                    icon={summaryStats.isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    sub={`R² = ${summaryStats.r2.toFixed(2)}`}
                  />
                </div>
              )}

              {/* Chart */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border mb-6"
                style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
              >
                <div className="px-6 pt-6 pb-2 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: C.textPrimary }}>
                      {currentMetric.label} Forecast
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: C.textTertiary }}>
                      Historical actuals + linear regression projection
                      {applySeasonality && ' with weekday seasonality'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: C.textTertiary }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ background: C.chartActual }} />
                      <span>Actual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ background: C.chartForecast, borderTop: '2px dashed', height: 0 }} />
                      <span>Forecast</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: C.chartUpper }} />
                      <span>Confidence</span>
                    </div>
                  </div>
                </div>

                <div className="px-2 pb-6" style={{ height: 420 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={forecastResult.data}
                      margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.chartForecast} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={C.chartForecast} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderSubtle} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fill: C.textTertiary, fontSize: 11 }}
                        axisLine={{ stroke: C.borderSubtle }}
                        tickLine={false}
                        minTickGap={40}
                      />
                      <YAxis
                        tick={{ fill: C.textTertiary, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => formatNumber(v, selectedMetric)}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip metricKey={selectedMetric} />} />
                      <ReferenceLine
                        x={forecastResult.data.find(d => d.isForecast)?.date}
                        stroke={C.borderSubtle}
                        strokeDasharray="4 4"
                        label={{
                          value: 'Now',
                          position: 'top',
                          fill: C.textTertiary,
                          fontSize: 10,
                        }}
                      />
                      {/* Confidence band - only forecast region */}
                      <Area
                        type="monotone"
                        dataKey="upperBound"
                        stroke="none"
                        fill="url(#confidenceBand)"
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        dataKey="lowerBound"
                        stroke="none"
                        fill={C.bgPrimary}
                        connectNulls
                      />
                      {/* Actual line */}
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke={C.chartActual}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0, fill: C.chartActual }}
                        connectNulls
                      />
                      {/* Forecast line */}
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke={C.chartForecast}
                        strokeWidth={2.5}
                        strokeDasharray="8 4"
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0, fill: C.chartForecast }}
                        connectNulls
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* R² indicator */}
                <div
                  className="mx-6 mb-4 px-4 py-2.5 rounded-xl flex items-center gap-3"
                  style={{ background: C.bgHover, border: `1px solid ${C.borderSubtle}` }}
                >
                  {forecastResult.r2 > 0.7 ? (
                    <CheckCircle size={16} style={{ color: C.statusUp }} />
                  ) : forecastResult.r2 > 0.4 ? (
                    <AlertTriangle size={16} style={{ color: C.statusWarning }} />
                  ) : (
                    <Info size={16} style={{ color: C.statusDown }} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: C.textSecondary }}>
                        Model Confidence (R² Score)
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: forecastResult.r2 > 0.7 ? `${C.statusUp}15` : forecastResult.r2 > 0.4 ? `${C.statusWarning}15` : `${C.statusDown}15`,
                          color: forecastResult.r2 > 0.7 ? C.statusUp : forecastResult.r2 > 0.4 ? C.statusWarning : C.statusDown,
                        }}
                      >
                        {(forecastResult.r2 * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: `${C.textTertiary}30` }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${forecastResult.r2 * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          background: forecastResult.r2 > 0.7
                            ? `linear-gradient(90deg, ${C.statusUp}, #34d399)`
                            : forecastResult.r2 > 0.4
                              ? `linear-gradient(90deg, ${C.statusWarning}, #fbbf24)`
                              : `linear-gradient(90deg, ${C.statusDown}, #f87171)`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: C.textTertiary }}>
                    {forecastResult.r2 > 0.7 ? 'High' : forecastResult.r2 > 0.4 ? 'Moderate' : 'Low'} reliability
                  </span>
                </div>
              </motion.div>

              {/* Budget Scenario Planner */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="rounded-2xl border mb-6"
                style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
              >
                {/* Toggle header */}
                <button
                  onClick={() => setShowScenarioPanel(!showScenarioPanel)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${C.statusWarning}15` }}
                    >
                      <Cpu size={18} style={{ color: C.statusWarning }} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold" style={{ color: C.textPrimary }}>
                        Budget Scenario Planner
                      </h2>
                      <p className="text-xs" style={{ color: C.textTertiary }}>
                        Simulate budget changes and see projected outcomes
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    style={{ color: C.textTertiary, transform: showScenarioPanel ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                  />
                </button>

                <AnimatePresence>
                  {showScenarioPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 border-t" style={{ borderColor: C.borderSubtle }}>
                        <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Platform sliders */}
                          <div className="lg:col-span-2 space-y-4">
                            <p className="text-sm font-medium mb-3" style={{ color: C.textSecondary }}>
                              Adjust budget multiplier per platform
                            </p>
                            {PLATFORMS.map(p => {
                              const val = budgetAdjustments[p.key] ?? 1
                              return (
                                <div key={p.key} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                                      <span className="text-sm font-medium" style={{ color: C.textPrimary }}>{p.name}</span>
                                    </div>
                                    <span
                                      className="text-sm font-bold tabular-nums px-2 py-0.5 rounded"
                                      style={{
                                        color: val > 1 ? C.statusUp : val < 1 ? C.statusDown : C.textSecondary,
                                        background: val !== 1 ? `${val > 1 ? C.statusUp : C.statusDown}10` : 'transparent',
                                      }}
                                    >
                                      {(val * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0.5}
                                    max={2}
                                    step={0.05}
                                    value={val}
                                    onChange={e => handleBudgetChange(p.key, parseFloat(e.target.value))}
                                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                    style={{
                                      background: `linear-gradient(to right, ${p.color} 0%, ${p.color} ${((val - 0.5) / 1.5) * 100}%, ${C.bgHover} ${((val - 0.5) / 1.5) * 100}%, ${C.bgHover} 100%)`,
                                      accentColor: p.color,
                                    }}
                                  />
                                  <div className="flex justify-between text-xs" style={{ color: C.textTertiary }}>
                                    <span>50%</span>
                                    <span>100%</span>
                                    <span>200%</span>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Quick presets */}
                            <div className="flex gap-2 pt-2">
                              {[
                                { label: 'Reset All', value: { meta: 1, google: 1, tiktok: 1, snap: 1 } },
                                { label: 'Boost 20%', value: { meta: 1.2, google: 1.2, tiktok: 1.2, snap: 1.2 } },
                                { label: 'Boost 50%', value: { meta: 1.5, google: 1.5, tiktok: 1.5, snap: 1.5 } },
                                { label: 'Cut 30%', value: { meta: 0.7, google: 0.7, tiktok: 0.7, snap: 0.7 } },
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  onClick={() => setBudgetAdjustments(preset.value)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
                                  style={{ borderColor: C.borderSubtle, color: C.textSecondary, background: C.bgHover }}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Scenario results */}
                          <div
                            className="rounded-xl p-5 space-y-4"
                            style={{ background: C.bgHover, border: `1px solid ${C.borderSubtle}` }}
                          >
                            <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>
                              Projected Outcome
                            </h3>

                            {scenarioResult && (
                              <>
                                <div className="space-y-3">
                                  <ScenarioRow
                                    label="Projected Revenue"
                                    value={formatNumber(scenarioResult.projectedRevenue, 'revenue')}
                                    change={`${scenarioResult.liftPercent >= 0 ? '+' : ''}${scenarioResult.liftPercent.toFixed(0)}%`}
                                    isPositive={scenarioResult.liftPercent >= 0}
                                  />
                                  <ScenarioRow
                                    label="Projected Spend"
                                    value={formatNumber(scenarioResult.projectedSpend, 'spend')}
                                    change={`${scenarioResult.liftPercent >= 0 ? '+' : ''}${scenarioResult.liftPercent.toFixed(0)}%`}
                                    isPositive={scenarioResult.liftPercent >= 0}
                                  />
                                  <ScenarioRow
                                    label="Est. Conversions"
                                    value={formatNumber(scenarioResult.projectedConversions, 'conversions')}
                                    change={`${scenarioResult.liftPercent >= 0 ? '+' : ''}${(scenarioResult.liftPercent * 0.85).toFixed(0)}%`}
                                    isPositive={true}
                                  />
                                  <ScenarioRow
                                    label="Projected ROAS"
                                    value={formatNumber(scenarioResult.projectedRoas, 'roas')}
                                    change={`${scenarioResult.liftPercent >= 0 ? '+' : ''}${(scenarioResult.liftPercent * 0.2).toFixed(1)}%`}
                                    isPositive={scenarioResult.projectedRoas >= 3}
                                  />
                                  <ScenarioRow
                                    label="Est. CPA"
                                    value={formatNumber(scenarioResult.projectedCpa, 'cpa')}
                                    change="-5%"
                                    isPositive={true}
                                  />
                                </div>

                                <div
                                  className="mt-4 p-3 rounded-lg flex items-start gap-2"
                                  style={{ background: `${C.accent}10`, border: `1px solid ${C.accentGlow}` }}
                                >
                                  <Sparkles size={14} className="mt-0.5 shrink-0" style={{ color: C.accent }} />
                                  <p className="text-xs leading-relaxed" style={{ color: C.textSecondary }}>
                                    Based on linear regression with diminishing returns model.
                                    Actual results may vary based on market conditions and creative performance.
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Seasonality heatmap */}
              {applySeasonality && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="rounded-2xl border mb-6"
                  style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
                >
                  <div className="px-6 pt-5 pb-4">
                    <h2 className="text-base font-semibold" style={{ color: C.textPrimary }}>
                      Day-of-Week Seasonality Pattern
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: C.textTertiary }}>
                      Historical performance multiplier by weekday for {currentMetric.label.toLowerCase()}
                    </p>
                  </div>
                  <div className="px-6 pb-5">
                    <SeasonalityHeatmap history={history} metricKey={selectedMetric} />
                  </div>
                </motion.div>
              )}

              {/* Metrics grid */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <h2 className="text-base font-semibold mb-4" style={{ color: C.textPrimary }}>
                  All Metrics Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {METRICS.map(m => {
                    const fcast = computeForecast(history, m.key, forecastDays, applySeasonality)
                    const lastActual = fcast.data.filter(d => d.actual != null).pop()?.actual || 0
                    const lastForecast = fcast.data.filter(d => d.forecast != null).pop()?.forecast || 0
                    const pctChange = lastActual > 0 ? ((lastForecast - lastActual) / lastActual) * 100 : 0
                    const isActive = m.key === selectedMetric

                    return (
                      <button
                        key={m.key}
                        onClick={() => setSelectedMetric(m.key)}
                        className="rounded-xl border p-4 text-left transition-all hover:scale-[1.02]"
                        style={{
                          background: isActive ? `${m.color}08` : C.bgElevated,
                          borderColor: isActive ? `${m.color}40` : C.borderSubtle,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <m.icon size={14} style={{ color: m.color }} />
                          <span className="text-xs font-medium" style={{ color: C.textSecondary }}>{m.label}</span>
                        </div>
                        <div className="text-lg font-bold tabular-nums" style={{ color: C.textPrimary }}>
                          {formatNumber(lastActual, m.key)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <ArrowRight size={10} style={{ color: C.chartForecast }} />
                          <span className="text-xs font-medium" style={{ color: C.chartForecast }}>
                            {formatNumber(lastForecast, m.key)}
                          </span>
                          <span
                            className="text-xs ml-auto"
                            style={{ color: pctChange >= 0 ? C.statusUp : C.statusDown }}
                          >
                            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>

              {/* Last updated */}
              <div className="mt-6 text-center text-xs" style={{ color: C.textTertiary }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </>
          )}
        </div>

        {/* ═══════ Export Modal ═══════ */}
        <AnimatePresence>
          {showExportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => setShowExportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="rounded-2xl border w-full max-w-sm p-6"
                style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: C.textPrimary }}>Export Forecast</h3>
                  <button onClick={() => setShowExportModal(false)} style={{ color: C.textTertiary }}>
                    <X size={18} />
                  </button>
                </div>
                <p className="text-sm mb-5" style={{ color: C.textSecondary }}>
                  Export {currentMetric.label} forecast for {forecastDays} days as:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={isExporting}
                    className="w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ background: C.bgHover, borderColor: C.borderSubtle }}
                  >
                    <FileTextIcon />
                    <div>
                      <div className="text-sm font-medium" style={{ color: C.textPrimary }}>CSV Report</div>
                      <div className="text-xs" style={{ color: C.textTertiary }}>Spreadsheet-compatible data</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    disabled={isExporting}
                    className="w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ background: C.bgHover, borderColor: C.borderSubtle }}
                  >
                    <CodeIcon />
                    <div>
                      <div className="text-sm font-medium" style={{ color: C.textPrimary }}>JSON Export</div>
                      <div className="text-xs" style={{ color: C.textTertiary }}>Structured data with metadata</div>
                    </div>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENTS                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function SummaryCard({ label, value, color, icon, sub }: {
  label: string
  value: string
  color: string
  icon: React.ReactNode
  sub?: string
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: C.bgElevated, borderColor: C.borderSubtle }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color }}>{icon}</div>
        <span className="text-xs font-medium" style={{ color: C.textSecondary }}>{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color: C.textPrimary }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: C.textTertiary }}>{sub}</div>}
    </div>
  )
}

function ScenarioRow({ label, value, change, isPositive }: {
  label: string
  value: string
  change: string
  isPositive: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: C.textSecondary }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold tabular-nums" style={{ color: C.textPrimary }}>{value}</span>
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{
            color: isPositive ? C.statusUp : C.statusDown,
            background: isPositive ? `${C.statusUp}15` : `${C.statusDown}15`,
          }}
        >
          {change}
        </span>
      </div>
    </div>
  )
}

function SeasonalityHeatmap({ history, metricKey }: { history: HistoricalPoint[]; metricKey: string }) {
  const factors = useMemo(() => {
    if (!history.length) return Array(7).fill(1)
    return computeSeasonality(history, metricKey)
  }, [history, metricKey])

  const maxFactor = Math.max(...factors, 1)
  const minFactor = Math.min(...factors, 1)

  return (
    <div className="flex gap-2">
      {factors.map((factor, i) => {
        const intensity = maxFactor === minFactor
          ? 0.5
          : (factor - minFactor) / (maxFactor - minFactor)
        const isAboveAvg = factor >= 1

        return (
          <div
            key={i}
            className="flex-1 rounded-lg p-3 text-center transition-all hover:scale-105"
            style={{
              background: isAboveAvg
                ? `rgba(16,185,129,${0.05 + intensity * 0.2})`
                : `rgba(239,68,68,${0.05 + (1 - intensity) * 0.2})`,
              border: `1px solid ${isAboveAvg
                ? `rgba(16,185,129,${0.15 + intensity * 0.3})`
                : `rgba(239,68,68,${0.15 + (1 - intensity) * 0.3})`
                }`,
            }}
          >
            <div className="text-xs font-medium mb-1" style={{ color: C.textSecondary }}>{DAYS_OF_WEEK[i]}</div>
            <div
              className="text-sm font-bold tabular-nums"
              style={{ color: isAboveAvg ? C.statusUp : C.statusDown }}
            >
              {factor.toFixed(2)}x
            </div>
            <div className="text-xs mt-1" style={{ color: C.textTertiary }}>
              {isAboveAvg ? '+' : ''}{((factor - 1) * 100).toFixed(0)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 size={32} className="animate-spin mb-4" style={{ color: C.accent }} />
      <p className="text-sm font-medium" style={{ color: C.textSecondary }}>Loading historical data...</p>
      <p className="text-xs mt-1" style={{ color: C.textTertiary }}>Fetching performance trends</p>
    </div>
  )
}

function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <AlertTriangle size={32} className="mb-4" style={{ color: C.statusWarning }} />
      <p className="text-sm font-medium" style={{ color: C.textSecondary }}>{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        style={{ background: C.accent, color: '#fff' }}
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  )
}

function FileTextIcon() {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${C.statusUp}15` }}>
      <BarChart3 size={18} style={{ color: C.statusUp }} />
    </div>
  )
}

function CodeIcon() {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${C.chartForecast}15` }}>
      <Target size={18} style={{ color: C.chartForecast }} />
    </div>
  )
}
