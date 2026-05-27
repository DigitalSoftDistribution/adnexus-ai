// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CountUp from 'react-countup'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, BarChart, Bar,
} from 'recharts'
import {
  TrendingUp, Download, ChevronDown, X, AlertTriangle,
  Sparkles, Clock, CheckCircle, BarChart3, DollarSign,
  MousePointer, Target, Zap, ShieldAlert, Bell,
  FileText, Flame, ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  generateFallbackDashboardData,
  apiGet,
} from '../lib/api'
import type {
  DashboardData,
  Campaign,
  AlertItem,
  DraftItem,
  RuleTrigger,
  NotificationItem,
} from '../lib/api'
import { useRealtime } from '../hooks/useRealtime'
import { useToast } from '../hooks/useToast'
import { Skeleton } from '../components/ui/skeleton'
import { triggerTour } from '../components/ProductTour'
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
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  statusInfo: '#3B82F6',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
  trendUp: '#c3f53b',
  trendDown: '#ef4444',
}

const PLATFORM_COLORS: Record<string, string> = {
  Meta: C.metaBlue,
  Google: C.googleRed,
  TikTok: C.tiktokCyan,
  Snap: C.snapYellow,
  meta: C.metaBlue,
  google: C.googleRed,
  tiktok: C.tiktokCyan,
  snap: C.snapYellow,
}

const STATUS_COLORS: Record<string, string> = {
  Active: C.statusActive,
  Paused: C.statusWarning,
  Ended: C.statusError,
  Draft: C.statusInfo,
}

const DATE_RANGES = [
  { label: 'Today', value: '1' },
  { label: 'Yesterday', value: '2' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
]

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function sparkFromDaily(daily: { date: string; meta: number; google: number; tiktok: number; snap: number }[], key: 'meta' | 'google' | 'tiktok' | 'snap' | 'total'): number[] {
  return daily.map((d) => {
    if (key === 'total') return d.meta + d.google + d.tiktok + d.snap
    return d[key]
  })
}

/* ------------------------------------------------------------------ */
/*  LOADING SKELETONS                                                   */
/* ------------------------------------------------------------------ */
function KPICardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.05] p-4 space-y-3" style={{ background: '#111111' }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-20" />
    </div>
  )
}

function ChartSkeleton({ height = 300, mdHeight }: { height?: number; mdHeight?: number }) {
  const responsiveHeight = mdHeight ? { height, [`--md-height`]: `${mdHeight}px` } as React.CSSProperties : { height }
  return (
    <div className="rounded-xl border border-white/[0.05] p-4 space-y-3" style={{ background: '#111111' }}>
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton style={responsiveHeight} className={`w-full rounded-lg ${mdHeight ? 'md:!h-[var(--md-height)]' : ''}`} />
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
        <p className="text-[13px] font-semibold" style={{ color: C.statusError }}>Failed to load dashboard</p>
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
/*  SPARKLINE                                                           */
/* ------------------------------------------------------------------ */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }))
  const gradId = `sparkGrad-${color.replace('#', '')}`
  return (
    <div className="w-24 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
  sparklineData: number[]
  sparklineColor: string
  trend: number
  trendLabel: string
  delay: number
  icon: React.ReactNode
  loading?: boolean
}

function KPICard({
  label, value, prefix, suffix, decimals = 0,
  sparklineData, sparklineColor, trend, trendLabel, delay, icon, loading,
}: KPICardProps) {
  if (loading) return <KPICardSkeleton />

  const isPositive = trend >= 0
  const isDownGood = label === 'CPA'
  const trendColor = isPositive ? (isDownGood ? C.trendDown : C.trendUp) : (isDownGood ? C.trendUp : C.trendDown)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.05, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl border border-white/[0.05] p-4 flex flex-col gap-2 cursor-default
                 transition-all duration-300 ease-out
                 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(37,99,235,0.15),0_0_0_1px_rgba(37,99,235,0.08)]
                 hover:border-blue-500/20"
      style={{ background: '#111111' }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textSecondary }}>
          {label}
        </span>
        <span style={{ color: C.textTertiary }}>{icon}</span>
      </div>

      <div className="flex items-end gap-3">
        <span className="text-[28px] font-bold leading-none tracking-tight font-mono" style={{ color: C.textPrimary }}>
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

      <MiniSparkline data={sparklineData} color={sparklineColor} />
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SMART ALERT BANNER                                                  */
/* ------------------------------------------------------------------ */
function SmartAlertBanner({
  alerts,
  onDismiss,
  loading,
}: {
  alerts: AlertItem[]
  onDismiss: (id: string) => void
  loading?: boolean
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const handleDismiss = useCallback(
    (id: string) => {
      setDismissed((prev) => new Set(prev).add(id))
      onDismiss(id)
    },
    [onDismiss]
  )

  if (loading) return null

  const visible = alerts.filter((a) => !a.dismissed && !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {visible.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-white/[0.05] p-4 flex items-center gap-4"
            style={{
              background: '#111111',
              borderLeft: `3px solid ${alert.severity === 'critical' ? C.statusError : alert.severity === 'warning' ? C.statusWarning : C.statusInfo}`,
            }}
          >
            {alert.severity === 'critical' ? (
              <ShieldAlert size={18} style={{ color: C.statusError }} />
            ) : alert.severity === 'warning' ? (
              <AlertTriangle size={18} style={{ color: C.statusWarning }} />
            ) : (
              <Bell size={18} style={{ color: C.statusInfo }} />
            )}
            <div className="flex-1 min-w-0">
              <span
                className="text-[13px] font-semibold"
                style={{
                  color: alert.severity === 'critical' ? C.statusError : alert.severity === 'warning' ? C.statusWarning : C.statusInfo,
                }}
              >
                {alert.title}
              </span>
              <span className="text-[13px] ml-2" style={{ color: C.textSecondary }}>
                {alert.message}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {alert.campaignName && (
                <button
                  className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)', color: C.textPrimary }}
                >
                  View
                </button>
              )}
              <button
                onClick={() => handleDismiss(alert.id)}
                className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                style={{ color: C.textTertiary }}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SPEND OVER TIME CHART                                               */
/* ------------------------------------------------------------------ */
function SpendOverTimeCard({
  data,
  loading,
}: {
  data: { date: string; meta: number; google: number; tiktok: number; snap: number }[]
  loading?: boolean
}) {
  const [activePlatform, setActivePlatform] = useState<string>('All')

  if (loading) return <ChartSkeleton height={220} mdHeight={280} />

  const platformKeys = [
    { key: 'All', label: 'All', color: C.textSecondary },
    { key: 'meta', label: 'Meta', color: C.metaBlue },
    { key: 'google', label: 'Google', color: C.googleRed },
    { key: 'tiktok', label: 'TikTok', color: C.tiktokCyan },
    { key: 'snap', label: 'Snap', color: C.snapYellow },
  ]

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-white/[0.06] px-3 py-2 shadow-xl" style={{ background: '#1a1a1a' }}>
        <p className="text-[11px] font-medium mb-1" style={{ color: C.textSecondary }}>{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-[12px]">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: C.textSecondary }}>{p.name}:</span>
            <span className="font-semibold" style={{ color: C.textPrimary }}>${p.value.toLocaleString()}</span>
          </div>
        ))}
        <div className="mt-1 pt-1 border-t border-white/[0.06] flex items-center gap-2 text-[12px] font-semibold">
          <span style={{ color: C.textSecondary }}>Total:</span>
          <span style={{ color: C.accent }}>
            ${payload.reduce((s, p) => s + p.value, 0).toLocaleString()}
          </span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl border border-white/[0.05] p-4"
      style={{ background: '#111111' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Spend Over Time</span>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {platformKeys.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePlatform(p.key)}
              className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex-shrink-0 min-h-[28px]"
              style={{
                background: activePlatform === p.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activePlatform === p.key ? p.color : C.textTertiary,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[220px] md:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.metaBlue} stopOpacity={0.15} />
                <stop offset="95%" stopColor={C.metaBlue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="googleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.googleRed} stopOpacity={0.15} />
                <stop offset="95%" stopColor={C.googleRed} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tiktokGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.tiktokCyan} stopOpacity={0.15} />
                <stop offset="95%" stopColor={C.tiktokCyan} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="snapGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.snapYellow} stopOpacity={0.15} />
                <stop offset="95%" stopColor={C.snapYellow} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: C.textTertiary, fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: C.textTertiary, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            {(activePlatform === 'All' || activePlatform === 'meta') && <Area type="monotone" dataKey="meta" stroke={C.metaBlue} strokeWidth={2} fill="url(#metaGrad)" name="Meta" />}
            {(activePlatform === 'All' || activePlatform === 'google') && <Area type="monotone" dataKey="google" stroke={C.googleRed} strokeWidth={2} fill="url(#googleGrad)" name="Google" />}
            {(activePlatform === 'All' || activePlatform === 'tiktok') && <Area type="monotone" dataKey="tiktok" stroke={C.tiktokCyan} strokeWidth={2} fill="url(#tiktokGrad)" name="TikTok" />}
            {(activePlatform === 'All' || activePlatform === 'snap') && <Area type="monotone" dataKey="snap" stroke={C.snapYellow} strokeWidth={2} fill="url(#snapGrad)" name="Snap" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  PLATFORM PERFORMANCE (HORIZONTAL BAR)                               */
/* ------------------------------------------------------------------ */
function PlatformPerformanceCard({
  data,
  loading,
}: {
  data: { platform: string; spend: number; conversions: number; roas: number; color: string }[]
  loading?: boolean
}) {
  if (loading) return <ChartSkeleton height={220} mdHeight={280} />

  const barData = data.map((d) => ({
    name: d.platform,
    spend: d.spend,
    conversions: d.conversions,
    roas: d.roas,
    color: d.color,
  }))

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (!active || !payload?.length) return null
    const p = payload[0]
    return (
      <div className="rounded-lg border border-white/[0.06] px-3 py-2 shadow-xl" style={{ background: '#1a1a1a' }}>
        <p className="text-[11px] font-semibold mb-1" style={{ color: p.payload.color }}>{p.name}</p>
        {payload.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-[12px]">
            <span style={{ color: C.textSecondary }}>{item.name}:</span>
            <span className="font-semibold" style={{ color: C.textPrimary }}>
              {item.name === 'spend' ? `$${item.value.toLocaleString()}` : item.name === 'roas' ? `${item.value.toFixed(1)}x` : item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl border border-white/[0.05] p-4"
      style={{ background: '#111111' }}
    >
      <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Platform Performance</span>
      <div className="h-[220px] md:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} layout="vertical" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fill: C.textTertiary, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis dataKey="name" type="category" tick={{ fill: C.textSecondary, fontSize: 12 }} tickLine={false} axisLine={false} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="spend" radius={[0, 4, 4, 0]} barSize={16}>
              {barData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={barData[index].color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        {data.map((d) => (
          <div key={d.platform} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-[11px]" style={{ color: C.textTertiary }}>{d.platform}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CAMPAIGN STATUS (DONUT)                                             */
/* ------------------------------------------------------------------ */
function CampaignStatusCard({
  status,
  loading,
}: {
  status: { active: number; paused: number; ended: number; draft: number }
  loading?: boolean
}) {
  if (loading) return <ChartSkeleton height={200} mdHeight={260} />

  const data = [
    { name: 'Active', value: status.active, color: C.statusActive },
    { name: 'Paused', value: status.paused, color: C.statusWarning },
    { name: 'Ended', value: status.ended, color: C.statusError },
    { name: 'Draft', value: status.draft, color: C.statusInfo },
  ]

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl border border-white/[0.05] p-4"
      style={{ background: '#111111' }}
    >
      <span className="text-sm font-semibold block mb-4" style={{ color: C.textPrimary }}>Campaign Status</span>
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" stroke="none" paddingAngle={2}>
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={data[index].color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3 flex-1 w-full">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-[12px]" style={{ color: C.textSecondary }}>{d.name}</span>
              </div>
              <span className="text-[12px] font-semibold" style={{ color: C.textPrimary }}>
                {d.value} <span className="font-normal" style={{ color: C.textTertiary }}>({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CAMPAIGNS TABLE                                                     */
/* ------------------------------------------------------------------ */
function CampaignsTable({ campaigns, loading }: { campaigns: Campaign[]; loading?: boolean }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.05] p-4 space-y-3" style={{ background: '#111111' }}>
        <Skeleton className="h-5 w-48 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl border border-white/[0.05] p-4"
      style={{ background: '#111111' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Top Campaigns</span>
        <button
          onClick={() => navigate('/campaigns')}
          className="text-[11px] font-medium transition-colors hover:underline"
          style={{ color: C.accent }}
        >
          View All &rarr;
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Campaign', 'Platform', 'Status', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conv.', 'ROAS'].map((h) => (
                <th key={h} scope="col" className="text-left text-[10px] font-semibold uppercase tracking-wider py-2 pr-3" style={{ color: C.textTertiary }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => navigate(`/campaigns/${c.id}`)}
                className="cursor-pointer transition-all duration-200 hover:bg-white/[0.04] group hover:translate-x-0.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <td className="py-2.5 pr-3">
                  <span className="text-[12px] font-medium group-hover:text-[#2563EB] transition-colors" style={{ color: C.textPrimary }}>
                    {c.name}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{ background: `${PLATFORM_COLORS[c.platform] || C.accent}18`, color: PLATFORM_COLORS[c.platform] || C.accent }}
                  >
                    {c.platform}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[c.status] || C.textTertiary }} />
                    <span className="text-[11px]" style={{ color: C.textSecondary }}>{c.status}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-[12px] font-mono" style={{ color: C.textPrimary }}>${c.spend.toLocaleString()}</td>
                <td className="py-2.5 pr-3 text-[12px] font-mono" style={{ color: C.textSecondary }}>{(c.impressions / 1000).toFixed(0)}k</td>
                <td className="py-2.5 pr-3 text-[12px] font-mono" style={{ color: C.textSecondary }}>{c.clicks.toLocaleString()}</td>
                <td className="py-2.5 pr-3 text-[12px] font-mono" style={{ color: C.textSecondary }}>{c.ctr != null ? c.ctr.toFixed(1) : '—'}%</td>
                <td className="py-2.5 pr-3 text-[12px] font-mono" style={{ color: C.textPrimary }}>{c.conversions != null ? c.conversions.toLocaleString() : '—'}</td>
                <td className="py-2.5 pr-3 text-[12px] font-mono font-semibold" style={{ color: (c.roas ?? 0) >= 4 ? C.trendUp : (c.roas ?? 0) >= 2 ? C.statusWarning : C.trendDown }}>
                  {c.roas != null ? `${c.roas.toFixed(1)}x` : '—'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  ACTIVITY FEED                                                       */
/* ------------------------------------------------------------------ */
function ActivityFeed({
  drafts,
  triggers,
  notifications,
  loading,
}: {
  drafts: DraftItem[]
  triggers: RuleTrigger[]
  notifications: NotificationItem[]
  loading?: boolean
}) {
  const allActivities = useMemo(() => {
    const items: Array<{
      id: string
      icon: React.ReactNode
      color: string
      title: string
      subtitle: string
      time: string
      type: string
    }> = []

    drafts.forEach((d) => {
      items.push({
        id: `draft-${d.id}`,
        icon: <FileText size={14} />,
        color: d.status === 'pending' ? C.statusWarning : d.status === 'approved' ? C.statusActive : C.statusError,
        title: d.title,
        subtitle: d.campaignName,
        time: timeAgo(d.createdAt),
        type: 'Draft',
      })
    })

    triggers.forEach((t) => {
      items.push({
        id: `trigger-${t.id}`,
        icon: <Zap size={14} />,
        color: t.status === 'executed' ? C.statusActive : t.status === 'pending' ? C.statusWarning : C.statusError,
        title: t.ruleName,
        subtitle: `${t.action} — ${t.campaignName}`,
        time: timeAgo(t.triggeredAt),
        type: 'Rule',
      })
    })

    notifications.forEach((n) => {
      const iconMap: Record<string, React.ReactNode> = {
        success: <CheckCircle size={14} />,
        warning: <AlertTriangle size={14} />,
        critical: <ShieldAlert size={14} />,
        info: <Bell size={14} />,
      }
      const colorMap: Record<string, string> = {
        success: C.statusActive,
        warning: C.statusWarning,
        critical: C.statusError,
        info: C.statusInfo,
      }
      items.push({
        id: `notif-${n.id}`,
        icon: iconMap[n.type] || <Bell size={14} />,
        color: colorMap[n.type] || C.textSecondary,
        title: n.title,
        subtitle: n.message,
        time: timeAgo(n.createdAt),
        type: 'Alert',
      })
    })

    return items.sort((a, b) => {
      const getTime = (t: string) => {
        if (t === 'Just now') return 0
        const m = t.match(/(\d+)([mhd])/)
        if (!m) return 999
        const n = parseInt(m[1])
        const unit = m[2]
        return n * (unit === 'm' ? 1 : unit === 'h' ? 60 : 1440)
      }
      return getTime(a.time) - getTime(b.time)
    })
  }, [drafts, triggers, notifications])

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.05] p-4 space-y-3" style={{ background: '#111111' }}>
        <Skeleton className="h-5 w-32 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.45, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="rounded-xl border border-white/[0.05] p-4"
      style={{ background: '#111111' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Activity Feed</span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {['All', 'Drafts', 'Rules', 'Alerts'].map((tab) => (
            <span key={tab} className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-white/5 flex-shrink-0" style={{ color: C.textTertiary }}>
              {tab}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col max-h-[420px] overflow-y-auto pr-1">
        {allActivities.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.5 + i * 0.06 }}
            className="flex items-center gap-3 py-3 px-1 rounded-lg transition-colors hover:bg-white/[0.03]"
            style={{ borderBottom: i < allActivities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}18`, color: a.color }}>
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate" style={{ color: C.textPrimary }}>{a.title}</p>
              <p className="text-[11px] truncate" style={{ color: C.textTertiary }}>{a.subtitle}</p>
            </div>
            <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
              <span className="text-[10px]" style={{ color: C.textTertiary }}>{a.time}</span>
              <span
                className="text-[9px] px-1 py-0.5 rounded font-medium"
                style={{ background: `${a.color}12`, color: a.color }}
              >
                {a.type}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN DASHBOARD                                                      */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { lastEvent } = useRealtime({ enabled: true })

  /* State */
  const [dateRange, setDateRange] = useState('7')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  /* Derived data */
  const summary = dashboardData?.summary
  const dailySpend = dashboardData?.dailySpend ?? []
  const platformMetrics = dashboardData?.platformMetrics ?? []
  const campaigns = dashboardData?.campaigns ?? []
  const statusBreakdown = dashboardData?.statusBreakdown ?? { active: 0, paused: 0, ended: 0, draft: 0 }
  const recentDrafts = dashboardData?.recentDrafts ?? []
  const recentTriggers = dashboardData?.recentTriggers ?? []
  const recentNotifications = dashboardData?.recentNotifications ?? []

  const activeRangeLabel = DATE_RANGES.find((d) => d.value === dateRange)?.label || `Last ${dateRange} days`

  /* Fetch dashboard data from real API */
  const fetchDashboard = useCallback(
    async (days: number) => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiGet<DashboardData>(`/reports/dashboard?days=${days}`)
        setDashboardData(data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data'
        setError(message)
        toast({ title: 'Error', description: message, variant: 'destructive' })
        /* Fallback to generated mock data so UI still renders */
        const fallback = generateFallbackDashboardData(days)
        setDashboardData(fallback)
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  /* Fetch alerts from real API */
  const fetchAlerts = useCallback(
    async () => {
      try {
        const data = await apiGet<AlertItem[]>(`/notifications?priority=high,critical&limit=5`)
        setAlerts(data)
      } catch (err: unknown) {
        /* Silently fail — alerts are non-critical */
        setAlerts([])
      }
    },
    []
  )

  /* Combined fetch for parallel loading */
  const fetchAll = useCallback(
    async (days: number) => {
      setLoading(true)
      setError(null)
      try {
        const [dashData, alertData] = await Promise.all([
          apiGet<DashboardData>(`/reports/dashboard?days=${days}`),
          apiGet<AlertItem[]>(`/notifications?priority=high,critical&limit=5`),
        ])
        setDashboardData(dashData)
        setAlerts(alertData)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data'
        setError(message)
        toast({ title: 'Error', description: message, variant: 'destructive' })
        const fallback = generateFallbackDashboardData(days)
        setDashboardData(fallback)
        setAlerts([])
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  /* On mount + date range change: fetch in parallel */
  useEffect(() => {
    fetchAll(parseInt(dateRange, 10))
  }, [dateRange, fetchAll])

  /* Real-time event handlers */
  useEffect(() => {
    if (!lastEvent) return

    if (lastEvent.type === 'metrics.updated') {
      /* Refetch dashboard data when metrics update */
      fetchDashboard(parseInt(dateRange, 10))
      toast({
        title: 'Metrics Updated',
        description: 'Dashboard data refreshed with latest metrics.',
        variant: 'default',
      })
    }

    if (lastEvent.type === 'alert.triggered') {
      /* Add new alert to the list */
      const payload = lastEvent.payload as Partial<AlertItem>
      if (payload && payload.id) {
        const newAlert: AlertItem = {
          id: payload.id,
          severity: (payload.severity as 'critical' | 'warning' | 'info') || 'warning',
          title: payload.title || 'New Alert',
          message: payload.message || '',
          campaignName: payload.campaignName,
          createdAt: payload.createdAt || new Date().toISOString(),
          dismissed: false,
        }
        setAlerts((prev) => [newAlert, ...prev].slice(0, 20))
        toast({
          title: newAlert.title,
          description: newAlert.message,
          variant: newAlert.severity === 'critical' ? 'destructive' : 'default',
        })
      }
    }
  }, [lastEvent, dateRange, fetchDashboard, toast])

  /* Trigger product tour on first visit after onboarding/signup */
  useEffect(() => {
    try {
      const firstLogin = localStorage.getItem('adnexus_tour_first_login')
      if (firstLogin === 'true') {
        localStorage.removeItem('adnexus_tour_first_login')
        const timer = setTimeout(() => {
          triggerTour()
        }, 1500)
        return () => clearTimeout(timer)
      }
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [])

  /* Retry handler */
  const handleRetry = useCallback(() => {
    fetchAll(parseInt(dateRange, 10))
  }, [dateRange, fetchAll])

  /* Dismiss alert handler */
  const handleDismissAlert = useCallback(
    async (id: string) => {
      try {
        await apiGet(`/notifications/${id}/dismiss`)
      } catch {
        /* Silently fail - already handled visually */
      }
    },
    []
  )

  return (
    <>
    <SEO
      title="Dashboard"
      description="Your AdNexus AI command center. View real-time campaign metrics, performance KPIs, alerts, and optimization recommendations at a glance."
      keywords="dashboard, campaign analytics, KPI, performance metrics, advertising dashboard"
    />
    <div className="min-h-[100dvh]" style={{ background: '#0a0a0a' }}>
      <div className="flex">
        {/* Sidebar spacer */}
        <div className="hidden lg:block w-64 flex-shrink-0" />

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-[1440px] mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight" style={{ color: C.textPrimary }}>
                  Dashboard
                </h1>
                <p className="text-[13px] mt-0.5" style={{ color: C.textSecondary }}>
                  Overview of all connected ad accounts
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Date range dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                    style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', color: C.textPrimary }}
                  >
                    <Clock size={14} style={{ color: C.textSecondary }} />
                    {activeRangeLabel}
                    <ChevronDown size={14} style={{ color: C.textSecondary }} />
                  </button>
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-1 py-1 rounded-lg z-50 min-w-[160px] shadow-xl"
                        style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {DATE_RANGES.map((d) => (
                          <button
                            key={d.value}
                            onClick={() => { setDateRange(d.value); setDropdownOpen(false) }}
                            className="w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-white/5"
                            style={{ color: dateRange === d.value ? C.accent : C.textPrimary }}
                          >
                            {d.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-white/5"
                  style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', color: C.textPrimary }}
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
          </motion.div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <ErrorBanner message={error} onRetry={handleRetry} />
            )}
          </AnimatePresence>

          {/* Smart Alerts */}
          <div className="mb-6">
            <SmartAlertBanner alerts={alerts} onDismiss={handleDismissAlert} loading={loading} />
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KPICard
              label="Total Spend"
              value={summary?.totalSpend ?? 0}
              prefix="$"
              sparklineData={sparkFromDaily(dailySpend, 'total')}
              sparklineColor={C.statusActive}
              trend={summary?.totalSpendChange ?? 0}
              trendLabel={`${Math.abs(summary?.totalSpendChange ?? 0).toFixed(1)}%`}
              delay={0}
              icon={<DollarSign size={16} />}
              loading={loading}
            />
            <KPICard
              label="ROAS"
              value={summary?.roas ?? 0}
              suffix="x"
              decimals={1}
              sparklineData={sparkFromDaily(dailySpend, 'total').map((v, _i, arr) => {
                const avg = arr.reduce((s, x) => s + x, 0) / arr.length
                return v / (avg / (summary?.roas ?? 4))
              })}
              sparklineColor={C.accent}
              trend={summary?.roasChange ?? 0}
              trendLabel={`${Math.abs(summary?.roasChange ?? 0).toFixed(1)}%`}
              delay={1}
              icon={<TrendingUp size={16} />}
              loading={loading}
            />
            <KPICard
              label="Conversions"
              value={summary?.conversions ?? 0}
              sparklineData={sparkFromDaily(dailySpend, 'total').map((v, _i, arr) => {
                const avg = arr.reduce((s, x) => s + x, 0) / arr.length
                return (v / (avg || 1)) * (summary?.conversions ?? 100) * 0.3
              })}
              sparklineColor={C.trendUp}
              trend={summary?.conversionsChange ?? 0}
              trendLabel={`${Math.abs(summary?.conversionsChange ?? 0).toFixed(1)}%`}
              delay={2}
              icon={<Flame size={16} />}
              loading={loading}
            />
            <KPICard
              label="CTR"
              value={summary?.ctr ?? 0}
              suffix="%"
              decimals={1}
              sparklineData={sparkFromDaily(dailySpend, 'total').map(() => (summary?.ctr ?? 2) + (Math.random() - 0.5))}
              sparklineColor={C.statusWarning}
              trend={summary?.ctrChange ?? 0}
              trendLabel={`${Math.abs(summary?.ctrChange ?? 0).toFixed(1)}%`}
              delay={3}
              icon={<MousePointer size={16} />}
              loading={loading}
            />
            <KPICard
              label="CPA"
              value={summary?.cpa ?? 0}
              prefix="$"
              decimals={0}
              sparklineData={sparkFromDaily(dailySpend, 'total').map(() => (summary?.cpa ?? 30) + (Math.random() - 0.5) * 5)}
              sparklineColor={C.statusError}
              trend={summary?.cpaChange ?? 0}
              trendLabel={`${Math.abs(summary?.cpaChange ?? 0).toFixed(1)}%`}
              delay={4}
              icon={<Target size={16} />}
              loading={loading}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-3">
              <SpendOverTimeCard data={dailySpend} loading={loading} />
            </div>
            <div className="lg:col-span-2">
              <PlatformPerformanceCard data={platformMetrics} loading={loading} />
            </div>
          </div>

          {/* Campaigns Table + Activity Feed Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-3">
              <CampaignsTable campaigns={campaigns} loading={loading} />
            </div>
            <div className="lg:col-span-2">
              <ActivityFeed drafts={recentDrafts} triggers={recentTriggers} notifications={recentNotifications} loading={loading} />
            </div>
          </div>

          {/* Bottom Row: Campaign Status + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <CampaignStatusCard status={statusBreakdown} loading={loading} />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              className="lg:col-span-2 rounded-xl border border-white/[0.05] p-4"
              style={{ background: '#111111' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>Quick Actions</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <PlusIcon />, label: 'New Campaign', color: C.accent, action: () => navigate('/campaigns') },
                  { icon: <Sparkles size={18} />, label: 'AI Agent', color: '#A855F7', action: () => navigate('/ai-agent') },
                  { icon: <FileText size={18} />, label: 'Drafts', color: C.statusWarning, action: () => navigate('/drafts') },
                  { icon: <BarChart3 size={18} />, label: 'Reports', color: C.statusActive, action: () => navigate('/reports') },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.05] transition-all hover:border-white/10 hover:-translate-y-0.5 group"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="transition-transform group-hover:scale-110" style={{ color: item.color }}>{item.icon}</span>
                    <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="3" x2="9" y2="15" />
      <line x1="3" y1="9" x2="15" y2="9" />
    </svg>
  )
}
