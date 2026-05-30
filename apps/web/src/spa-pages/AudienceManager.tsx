// @ts-nocheck
import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Copy,
  Archive,
  X,
  Users,
  Target,
  Sparkles,
  GitBranch,
  BarChart3,
  ChevronRight,
  Activity,
  DollarSign,
  MousePointerClick,
  ShoppingCart,
  TrendingUp,
  Zap,
  Eye,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  ArrowUpRight,
  Layers,
  Globe,
  Clock,
  Filter,
  AlertTriangle,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from 'recharts'
import CountUp from 'react-countup'
import { apiGet } from '../lib/api'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snap'
type AudienceType = 'Custom' | 'Lookalike' | 'Saved' | 'Retargeting' | 'Interest' | 'Behavioral'
type AudienceStatus = 'Active' | 'Unused' | 'Building'

interface Audience {
  id: string
  name: string
  platform: Platform
  type: AudienceType
  size: number
  campaigns: number
  ctr: number
  cpa: number
  roas: number
  spend: number
  conversions: number
  status: AudienceStatus
  created: string
  lastUsed: string
  frequency: number
  reach: number
  chartData: { week: string; ctr: number; cpa: number; roas: number }[]
  aiInsight: string
  ageData: { name: string; value: number }[]
  genderData: { name: string; value: number }[]
  overlapWith: { platform: Platform; percentage: number }[]
}

interface AISuggestion {
  id: string
  title: string
  description: string
  impact: 'High' | 'Medium' | 'Low'
  type: 'Lookalike' | 'Expansion' | 'Niche' | 'Test'
  estimatedRoas: number
  estimatedCpa: number
  confidence: number
}

interface OverlapMatrixRow {
  platform: string
  Meta: number
  Google: number
  TikTok: number
  Snap: number
}

interface RadarMetric {
  metric: string
  Meta: number
  Google: number
  TikTok: number
  Snap: number
}

interface AudiencePerformance {
  week: string
  ctr: number
  cpa: number
  roas: number
}

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */
const PLATFORM_COLORS: Record<Platform, string> = {
  Meta: '#1877F2',
  Google: '#DB4437',
  TikTok: '#00F2EA',
  Snap: '#FFFC00',
}

const ACCENT = '#c3f53b'
const ACCENT_DARK = '#a8d62f'

const TYPE_COLORS: Record<AudienceType, string> = {
  Custom: 'rgba(37,99,235,0.15)',
  Lookalike: 'rgba(16,185,129,0.15)',
  Saved: 'rgba(195,245,59,0.15)',
  Retargeting: 'rgba(245,158,11,0.15)',
  Interest: 'rgba(0,242,234,0.15)',
  Behavioral: 'rgba(255,252,0,0.15)',
}

const TYPE_TEXT_COLORS: Record<AudienceType, string> = {
  Custom: '#3B82F6',
  Lookalike: '#10B981',
  Saved: '#c3f53b',
  Retargeting: '#F59E0B',
  Interest: '#00F2EA',
  Behavioral: '#FFFC00',
}

const STATUS_COLORS: Record<AudienceStatus, string> = {
  Active: '#10B981',
  Unused: '#8A8F98',
  Building: '#3B82F6',
}

const PIE_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number]
const easeInOut = [0.65, 0, 0.35, 1] as [number, number, number, number]

/* ------------------------------------------------------------------ */
/*  Default Fallback Data                                              */
/* ------------------------------------------------------------------ */
const defaultAgeData = [
  { name: '18-24', value: 28 },
  { name: '25-34', value: 35 },
  { name: '35-44', value: 20 },
  { name: '45-54', value: 12 },
  { name: '55+', value: 5 },
]

const defaultGenderData = [
  { name: 'Female', value: 62 },
  { name: 'Male', value: 36 },
  { name: 'Other', value: 2 },
]

const defaultChartData = [
  { week: 'W1', ctr: 2.2, cpa: 20, roas: 3.8 },
  { week: 'W2', ctr: 2.5, cpa: 19, roas: 4.0 },
  { week: 'W3', ctr: 2.8, cpa: 18, roas: 4.2 },
  { week: 'W4', ctr: 2.6, cpa: 18, roas: 4.1 },
  { week: 'W5', ctr: 2.9, cpa: 17, roas: 4.5 },
  { week: 'W6', ctr: 3.0, cpa: 16, roas: 4.6 },
]

const defaultOverlapMatrix: OverlapMatrixRow[] = [
  { platform: 'Meta', Meta: 100, Google: 14, TikTok: 26, Snap: 9 },
  { platform: 'Google', Meta: 14, Google: 100, TikTok: 18, Snap: 7 },
  { platform: 'TikTok', Meta: 26, Google: 18, TikTok: 100, Snap: 31 },
  { platform: 'Snap', Meta: 9, Google: 7, TikTok: 31, Snap: 100 },
]

const defaultRadarData: RadarMetric[] = [
  { metric: 'Reach', Meta: 85, Google: 92, TikTok: 78, Snap: 65 },
  { metric: 'CTR', Meta: 90, Google: 72, TikTok: 58, Snap: 45 },
  { metric: 'ROAS', Meta: 88, Google: 75, TikTok: 62, Snap: 50 },
  { metric: 'Frequency', Meta: 70, Google: 55, TikTok: 65, Snap: 60 },
  { metric: 'CPA Efficiency', Meta: 82, Google: 68, TikTok: 55, Snap: 42 },
  { metric: 'Scale', Meta: 78, Google: 95, TikTok: 88, Snap: 72 },
]

const platforms: (Platform | 'All')[] = ['All', 'Meta', 'Google', 'TikTok', 'Snap']

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatSize(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toString()
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString()}`
}

/* ------------------------------------------------------------------ */
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */
function SkeletonStat() {
  return (
    <div className="rounded-xl p-5 animate-pulse border border-white/[0.04]" style={{ background: '#141B23' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
        <div className="h-3 rounded w-20 bg-white/[0.06]" />
      </div>
      <div className="h-8 rounded w-24 mb-2 bg-white/[0.06]" />
      <div className="h-2.5 rounded w-16 bg-white/[0.06]" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="grid gap-4 px-4 py-3 items-center animate-pulse" style={{ gridTemplateColumns: '2fr 0.7fr 0.8fr 0.7fr 0.8fr 1fr 1.2fr 0.8fr 0.9fr 0.7fr', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="h-3.5 rounded w-32 bg-white/[0.06]" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-3 rounded w-16 bg-white/[0.06]" />
      ))}
      <div className="h-3 rounded w-12 ml-auto bg-white/[0.06]" />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-5 border animate-pulse" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="h-4 rounded w-48 mb-3 bg-white/[0.06]" />
      <div className="h-3 rounded w-full mb-2 bg-white/[0.06]" />
      <div className="h-3 rounded w-3/4 mb-4 bg-white/[0.06]" />
      <div className="flex gap-4">
        <div className="h-3 rounded w-16 bg-white/[0.06]" />
        <div className="h-3 rounded w-16 bg-white/[0.06]" />
        <div className="h-3 rounded w-16 bg-white/[0.06]" />
      </div>
    </div>
  )
}

function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl p-6 border text-center" style={{ background: '#141B23', borderColor: 'rgba(239,68,68,0.2)' }}>
      <AlertTriangle size={24} style={{ color: '#EF4444' }} className="mx-auto mb-2" />
      <p className="text-sm mb-3" style={{ color: '#F1F5F9' }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
          Retry
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Venn-style Overlap Visual                                          */
/* ------------------------------------------------------------------ */
function OverlapVisualization({ overlapData }: { overlapData?: { pair: string; pct: number; desc: string }[] }) {
  const vennData = [
    { name: 'Meta', x: 30, y: 45, r: 28, color: '#1877F2' },
    { name: 'Google', x: 55, y: 35, r: 24, color: '#DB4437' },
    { name: 'TikTok', x: 50, y: 60, r: 26, color: '#00F2EA' },
    { name: 'Snap', x: 70, y: 55, r: 18, color: '#FFFC00' },
  ]

  const defaultPairs = [
    { pair: 'Meta ↔ Google', pct: 14, desc: 'Low overlap — good for incremental reach' },
    { pair: 'Meta ↔ TikTok', pct: 26, desc: 'Moderate — sequential storytelling works' },
    { pair: 'Google ↔ TikTok', pct: 18, desc: 'Search + discovery combo potential' },
    { pair: 'TikTok ↔ Snap', pct: 31, desc: 'High overlap — avoid duplication' },
  ]

  const pairs = overlapData || defaultPairs

  // Map pair labels to approximate positions for the SVG text
  const getLabelForPair = (pairStr: string) => {
    const match = pairs.find(p => p.pair === pairStr)
    return match ? `${match.pct}%` : ''
  }

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 100 85" className="w-full max-w-[360px] h-auto">
        <defs>
          {vennData.map((c) => (
            <radialGradient key={c.name} id={`grad-${c.name}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={c.color} stopOpacity="0.08" />
            </radialGradient>
          ))}
        </defs>
        {vennData.map((c) => (
          <g key={c.name}>
            <circle
              cx={c.x} cy={c.y} r={c.r}
              fill={`url(#grad-${c.name})`}
              stroke={c.color}
              strokeWidth="0.6"
              strokeOpacity="0.5"
            />
            <text x={c.x} y={c.y - c.r - 3} textAnchor="middle" fill="#A1A1AA" fontSize="3.5" fontWeight="600">
              {c.name}
            </text>
          </g>
        ))}
        {/* Overlap labels - dynamically placed */}
        {pairs[0] && <text x="42" y="42" textAnchor="middle" fill="#c3f53b" fontSize="3" fontWeight="600">{pairs[0]?.pct}%</text>}
        {pairs[1] && <text x="40" y="56" textAnchor="middle" fill="#c3f53b" fontSize="3" fontWeight="600">{pairs[1]?.pct}%</text>}
        {pairs[2] && <text x="62" y="48" textAnchor="middle" fill="#c3f53b" fontSize="3" fontWeight="600">{pairs[2]?.pct}%</text>}
        {pairs[3] && <text x="60" y="62" textAnchor="middle" fill="#c3f53b" fontSize="3" fontWeight="600">{pairs[3]?.pct}%</text>}
        <text x="50" y="50" textAnchor="middle" fill="#fff" fontSize="2.5" opacity="0.5">overlap</text>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AudienceManager() {
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'All'>('All')
  const [typeFilter, setTypeFilter] = useState<AudienceType | 'All'>('All')
  const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTab, setCreateTab] = useState<'From Scratch' | 'Lookalike' | 'Retargeting'>('From Scratch')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedGender, setSelectedGender] = useState('All')
  const [similarityValue, setSimilarityValue] = useState(1)
  const [lookbackDays, setLookbackDays] = useState(30)
  const [activeSection, setActiveSection] = useState<'table' | 'overlap' | 'performance' | 'ai'>('table')

  /* ---- API state ---- */
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [audiencesLoading, setAudiencesLoading] = useState(true)
  const [audiencesError, setAudiencesError] = useState<string | null>(null)

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)

  const [overlapMatrix, setOverlapMatrix] = useState<OverlapMatrixRow[]>(defaultOverlapMatrix)
  const [radarData, setRadarData] = useState<RadarMetric[]>(defaultRadarData)
  const [overlapPairs, setOverlapPairs] = useState<{ pair: string; pct: number; desc: string }[] | undefined>()
  const [overlapLoading, setOverlapLoading] = useState(true)
  const [overlapError, setOverlapError] = useState<string | null>(null)

  const [performanceData, setPerformanceData] = useState<AudiencePerformance[]>([])
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [performanceError, setPerformanceError] = useState<string | null>(null)

  /* ---- fetch audiences ---- */
  const fetchAudiences = useCallback(async () => {
    setAudiencesLoading(true)
    setAudiencesError(null)
    try {
      const data = await apiGet<Audience[]>('/audiences')
      setAudiences(data || [])
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load audiences'
      setAudiencesError(msg)
      console.error('[AudienceManager] fetchAudiences error:', err)
    } finally {
      setAudiencesLoading(false)
    }
  }, [])

  /* ---- fetch AI suggestions ---- */
  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      const data = await apiGet<AISuggestion[]>('/audiences/suggestions')
      setAiSuggestions(data || [])
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load AI suggestions'
      setSuggestionsError(msg)
      console.error('[AudienceManager] fetchSuggestions error:', err)
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  /* ---- fetch overlap data ---- */
  const fetchOverlap = useCallback(async () => {
    setOverlapLoading(true)
    setOverlapError(null)
    try {
      // Only fetch overlap if we have audiences
      if (audiences.length === 0) {
        setOverlapLoading(false)
        return
      }
      const audienceIds = audiences.map(a => a.id).join(',')
      const data = await apiGet<{
        matrix?: OverlapMatrixRow[]
        radar?: RadarMetric[]
        pairs?: { pair: string; pct: number; desc: string }[]
      }>('/audiences/overlap', { params: { audienceIds } })

      if (data?.matrix) setOverlapMatrix(data.matrix)
      if (data?.radar) setRadarData(data.radar)
      if (data?.pairs) setOverlapPairs(data.pairs)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load overlap data'
      setOverlapError(msg)
      console.error('[AudienceManager] fetchOverlap error:', err)
    } finally {
      setOverlapLoading(false)
    }
  }, [audiences])

  /* ---- fetch audience performance (detail drawer) ---- */
  const fetchPerformance = useCallback(async (audienceId: string) => {
    setPerformanceLoading(true)
    setPerformanceError(null)
    try {
      const data = await apiGet<AudiencePerformance[]>(`/audiences/${audienceId}/performance`)
      setPerformanceData(data || [])
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load performance data'
      setPerformanceError(msg)
      console.error('[AudienceManager] fetchPerformance error:', err)
      // Fall back to default chart data
      setPerformanceData(defaultChartData)
    } finally {
      setPerformanceLoading(false)
    }
  }, [])

  /* ---- initial load ---- */
  useEffect(() => {
    fetchAudiences()
    fetchSuggestions()
  }, [fetchAudiences, fetchSuggestions])

  /* ---- load overlap when audiences are fetched or tab is opened ---- */
  useEffect(() => {
    if (activeSection === 'overlap' && audiences.length > 0 && overlapLoading) {
      fetchOverlap()
    }
  }, [activeSection, audiences.length, overlapLoading, fetchOverlap])

  /* ---- fetch performance when audience is selected ---- */
  useEffect(() => {
    if (selectedAudience) {
      fetchPerformance(selectedAudience.id)
    }
  }, [selectedAudience, fetchPerformance])

  /* ---- isLoading aggregate for initial render ---- */
  const isLoading = audiencesLoading

  /* ---- filtering ---- */
  const filtered = useMemo(() => {
    return audiences.filter((a) => {
      const matchPlatform = platformFilter === 'All' || a.platform === platformFilter
      const matchType = typeFilter === 'All' || a.type === typeFilter
      const q = search.toLowerCase()
      const matchSearch = !q || a.name.toLowerCase().includes(q) || a.platform.toLowerCase().includes(q)
      return matchPlatform && matchType && matchSearch
    })
  }, [search, platformFilter, typeFilter, audiences])

  /* ---- stats ---- */
  const totalAudiences = audiences.length
  const activeInCampaigns = audiences.filter((a) => a.campaigns > 0).length
  const lookalikesCount = audiences.filter((a) => a.type === 'Lookalike').length
  const savedCount = audiences.filter((a) => a.type === 'Saved').length
  const totalReach = audiences.reduce((s, a) => s + (a.reach || 0), 0)
  const avgFrequency = audiences.length > 0 ? (audiences.reduce((s, a) => s + (a.frequency || 0), 0) / audiences.length).toFixed(1) : '0'
  const totalSpend = audiences.reduce((s, a) => s + (a.spend || 0), 0)
  const totalConversions = audiences.reduce((s, a) => s + (a.conversions || 0), 0)
  const avgRoas = totalSpend > 0 ? (audiences.reduce((s, a) => s + (a.roas || 0) * (a.spend || 0), 0) / totalSpend).toFixed(1) : '0'

  const handleRowClick = (audience: Audience) => {
    setSelectedAudience(audience)
    setDrawerOpen(true)
  }

  return (
    <>
    <SEO
      title="Audience Manager"
      description="Create, segment, and manage target audiences across all ad platforms. Build lookalikes, custom audiences, and AI-powered segments."
      keywords="audience management, segmentation, targeting, lookalike audiences, custom audiences"
    />
    <div className="min-h-[100dvh]" style={{ background: '#0B0E13' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* ============ HEADER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeSmooth }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-semibold text-3xl tracking-tight" style={{ color: '#F1F5F9' }}>
              Audience Manager
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Create, manage, and analyze audience segments across platforms
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 border" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
              <Search size={16} style={{ color: '#4B5563' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audiences..." className="bg-transparent text-sm outline-none w-40" style={{ color: '#F1F5F9' }} />
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer" style={{ background: ACCENT, color: '#0B0E13' }}>
              <Plus size={16} />Create Audience
            </motion.button>
          </div>
        </motion.div>

        {/* ============ STATS ROW ============ */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
          </div>
        ) : audiencesError ? (
          <div className="mb-8">
            <ErrorMessage message={audiencesError} onRetry={fetchAudiences} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: easeSmooth }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Total Audiences', value: totalAudiences, suffix: '', icon: Users, color: '#3B82F6' },
              { label: 'Total Reach', value: totalReach, suffix: '', icon: Globe, color: '#10B981', formatter: formatSize },
              { label: 'Avg. Frequency', value: parseFloat(avgFrequency), suffix: 'x', icon: RefreshCw, color: '#F59E0B', decimals: 1 },
              { label: 'Blended ROAS', value: parseFloat(avgRoas), suffix: 'x', icon: TrendingUp, color: ACCENT, decimals: 1 },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: easeSmooth }}
                className="rounded-xl p-5 border"
                style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                    <stat.icon size={16} style={{ color: stat.color }} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{stat.label}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: '#F1F5F9' }}>
                  {stat.formatter ? stat.formatter(stat.value) : <CountUp end={stat.value} duration={0.8} separator="," decimals={stat.decimals || 0} />}
                  <span className="text-lg ml-0.5" style={{ color: '#6B7280' }}>{stat.suffix}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ============ TAB NAVIGATION ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex items-center gap-1 mb-6 p-1 rounded-xl border w-fit"
          style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {[
            { key: 'table', label: 'Audience List', icon: Layers },
            { key: 'performance', label: 'Performance', icon: BarChart3 },
            { key: 'overlap', label: 'Overlap Analysis', icon: Target },
            { key: 'ai', label: 'AI Suggestions', icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as any)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer"
              style={{
                background: activeSection === tab.key ? ACCENT : 'transparent',
                color: activeSection === tab.key ? '#0B0E13' : '#6B7280',
              }}
            >
              <tab.icon size={14} />{tab.label}
            </button>
          ))}
        </motion.div>

        {/* ============ PLATFORM FILTERS ============ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3 mb-6 flex-wrap"
        >
          <div className="flex items-center gap-1">
            <Filter size={12} style={{ color: '#4B5563' }} />
            {platforms.map((p) => (
              <button key={p} onClick={() => setPlatformFilter(p)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer" style={{ background: platformFilter === p ? ACCENT : '#141B23', color: platformFilter === p ? '#0B0E13' : '#6B7280', border: `1px solid ${platformFilter === p ? ACCENT : 'rgba(255,255,255,0.06)'}` }}>
                {p}
              </button>
            ))}
          </div>
          <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="flex items-center gap-1">
            {(['All', 'Custom', 'Lookalike', 'Saved', 'Retargeting', 'Interest'] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer" style={{ background: typeFilter === t ? TYPE_TEXT_COLORS[t as AudienceType] || ACCENT : '#141B23', color: typeFilter === t ? '#0B0E13' : '#6B7280', border: `1px solid ${typeFilter === t ? (TYPE_TEXT_COLORS[t as AudienceType] || ACCENT) : 'rgba(255,255,255,0.06)'}` }}>
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ============ AUDIENCE LIST TABLE ============ */}
        <AnimatePresence mode="wait">
          {activeSection === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl overflow-hidden border"
              style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="grid gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider items-center" style={{ gridTemplateColumns: '2fr 0.7fr 0.8fr 0.7fr 0.7fr 1fr 1.2fr 0.8fr 0.9fr 0.7fr', background: '#0F1419', color: '#4B5563' }}>
                <span>Name</span><span>Platform</span><span>Type</span><span>Size</span><span>Reach</span><span>Performance</span><span>Last Used</span><span>Status</span><span>Created</span><span className="text-right">Actions</span>
              </div>

              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : audiencesError ? (
                <div className="px-4 py-12 text-center">
                  <ErrorMessage message={audiencesError} onRetry={fetchAudiences} />
                </div>
              ) : (
                filtered.map((audience, idx) => (
                  <motion.div
                    key={audience.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="grid gap-4 px-4 py-3 items-center border-b transition-colors duration-100 cursor-pointer hover:bg-white/[0.02]"
                    style={{ gridTemplateColumns: '2fr 0.7fr 0.8fr 0.7fr 0.7fr 1fr 1.2fr 0.8fr 0.9fr 0.7fr', borderColor: 'rgba(255,255,255,0.04)' }}
                    onClick={() => handleRowClick(audience)}
                  >
                    <div className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>{audience.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[audience.platform] }} />
                      <span className="text-xs" style={{ color: '#6B7280' }}>{audience.platform}</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit" style={{ background: TYPE_COLORS[audience.type], color: TYPE_TEXT_COLORS[audience.type] }}>{audience.type}</span>
                    <span className="text-xs tabular-nums" style={{ color: '#F1F5F9' }}>{formatSize(audience.size || 0)}</span>
                    <span className="text-xs tabular-nums" style={{ color: '#9CA3AF' }}>{formatSize(audience.reach || 0)}</span>
                    <div className="flex items-center gap-3">
                      {(audience.ctr || 0) > 0 && <div className="text-center"><div className="text-[10px]" style={{ color: '#4B5563' }}>CTR</div><div className="text-xs tabular-nums font-medium" style={{ color: '#10B981' }}>{(audience.ctr || 0).toFixed(1)}%</div></div>}
                      {(audience.cpa || 0) > 0 && <div className="text-center"><div className="text-[10px]" style={{ color: '#4B5563' }}>CPA</div><div className="text-xs tabular-nums font-medium" style={{ color: '#F1F5F9' }}>${audience.cpa || 0}</div></div>}
                      {(audience.roas || 0) > 0 && <div className="text-center"><div className="text-[10px]" style={{ color: '#4B5563' }}>ROAS</div><div className="text-xs tabular-nums font-medium" style={{ color: ACCENT }}>{(audience.roas || 0).toFixed(1)}x</div></div>}
                      {(audience.ctr || 0) === 0 && <span className="text-xs" style={{ color: '#4B5563' }}>N/A</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={11} style={{ color: '#4B5563' }} />
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>{audience.lastUsed || 'Never'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[audience.status || 'Unused'], ...(audience.status === 'Active' ? { boxShadow: `0 0 6px ${STATUS_COLORS.Active}` } : {}) }} />
                      <span className="text-xs" style={{ color: STATUS_COLORS[audience.status || 'Unused'] }}>{audience.status || 'Unused'}</span>
                    </div>
                    <span className="text-xs" style={{ color: '#4B5563' }}>{audience.created || ''}</span>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-white/[0.06]" style={{ color: '#6B7280' }} title="Duplicate"><Copy size={14} /></button>
                      <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-white/[0.06]" style={{ color: '#6B7280' }} title="Archive"><Archive size={14} /></button>
                    </div>
                  </motion.div>
                ))
              )}

              {!isLoading && !audiencesError && filtered.length === 0 && (
                <div className="px-4 py-12 text-center text-sm" style={{ color: '#4B5563' }}>No audiences match your filters.</div>
              )}
            </motion.div>
          )}

          {/* ============ PERFORMANCE SECTION ============ */}
          {activeSection === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {audiencesError ? (
                <ErrorMessage message={audiencesError} onRetry={fetchAudiences} />
              ) : audiences.length === 0 && !audiencesLoading ? (
                <div className="rounded-xl p-8 border text-center" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <BarChart3 size={32} style={{ color: '#4B5563' }} className="mx-auto mb-3" />
                  <p className="text-sm" style={{ color: '#6B7280' }}>No audience data available for performance analysis.</p>
                </div>
              ) : (
                <>
                  {/* ROAS/CPA scatter */}
                  <div className="rounded-xl p-5 border" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg" style={{ color: '#F1F5F9' }}>
                        ROAS vs CPA by Audience
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#4B5563' }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: ACCENT }} />
                        Bubble size = spend
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                      <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis type="number" dataKey="cpa" name="CPA" tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} label={{ value: 'CPA ($)', position: 'bottom', fill: '#4B5563', fontSize: 10 }} />
                        <YAxis type="number" dataKey="roas" name="ROAS" tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} label={{ value: 'ROAS', angle: -90, position: 'insideLeft', fill: '#4B5563', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                          formatter={(value: any, name: string, props: any) => {
                            if (name === 'ROAS') return [`${value}x`, 'ROAS']
                            if (name === 'CPA') return [`$${value}`, 'CPA']
                            return [value, name]
                          }}
                          labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.name || ''}
                        />
                        <Scatter data={audiences.filter(a => (a.spend || 0) > 0)} fill={ACCENT}>
                          {audiences.filter(a => (a.spend || 0) > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[entry.platform]} fillOpacity={0.8} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-5 mt-3">
                      {(['Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => (
                        <div key={p} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />
                          <span className="text-[10px]" style={{ color: '#6B7280' }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Spend + Conversions Bar Chart */}
                  <div className="rounded-xl p-5 border" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <h3 className="font-semibold text-lg mb-4" style={{ color: '#F1F5F9' }}>
                      Spend &middot; Conversions &middot; CPA by Audience
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={audiences.filter(a => (a.spend || 0) > 0)} barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#555B66' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#555B66' }} axisLine={false} tickLine={false} width={45} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#555B66' }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                        <Bar yAxisId="left" dataKey="spend" name="Spend" fill="#2563EB" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="conversions" name="Conversions" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="cpa" name="CPA" fill={ACCENT} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-5 mt-2">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2563EB' }} /><span className="text-[10px]" style={{ color: '#6B7280' }}>Spend</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} /><span className="text-[10px]" style={{ color: '#6B7280' }}>Conversions</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} /><span className="text-[10px]" style={{ color: '#6B7280' }}>CPA</span></div>
                    </div>
                  </div>

                  {/* Frequency over time */}
                  <div className="rounded-xl p-5 border" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <h3 className="font-semibold text-lg mb-4" style={{ color: '#F1F5F9' }}>
                      Audience Size vs Reach Efficiency
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={audiences.filter(a => (a.spend || 0) > 0).map(a => ({ name: a.name, size: Math.round((a.size || 0) / 1000), reach: Math.round((a.reach || 0) / 1000), frequency: a.frequency || 0 }))}>
                        <defs>
                          <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
                          <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} /><stop offset="95%" stopColor={ACCENT} stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#555B66' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 10, fill: '#555B66' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `${v}K`} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                        <Area type="monotone" dataKey="size" stroke="#2563EB" fillOpacity={1} fill="url(#colorSize)" strokeWidth={2} name="Size (K)" />
                        <Area type="monotone" dataKey="reach" stroke={ACCENT} fillOpacity={1} fill="url(#colorReach)" strokeWidth={2} name="Reach (K)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ============ OVERLAP ANALYSIS SECTION ============ */}
          {activeSection === 'overlap' && (
            <motion.div
              key="overlap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {overlapError ? (
                <div className="lg:col-span-2">
                  <ErrorMessage message={overlapError} onRetry={fetchOverlap} />
                </div>
              ) : (
                <>
                  {/* Venn Diagram */}
                  <div className="rounded-xl p-5 border" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <h3 className="font-semibold text-lg mb-4" style={{ color: '#F1F5F9' }}>
                      Cross-Platform Audience Overlap
                    </h3>
                    <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
                      Percentage of users found on multiple platforms. Higher overlap means sequential messaging opportunities.
                    </p>
                    <OverlapVisualization overlapData={overlapPairs} />
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {(overlapPairs || [
                        { pair: 'Meta ↔ Google', pct: 14, desc: 'Low overlap — good for incremental reach' },
                        { pair: 'Meta ↔ TikTok', pct: 26, desc: 'Moderate — sequential storytelling works' },
                        { pair: 'Google ↔ TikTok', pct: 18, desc: 'Search + discovery combo potential' },
                        { pair: 'TikTok ↔ Snap', pct: 31, desc: 'High overlap — avoid duplication' },
                      ]).map((o) => (
                        <div key={o.pair} className="rounded-lg p-3 border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.04)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{o.pair}</span>
                            <span className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{o.pct}%</span>
                          </div>
                          <p className="text-[10px]" style={{ color: '#4B5563' }}>{o.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Radar Chart */}
                  <div className="rounded-xl p-5 border" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <h3 className="font-semibold text-lg mb-4" style={{ color: '#F1F5F9' }}>
                      Platform Performance Comparison
                    </h3>
                    <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
                      Normalized scores across key metrics by platform.
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6B7280' }} />
                        <PolarRadiusAxis tick={{ fontSize: 9, fill: '#4B5563' }} domain={[0, 100]} />
                        <Radar name="Meta" dataKey="Meta" stroke="#1877F2" fill="#1877F2" fillOpacity={0.15} strokeWidth={1.5} />
                        <Radar name="Google" dataKey="Google" stroke="#DB4437" fill="#DB4437" fillOpacity={0.15} strokeWidth={1.5} />
                        <Radar name="TikTok" dataKey="TikTok" stroke="#00F2EA" fill="#00F2EA" fillOpacity={0.15} strokeWidth={1.5} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-5 mt-2">
                      {(['Meta', 'Google', 'TikTok'] as Platform[]).map((p) => (
                        <div key={p} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />
                          <span className="text-[10px]" style={{ color: '#6B7280' }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overlap Matrix Table */}
                  <div className="rounded-xl p-5 border lg:col-span-2" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <h3 className="font-semibold text-lg mb-4" style={{ color: '#F1F5F9' }}>
                      Overlap Matrix
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th scope="col" className="text-left text-xs font-medium uppercase tracking-wider py-3 px-4" style={{ color: '#4B5563' }}>Platform</th>
                            {(['Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => (
                              <th scope="col" key={p} className="text-center text-xs font-medium uppercase tracking-wider py-3 px-4" style={{ color: PLATFORM_COLORS[p] }}>{p}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {overlapMatrix.map((row, ri) => (
                            <tr key={row.platform} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td className="py-3 px-4 text-sm font-medium" style={{ color: '#F1F5F9' }}>
                                <span className="w-2 h-2 rounded-full inline-block mr-2" style={{ background: PLATFORM_COLORS[row.platform as Platform] }} />
                                {row.platform}
                              </td>
                              {(['Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => {
                                const val = row[p as keyof typeof row] as number
                                return (
                                  <td key={p} className="py-3 px-4 text-center">
                                    <span
                                      className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-full"
                                      style={{
                                        color: val === 100 ? '#F1F5F9' : val > 25 ? ACCENT : '#9CA3AF',
                                        background: val === 100 ? 'rgba(255,255,255,0.06)' : val > 25 ? `${ACCENT}15` : 'transparent',
                                      }}
                                    >
                                      {val}%
                                    </span>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Per-audience overlap */}
                  <div className="rounded-xl p-5 border lg:col-span-2" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <h3 className="font-semibold text-lg mb-4" style={{ color: '#F1F5F9' }}>
                      Audience Overlap by Segment
                    </h3>
                    <div className="space-y-3">
                      {audiences.filter(a => (a.spend || 0) > 0).map((aud) => (
                        <div key={aud.id} className="flex items-center gap-4">
                          <div className="w-40 shrink-0">
                            <div className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>{aud.name}</div>
                            <div className="text-[10px]" style={{ color: '#4B5563' }}>{aud.platform}</div>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            {(aud.overlapWith || []).map((o) => (
                              <div key={o.platform} className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px]" style={{ color: '#4B5563' }}>{o.platform}</span>
                                  <span className="text-[10px] font-medium tabular-nums" style={{ color: o.percentage > 25 ? ACCENT : '#9CA3AF' }}>{o.percentage}%</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${o.percentage}%` }}
                                    transition={{ duration: 0.6, delay: 0.1 }}
                                    className="h-full rounded-full"
                                    style={{ background: o.percentage > 25 ? ACCENT : PLATFORM_COLORS[o.platform] }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ============ AI SUGGESTIONS SECTION ============ */}
          {activeSection === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {suggestionsLoading ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SkeletonStat /><SkeletonStat /><SkeletonStat />
                  </div>
                  <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </>
              ) : suggestionsError ? (
                <ErrorMessage message={suggestionsError} onRetry={fetchSuggestions} />
              ) : (
                <>
                  {/* Hero stat */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'AI Recommendations', value: aiSuggestions.length, icon: Lightbulb, color: ACCENT },
                      { label: 'High Impact', value: aiSuggestions.filter(s => s.impact === 'High').length, icon: Zap, color: '#F59E0B' },
                      { label: 'Avg. Confidence', value: aiSuggestions.length > 0 ? Math.round(aiSuggestions.reduce((s, a) => s + (a.confidence || 0), 0) / aiSuggestions.length) : 0, icon: CheckCircle2, color: '#10B981', suffix: '%' },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="rounded-xl p-4 border"
                        style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon size={16} style={{ color: stat.color }} />
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>{stat.label}</span>
                        </div>
                        <div className="text-2xl font-bold tabular-nums" style={{ color: '#F1F5F9' }}>
                          {stat.value}{stat.suffix || ''}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Suggestion cards */}
                  <div className="space-y-4">
                    {aiSuggestions.length === 0 && (
                      <div className="rounded-xl p-8 border text-center" style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <Sparkles size={32} style={{ color: '#4B5563' }} className="mx-auto mb-3" />
                        <p className="text-sm" style={{ color: '#6B7280' }}>No AI suggestions available at the moment.</p>
                      </div>
                    )}
                    {aiSuggestions.map((suggestion, idx) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="rounded-xl p-5 border transition-all duration-200 hover:border-opacity-20"
                        style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)', hover: { borderColor: `${ACCENT}40` } }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>{suggestion.title}</h4>
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{
                                  background: suggestion.impact === 'High' ? 'rgba(245,158,11,0.15)' : suggestion.impact === 'Medium' ? 'rgba(37,99,235,0.15)' : 'rgba(16,185,129,0.15)',
                                  color: suggestion.impact === 'High' ? '#F59E0B' : suggestion.impact === 'Medium' ? '#3B82F6' : '#10B981',
                                }}
                              >
                                {suggestion.impact} Impact
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ background: `${ACCENT}15`, color: ACCENT }}
                              >
                                {suggestion.type}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed mb-3" style={{ color: '#9CA3AF' }}>
                              {suggestion.description}
                            </p>
                            <div className="flex items-center gap-5">
                              <div className="flex items-center gap-1.5">
                                <TrendingUp size={12} style={{ color: '#10B981' }} />
                                <span className="text-[10px]" style={{ color: '#4B5563' }}>Est. ROAS</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: '#10B981' }}>{(suggestion.estimatedRoas || 0).toFixed(1)}x</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <DollarSign size={12} style={{ color: ACCENT }} />
                                <span className="text-[10px]" style={{ color: '#4B5563' }}>Est. CPA</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: ACCENT }}>${suggestion.estimatedCpa || 0}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={12} style={{ color: '#3B82F6' }} />
                                <span className="text-[10px]" style={{ color: '#4B5563' }}>Confidence</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: '#3B82F6' }}>{suggestion.confidence || 0}%</span>
                              </div>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer"
                            style={{ background: ACCENT, color: '#0B0E13' }}
                          >
                            <ArrowUpRight size={13} />Apply
                          </motion.button>
                        </div>
                        {/* Confidence bar */}
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${suggestion.confidence || 0}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full rounded-full"
                              style={{
                                background: (suggestion.confidence || 0) >= 85 ? '#10B981' : (suggestion.confidence || 0) >= 75 ? ACCENT : '#F59E0B',
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== CREATE AUDIENCE MODAL ==================== */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false) }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                className="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl border"
                style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <h3 className="font-semibold text-lg" style={{ color: '#F1F5F9' }}>Create Audience</h3>
                  <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/[0.06]" style={{ color: '#4B5563' }}><X size={18} /></button>
                </div>

                <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {(['From Scratch', 'Lookalike', 'Retargeting'] as const).map((tab) => (
                    <button key={tab} onClick={() => setCreateTab(tab)} className="relative flex-1 py-3 text-sm font-medium text-center transition-colors cursor-pointer" style={{ color: createTab === tab ? '#F1F5F9' : '#4B5563' }}>
                      {tab}
                      {createTab === tab && <motion.div layoutId="aud-create-tab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: ACCENT }} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }} />}
                    </button>
                  ))}
                </div>

                <div className="px-5 py-5 max-h-[60vh] overflow-y-auto">
                  {createTab === 'From Scratch' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Audience Name</label>
                        <input placeholder="e.g. Fitness Enthusiasts 25-40" className="w-full rounded-lg px-3 py-2 text-sm outline-none border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Platform</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => (
                            <button key={p} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
                              <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />{p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Age Range</label>
                          <div className="flex items-center gap-2">
                            <select className="w-full rounded-lg px-3 py-2 text-sm outline-none border appearance-none cursor-pointer" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }}>
                              <option>18</option><option>21</option><option>25</option><option>30</option><option>35</option>
                            </select>
                            <span style={{ color: '#4B5563' }}>—</span>
                            <select className="w-full rounded-lg px-3 py-2 text-sm outline-none border appearance-none cursor-pointer" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }}>
                              <option>34</option><option>44</option><option>54</option><option>65+</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Gender</label>
                          <div className="flex gap-2">
                            {['All', 'Male', 'Female'].map((g) => (
                              <button key={g} onClick={() => setSelectedGender(g)} className="flex-1 rounded-lg py-2 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: g === selectedGender ? ACCENT : '#0F1419', borderColor: g === selectedGender ? ACCENT : 'rgba(255,255,255,0.08)', color: g === selectedGender ? '#0B0E13' : '#9CA3AF' }}>{g}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Interests</label>
                        <input placeholder="Search interests..." className="w-full rounded-lg px-3 py-2 text-sm outline-none border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }} />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {['Fitness', 'Wellness', 'Healthy Eating', 'Yoga', 'Running', 'Gym', 'Nutrition', 'Meditation'].map((tag) => (
                            <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity" style={{ background: ACCENT, color: '#0B0E13' }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Behaviors</label>
                        <input placeholder="e.g. Frequent travelers, Online shoppers, Engaged shoppers..." className="w-full rounded-lg px-3 py-2 text-sm outline-none border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Location</label>
                        <input placeholder="United States, Canada, United Kingdom..." className="w-full rounded-lg px-3 py-2 text-sm outline-none border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Language</label>
                        <select className="w-full rounded-lg px-3 py-2 text-sm outline-none border appearance-none cursor-pointer" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }}>
                          <option>English</option><option>Spanish</option><option>French</option><option>German</option>
                        </select>
                      </div>
                      <div className="rounded-lg p-3 border" style={{ background: `${ACCENT}08`, borderColor: `${ACCENT}20` }}>
                        <div className="flex items-center gap-1.5">
                          <Eye size={12} style={{ color: ACCENT }} />
                          <span className="text-xs" style={{ color: ACCENT }}>
                            Estimated audience size: <span className="font-semibold tabular-nums">450K — 2.1M</span> people
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {createTab === 'Lookalike' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Source Audience</label>
                        <select className="w-full rounded-lg px-3 py-2 text-sm outline-none border appearance-none cursor-pointer" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }}>
                          {audiences.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({formatSize(a.size || 0)})</option>
                          ))}
                          {audiences.length === 0 && <option>No audiences available</option>}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Platform</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => (
                            <button key={p} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: p === 'Meta' ? ACCENT : '#0F1419', borderColor: p === 'Meta' ? ACCENT : 'rgba(255,255,255,0.08)', color: p === 'Meta' ? '#0B0E13' : '#9CA3AF' }}>
                              <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />{p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Similarity &mdash; {similarityValue}%</label>
                        <input type="range" min={1} max={10} value={similarityValue} onChange={(e) => setSimilarityValue(Number(e.target.value))} className="w-full accent-lime-400" style={{ accentColor: ACCENT }} />
                        <div className="flex justify-between text-[10px] mt-1" style={{ color: '#4B5563' }}>
                          <span>1% (Most similar)</span><span>10% (Broadest)</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Location</label>
                        <input placeholder="United States" className="w-full rounded-lg px-3 py-2 text-sm outline-none border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }} />
                      </div>
                      <div className="rounded-lg p-3 border" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)' }}>
                        <p className="text-xs" style={{ color: '#10B981' }}>
                          <Sparkles size={12} className="inline mr-1" />
                          Estimated audience size: <span className="font-semibold tabular-nums">{formatSize(similarityValue === 1 ? 2100000 : similarityValue * 800000)}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {createTab === 'Retargeting' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Event Trigger</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Page View', 'Add to Cart', 'Purchase', 'Video View 50%', 'Lead Form', 'Engagement'] as const).map((evt) => (
                            <button key={evt} className="rounded-lg py-2.5 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: evt === 'Add to Cart' ? ACCENT : '#0F1419', borderColor: evt === 'Add to Cart' ? ACCENT : 'rgba(255,255,255,0.08)', color: evt === 'Add to Cart' ? '#0B0E13' : '#9CA3AF' }}>{evt}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Lookback Window</label>
                        <div className="flex gap-2 flex-wrap">
                          {[7, 14, 30, 60, 90, 180].map((d) => (
                            <button key={d} onClick={() => setLookbackDays(d)} className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: d === lookbackDays ? ACCENT : '#0F1419', borderColor: d === lookbackDays ? ACCENT : 'rgba(255,255,255,0.08)', color: d === lookbackDays ? '#0B0E13' : '#9CA3AF' }}>{d}d</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Platform</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['Meta', 'Google', 'TikTok', 'Snap'] as Platform[]).map((p) => (
                            <button key={p} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium border transition-all cursor-pointer hover:opacity-80" style={{ background: p === 'Meta' ? ACCENT : '#0F1419', borderColor: p === 'Meta' ? ACCENT : 'rgba(255,255,255,0.08)', color: p === 'Meta' ? '#0B0E13' : '#9CA3AF' }}>
                              <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />{p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Frequency Cap</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min={1} max={10} defaultValue={3} className="flex-1" style={{ accentColor: ACCENT }} />
                          <span className="text-xs tabular-nums w-8" style={{ color: '#F1F5F9' }}>3</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Exclusions</label>
                        <input placeholder="e.g. Exclude purchasers, Exclude 1d visitors..." className="w-full rounded-lg px-3 py-2 text-sm outline-none border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.08)', color: '#F1F5F9' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer" style={{ color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: ACCENT, color: '#0B0E13' }}>Create Audience</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================== DETAIL DRAWER ==================== */}
        <AnimatePresence>
          {drawerOpen && selectedAudience && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100]"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => { setDrawerOpen(false); setSelectedAudience(null) }}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: easeInOut }}
                className="absolute right-0 top-0 bottom-0 w-full max-w-lg overflow-y-auto border-l"
                style={{ background: '#141B23', borderColor: 'rgba(255,255,255,0.06)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#141B23' }}>
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: '#F1F5F9' }}>{selectedAudience.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[selectedAudience.platform] }} />
                      <span className="text-xs" style={{ color: '#6B7280' }}>{selectedAudience.platform}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: TYPE_COLORS[selectedAudience.type], color: TYPE_TEXT_COLORS[selectedAudience.type] }}>{selectedAudience.type}</span>
                    </div>
                  </div>
                  <button onClick={() => { setDrawerOpen(false); setSelectedAudience(null) }} className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/[0.06]" style={{ color: '#4B5563' }}><X size={18} /></button>
                </div>

                <div className="px-5 py-5 space-y-6">
                  {/* Key metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Size', value: formatSize(selectedAudience.size || 0), color: '#3B82F6' },
                      { label: 'Reach', value: formatSize(selectedAudience.reach || 0), color: '#10B981' },
                      { label: 'Frequency', value: `${selectedAudience.frequency || 0}x`, color: ACCENT },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg p-3 text-center border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>{m.label}</div>
                        <div className="text-sm font-bold tabular-nums" style={{ color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Performance */}
                  {(selectedAudience.spend || 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3" style={{ color: '#F1F5F9' }}>Performance</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Spend', value: formatCurrency(selectedAudience.spend || 0), color: '#2563EB', icon: DollarSign },
                          { label: 'Conv.', value: (selectedAudience.conversions || 0).toLocaleString(), color: '#10B981', icon: ShoppingCart },
                          { label: 'CPA', value: `$${selectedAudience.cpa || 0}`, color: '#F1F5F9', icon: MousePointerClick },
                          { label: 'ROAS', value: `${(selectedAudience.roas || 0).toFixed(1)}x`, color: ACCENT, icon: TrendingUp },
                        ].map((m) => (
                          <div key={m.label} className="rounded-lg p-2.5 text-center border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-center gap-1 mb-1"><m.icon size={11} style={{ color: '#4B5563' }} /></div>
                            <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>{m.label}</div>
                            <div className="text-xs font-bold tabular-nums" style={{ color: m.color }}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-3" style={{ color: '#F1F5F9' }}>Performance Over Time</h4>
                    {performanceLoading ? (
                      <div className="rounded-lg p-3 border animate-pulse" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-[180px] bg-white/[0.03] rounded" />
                      </div>
                    ) : (
                      <div className="rounded-lg p-3 border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={performanceData.length > 0 ? performanceData : (selectedAudience.chartData || defaultChartData)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#555B66' }} axisLine={false} tickLine={false} width={35} />
                            <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                            <Line type="monotone" dataKey="ctr" stroke="#10B981" strokeWidth={2} dot={false} name="CTR %" />
                            <Line type="monotone" dataKey="roas" stroke="#3B82F6" strokeWidth={2} dot={false} name="ROAS" />
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="flex items-center justify-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5"><span className="w-2 h-0.5 rounded" style={{ background: '#10B981' }} /><span className="text-[10px]" style={{ color: '#4B5563' }}>CTR %</span></div>
                          <div className="flex items-center gap-1.5"><span className="w-2 h-0.5 rounded" style={{ background: '#3B82F6' }} /><span className="text-[10px]" style={{ color: '#4B5563' }}>ROAS</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Demographics */}
                  <div>
                    <h4 className="text-sm font-medium mb-3" style={{ color: '#F1F5F9' }}>Demographics</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-3 border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-center" style={{ color: '#4B5563' }}>Age Distribution</div>
                        <ResponsiveContainer width="100%" height={130}>
                          <PieChart>
                            <Pie data={selectedAudience.ageData || defaultAgeData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                              {(selectedAudience.ageData || defaultAgeData).map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-1">
                          {(selectedAudience.ageData || defaultAgeData).map((entry, i) => (
                            <div key={entry.name} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-[9px]" style={{ color: '#4B5563' }}>{entry.name}</span></div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg p-3 border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-center" style={{ color: '#4B5563' }}>Gender Split</div>
                        <ResponsiveContainer width="100%" height={130}>
                          <PieChart>
                            <Pie data={selectedAudience.genderData || defaultGenderData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                              {(selectedAudience.genderData || defaultGenderData).map((_, i) => <Cell key={`cell-g-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-1">
                          {(selectedAudience.genderData || defaultGenderData).map((entry, i) => (
                            <div key={entry.name} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-[9px]" style={{ color: '#4B5563' }}>{entry.name}</span></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cross-platform overlap */}
                  <div>
                    <h4 className="text-sm font-medium mb-3" style={{ color: '#F1F5F9' }}>Cross-Platform Overlap</h4>
                    <div className="space-y-2">
                      {(selectedAudience.overlapWith || []).map((o) => (
                        <div key={o.platform} className="flex items-center justify-between rounded-lg px-3 py-2 border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[o.platform] }} />
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>{o.platform}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <div className="h-full rounded-full" style={{ width: `${o.percentage}%`, background: o.percentage > 25 ? ACCENT : PLATFORM_COLORS[o.platform] }} />
                            </div>
                            <span className="text-xs font-medium tabular-nums w-8 text-right" style={{ color: o.percentage > 25 ? ACCENT : '#9CA3AF' }}>{o.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Campaigns */}
                  <div>
                    <h4 className="text-sm font-medium mb-3" style={{ color: '#F1F5F9' }}>Campaigns Using This Audience</h4>
                    {(selectedAudience.campaigns || 0) > 0 ? (
                      <div className="space-y-2">
                        {Array.from({ length: selectedAudience.campaigns || 0 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center gap-2"><Activity size={14} style={{ color: ACCENT }} /><span className="text-xs" style={{ color: '#F1F5F9' }}>{selectedAudience.platform} Campaign {i + 1}</span></div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>Active</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg px-3 py-4 text-center text-xs border" style={{ background: '#0F1419', borderColor: 'rgba(255,255,255,0.06)', color: '#4B5563' }}>Not used in any campaigns yet.</div>
                    )}
                  </div>

                  {/* AI Insight */}
                  {selectedAudience.aiInsight && (
                    <div className="rounded-lg p-4 border" style={{ background: `${ACCENT}08`, borderColor: `${ACCENT}25` }}>
                      <div className="flex items-center gap-1.5 mb-2"><Sparkles size={14} style={{ color: ACCENT }} /><span className="text-xs font-semibold" style={{ color: ACCENT }}>AI Insight</span></div>
                      <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>{selectedAudience.aiInsight}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs" style={{ color: '#4B5563' }}>
                    <span>Created {selectedAudience.created || ''}</span>
                    <span>&middot;</span>
                    <span>Last used {selectedAudience.lastUsed || 'Never'}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  )
}
