// @ts-nocheck
import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import {
  Palette, AlertTriangle, AlertCircle, Trophy,
  TrendingUp, TrendingDown, Activity, BarChart3,
  DollarSign, MousePointer, Zap, RefreshCw, ChevronDown,
  X, Layers, Clock, ArrowUpRight, Sparkles, Plus,
  Facebook, Globe, Music, Camera, CheckCircle,
  Loader2, Inbox, WifiOff,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#0A0A0A',
  bgElevated: '#111111',
  bgCard: '#141414',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(37,99,235,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  accent: '#2563EB',
  accentGlow: 'rgba(37,99,235,0.15)',
  statusHealthy: '#10B981',
  statusAtRisk: '#F59E0B',
  statusFatigued: '#EF4444',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
}

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */

interface Ad {
  id: string
  name: string
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap'
  status: 'Healthy' | 'At Risk' | 'Fatigued'
  ctr: number
  roas: number
  spend: number
  fatigueScore: number
  daysSinceLaunch: number
  color: string
}

interface FatiguePoint {
  day: string
  [creativeName: string]: number | string
  fatigueDay14: number
  fatigueDay21: number
}

interface CreativePerformance {
  id: string
  name: string
  platform: string
  status: string
  ctr: number
  roas: number
  spend: number
  fatigueScore: number
  daysSinceLaunch: number
  color: string
  timelineData: { day: number; ctr: number; roas: number }[]
}

interface CreativeFatigueResponse {
  ads: {
    id: string
    name: string
    platform: string
    fatigueScore: number
    timeline: { day: number; ctr: number; roas: number }[]
  }[]
  fatigueDay14: number
  fatigueDay21: number
}

interface AdsListResponse {
  data: Ad[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/* ------------------------------------------------------------------ */
/*  STATIC DATA (platform info, recommendations — UI-only content)      */
/* ------------------------------------------------------------------ */

const PLATFORMS = [
  { name: 'Meta', icon: Facebook, color: C.metaBlue, lifespan: '1-2 weeks', refresh: 'Refresh every 10-14 days', description: 'Video & carousel ads perform best. Refresh before CTR drops below 1.5%.' },
  { name: 'TikTok', icon: Music, color: C.tiktokCyan, lifespan: '3-7 days', refresh: 'Refresh every 3-7 days', description: 'Fastest fatigue cycle. UGC and native-style content require frequent rotation.' },
  { name: 'Google', icon: Globe, color: C.googleRed, lifespan: 'Varies', refresh: 'Monitor CTR weekly', description: 'Search vs Display have different lifecycles. Responsive Search Ads auto-rotate.' },
  { name: 'Snap', icon: Camera, color: C.snapYellow, lifespan: '1-2 weeks', refresh: 'Refresh every 7-10 days', description: 'Short-form video works best. Keep under 6 seconds for optimal completion rates.' },
]

const RECOMMENDATIONS = [
  { id: 1, title: "Refresh TikTok creative 'Summer Sale'", subtitle: 'Fatigue score reached 85%', type: 'fatigue', icon: RefreshCw, action: 'Create New Draft' },
  { id: 2, title: 'A/B test new headline for Meta campaign', subtitle: 'Current headline CTR declining 12% over 7 days', type: 'ab-test', icon: BarChart3, action: 'Create Draft' },
  { id: 3, title: 'Repurpose top Google creative for TikTok', subtitle: 'High-performing asset on one platform can scale', type: 'repurpose', icon: Layers, action: 'Create Draft' },
]

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
const statusColors: Record<string, string> = {
  Healthy: C.statusHealthy,
  'At Risk': C.statusAtRisk,
  Fatigued: C.statusFatigued,
}

const statusBg: Record<string, string> = {
  Healthy: 'rgba(16,185,129,0.1)',
  'At Risk': 'rgba(245,158,11,0.1)',
  Fatigued: 'rgba(239,68,68,0.1)',
}

const platformIcons: Record<string, any> = {
  Meta: Facebook,
  TikTok: Music,
  Google: Globe,
  Snap: Camera,
}

const platformColors: Record<string, string> = {
  Meta: C.metaBlue,
  TikTok: C.tiktokCyan,
  Google: C.googleRed,
  Snap: C.snapYellow,
}

const fatigueColor = (score: number) => {
  if (score < 40) return C.statusHealthy
  if (score < 75) return C.statusAtRisk
  return C.statusFatigued
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function getAdColor(ad: Ad): string {
  return platformColors[ad.platform] || C.accent
}

function computeAdStatus(fatigueScore: number): 'Healthy' | 'At Risk' | 'Fatigued' {
  if (fatigueScore >= 75) return 'Fatigued'
  if (fatigueScore >= 40) return 'At Risk'
  return 'Healthy'
}

/* ------------------------------------------------------------------ */
/*  SKELETON COMPONENTS                                                 */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div
      className="rounded-xl border p-5 animate-pulse"
      style={{ background: C.bgCard, borderColor: C.borderSubtle }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="w-16 h-6 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="w-16 h-8 rounded mb-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="w-24 h-4 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

function SkeletonCreativeCard() {
  return (
    <div
      className="rounded-xl border p-4 animate-pulse"
      style={{ background: C.bgCard, borderColor: C.borderSubtle }}
    >
      <div className="w-full h-28 rounded-lg mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="w-3/4 h-4 rounded mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="h-8 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-8 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-8 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="h-72 rounded-lg animate-pulse flex items-end justify-between px-4 pb-4 gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t"
          style={{
            background: 'rgba(255,255,255,0.04)',
            height: `${20 + Math.random() * 60}%`,
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ERROR & EMPTY STATES                                                */
/* ------------------------------------------------------------------ */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
      style={{ background: C.bgCard, borderColor: C.borderSubtle }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'rgba(239,68,68,0.1)' }}
      >
        <WifiOff size={24} style={{ color: C.statusFatigued }} />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: C.textPrimary }}>
        Failed to load data
      </h3>
      <p className="text-xs mb-4 max-w-xs" style={{ color: C.textSecondary }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all hover:opacity-90"
        style={{ background: C.accent, color: '#fff' }}
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
      style={{ background: C.bgCard, borderColor: C.borderSubtle }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'rgba(37,99,235,0.1)' }}
      >
        <Inbox size={24} style={{ color: C.accent }} />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: C.textPrimary }}>
        No creatives found
      </h3>
      <p className="text-xs max-w-xs" style={{ color: C.textSecondary }}>
        Get started by creating your first ad creative. Creatives will appear here once they are live.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                      */
/* ------------------------------------------------------------------ */

function KPICard({ kpi, index }: { kpi: { label: string; value: number; change: string; trend: string; icon: any; color: string }; index: number }) {
  const Icon = kpi.icon
  return (
    <motion.div
      variants={itemVariants}
      className="relative rounded-xl border p-5 transition-all duration-300 hover:border-opacity-20 group"
      style={{
        background: C.bgCard,
        borderColor: C.borderSubtle,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${kpi.color}15` }}
        >
          <Icon size={20} style={{ color: kpi.color }} />
        </div>
        <div
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
          style={{
            background: kpi.trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: kpi.trend === 'up' ? C.statusHealthy : C.statusFatigued,
          }}
        >
          {kpi.trend === 'up' ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
          {kpi.change}
        </div>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: C.textPrimary }}>
        {kpi.value}
      </div>
      <div className="text-sm" style={{ color: C.textSecondary }}>{kpi.label}</div>
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 1px ${kpi.color}20`,
        }}
      />
    </motion.div>
  )
}

function CreativeCard({ creative, onClick }: { creative: Ad; onClick: () => void }) {
  const PlatformIcon = platformIcons[creative.platform] || Layers
  const isWarning = creative.status === 'At Risk' || creative.status === 'Fatigued'
  const fColor = fatigueColor(creative.fatigueScore)
  const adColor = getAdColor(creative)

  return (
    <motion.div
      variants={itemVariants}
      layout
      onClick={onClick}
      className={`relative rounded-xl border p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
        isWarning ? 'animate-pulse-border' : ''
      }`}
      style={{
        background: C.bgCard,
        borderColor: isWarning ? `${fColor}40` : C.borderSubtle,
        boxShadow: isWarning ? `0 0 20px ${fColor}10` : 'none',
      }}
    >
      {/* Thumbnail Placeholder */}
      <div
        className="w-full h-28 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
        style={{ background: `${adColor}15` }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(135deg, ${adColor}40 0%, transparent 60%)`,
          }}
        />
        <Palette size={28} style={{ color: adColor, opacity: 0.7 }} />
        <div
          className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: statusBg[creative.status],
            color: statusColors[creative.status],
          }}
        >
          {creative.status}
        </div>
      </div>

      {/* Name & Platform */}
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon size={14} style={{ color: adColor }} />
        <span className="text-sm font-medium truncate" style={{ color: C.textPrimary }}>
          {creative.name}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: C.textTertiary }}>CTR</div>
          <div className="text-sm font-semibold" style={{ color: C.textPrimary }}>{creative.ctr}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: C.textTertiary }}>ROAS</div>
          <div className="text-sm font-semibold" style={{ color: C.textPrimary }}>{creative.roas}x</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: C.textTertiary }}>Spend</div>
          <div className="text-sm font-semibold" style={{ color: C.textPrimary }}>${(creative.spend / 1000).toFixed(1)}k</div>
        </div>
      </div>

      {/* Fatigue Score Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] mb-1" style={{ color: C.textSecondary }}>
          <span>Fatigue Score</span>
          <span style={{ color: fColor }}>{creative.fatigueScore}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: fColor }}
            initial={{ width: 0 }}
            animate={{ width: `${creative.fatigueScore}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Days */}
      <div className="flex items-center gap-1 text-[10px]" style={{ color: C.textTertiary }}>
        <Clock size={10} />
        {creative.daysSinceLaunch} days since launch
      </div>
    </motion.div>
  )
}

function DetailPanel({ ad, onClose }: { ad: Ad; onClose: () => void }) {
  const [performance, setPerformance] = useState<CreativePerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const adColor = getAdColor(ad)

  useEffect(() => {
    let cancelled = false

    async function fetchPerformance() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiGet<CreativePerformance>(`/ads/${ad.id}/creative-performance`)
        if (!cancelled) setPerformance(data)
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load creative performance')
          // Fall back to ad data itself
          setPerformance({
            id: ad.id,
            name: ad.name,
            platform: ad.platform,
            status: ad.status,
            ctr: ad.ctr,
            roas: ad.roas,
            spend: ad.spend,
            fatigueScore: ad.fatigueScore,
            daysSinceLaunch: ad.daysSinceLaunch,
            color: adColor,
            timelineData: [],
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPerformance()
    return () => { cancelled = true }
  }, [ad.id])

  const display = performance || ad

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="rounded-2xl border p-6 w-full max-w-lg"
        style={{ background: C.bgCard, borderColor: C.borderSubtle }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold" style={{ color: C.textPrimary }}>{display.name}</h3>
            <p className="text-sm" style={{ color: C.textSecondary }}>{display.platform}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: C.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', color: C.statusFatigued }}
          >
            {error}
          </div>
        )}

        <div
          className="w-full h-40 rounded-xl mb-6 flex items-center justify-center"
          style={{ background: `${adColor}15` }}
        >
          <Palette size={40} style={{ color: adColor, opacity: 0.5 }} />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'CTR', value: `${display.ctr}%`, icon: MousePointer },
                { label: 'ROAS', value: `${display.roas}x`, icon: TrendingUp },
                { label: 'Spend', value: `$${(display.spend / 1000).toFixed(1)}k`, icon: DollarSign },
              ].map((metric) => (
                <div key={metric.label} className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <metric.icon size={16} className="mx-auto mb-1" style={{ color: C.textSecondary }} />
                  <div className="text-lg font-bold" style={{ color: C.textPrimary }}>{metric.value}</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: C.textTertiary }}>{metric.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-sm" style={{ color: C.textSecondary }}>Status</span>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: statusBg[display.status || 'Healthy'], color: statusColors[display.status || 'Healthy'] }}
                >
                  {display.status}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-sm" style={{ color: C.textSecondary }}>Fatigue Score</span>
                <span className="text-sm font-semibold" style={{ color: fatigueColor(display.fatigueScore || 0) }}>
                  {display.fatigueScore}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-sm" style={{ color: C.textSecondary }}>Days Since Launch</span>
                <span className="text-sm font-medium" style={{ color: C.textPrimary }}>{display.daysSinceLaunch} days</span>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function ComparisonTool({ ads }: { ads: Ad[] }) {
  const [leftId, setLeftId] = useState(ads[0]?.id || '')
  const [rightId, setRightId] = useState(ads[1]?.id || '')

  const left = ads.find((c) => c.id === leftId) || ads[0]
  const right = ads.find((c) => c.id === rightId) || ads[1]

  const MetricRow = ({ label, leftVal, rightVal, leftFmt, rightFmt, isHigherBetter = true }: any) => {
    const l = parseFloat(leftVal)
    const r = parseFloat(rightVal)
    const better = isHigherBetter ? (l > r ? 'left' : l < r ? 'right' : null) : (l < r ? 'left' : l < r ? 'right' : null)

    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b" style={{ borderColor: C.borderSubtle }}>
        <div className="text-center">
          <span className={`text-sm font-semibold ${better === 'left' ? 'text-emerald-400' : ''}`} style={better !== 'left' ? { color: C.textPrimary } : {}}>
            {leftFmt}
          </span>
          {better === 'left' && <CheckCircle size={12} className="inline ml-1 text-emerald-400" />}
        </div>
        <div className="text-center text-xs uppercase tracking-wider font-medium" style={{ color: C.textTertiary }}>
          {label}
        </div>
        <div className="text-center">
          <span className={`text-sm font-semibold ${better === 'right' ? 'text-emerald-400' : ''}`} style={better !== 'right' ? { color: C.textPrimary } : {}}>
            {rightFmt}
          </span>
          {better === 'right' && <CheckCircle size={12} className="inline ml-1 text-emerald-400" />}
        </div>
      </div>
    )
  }

  if (ads.length < 2) {
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ background: C.bgCard, borderColor: C.borderSubtle }}
      >
        <p className="text-sm" style={{ color: C.textSecondary }}>
          Need at least 2 creatives to compare. Create more ads to use this tool.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-6" style={{ background: C.bgCard, borderColor: C.borderSubtle }}>
      {/* Selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { value: leftId, setter: setLeftId, label: 'Creative A' },
          { value: rightId, setter: setRightId, label: 'Creative B' },
        ].map((side, idx) => (
          <div key={idx} className="relative">
            <label className="text-[10px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: C.textTertiary }}>
              {side.label}
            </label>
            <div className="relative">
              <select
                value={side.value}
                onChange={(e) => side.setter(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2"
                style={{ background: C.bgElevated, borderColor: C.borderSubtle, color: C.textPrimary }}
              >
                {ads.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.textSecondary }} />
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[left, right].map((creative, idx) => {
          const cColor = getAdColor(creative)
          return (
            <div key={idx} className="rounded-lg p-4" style={{ background: `${cColor}08` }}>
              <div
                className="w-full h-20 rounded-lg mb-3 flex items-center justify-center"
                style={{ background: `${cColor}15` }}
              >
                <Palette size={24} style={{ color: cColor, opacity: 0.6 }} />
              </div>
              <div className="text-sm font-semibold text-center mb-1" style={{ color: C.textPrimary }}>{creative.name}</div>
              <div className="text-xs text-center" style={{ color: C.textSecondary }}>{creative.platform}</div>
            </div>
          )
        })}
      </div>

      {/* Metrics Comparison */}
      <div className="rounded-lg border p-4" style={{ borderColor: C.borderSubtle, background: 'rgba(255,255,255,0.02)' }}>
        <MetricRow label="CTR" leftVal={left.ctr} rightVal={right.ctr} leftFmt={`${left.ctr}%`} rightFmt={`${right.ctr}%`} />
        <MetricRow label="ROAS" leftVal={left.roas} rightVal={right.roas} leftFmt={`${left.roas}x`} rightFmt={`${right.roas}x`} />
        <MetricRow label="Spend" leftVal={left.spend} rightVal={right.spend} leftFmt={`$${(left.spend / 1000).toFixed(1)}k`} rightFmt={`$${(right.spend / 1000).toFixed(1)}k`} isHigherBetter={false} />
        <MetricRow label="Fatigue" leftVal={left.fatigueScore} rightVal={right.fatigueScore} leftFmt={`${left.fatigueScore}%`} rightFmt={`${right.fatigueScore}%`} isHigherBetter={false} />
        <div className="grid grid-cols-3 gap-4 pt-3">
          <div className="text-center text-sm font-medium" style={{ color: C.textSecondary }}>{left.daysSinceLaunch} days</div>
          <div className="text-center text-xs uppercase tracking-wider font-medium" style={{ color: C.textTertiary }}>Age</div>
          <div className="text-center text-sm font-medium" style={{ color: C.textSecondary }}>{right.daysSinceLaunch} days</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */

export default function CreativeIntelligence() {
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
  const [activeFatigueTab, setActiveFatigueTab] = useState<'ctr' | 'roas'>('ctr')

  /* ── API data ── */
  const [ads, setAds] = useState<Ad[]>([])
  const [fatigueData, setFatigueData] = useState<FatiguePoint[]>([])
  const [fatigueLines, setFatigueLines] = useState<string[]>([])
  const [fatigueLineColors, setFatigueLineColors] = useState<string[]>([])
  const [fatigueRefLines, setFatigueRefLines] = useState<{ day14: number; day21: number }>({ day14: 14, day21: 21 })

  /* ── Loading states ── */
  const [adsLoading, setAdsLoading] = useState(true)
  const [fatigueLoading, setFatigueLoading] = useState(true)

  /* ── Error states ── */
  const [adsError, setAdsError] = useState<string | null>(null)
  const [fatigueError, setFatigueError] = useState<string | null>(null)

  /* ── Derived KPIs ── */
  const kpis = useMemo(() => {
    const total = ads.length
    const atRisk = ads.filter((a) => a.status === 'At Risk').length
    const fatigued = ads.filter((a) => a.status === 'Fatigued').length
    const healthy = ads.filter((a) => a.status === 'Healthy').length
    return [
      { label: 'Total Creatives', value: total, change: total > 0 ? `+${total}` : '0', trend: 'up', icon: Layers, color: C.accent },
      { label: 'At Risk', value: atRisk, change: atRisk > 0 ? `+${atRisk}` : '0', trend: atRisk > 0 ? 'down' : 'up', icon: AlertTriangle, color: C.statusAtRisk },
      { label: 'Fatigued', value: fatigued, change: fatigued > 0 ? `-${fatigued}` : '0', trend: 'up', icon: AlertCircle, color: C.statusFatigued },
      { label: 'Top Performers', value: healthy, change: healthy > 0 ? `+${healthy}` : '0', trend: 'up', icon: Trophy, color: C.statusHealthy },
    ]
  }, [ads])

  /* ── Fetch ads ── */
  const fetchAds = useCallback(async () => {
    setAdsLoading(true)
    setAdsError(null)
    try {
      const response = await apiGet<AdsListResponse>('/ads')
      const enrichedAds: Ad[] = (response.data || []).map((ad) => ({
        ...ad,
        color: getAdColor(ad),
        status: ad.status || computeAdStatus(ad.fatigueScore || 0),
      }))
      setAds(enrichedAds)
    } catch (err: any) {
      setAdsError(err?.message || 'Failed to load creatives')
    } finally {
      setAdsLoading(false)
    }
  }, [])

  /* ── Fetch fatigue data ── */
  const fetchFatigue = useCallback(async () => {
    setFatigueLoading(true)
    setFatigueError(null)
    try {
      const response = await apiGet<CreativeFatigueResponse>('/agent/creative-fatigue')
      const adsData = response.ads || []

      // Build timeline chart data
      const maxDays = 30
      const chartData: FatiguePoint[] = []

      // Get top 5 creatives by fatigue score for the chart
      const topAds = [...adsData]
        .sort((a, b) => (b.fatigueScore || 0) - (a.fatigueScore || 0))
        .slice(0, 5)

      const lineNames = topAds.map((a) => a.name)
      const lineCols = topAds.map((a) => platformColors[a.platform] || C.accent)

      for (let day = 1; day <= maxDays; day++) {
        const point: FatiguePoint = {
          day: `Day ${day}`,
          fatigueDay14: response.fatigueDay14 || 14,
          fatigueDay21: response.fatigueDay21 || 21,
        }

        topAds.forEach((ad) => {
          const timelineEntry = ad.timeline?.find((t) => t.day === day)
          if (activeFatigueTab === 'ctr') {
            point[ad.name] = timelineEntry?.ctr ?? 0
          } else {
            point[ad.name] = timelineEntry?.roas ?? 0
          }
        })

        chartData.push(point)
      }

      setFatigueData(chartData)
      setFatigueLines(lineNames)
      setFatigueLineColors(lineCols)
      setFatigueRefLines({
        day14: response.fatigueDay14 || 14,
        day21: response.fatigueDay21 || 21,
      })
    } catch (err: any) {
      setFatigueError(err?.message || 'Failed to load fatigue data')
      setFatigueData([])
      setFatigueLines([])
    } finally {
      setFatigueLoading(false)
    }
  }, [activeFatigueTab])

  /* ── Initial load ── */
  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  useEffect(() => {
    if (!adsLoading) {
      fetchFatigue()
    }
  }, [adsLoading, activeFatigueTab, fetchFatigue])

  return (
    <>
    <SEO
      title="Creative Intelligence"
      description="Analyze creative performance with AI-powered insights. Discover winning ad patterns, fatigue tracking, and creative optimization."
      keywords="creative intelligence, ad creative analysis, creative performance, fatigue tracking"
    />
    <div className="min-h-screen pb-20" style={{ background: C.bg }}>
      {/* Header */}
      <div className="border-b px-6 py-6" style={{ borderColor: C.borderSubtle, background: C.bgElevated }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${C.accent}15` }}>
              <Sparkles size={18} style={{ color: C.accent }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Creative Intelligence</h1>
              <p className="text-xs" style={{ color: C.textSecondary }}>AI-powered creative fatigue detection & optimization</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* ═══════ SECTION 1: KPI Cards ═══════ */}
        {adsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : adsError && ads.length === 0 ? (
          <ErrorState message={adsError} onRetry={fetchAds} />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {kpis.map((kpi, i) => (
              <KPICard key={kpi.label} kpi={kpi} index={i} />
            ))}
          </motion.div>
        )}

        {/* ═══════ SECTION 2: Creative Fatigue Timeline ═══════ */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="rounded-xl border p-6" style={{ background: C.bgCard, borderColor: C.borderSubtle }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                  <Activity size={18} style={{ color: C.accent }} />
                  Creative Fatigue Timeline
                </h2>
                <p className="text-xs mt-1" style={{ color: C.textSecondary }}>Performance decay over 30 days for top creatives</p>
              </div>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: C.borderSubtle }}>
                <button
                  onClick={() => setActiveFatigueTab('ctr')}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: activeFatigueTab === 'ctr' ? C.accent : 'transparent',
                    color: activeFatigueTab === 'ctr' ? '#fff' : C.textSecondary,
                  }}
                >
                  CTR
                </button>
                <button
                  onClick={() => setActiveFatigueTab('roas')}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: activeFatigueTab === 'roas' ? C.accent : 'transparent',
                    color: activeFatigueTab === 'roas' ? '#fff' : C.textSecondary,
                  }}
                >
                  ROAS
                </button>
              </div>
            </div>

            {fatigueLoading ? (
              <SkeletonChart />
            ) : fatigueError ? (
              <ErrorState message={fatigueError} onRetry={fetchFatigue} />
            ) : fatigueData.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fatigueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: C.textTertiary, fontSize: 10 }}
                        axisLine={{ stroke: C.borderSubtle }}
                        tickLine={false}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fill: C.textTertiary, fontSize: 10 }}
                        axisLine={{ stroke: C.borderSubtle }}
                        tickLine={false}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          background: C.bgCard,
                          border: `1px solid ${C.borderSubtle}`,
                          borderRadius: 8,
                          fontSize: 12,
                          color: C.textPrimary,
                        }}
                        itemStyle={{ fontSize: 11 }}
                        labelStyle={{ color: C.textSecondary, marginBottom: 4 }}
                      />
                      <ReferenceLine
                        x={`Day ${fatigueRefLines.day14}`}
                        stroke={C.statusAtRisk}
                        strokeDasharray="6 3"
                        label={{ value: 'AI Flagged', fill: C.statusAtRisk, fontSize: 10, position: 'top' }}
                      />
                      <ReferenceLine
                        x={`Day ${fatigueRefLines.day21}`}
                        stroke={C.statusFatigued}
                        strokeDasharray="6 3"
                        label={{ value: 'Critical', fill: C.statusFatigued, fontSize: 10, position: 'top' }}
                      />
                      {fatigueLines.map((key, i) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={fatigueLineColors[i] || C.accent}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                {fatigueLines.length > 0 && (
                  <div className="flex flex-wrap gap-4 mt-4">
                    {fatigueLines.map((key, i) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: fatigueLineColors[i] || C.accent }} />
                        <span className="text-[11px]" style={{ color: C.textSecondary }}>{key}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>

        {/* ═══════ SECTION 3: Creative Cards Grid ═══════ */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
                <Palette size={18} style={{ color: C.accent }} />
                Creative Inventory
              </h2>
              <p className="text-xs mt-1" style={{ color: C.textSecondary }}>Click any card to view details</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: C.statusHealthy }} />
              <span className="text-[10px] mr-3" style={{ color: C.textSecondary }}>Healthy</span>
              <span className="w-2 h-2 rounded-full" style={{ background: C.statusAtRisk }} />
              <span className="text-[10px] mr-3" style={{ color: C.textSecondary }}>At Risk</span>
              <span className="w-2 h-2 rounded-full" style={{ background: C.statusFatigued }} />
              <span className="text-[10px]" style={{ color: C.textSecondary }}>Fatigued</span>
            </div>
          </motion.div>

          {adsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCreativeCard key={i} />
              ))}
            </div>
          ) : adsError ? (
            <ErrorState message={adsError} onRetry={fetchAds} />
          ) : ads.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ads.map((ad) => (
                <CreativeCard
                  key={ad.id}
                  creative={ad}
                  onClick={() => setSelectedAd(ad)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* ═══════ SECTION 4: Platform Lifecycles ═══════ */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
              <Layers size={18} style={{ color: C.accent }} />
              Platform-Specific Lifecycles
            </h2>
            <p className="text-xs mt-1" style={{ color: C.textSecondary }}>Average creative lifespan and refresh recommendations per platform</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon
              return (
                <motion.div
                  key={platform.name}
                  variants={itemVariants}
                  className="rounded-xl border p-5 transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: C.bgCard, borderColor: C.borderSubtle }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${platform.color}15` }}
                    >
                      <Icon size={20} style={{ color: platform.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: C.textPrimary }}>{platform.name}</div>
                      <div className="text-[10px]" style={{ color: C.textSecondary }}>Avg. lifespan: {platform.lifespan}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: C.textTertiary }}>Recommendation</div>
                    <div className="text-xs font-medium" style={{ color: platform.color }}>{platform.refresh}</div>
                  </div>

                  <p className="text-[11px] leading-relaxed" style={{ color: C.textSecondary }}>{platform.description}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ═══════ SECTION 5: AI Recommendations ═══════ */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
              <Zap size={18} style={{ color: C.accent }} />
              AI Recommendations
            </h2>
            <p className="text-xs mt-1" style={{ color: C.textSecondary }}>Smart suggestions based on fatigue analysis</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RECOMMENDATIONS.map((rec) => {
              const Icon = rec.icon
              const typeColors: Record<string, string> = {
                fatigue: C.statusFatigued,
                'ab-test': C.accent,
                repurpose: C.statusHealthy,
              }
              const tColor = typeColors[rec.type] || C.accent

              return (
                <motion.div
                  key={rec.id}
                  variants={itemVariants}
                  className="rounded-xl border p-5 group transition-all duration-300 hover:border-opacity-30"
                  style={{ background: C.bgCard, borderColor: C.borderSubtle }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${tColor}15` }}
                    >
                      <Icon size={18} style={{ color: tColor }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>{rec.title}</h3>
                      <p className="text-[11px] mt-0.5" style={{ color: C.textSecondary }}>{rec.subtitle}</p>
                    </div>
                  </div>
                  <button
                    className="w-full mt-2 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 hover:opacity-90"
                    style={{ background: `${tColor}15`, color: tColor, border: `1px solid ${tColor}25` }}
                  >
                    <Plus size={12} />
                    {rec.action}
                  </button>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ═══════ SECTION 6: Creative Comparison Tool ═══════ */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: C.textPrimary }}>
              <BarChart3 size={18} style={{ color: C.accent }} />
              Creative Comparison Tool
            </h2>
            <p className="text-xs mt-1" style={{ color: C.textSecondary }}>Compare performance metrics side-by-side</p>
          </motion.div>

          {adsLoading ? (
            <div
              className="rounded-xl border p-6 animate-pulse"
              style={{ background: C.bgCard, borderColor: C.borderSubtle }}
            >
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="h-20 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-20 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
              <div className="h-40 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ) : ads.length < 2 ? (
            <ComparisonTool ads={ads} />
          ) : (
            <ComparisonTool ads={ads} />
          )}
        </motion.div>
      </div>

      {/* Detail Panel Modal */}
      <AnimatePresence>
        {selectedAd && (
          <DetailPanel ad={selectedAd} onClose={() => setSelectedAd(null)} />
        )}
      </AnimatePresence>

      {/* Pulsing border keyframes - injected inline */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0px transparent; }
          50% { box-shadow: 0 0 0 2px currentColor; }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
    </div>
    </>
  )
}
