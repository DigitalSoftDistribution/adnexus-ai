import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Line, AreaChart, Area, Cell
} from 'recharts'
import {
  Plus, Download, Calendar, ChevronDown,
  Users, Sparkles,
  Clock, Edit, Trash2, Play, FileText, ChevronUp,
  ArrowUpDown, Check, X, TrendingUp, TrendingDown,
  Loader2, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight,
  FileBarChart, Inbox
} from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '../lib/api'
import SEO from '../components/SEO';
import type {
  CrossPlatformData, FunnelStage,
  ReportCampaign, ScheduledReport, KpiSummary
} from '../lib/api'

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

const DATE_RANGES = [
  { label: 'Today', days: 1 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7', days: 7 },
  { label: 'Last 30', days: 30 },
  { label: 'Last 90', days: 90 },
] as const

const METRICS_OPTIONS = ['Impressions', 'Clicks', 'CTR', 'CPC', 'Spend', 'Conversions', 'CPA', 'ROAS', 'Reach', 'Frequency', 'Video Views']
const DIMENSIONS_OPTIONS = ['Platform', 'Campaign', 'Ad Set', 'Ad', 'Date', 'Device', 'Country', 'Age', 'Gender']

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
interface LoadingState {
  kpi: boolean
  crossPlatform: boolean
  trend: boolean
  funnel: boolean
  campaigns: boolean
  scheduled: boolean
  templates: boolean
}

interface ErrorState {
  kpi: string | null
  crossPlatform: string | null
  trend: string | null
  funnel: string | null
  campaigns: string | null
  scheduled: string | null
  templates: string | null
  generate: string | null
  export: string | null
}

interface TrendDataPoint {
  date: string
  meta: number
  google: number
  tiktok: number
  snap: number
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  defaultMetrics: string[]
  defaultDimensions: string[]
}

interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
function fmtCurrency(v: number) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

function fmtNumber(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return `${v}`
}

function fmtPercentChange(current: number, previous: number) {
  if (previous === 0) return { value: 'N/A', up: true }
  const change = ((current - previous) / previous) * 100
  return { value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`, up: change >= 0 }
}

const platformColor = (platform: string) =>
  PLATFORMS.find(p => p.name === platform || p.key === platform)?.color || C.textSecondary

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'An unexpected error occurred'
}

/* ------------------------------------------------------------------ */
/*  SHARED UI COMPONENTS                                                */
/* ------------------------------------------------------------------ */

/** Skeleton loader - single bar */
function SkeletonBar({ className = '', height = '16px', width = '100%' }: { className?: string; height?: string; width?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: 'rgba(255,255,255,0.08)', height, width }}
    />
  )
}

/** Skeleton card */
function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return (
    <div className="card-surface p-4">
      <div className="space-y-3">
        <SkeletonBar height="20px" width="40%" />
        {children || (
          <>
            <SkeletonBar height="200px" />
            <div className="flex gap-2">
              <SkeletonBar height="12px" width="30%" />
              <SkeletonBar height="12px" width="30%" />
              <SkeletonBar height="12px" width="30%" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Error banner with retry */
function ErrorBanner({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  if (!message) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4"
      style={{ background: `${C.statusError}15`, border: `1px solid ${C.statusError}33` }}
    >
      <AlertTriangle size={16} style={{ color: C.statusError, flexShrink: 0 }} />
      <span className="text-[13px] flex-1" style={{ color: C.statusError }}>{message}</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors flex-shrink-0"
        style={{ background: `${C.statusError}22`, color: C.statusError }}
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </motion.div>
  )
}

/** Empty state */
function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Icon size={22} style={{ color: C.textTertiary }} />
      </div>
      <span className="text-[13px] font-medium" style={{ color: C.textSecondary }}>{title}</span>
      <span className="text-[12px] mt-0.5" style={{ color: C.textTertiary }}>{subtitle}</span>
    </div>
  )
}

/** Pagination controls */
function Pagination({
  page, totalPages, total, limit, onPageChange
}: {
  page: number; totalPages: number; total: number; limit: number; onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  return (
    <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
      <span className="text-[11px]" style={{ color: C.textTertiary }}>
        {total > 0 ? `Showing ${start}-${end} of ${total}` : 'No results'}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md transition-colors disabled:opacity-30"
          style={{ background: C.bgHover, color: C.textSecondary }}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[12px] font-medium px-2" style={{ color: C.textSecondary }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md transition-colors disabled:opacity-30"
          style={{ background: C.bgHover, color: C.textSecondary }}
        >
          <ChevronRight size={14} />
        </button>
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
      <p className="font-semibold mb-1" style={{ color: C.textPrimary }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span style={{ color: C.textSecondary }}>{p.name}:</span>
          <span className="font-mono-data font-medium" style={{ color: C.textPrimary }}>
            {typeof p.value === 'number' ? (p.value > 100 ? p.value.toLocaleString() : p.value.toFixed(2)) : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  KPI OVERVIEW ROW                                                    */
/* ------------------------------------------------------------------ */
function KpiCard({
  label, value, prevValue, prefix = '', suffix = '', isCurrency = false, isPercent = false, loading
}: {
  label: string
  value: number
  prevValue: number
  prefix?: string
  suffix?: string
  isCurrency?: boolean
  isPercent?: boolean
  loading: boolean
}) {
  const change = useMemo(() => fmtPercentChange(value, prevValue), [value, prevValue])
  const displayValue = isCurrency ? fmtCurrency(value) : isPercent ? `${value.toFixed(2)}%` : fmtNumber(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-surface p-4 flex-1 min-w-[180px]"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-2" style={{ color: C.textTertiary }}>
        {label}
      </span>
      {loading ? (
        <div className="space-y-2 py-1">
          <SkeletonBar height="22px" width="60%" />
          <SkeletonBar height="12px" width="40%" />
        </div>
      ) : (
        <>
          <span className="text-[22px] font-semibold font-mono-data block" style={{ color: C.textPrimary }}>
            {prefix}{displayValue}{suffix}
          </span>
          <div className="flex items-center gap-1 mt-1">
            {change.up ? (
              <TrendingUp size={12} style={{ color: C.statusActive }} />
            ) : (
              <TrendingDown size={12} style={{ color: C.statusError }} />
            )}
            <span className="text-[11px] font-medium" style={{ color: change.up ? C.statusActive : C.statusError }}>
              {change.value}
            </span>
            <span className="text-[11px] ml-0.5" style={{ color: C.textTertiary }}>vs prev</span>
          </div>
        </>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  DATE RANGE PICKER                                                   */
/* ------------------------------------------------------------------ */
function DateRangePicker({
  selectedDays, onChange
}: {
  selectedDays: number
  onChange: (days: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
        style={{ background: 'var(--bg-hover)', color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
      >
        <Calendar size={14} style={{ color: C.textSecondary }} />
        <span>{DATE_RANGES.find(d => d.days === selectedDays)?.label || `Last ${selectedDays}`}</span>
        <ChevronDown size={12} style={{ color: C.textTertiary, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden min-w-[140px]"
              style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
            >
              {DATE_RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => { onChange(r.days); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-[12px] transition-colors hover:bg-[var(--bg-hover)] flex items-center justify-between"
                  style={{ color: selectedDays === r.days ? C.accent : C.textPrimary }}
                >
                  {r.label}
                  {selectedDays === r.days && <Check size={12} style={{ color: C.accent }} />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  REPORT BUILDER                                                      */
/* ------------------------------------------------------------------ */
function ReportBuilder({
  templates,
  templatesLoading,
  templatesError,
  onRetryTemplates,
  onGenerated,
}: {
  templates: ReportTemplate[]
  templatesLoading: boolean
  templatesError: string | null
  onRetryTemplates: () => void
  onGenerated: () => void
}) {
  const [collapsed, setCollapsed] = useState(true)
  const [selectedMetrics, setSelectedMetrics] = useState(['Spend', 'ROAS', 'CTR', 'Conversions'])
  const [selectedDimensions, setSelectedDimensions] = useState(['Platform', 'Campaign', 'Date'])
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const toggleMetric = (m: string) => {
    setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }
  const toggleDimension = (d: string) => {
    setSelectedDimensions(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    const tpl = templates.find(t => t.id === templateId)
    if (tpl) {
      if (tpl.defaultMetrics?.length) setSelectedMetrics(tpl.defaultMetrics)
      if (tpl.defaultDimensions?.length) setSelectedDimensions(tpl.defaultDimensions)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      await apiPost('/reports/generate', {
        metrics: selectedMetrics,
        dimensions: selectedDimensions,
        templateId: selectedTemplate || undefined,
      })
      onGenerated()
    } catch (err) {
      setGenerateError(getErrorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="card-surface mb-6"
    >
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: C.accent }} />
          <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Report Builder</span>
        </div>
        {collapsed ? <ChevronDown size={16} style={{ color: C.textTertiary }} /> : <ChevronUp size={16} style={{ color: C.textTertiary }} />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {/* Templates */}
              <div className="pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-2" style={{ color: C.textTertiary }}>Templates</span>
                <ErrorBanner message={templatesError} onRetry={onRetryTemplates} />
                {templatesLoading ? (
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3].map(i => (
                      <SkeletonBar key={i} height="28px" width="120px" />
                    ))}
                  </div>
                ) : templates.length === 0 ? (
                  <span className="text-[12px]" style={{ color: C.textTertiary }}>No templates available</span>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                        style={{
                          background: selectedTemplate === tpl.id ? `${C.accent}22` : 'var(--bg-hover)',
                          color: selectedTemplate === tpl.id ? C.accent : C.textSecondary,
                          border: selectedTemplate === tpl.id ? `1px solid ${C.accent}44` : '1px solid transparent',
                        }}
                      >
                        {selectedTemplate === tpl.id && <Check size={10} />}
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-2" style={{ color: C.textTertiary }}>Metrics</span>
                <div className="flex flex-wrap gap-2">
                  {METRICS_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMetric(m)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                      style={{
                        background: selectedMetrics.includes(m) ? `${C.accent}22` : 'var(--bg-hover)',
                        color: selectedMetrics.includes(m) ? C.accent : C.textSecondary,
                        border: selectedMetrics.includes(m) ? `1px solid ${C.accent}44` : '1px solid transparent',
                      }}
                    >
                      {selectedMetrics.includes(m) && <Check size={10} />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-2" style={{ color: C.textTertiary }}>Dimensions</span>
                <div className="flex flex-wrap gap-2">
                  {DIMENSIONS_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDimension(d)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                      style={{
                        background: selectedDimensions.includes(d) ? `${C.accent}22` : 'var(--bg-hover)',
                        color: selectedDimensions.includes(d) ? C.accent : C.textSecondary,
                        border: selectedDimensions.includes(d) ? `1px solid ${C.accent}44` : '1px solid transparent',
                      }}
                    >
                      {selectedDimensions.includes(d) && <Check size={10} />}
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate error */}
              <AnimatePresence>
                {generateError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: `${C.statusError}15`, border: `1px solid ${C.statusError}33` }}
                  >
                    <AlertTriangle size={14} style={{ color: C.statusError, flexShrink: 0 }} />
                    <span className="text-[12px]" style={{ color: C.statusError }}>{generateError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating || selectedMetrics.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-60"
                  style={{ background: C.accent }}
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {generating ? 'Generating...' : 'Generate Report'}
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                  style={{ background: 'var(--bg-hover)', color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                >
                  <Clock size={14} />
                  Schedule
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CROSS-PLATFORM PERFORMANCE CHART (Bar + Line combo)                 */
/* ------------------------------------------------------------------ */
function CrossPlatformChart({ data, loading, error, onRetry }: {
  data: CrossPlatformData[]; loading: boolean; error: string | null; onRetry: () => void
}) {
  const chartData = useMemo(() =>
    data.map(d => ({
      platform: d.platform,
      spend: d.spend,
      roas: d.roas,
    })), [data])

  if (loading) {
    return <SkeletonCard />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="card-surface p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Cross-Platform Performance</span>
        <div className="flex items-center gap-4">
          {PLATFORMS.map((p) => (
            <div key={p.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-[11px]" style={{ color: C.textSecondary }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />

      {data.length === 0 && !error ? (
        <EmptyState icon={FileBarChart} title="No platform data" subtitle="Select a date range to see cross-platform metrics" />
      ) : (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="platform"
                tick={{ fill: C.textTertiary, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: C.textTertiary, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: C.textTertiary, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}x`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="left" dataKey="spend" name="Spend" radius={[4, 4, 0, 0]} barSize={40}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={platformColor(entry.platform) + 'CC'} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="roas"
                name="ROAS"
                stroke={C.statusActive}
                strokeWidth={2}
                dot={{ r: 5, fill: C.statusActive, stroke: C.bgElevated, strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SPEND TREND CHART (Area)                                            */
/* ------------------------------------------------------------------ */
function SpendTrendChart({ data, loading, error, onRetry }: {
  data: TrendDataPoint[]; loading: boolean; error: string | null; onRetry: () => void
}) {
  const [hiddenPlatforms, setHiddenPlatforms] = useState<Set<string>>(new Set())

  const togglePlatform = (key: string) => {
    setHiddenPlatforms(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (loading) {
    return <SkeletonCard />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="card-surface p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Spend Trend</span>
        <div className="flex items-center gap-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              className="flex items-center gap-1.5 transition-opacity"
              style={{ opacity: hiddenPlatforms.has(p.key) ? 0.4 : 1 }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-[11px]" style={{ color: C.textSecondary }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />

      {data.length === 0 && !error ? (
        <EmptyState icon={FileBarChart} title="No trend data" subtitle="Select a date range to see spend trends" />
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {PLATFORMS.map(p => (
                  <linearGradient key={p.key} id={`grad-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={p.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={p.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: C.textTertiary, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              />
              <YAxis
                tick={{ fill: C.textTertiary, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
              />
              <Tooltip content={<ChartTooltip />} />
              {PLATFORMS.map(p => (
                <Area
                  key={p.key}
                  type="monotone"
                  dataKey={p.key}
                  name={p.name}
                  stroke={p.color}
                  strokeWidth={2}
                  fill={`url(#grad-${p.key})`}
                  hide={hiddenPlatforms.has(p.key)}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CONVERSION FUNNEL                                                   */
/* ------------------------------------------------------------------ */
function ConversionFunnel({ data, loading, error, onRetry }: {
  data: FunnelStage[]; loading: boolean; error: string | null; onRetry: () => void
}) {
  const [showByPlatform, setShowByPlatform] = useState(false)

  const maxVal = useMemo(() => (data.length ? (data[0].value ?? data[0].count) : 1), [data])

  if (loading) {
    return <SkeletonCard>
      <div className="space-y-3 py-4">
        {[1, 2, 3, 4, 5].map(i => (
          <SkeletonBar key={i} height="40px" width={`${100 - (i - 1) * 15}%`} />
        ))}
      </div>
    </SkeletonCard>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="card-surface p-4"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Conversion Funnel</span>
        <button
          onClick={() => setShowByPlatform(!showByPlatform)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
          style={{
            background: showByPlatform ? `${C.accent}22` : 'var(--bg-hover)',
            color: showByPlatform ? C.accent : C.textSecondary,
            border: showByPlatform ? `1px solid ${C.accent}44` : '1px solid transparent',
          }}
        >
          Show by platform
        </button>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />

      {data.length === 0 && !error ? (
        <EmptyState icon={FileBarChart} title="No funnel data" subtitle="Select a date range to see conversion funnel" />
      ) : (
        <div className="space-y-3">
          {data.map((stage, i) => {
            const width = Math.max(((stage.value ?? stage.count) / (maxVal ?? 1)) * 100, 12)
            const prevStage = i > 0 ? data[i - 1] : null
            const conversionRate = prevStage ? (((stage.value ?? stage.count) / (prevStage.value ?? prevStage.count)) * 100).toFixed(1) : '100.0'
            const dropOff = prevStage ? (100 - (((stage.value ?? stage.count) / (prevStage.value ?? prevStage.count)) * 100)).toFixed(1) : '0.0'
            const breakdown = stage.platformBreakdown

            return (
              <motion.div
                key={stage.stage}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div
                      className="h-10 rounded-lg flex items-center px-3 relative overflow-hidden transition-all duration-500"
                      style={{
                        width: `${width}%`,
                        minWidth: '140px',
                        background: showByPlatform ? 'transparent' : `linear-gradient(90deg, ${C.accent}44, ${C.accent}18)`,
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {showByPlatform ? (
                        <div className="flex w-full h-full relative">
                          {PLATFORMS.map((p) => {
                            const platVal = breakdown?.[p.name] || 0
                            const platPct = (stage.value ?? stage.count) > 0 ? (platVal / (stage.value ?? stage.count)) * 100 : 0
                            return (
                              <div
                                key={p.key}
                                style={{ width: `${platPct}%`, background: `${p.color}55` }}
                                className="h-full first:rounded-l-lg last:rounded-r-lg"
                              />
                            )
                          })}
                          <span className="absolute left-3 text-[12px] font-semibold z-10" style={{ color: C.textPrimary }}>
                            {stage.stage}
                          </span>
                          <span className="absolute right-3 text-[12px] font-mono-data z-10" style={{ color: C.textPrimary }}>
                            {fmtNumber((stage.value ?? stage.count))}
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className="text-[12px] font-semibold" style={{ color: C.textPrimary }}>{stage.stage}</span>
                          <span className="text-[12px] font-mono-data ml-auto" style={{ color: C.textPrimary }}>
                            {fmtNumber((stage.value ?? stage.count))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {i > 0 && (
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[10px] font-semibold" style={{ color: C.textSecondary }}>{conversionRate}%</span>
                      <span className="text-[9px]" style={{ color: C.statusError }}>-{dropOff}%</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {showByPlatform && (
        <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {PLATFORMS.map((p) => (
            <div key={p.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-[11px]" style={{ color: C.textSecondary }}>{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CAMPAIGN PERFORMANCE TABLE                                          */
/* ------------------------------------------------------------------ */
function CampaignPerformanceTable({
  data, loading, error, onRetry, pagination, onPageChange
}: {
  data: ReportCampaign[]
  loading: boolean
  error: string | null
  onRetry: () => void
  pagination: PaginatedData<ReportCampaign>
  onPageChange: (p: number) => void
}) {
  const [sortCol, setSortCol] = useState<string>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [exportFormat, setExportFormat] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    const rows = [...data]
    rows.sort((a: any, b: any) => {
      const av = a[sortCol] ?? 0
      const bv = b[sortCol] ?? 0
      const an = typeof av === 'string' ? parseFloat(av) || av : av
      const bn = typeof bv === 'string' ? parseFloat(bv) || bv : bv
      if (typeof an === 'number' && typeof bn === 'number') {
        return sortDir === 'asc' ? an - bn : bn - an
      }
      return sortDir === 'asc' ? String(an).localeCompare(String(bn)) : String(bn).localeCompare(String(an))
    })
    return rows
  }, [data, sortCol, sortDir])

  const handleExport = useCallback(async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExportFormat(format)
    setExportError(null)
    try {
      const result = await apiPost<{ downloadUrl?: string; content?: string }>(`/reports/export?format=${format}`, {
        campaignIds: sorted.map(c => c.id),
      })
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank')
      } else if (result.content && format === 'csv') {
        const blob = new Blob([result.content], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `campaign-performance-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setExportError(getErrorMessage(err))
    } finally {
      setExportFormat(null)
    }
  }, [sorted])

  const cols = [
    { key: 'platform', label: 'Platform' },
    { key: 'campaign', label: 'Campaign' },
    { key: 'spend', label: 'Spend' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'ctr', label: 'CTR %' },
    { key: 'conversions', label: 'Conv.' },
    { key: 'cpa', label: 'CPA' },
    { key: 'roas', label: 'ROAS' },
  ]

  const statusColor = (s: string) => {
    switch (s) {
      case 'Active': return C.statusActive
      case 'Paused': return C.statusWarning
      case 'Draft': return C.statusInfo
      case 'Error': return C.statusError
      default: return C.textTertiary
    }
  }

  if (loading) {
    return <SkeletonCard>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <SkeletonBar key={i} height="36px" />
        ))}
      </div>
    </SkeletonCard>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="card-surface p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Campaign Performance</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: C.textTertiary }}>{pagination.total} rows</span>
          <div className="flex items-center gap-1">
            {(['csv', 'xlsx', 'pdf'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                disabled={exportFormat === fmt}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--bg-hover)', color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
              >
                {exportFormat === fmt ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />
      {exportError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
          style={{ background: `${C.statusError}15`, border: `1px solid ${C.statusError}33` }}
        >
          <AlertTriangle size={14} style={{ color: C.statusError }} />
          <span className="text-[12px]" style={{ color: C.statusError }}>{exportError}</span>
        </motion.div>
      )}

      {sorted.length === 0 && !error ? (
        <EmptyState icon={Inbox} title="No campaigns found" subtitle="Adjust filters or add campaigns to see data" />
      ) : (
        <>
          <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={sortCol === c.key ? 'ascending' : 'none'}
                      onClick={() => handleSort(c.key)}
                      className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] cursor-pointer select-none transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ color: C.textTertiary }}
                    >
                      <div className="flex items-center gap-1">
                        {c.label}
                        <ArrowUpDown size={10} style={{ opacity: sortCol === c.key ? 1 : 0.3 }} aria-hidden="true" />
                      </div>
                    </th>
                  ))}
                  <th scope="col" className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textTertiary }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const plat = PLATFORMS.find(p => p.key === row.platform.toLowerCase())
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: 0.4 + i * 0.02 }}
                      className="transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                      style={{ borderBottom: '1px solid var(--border-subtle)', height: '48px' }}
                      onClick={() => { /* drill down */ }}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: plat?.color || '#888' }} />
                          <span className="text-[12px] font-medium capitalize" style={{ color: C.textPrimary }}>
                            {plat?.name || row.platform}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[12px] truncate max-w-[180px] block font-medium" style={{ color: C.textPrimary }}>
                          {row.campaign || row.name}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono-data text-[12px] font-medium" style={{ color: C.textPrimary }}>
                          ${row.spend.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono-data text-[12px]" style={{ color: C.textSecondary }}>
                          {(row.impressions / 1000).toFixed(0)}K
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono-data text-[12px]" style={{ color: C.textSecondary }}>
                          {row.clicks.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono-data text-[12px]" style={{ color: C.textSecondary }}>
                          {row.ctr}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono-data text-[12px] font-medium" style={{ color: C.textPrimary }}>
                          {row.conversions}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono-data text-[12px]" style={{ color: C.textSecondary }}>
                          ${row.cpa}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono-data text-[12px] font-semibold" style={{ color: row.roas >= 4 ? C.statusActive : row.roas >= 3 ? C.accent : C.textSecondary }}>
                          {row.roas}x
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex"
                          style={{ background: `${statusColor(row.status)}22`, color: statusColor(row.status) }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(row.status) }} />
                          {row.status}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={onPageChange}
          />
        </>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CREATE SCHEDULED REPORT MODAL                                       */
/* ------------------------------------------------------------------ */
function CreateScheduledReportModal({
  open, onClose, onCreate, templates
}: {
  open: boolean
  onClose: () => void
  onCreate: (report: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun'>) => void
  templates: ReportTemplate[]
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [schedule, setSchedule] = useState('weekly')
  const [recipients, setRecipients] = useState('')
  const [format, setFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf')

  const schedules = [
    { key: 'daily', label: 'Every day' },
    { key: 'weekly', label: 'Every week' },
    { key: 'monthly', label: 'Every month' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const recipientList = recipients.split(',').map(r => r.trim()).filter(Boolean)
    if (recipientList.length === 0) recipientList.push('user@company.com')
    onCreate({
      name,
      type: type || (templates[0]?.name ?? 'Custom'),
      schedule: schedules.find(s => s.key === schedule)?.label || 'Every week',
      recipients: recipientList,
      frequency: schedule as 'daily' | 'weekly' | 'monthly',
      format,
      includePlatforms: [],
      nextSend: new Date(Date.now() + 86400000).toISOString(),
      isActive: true,
    })
    setName('')
    setType('')
    setSchedule('weekly')
    setRecipients('')
    setFormat('pdf')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-xl p-6"
            style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-semibold" style={{ color: C.textPrimary }}>Create Scheduled Report</h3>
              <button onClick={onClose} className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: C.textTertiary }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-1.5" style={{ color: C.textTertiary }}>Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Weekly Performance Summary"
                  required
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                  style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-1.5" style={{ color: C.textTertiary }}>Report Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                  style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                >
                  <option value="">Custom</option>
                  {templates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-1.5" style={{ color: C.textTertiary }}>Schedule</label>
                <select
                  value={schedule}
                  onChange={e => setSchedule(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                  style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                >
                  {schedules.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-1.5" style={{ color: C.textTertiary }}>Format</label>
                <div className="flex gap-2">
                  {(['pdf', 'csv', 'xlsx'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className="flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        background: format === f ? `${C.accent}22` : C.bgHover,
                        color: format === f ? C.accent : C.textSecondary,
                        border: format === f ? `1px solid ${C.accent}44` : `1px solid ${C.borderSubtle}`,
                      }}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.06em] block mb-1.5" style={{ color: C.textTertiary }}>Recipients (comma-separated)</label>
                <input
                  value={recipients}
                  onChange={e => setRecipients(e.target.value)}
                  placeholder="user@company.com, manager@company.com"
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                  style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                  style={{ background: 'transparent', color: C.textSecondary }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors"
                  style={{ background: C.accent }}
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/*  SCHEDULED REPORTS                                                   */
/* ------------------------------------------------------------------ */
function ScheduledReportsSection({
  reports, loading, error, onRetry, onToggle, onDelete, onCreate,
  pagination, onPageChange, templates
}: {
  reports: ScheduledReport[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onCreate: (report: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun'>) => void
  pagination: PaginatedData<ScheduledReport>
  onPageChange: (p: number) => void
  templates: ReportTemplate[]
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const formatLastRun = (lr: string | null) => {
    if (!lr) return 'Never'
    const d = new Date(lr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleDelete = (id: string) => {
    onDelete(id)
    setDeleteConfirm(null)
  }

  if (loading) {
    return (
      <div className="card-surface p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <SkeletonBar height="18px" width="160px" />
          <SkeletonBar height="28px" width="100px" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 py-3">
            <SkeletonBar height="18px" width="18px" />
            <div className="flex-1 space-y-2">
              <SkeletonBar height="14px" width="200px" />
              <SkeletonBar height="12px" width="120px" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="card-surface p-4 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Scheduled Reports</span>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white transition-colors"
            style={{ background: C.accent }}
          >
            <Plus size={14} />
            Create New
          </button>
        </div>

        <ErrorBanner message={error} onRetry={onRetry} />

        {reports.length === 0 && !error ? (
          <EmptyState
            icon={FileText}
            title="No scheduled reports"
            subtitle="Create your first scheduled report to get started"
          />
        ) : (
          <>
            <div className="flex flex-col">
              {reports.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.45 + i * 0.05 }}
                  className="flex items-center gap-4 py-3 px-2 transition-colors hover:bg-[var(--bg-hover)] rounded-lg relative"
                  style={{ borderBottom: i < reports.length - 1 ? '1px solid var(--border-subtle)' : 'none', minHeight: '56px' }}
                >
                  {deleteConfirm === r.id ? (
                    <div className="flex items-center gap-3 w-full justify-between">
                      <span className="text-[12px]" style={{ color: C.statusError }}>Delete &quot;{r.name}&quot;?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="px-3 py-1 rounded-md text-[11px] font-medium text-white"
                          style={{ background: C.statusError }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1 rounded-md text-[11px] font-medium"
                          style={{ color: C.textSecondary }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <FileText size={18} style={{ color: C.accent, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium block truncate" style={{ color: C.textPrimary }}>{r.name}</span>
                        <span className="text-[11px] block" style={{ color: C.textTertiary }}>{r.type || 'Custom'}</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} style={{ color: C.textSecondary }} />
                          <span className="text-[12px]" style={{ color: C.textSecondary }}>{r.schedule || r.frequency}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={12} style={{ color: C.textSecondary }} />
                          <span className="text-[12px]" style={{ color: C.textSecondary }}>{r.recipients.length} recipient{r.recipients.length !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="text-[11px]" style={{ color: C.textTertiary }}>{formatLastRun(r.lastRun ?? null)}</span>
                        <button
                          onClick={() => onToggle(r.id, !r.isActive)}
                          className="w-8 h-4 rounded-full relative transition-colors duration-200"
                          style={{ background: r.isActive ? C.accent : C.textTertiary }}
                        >
                          <motion.div
                            animate={{ x: r.isActive ? 16 : 2 }}
                            transition={{ duration: 0.2 }}
                            className="w-3 h-3 rounded-full absolute top-0.5"
                            style={{ background: '#fff' }}
                          />
                        </button>
                        <div className="flex items-center gap-1">
                          <button className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: C.textTertiary }}>
                            <Edit size={14} />
                          </button>
                          <button className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: C.textTertiary }}>
                            <Play size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(r.id)}
                            className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
                            style={{ color: C.textTertiary }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {/* Mobile: simplified view */}
                      <div className="flex sm:hidden items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => onToggle(r.id, !r.isActive)}
                          className="w-8 h-4 rounded-full relative transition-colors duration-200"
                          style={{ background: r.isActive ? C.accent : C.textTertiary }}
                        >
                          <motion.div
                            animate={{ x: r.isActive ? 16 : 2 }}
                            transition={{ duration: 0.2 }}
                            className="w-3 h-3 rounded-full absolute top-0.5"
                            style={{ background: '#fff' }}
                          />
                        </button>
                        <button onClick={() => setDeleteConfirm(r.id)} className="p-1 rounded" style={{ color: C.textTertiary }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={onPageChange}
            />
          </>
        )}
      </motion.div>
      <CreateScheduledReportModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={onCreate} templates={templates} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN REPORTS PAGE                                                   */
/* ------------------------------------------------------------------ */
export default function Reports() {
  const [selectedDays, setSelectedDays] = useState(30)
  const [loading, setLoading] = useState<LoadingState>({
    kpi: true, crossPlatform: true, trend: true, funnel: true, campaigns: true, scheduled: true, templates: true
  })
  const [errors, setErrors] = useState<ErrorState>({
    kpi: null, crossPlatform: null, trend: null, funnel: null, campaigns: null, scheduled: null, templates: null, generate: null, export: null,
  })

  const [kpiData, setKpiData] = useState<KpiSummary | null>(null)
  const [crossPlatformData, setCrossPlatformData] = useState<CrossPlatformData[]>([])
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([])
  const [campaignData, setCampaignData] = useState<ReportCampaign[]>([])
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [templates, setTemplates] = useState<ReportTemplate[]>([])

  // Pagination states
  const [campaignPage, setCampaignPage] = useState(1)
  const CAMPAIGN_LIMIT = 10
  const [campaignPagination, setCampaignPagination] = useState<PaginatedData<ReportCampaign>>({
    items: [], total: 0, page: 1, limit: CAMPAIGN_LIMIT, totalPages: 0,
  })

  const [scheduledPage, setScheduledPage] = useState(1)
  const SCHEDULED_LIMIT = 5
  const [scheduledPagination, setScheduledPagination] = useState<PaginatedData<ScheduledReport>>({
    items: [], total: 0, page: 1, limit: SCHEDULED_LIMIT, totalPages: 0,
  })

  /* -------------------- API: KPI Summary -------------------- */
  const fetchKpi = useCallback(async () => {
    setLoading(prev => ({ ...prev, kpi: true }))
    setErrors(prev => ({ ...prev, kpi: null }))
    try {
      const data = await apiGet<KpiSummary>(`/reports/kpi?days=${selectedDays}`)
      setKpiData(data)
    } catch (err) {
      setErrors(prev => ({ ...prev, kpi: getErrorMessage(err) }))
    } finally {
      setLoading(prev => ({ ...prev, kpi: false }))
    }
  }, [selectedDays])

  /* -------------------- API: Cross-Platform -------------------- */
  const fetchCrossPlatform = useCallback(async () => {
    setLoading(prev => ({ ...prev, crossPlatform: true }))
    setErrors(prev => ({ ...prev, crossPlatform: null }))
    try {
      const data = await apiGet<CrossPlatformData[]>(`/reports/cross-platform?days=${selectedDays}`)
      setCrossPlatformData(data)
    } catch (err) {
      setErrors(prev => ({ ...prev, crossPlatform: getErrorMessage(err) }))
    } finally {
      setLoading(prev => ({ ...prev, crossPlatform: false }))
    }
  }, [selectedDays])

  /* -------------------- API: Spend Trend -------------------- */
  const fetchTrend = useCallback(async () => {
    setLoading(prev => ({ ...prev, trend: true }))
    setErrors(prev => ({ ...prev, trend: null }))
    try {
      const data = await apiGet<TrendDataPoint[]>(`/reports/trend?days=${selectedDays}`)
      setTrendData(data)
    } catch (err) {
      setErrors(prev => ({ ...prev, trend: getErrorMessage(err) }))
    } finally {
      setLoading(prev => ({ ...prev, trend: false }))
    }
  }, [selectedDays])

  /* -------------------- API: Funnel -------------------- */
  const fetchFunnel = useCallback(async () => {
    setLoading(prev => ({ ...prev, funnel: true }))
    setErrors(prev => ({ ...prev, funnel: null }))
    try {
      const data = await apiGet<FunnelStage[]>(`/reports/funnel?days=${selectedDays}`)
      setFunnelData(data)
    } catch (err) {
      setErrors(prev => ({ ...prev, funnel: getErrorMessage(err) }))
    } finally {
      setLoading(prev => ({ ...prev, funnel: false }))
    }
  }, [selectedDays])

  /* -------------------- API: Campaigns (paginated) -------------------- */
  const fetchCampaigns = useCallback(async (page: number = 1) => {
    setLoading(prev => ({ ...prev, campaigns: true }))
    setErrors(prev => ({ ...prev, campaigns: null }))
    try {
      const result = await apiGet<{
        data: ReportCampaign[]
        total: number
        page: number
        limit: number
        totalPages: number
      }>(`/reports/campaigns?days=${selectedDays}&page=${page}&limit=${CAMPAIGN_LIMIT}`)
      setCampaignData(result.data)
      setCampaignPagination({
        items: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      })
    } catch (err) {
      setErrors(prev => ({ ...prev, campaigns: getErrorMessage(err) }))
    } finally {
      setLoading(prev => ({ ...prev, campaigns: false }))
    }
  }, [selectedDays])

  /* -------------------- API: Scheduled Reports (paginated) -------------------- */
  const fetchScheduled = useCallback(async (page: number = 1) => {
    setLoading(prev => ({ ...prev, scheduled: true }))
    setErrors(prev => ({ ...prev, scheduled: null }))
    try {
      const result = await apiGet<{
        data: ScheduledReport[]
        total: number
        page: number
        limit: number
        totalPages: number
      }>(`/reports?page=${page}&limit=${SCHEDULED_LIMIT}`)
      setScheduledReports(result.data)
      setScheduledPagination({
        items: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      })
    } catch (err) {
      setErrors(prev => ({ ...prev, scheduled: getErrorMessage(err) }))
    } finally {
      setLoading(prev => ({ ...prev, scheduled: false }))
    }
  }, [])

  /* -------------------- API: Templates -------------------- */
  const fetchTemplates = useCallback(async () => {
    setLoading(prev => ({ ...prev, templates: true }))
    setErrors(prev => ({ ...prev, templates: null }))
    try {
      const data = await apiGet<ReportTemplate[]>('/reports/templates')
      setTemplates(data)
    } catch (err) {
      setErrors(prev => ({ ...prev, templates: getErrorMessage(err) }))
    } finally {
      setLoading(prev => ({ ...prev, templates: false }))
    }
  }, [])

  // Fetch all on mount / date change
  useEffect(() => {
    let cancelled = false
    if (cancelled) return

    fetchKpi()
    fetchCrossPlatform()
    fetchTrend()
    fetchFunnel()
    fetchCampaigns(campaignPage)
    fetchScheduled(scheduledPage)
    fetchTemplates()

    return () => { cancelled = true }
  }, [selectedDays])

  const handleToggleScheduled = useCallback(async (id: string, active: boolean) => {
    try {
      await apiPost(`/reports/${id}/toggle`, { active })
      setScheduledReports(prev => prev.map(r => r.id === id ? { ...r, isActive: active } : r))
    } catch (err) {
      setErrors(prev => ({ ...prev, scheduled: getErrorMessage(err) }))
    }
  }, [])

  const handleDeleteScheduled = useCallback(async (id: string) => {
    try {
      await apiDelete(`/reports/${id}`)
      setScheduledReports(prev => prev.filter(r => r.id !== id))
      setScheduledPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        totalPages: Math.max(1, Math.ceil((prev.total - 1) / prev.limit)),
      }))
    } catch (err) {
      setErrors(prev => ({ ...prev, scheduled: getErrorMessage(err) }))
    }
  }, [])

  const handleCreateScheduled = useCallback(async (input: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun'>) => {
    try {
      const report = await apiPost<ScheduledReport>('/reports', input)
      setScheduledReports(prev => [...prev, report])
      setScheduledPagination(prev => ({
        ...prev,
        total: prev.total + 1,
        totalPages: Math.max(1, Math.ceil((prev.total + 1) / prev.limit)),
      }))
    } catch (err) {
      setErrors(prev => ({ ...prev, scheduled: getErrorMessage(err) }))
    }
  }, [])

  const handleExport = useCallback(async (format: 'csv' | 'xlsx' | 'pdf') => {
    setErrors(prev => ({ ...prev, export: null }))
    try {
      const result = await apiPost<{ downloadUrl?: string; content?: string }>(`/reports/export?format=${format}`, {
        campaignIds: campaignData.map(c => c.id),
      })
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank')
      } else if (result.content && format === 'csv') {
        const blob = new Blob([result.content], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, export: getErrorMessage(err) }))
    }
  }, [campaignData])

  const handleCampaignPageChange = useCallback((page: number) => {
    setCampaignPage(page)
    fetchCampaigns(page)
  }, [fetchCampaigns])

  const handleScheduledPageChange = useCallback((page: number) => {
    setScheduledPage(page)
    fetchScheduled(page)
  }, [fetchScheduled])

  return (
    <>
    <SEO
      title="Reports"
      description="Generate comprehensive cross-platform reports, schedule automated reporting, export white-label reports, and share insights with stakeholders."
      keywords="reports, analytics reports, campaign reporting, white-label reports, scheduled reports"
    />
    <div className="min-h-[100dvh] flex" style={{ background: C.bgPrimary }}>
      {/* Sidebar spacer */}
      <div className="hidden lg:block w-64 flex-shrink-0" />

      <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-[1440px] mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="font-space text-[28px] font-semibold" style={{ color: C.textPrimary }}>
                Analytics &amp; Reports
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: C.textSecondary }}>
                Cross-platform analytics and attribution
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DateRangePicker selectedDays={selectedDays} onChange={setSelectedDays} />
              <ExportDropdown onExport={handleExport} exportError={errors.export} />
            </div>
          </div>
        </motion.div>

        {/* Export error banner */}
        <AnimatePresence>
          {errors.export && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4"
            >
              <ErrorBanner message={errors.export} onRetry={() => handleExport('csv')} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Overview Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <KpiCard
            label="Total Spend"
            value={kpiData?.totalSpend ?? 0}
            prevValue={kpiData?.totalSpendPrev ?? 0}
            isCurrency
            loading={loading.kpi}
          />
          <KpiCard
            label="Total Conversions"
            value={kpiData?.totalConversions ?? 0}
            prevValue={kpiData?.totalConversionsPrev ?? 0}
            loading={loading.kpi}
          />
          <KpiCard
            label="Avg ROAS"
            value={kpiData?.avgRoas ?? 0}
            prevValue={kpiData?.avgRoasPrev ?? 0}
            suffix="x"
            loading={loading.kpi}
          />
          <KpiCard
            label="Avg CPA"
            value={kpiData?.avgCpa ?? 0}
            prevValue={kpiData?.avgCpaPrev ?? 0}
            prefix="$"
            loading={loading.kpi}
          />
          <KpiCard
            label="Avg CTR"
            value={kpiData?.avgCtr ?? 0}
            prevValue={kpiData?.avgCtrPrev ?? 0}
            isPercent
            loading={loading.kpi}
          />
        </div>

        {/* Report Builder */}
        <ReportBuilder
          templates={templates}
          templatesLoading={loading.templates}
          templatesError={errors.templates}
          onRetryTemplates={fetchTemplates}
          onGenerated={() => {
            fetchKpi()
            fetchCrossPlatform()
            fetchTrend()
            fetchFunnel()
            fetchCampaigns(campaignPage)
          }}
        />

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <CrossPlatformChart
            data={crossPlatformData}
            loading={loading.crossPlatform}
            error={errors.crossPlatform}
            onRetry={fetchCrossPlatform}
          />
          <SpendTrendChart
            data={trendData}
            loading={loading.trend}
            error={errors.trend}
            onRetry={fetchTrend}
          />
        </div>

        {/* Conversion Funnel */}
        <div className="mb-6">
          <ConversionFunnel
            data={funnelData}
            loading={loading.funnel}
            error={errors.funnel}
            onRetry={fetchFunnel}
          />
        </div>

        {/* Campaign Performance Table */}
        <CampaignPerformanceTable
          data={campaignData}
          loading={loading.campaigns}
          error={errors.campaigns}
          onRetry={() => fetchCampaigns(campaignPage)}
          pagination={campaignPagination}
          onPageChange={handleCampaignPageChange}
        />

        {/* Scheduled Reports */}
        <ScheduledReportsSection
          reports={scheduledReports}
          loading={loading.scheduled}
          error={errors.scheduled}
          onRetry={() => fetchScheduled(scheduledPage)}
          onToggle={handleToggleScheduled}
          onDelete={handleDeleteScheduled}
          onCreate={handleCreateScheduled}
          pagination={scheduledPagination}
          onPageChange={handleScheduledPageChange}
          templates={templates}
        />
      </div>
    </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  EXPORT DROPDOWN                                                     */
/* ------------------------------------------------------------------ */
function ExportDropdown({ onExport, exportError }: { onExport: (format: 'csv' | 'xlsx' | 'pdf') => void; exportError: string | null }) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | 'pdf' | null>(null)
  const formats = [
    { key: 'csv' as const, label: 'Export CSV' },
    { key: 'xlsx' as const, label: 'Export Excel' },
    { key: 'pdf' as const, label: 'Export PDF' },
  ]

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(format)
    await onExport(format)
    setExporting(null)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
        style={{ background: 'var(--bg-hover)', color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} style={{ color: C.textTertiary }} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-1 z-50 rounded-lg overflow-hidden min-w-[140px]"
              style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
            >
              {formats.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleExport(f.key)}
                  disabled={exporting === f.key}
                  className="w-full text-left px-3 py-2 text-[12px] transition-colors hover:bg-[var(--bg-hover)] flex items-center gap-2 disabled:opacity-40"
                  style={{ color: C.textPrimary }}
                >
                  {exporting === f.key ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {f.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
