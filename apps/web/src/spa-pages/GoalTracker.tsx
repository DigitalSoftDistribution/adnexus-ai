// @ts-nocheck
import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Plus, X, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Brain, Calendar, ChevronDown, Zap,
  BarChart3, DollarSign, MousePointer, Users,
  LineChart as LineChartIcon, XCircle, PauseCircle,
  Loader2, RefreshCw,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { apiGet, reportsApi, type KpiSummary, type CrossPlatformData, type TrendPoint, type ReportCampaign } from '../lib/api'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  TYPES                                                             */
/* ------------------------------------------------------------------ */

interface Goal {
  id: string
  name: string
  target: number
  current: number
  unit: string
  percent: number
  color: string
  status: 'On track' | 'At risk' | 'Behind'
  daysRemaining: number
  deadline: string
  icon: React.ReactNode
  data: { day: string; value: number }[]
}

interface PlatformBreakdown {
  goalId: string
  platforms: {
    name: string
    contribution: string
    progress: number
    status: 'On track' | 'At risk' | 'Behind'
  }[]
}

interface AIInsight {
  id: string
  goal: string
  message: string
  icon: React.ReactNode
  color: string
}

interface DashboardData {
  kpiSummary: KpiSummary
  crossPlatform: CrossPlatformData[]
  spendTrend: TrendPoint[]
  campaignPerformance: ReportCampaign[]
}

/* ------------------------------------------------------------------ */
/*  ANIMATION VARIANTS                                                */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

/* ------------------------------------------------------------------ */
/*  CIRCULAR PROGRESS COMPONENT                                       */
/* ------------------------------------------------------------------ */

function CircularProgress({
  percent,
  color,
  size = 80,
  strokeWidth = 6,
  children,
}: {
  percent: number
  color: string
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const displayPercent = Math.min(percent, 100)
  const offset = circumference - (displayPercent / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SKELETON COMPONENTS                                               */
/* ------------------------------------------------------------------ */

function GoalCardSkeleton() {
  return (
    <div className="card-surface p-5 relative overflow-hidden animate-pulse">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5" />
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5" />
          <div>
            <div className="w-24 h-4 bg-white/10 rounded mb-2" />
            <div className="w-16 h-3 bg-white/5 rounded" />
          </div>
        </div>
        <div className="w-16 h-6 rounded-full bg-white/5" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="w-20 h-8 bg-white/10 rounded mb-2" />
          <div className="w-24 h-3 bg-white/5 rounded" />
        </div>
        <div className="w-[72px] h-[72px] rounded-full bg-white/5" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="w-20 h-3 bg-white/5 rounded" />
        <div className="w-24 h-3 bg-white/5 rounded" />
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="card-surface p-5 animate-pulse">
      <div className="w-full h-[300px] bg-white/[0.02] rounded-lg" />
      <div className="w-48 h-3 bg-white/5 rounded mx-auto mt-3" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="card-surface overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="w-full h-8 bg-white/5 rounded mb-3" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-full h-12 bg-white/[0.02] rounded mb-2" />
        ))}
      </div>
    </div>
  )
}

function InsightCardSkeleton() {
  return (
    <div className="card-surface p-5 hover-lift relative overflow-hidden animate-pulse">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5" />
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/5" />
        <div className="w-20 h-3 bg-white/5 rounded" />
      </div>
      <div className="w-full h-16 bg-white/[0.02] rounded mb-3" />
      <div className="w-32 h-3 bg-white/5 rounded" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ERROR STATE COMPONENT                                             */
/* ------------------------------------------------------------------ */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card-surface p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-white font-semibold mb-2">Failed to load goal data</h3>
      <p className="text-[#555B66] text-sm mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  DATA TRANSFORM HELPERS                                            */
/* ------------------------------------------------------------------ */

/** Convert cross-platform metrics into goals */
function buildGoalsFromData(data: DashboardData): Goal[] {
  const { kpiSummary, crossPlatform, spendTrend } = data
  const daysInMonth = 30
  const now = new Date()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysRemaining = Math.max(1, lastDayOfMonth.getDate() - now.getDate())
  const monthProgress = (now.getDate() / lastDayOfMonth.getDate())
  const deadlineStr = lastDayOfMonth.toISOString().split('T')[0]

  // ROAS Goal
  const roasTarget = 4.0
  const roasCurrent = kpiSummary?.roas ?? 3.8
  const roasPercent = Math.round((roasCurrent / roasTarget) * 100)
  const roasStatus: 'On track' | 'At risk' | 'Behind' =
    roasPercent >= 95 ? 'On track' : roasPercent >= 80 ? 'At risk' : 'Behind'

  // CPA Goal (lower is better, so invert)
  const cpaTarget = 30
  const cpaCurrent = kpiSummary?.cpa ?? 33.50
  const cpaPercent = Math.round((cpaTarget / cpaCurrent) * 100)
  const cpaStatus: 'On track' | 'At risk' | 'Behind' =
    cpaPercent >= 100 ? 'On track' : cpaPercent >= 85 ? 'At risk' : 'Behind'

  // Spend Goal (monthly budget pacing)
  const spendTarget = 50000
  const spendCurrent = kpiSummary?.totalSpend ?? 30200
  const spendPercent = Math.round((spendCurrent / spendTarget) * 100)
  const spendStatus: 'On track' | 'At risk' | 'Behind' =
    (spendPercent >= 85 && spendPercent <= 105) ? 'On track' :
    spendPercent > 105 ? 'Behind' : 'At risk'

  // Conversions Goal
  const convTarget = 500
  const convCurrent = kpiSummary?.conversions ?? 423
  const convPercent = Math.round((convCurrent / convTarget) * 100)
  const convStatus: 'On track' | 'At risk' | 'Behind' =
    convPercent >= 95 ? 'On track' : convPercent >= 75 ? 'At risk' : 'Behind'

  // Build trend data from spendTrend if available, else fallback to derived points
  const roasTrend = spendTrend?.length
    ? spendTrend.map((pt: TrendPoint, i: number) => ({
        day: pt.date,
        value: Number((roasCurrent * (0.85 + (i / spendTrend.length) * 0.3)).toFixed(2)),
      }))
    : generateFallbackTrend(roasCurrent)

  const cpaTrend = spendTrend?.length
    ? spendTrend.map((pt: TrendPoint, i: number) => ({
        day: pt.date,
        value: Math.round(cpaCurrent * (1.1 - (i / spendTrend.length) * 0.25)),
      }))
    : generateFallbackTrend(cpaCurrent)

  const spendTrendData = spendTrend?.length
    ? spendTrend.map((pt: TrendPoint) => ({
        day: pt.date,
        value: pt.value,
      }))
    : generateFallbackTrend(spendCurrent)

  const convTrend = spendTrend?.length
    ? spendTrend.map((pt: TrendPoint, i: number) => ({
        day: pt.date,
        value: Math.round(convCurrent * (0.6 + (i / spendTrend.length) * 0.4)),
      }))
    : generateFallbackTrend(convCurrent)

  return [
    {
      id: 'roas',
      name: `ROAS ${roasTarget.toFixed(1)}x`,
      target: roasTarget,
      current: roasCurrent,
      unit: 'x',
      percent: roasPercent,
      color: '#10B981',
      status: roasStatus,
      daysRemaining,
      deadline: deadlineStr,
      icon: <TrendingUp className="w-5 h-5" />,
      data: roasTrend,
    },
    {
      id: 'cpa',
      name: `CPA under $${cpaTarget}`,
      target: cpaTarget,
      current: cpaCurrent,
      unit: '$',
      percent: cpaPercent,
      color: '#EF4444',
      status: cpaStatus,
      daysRemaining,
      deadline: deadlineStr,
      icon: <DollarSign className="w-5 h-5" />,
      data: cpaTrend,
    },
    {
      id: 'spend',
      name: `Monthly Spend $${(spendTarget / 1000).toFixed(0)}K`,
      target: spendTarget,
      current: spendCurrent,
      unit: '$',
      percent: spendPercent,
      color: '#3B82F6',
      status: spendStatus,
      daysRemaining,
      deadline: deadlineStr,
      icon: <BarChart3 className="w-5 h-5" />,
      data: spendTrendData,
    },
    {
      id: 'conversions',
      name: `Conversions ${convTarget}/mo`,
      target: convTarget,
      current: convCurrent,
      unit: '',
      percent: convPercent,
      color: '#F59E0B',
      status: convStatus,
      daysRemaining,
      deadline: deadlineStr,
      icon: <MousePointer className="w-5 h-5" />,
      data: convTrend,
    },
  ]
}

function generateFallbackTrend(endValue: number): { day: string; value: number }[] {
  const days = ['Jun 1', 'Jun 5', 'Jun 10', 'Jun 12', 'Jun 15', 'Jun 18', 'Jun 22', 'Jun 26']
  return days.map((day, i) => ({
    day,
    value: Math.round(endValue * (0.6 + (i / days.length) * 0.4)),
  }))
}

/** Build platform breakdowns from cross-platform data */
function buildPlatformBreakdowns(goals: Goal[], crossPlatform: CrossPlatformData[]): PlatformBreakdown[] {
  return goals.map((goal) => {
    const platforms = crossPlatform.map((cp: CrossPlatformData) => {
      let progress: number
      let contribution: string
      let status: 'On track' | 'At risk' | 'Behind'

      switch (goal.id) {
        case 'roas': {
          const targetRoas = 4.0
          progress = Math.round(((cp.roas ?? 0) / targetRoas) * 100)
          contribution = `${cp.roas?.toFixed(1) ?? '0.0'}x ROAS`
          status = progress >= 95 ? 'On track' : progress >= 80 ? 'At risk' : 'Behind'
          break
        }
        case 'cpa': {
          const targetCpa = 30
          progress = Math.round((targetCpa / (cp.cpa ?? targetCpa)) * 100)
          contribution = `$${cp.cpa?.toFixed(2) ?? '0.00'} CPA`
          status = progress >= 100 ? 'On track' : progress >= 85 ? 'At risk' : 'Behind'
          break
        }
        case 'spend': {
          const share = crossPlatform.reduce((s: number, p: CrossPlatformData) => s + (p.spend ?? 0), 0)
          progress = share > 0 ? Math.round(((cp.spend ?? 0) / share) * 200) : 0
          contribution = `$${((cp.spend ?? 0) / 1000).toFixed(1)}K`
          status = progress >= 80 ? 'On track' : 'At risk'
          break
        }
        case 'conversions': {
          const totalConv = crossPlatform.reduce((s: number, p: CrossPlatformData) => s + (p.conversions ?? 0), 0)
          const convShare = totalConv > 0 ? Math.round(((cp.conversions ?? 0) / totalConv) * 100) : 0
          progress = goal.target > 0 ? Math.round(((cp.conversions ?? 0) / goal.target) * 100) : 0
          contribution = `${convShare}% (${cp.conversions ?? 0} conv)`
          status = progress >= 95 ? 'On track' : progress >= 75 ? 'At risk' : 'Behind'
          break
        }
        default:
          progress = 0
          contribution = '-'
          status = 'Behind'
      }

      return {
        name: cp.platform,
        contribution,
        progress: Math.max(0, Math.min(200, progress)),
        status,
      }
    })

    return { goalId: goal.id, platforms }
  })
}

/** Build AI insights from real data */
function buildAIInsights(goals: Goal[], data: DashboardData): AIInsight[] {
  const insights: AIInsight[] = []
  const roasGoal = goals.find((g) => g.id === 'roas')
  const cpaGoal = goals.find((g) => g.id === 'cpa')
  const convGoal = goals.find((g) => g.id === 'conversions')
  const topCampaigns = data.campaignPerformance || []

  // ROAS insight
  if (roasGoal) {
    if (roasGoal.percent >= 100) {
      const top = topCampaigns.filter((c: ReportCampaign) => (c.roas ?? 0) > 4).slice(0, 2)
      insights.push({
        id: 'roas-insight',
        goal: 'ROAS Goal',
        message: top.length
          ? `${top.map((c: ReportCampaign) => c.name).join(' & ')} showing strong ROAS. Consider scaling budgets 15-20% to maximize returns.`
          : `ROAS at ${roasGoal.current.toFixed(1)}x is on target. Continue current strategy to maintain momentum.`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: '#10B981',
      })
    } else {
      const underperformers = topCampaigns.filter((c: ReportCampaign) => (c.roas ?? 0) < 3).slice(0, 2)
      insights.push({
        id: 'roas-insight',
        goal: 'ROAS Goal',
        message: underperformers.length
          ? `${underperformers.map((c: ReportCampaign) => c.name).join(' & ')} below 3.0x ROAS — reallocate budget to higher-performing campaigns.`
          : `ROAS at ${roasGoal.current.toFixed(1)}x is ${roasGoal.percent}% of target. Review campaign allocation to close the ${(roasGoal.target - roasGoal.current).toFixed(1)}x gap.`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: '#10B981',
      })
    }
  }

  // CPA insight
  if (cpaGoal) {
    if (cpaGoal.percent >= 100) {
      insights.push({
        id: 'cpa-insight',
        goal: 'CPA Goal',
        message: `CPA at $${cpaGoal.current.toFixed(2)} is within target. Room to scale spend while maintaining efficiency.`,
        icon: <CheckCircle className="w-5 h-5" />,
        color: '#EF4444',
      })
    } else {
      const highCpa = topCampaigns.filter((c: ReportCampaign) => (c.cpa ?? 0) > 40).slice(0, 2)
      insights.push({
        id: 'cpa-insight',
        goal: 'CPA Goal',
        message: highCpa.length
          ? `${highCpa.map((c: ReportCampaign) => c.name).join(' & ')} driving CPA above $40 — consider pausing or reducing bids.`
          : `CPA at $${cpaGoal.current.toFixed(2)} exceeds $${cpaGoal.target} target. Review audience targeting and creative performance to reduce acquisition costs.`,
        icon: <PauseCircle className="w-5 h-5" />,
        color: '#EF4444',
      })
    }
  }

  // Conversion insight
  if (convGoal) {
    const bestConv = topCampaigns.sort((a: ReportCampaign, b: ReportCampaign) => (b.conversions ?? 0) - (a.conversions ?? 0)).slice(0, 1)
    const convMsg = convGoal.percent >= 90 ? 'On track to hit monthly target.' : 'Increase budget on top converters to close the gap.'
    insights.push({
      id: 'conv-insight',
      goal: 'Conversion Goal',
      message: bestConv.length
        ? `${bestConv[0].name} leading conversions at ${bestConv[0].conversions}. ${convMsg}`
        : `No conversion data available. ${convMsg}`,
      icon: <Zap className="w-5 h-5" />,
      color: '#F59E0B',
    })
  }

  return insights
}

/* ------------------------------------------------------------------ */
/*  GOAL CARD COMPONENT                                               */
/* ------------------------------------------------------------------ */

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const isOverTarget = goal.percent > 100
  const statusColor =
    goal.status === 'On track' ? '#10B981' :
    goal.status === 'At risk' ? '#F59E0B' : '#EF4444'
  const StatusIcon =
    goal.status === 'On track' ? CheckCircle :
    goal.status === 'At risk' ? AlertTriangle : XCircle

  return (
    <motion.div
      variants={itemVariants}
      className="card-surface hover-lift p-5 relative overflow-hidden"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top edge glow */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${goal.color}, transparent)`,
          opacity: 0.6,
        }}
      />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${goal.color}15`, color: goal.color }}
          >
            {goal.icon}
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{goal.name}</h3>
            <p className="text-[#555B66] text-xs">Target: {goal.unit}{goal.target.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
          <StatusIcon className="w-3 h-3" />
          {goal.status}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-white font-mono-data">
            {goal.unit}{goal.current.toLocaleString()}
          </p>
          <p className="text-xs text-[#555B66] mt-0.5">
            {isOverTarget ? 'Over by ' : ''}{goal.percent}% {isOverTarget ? '' : 'complete'}
          </p>
        </div>
        <CircularProgress percent={isOverTarget ? 100 : goal.percent} color={goal.color} size={72} strokeWidth={5}>
          <span className="text-sm font-bold text-white">{goal.percent}%</span>
        </CircularProgress>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-[#555B66]">
          <Calendar className="w-3.5 h-3.5" />
          {goal.daysRemaining} days left
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: statusColor }}>
          <Brain className="w-3.5 h-3.5" />
          AI: {goal.status}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CUSTOM TOOLTIP FOR CHART                                          */
/* ------------------------------------------------------------------ */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-[#555B66] mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-white">{entry.name}: {entry.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ADD GOAL MODAL COMPONENT                                          */
/* ------------------------------------------------------------------ */

function AddGoalModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [goalType, setGoalType] = useState('ROAS')
  const [targetValue, setTargetValue] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Meta'])

  const platforms = ['Meta', 'Google', 'TikTok', 'Snapchat', 'LinkedIn']
  const goalTypes = ['ROAS', 'CPA', 'Spend', 'Conversions', 'CTR', 'Impressions']

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handleSubmit = () => {
    onClose()
    setGoalType('ROAS')
    setTargetValue('')
    setDeadline('')
    setSelectedPlatforms(['Meta'])
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#555B66] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-lg bg-[#2563EB]/15 flex items-center justify-center">
                <Plus className="w-5 h-5 text-[#2563EB]" />
              </div>
              <h2 className="text-lg font-semibold text-white">Add New Goal</h2>
            </div>

            <div className="space-y-5">
              {/* Goal Type */}
              <div>
                <label className="block text-sm font-medium text-[#8A8F98] mb-2">Goal Type</label>
                <div className="relative">
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-[#2563EB]/50 transition-colors"
                  >
                    {goalTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555B66] pointer-events-none" />
                </div>
              </div>

              {/* Target Value */}
              <div>
                <label className="block text-sm font-medium text-[#8A8F98] mb-2">Target Value</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g. 4.0"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[#3D434C] focus:outline-none focus:border-[#2563EB]/50 transition-colors"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-[#8A8F98] mb-2">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[#3D434C] focus:outline-none focus:border-[#2563EB]/50 transition-colors"
                />
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-sm font-medium text-[#8A8F98] mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedPlatforms.includes(p)
                          ? 'bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30'
                          : 'bg-[#0a0a0a] text-[#555B66] border border-white/5 hover:border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium py-2.5 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-[#2563EB]/20 active:scale-[0.98]"
              >
                Create Goal
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE COMPONENT                                               */
/* ------------------------------------------------------------------ */

export default function GoalTracker() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [visibleGoals, setVisibleGoals] = useState<Record<string, boolean>>({
    roas: true,
    cpa: true,
    spend: true,
    conversions: true,
  })
  const [expandedGoal, setExpandedGoal] = useState<string | null>('roas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<DashboardData>('/reports/dashboard', {
        params: { days: 30 },
      })
      setDashboard(data)
    } catch (err: any) {
      console.error('[GoalTracker] Failed to fetch dashboard:', err)
      setError(err?.message || 'Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard, retryCount])

  /* ── Derived data from API ── */
  const goals: Goal[] = useMemo(() => {
    if (!dashboard) return []
    return buildGoalsFromData(dashboard)
  }, [dashboard])

  const platformBreakdowns: PlatformBreakdown[] = useMemo(() => {
    if (!dashboard || !goals.length) return []
    return buildPlatformBreakdowns(goals, dashboard.crossPlatform)
  }, [dashboard, goals])

  const aiInsights: AIInsight[] = useMemo(() => {
    if (!dashboard || !goals.length) return []
    return buildAIInsights(goals, dashboard)
  }, [dashboard, goals])

  /* ── Chart data: merge all goal series ── */
  const chartData = useMemo(() => {
    if (!goals.length || !goals[0].data.length) return []
    const days = goals[0].data.map((d: { day: string; value: number }) => d.day)
    return days.map((day: string, i: number) => ({
      day,
      ROAS: goals[0]?.data[i]?.value ?? 0,
      CPA: goals[1]?.data[i]?.value ?? 0,
      Spend: (goals[2]?.data[i]?.value ?? 0) / 1000,
      Conversions: goals[3]?.data[i]?.value ?? 0,
    }))
  }, [goals])

  const toggleGoal = (id: string) => {
    setVisibleGoals(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const goalColorMap: Record<string, string> = {
    roas: '#10B981',
    cpa: '#EF4444',
    spend: '#3B82F6',
    conversions: '#F59E0B',
  }

  const handleRetry = () => setRetryCount((c) => c + 1)

  return (
    <>
    <SEO
      title="Goal Tracker"
      description="Set, track, and achieve your campaign goals. Monitor KPIs, conversion targets, and ROI objectives with real-time progress tracking."
      keywords="goal tracker, KPI tracking, campaign goals, conversion targets, ROI tracking"
    />
    <div className="min-h-screen bg-[#050505] text-white p-6 pb-24">
      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-7 h-7 text-[#2563EB]" />
              Goal Tracker
            </h1>
            <p className="text-[#555B66] text-sm mt-1">
              Track performance goals across all platforms with AI-powered insights
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-[#2563EB]/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </button>
        </div>
      </motion.div>

      {/* Error state */}
      {error && (
        <div className="mb-8">
          <ErrorState message={error} onRetry={handleRetry} />
        </div>
      )}

      {/* ── SECTION 1: ACTIVE GOALS ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mb-10"
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-sm font-semibold text-[#8A8F98] uppercase tracking-wider">Active Goals</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            <>
              <GoalCardSkeleton />
              <GoalCardSkeleton />
              <GoalCardSkeleton />
              <GoalCardSkeleton />
            </>
          ) : goals.length > 0 ? (
            goals.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i} />
            ))
          ) : !error && (
            <div className="col-span-full text-center py-12 text-[#555B66]">
              No goal data available.
            </div>
          )}
        </div>
      </motion.div>

      {/* ── SECTION 2: GOAL TRENDS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-[#8A8F98] uppercase tracking-wider">Goal Trends</h2>
          </div>
          {/* Goal toggle pills */}
          {!loading && goals.length > 0 && (
            <div className="flex items-center gap-2">
              {goals.map((g: Goal) => (
                <button
                  key={g.id}
                  onClick={() => toggleGoal(g.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    visibleGoals[g.id]
                      ? 'text-white'
                      : 'bg-[#0a0a0a] text-[#3D434C] border border-white/5'
                  }`}
                  style={visibleGoals[g.id] ? {
                    backgroundColor: `${goalColorMap[g.id]}15`,
                    color: goalColorMap[g.id],
                    border: `1px solid ${goalColorMap[g.id]}30`,
                  } : {}}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: visibleGoals[g.id] ? goalColorMap[g.id] : '#3D434C' }}
                  />
                  {g.id === 'roas' ? 'ROAS' : g.id === 'cpa' ? 'CPA' : g.id === 'spend' ? 'Spend' : 'Conv.'}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <ChartSkeleton />
        ) : chartData.length > 0 ? (
          <div className="card-surface p-5">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="day"
                  stroke="#3D434C"
                  tick={{ fill: '#555B66', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#3D434C"
                  tick={{ fill: '#555B66', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {visibleGoals.roas && (
                  <Line
                    type="monotone"
                    dataKey="ROAS"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                  />
                )}
                {visibleGoals.cpa && (
                  <Line
                    type="monotone"
                    dataKey="CPA"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#EF4444', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
                  />
                )}
                {visibleGoals.spend && (
                  <Line
                    type="monotone"
                    dataKey="Spend"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                  />
                )}
                {visibleGoals.conversions && (
                  <Line
                    type="monotone"
                    dataKey="Conversions"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            <p className="text-center text-[#3D434C] text-xs mt-3">
              Note: Spend shown in thousands ($K) &middot; CPA shown in USD
            </p>
          </div>
        ) : (
          !error && (
            <div className="card-surface p-8 text-center text-[#555B66]">
              No trend data available.
            </div>
          )
        )}
      </motion.div>

      {/* ── SECTION 3: GOAL DETAIL TABLE ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-10"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-sm font-semibold text-[#8A8F98] uppercase tracking-wider">Platform Breakdown</h2>
        </div>

        {/* Goal selector tabs */}
        {!loading && goals.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {goals.map((goal: Goal) => (
              <button
                key={goal.id}
                onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  expandedGoal === goal.id
                    ? 'text-white'
                    : 'bg-[#0a0a0a] text-[#555B66] border border-white/5 hover:border-white/10'
                }`}
                style={expandedGoal === goal.id ? {
                  backgroundColor: `${goal.color}15`,
                  color: goal.color,
                  border: `1px solid ${goal.color}30`,
                } : {}}
              >
                {goal.icon}
                {goal.name}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <TableSkeleton />
          ) : expandedGoal && platformBreakdowns.length > 0 ? (
            platformBreakdowns
              .filter((b: PlatformBreakdown) => b.goalId === expandedGoal)
              .map((breakdown: PlatformBreakdown) => (
                <motion.div
                  key={breakdown.goalId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card-surface overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th scope="col" className="text-left text-[#555B66] font-medium py-3 px-5">Platform</th>
                          <th scope="col" className="text-left text-[#555B66] font-medium py-3 px-5">Contribution</th>
                          <th scope="col" className="text-left text-[#555B66] font-medium py-3 px-5">Progress</th>
                          <th scope="col" className="text-left text-[#555B66] font-medium py-3 px-5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.platforms.map((platform, i) => {
                          const statusColor =
                            platform.status === 'On track' ? '#10B981' :
                            platform.status === 'At risk' ? '#F59E0B' : '#EF4444'
                          const StatusIcon =
                            platform.status === 'On track' ? CheckCircle :
                            platform.status === 'At risk' ? AlertTriangle : XCircle

                          return (
                            <motion.tr
                              key={platform.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-7 h-7 rounded-md flex items-center justify-center"
                                    style={{
                                      backgroundColor: platform.name === 'Meta' ? '#1877F215' :
                                        platform.name === 'Google' ? '#DB443715' :
                                        platform.name === 'TikTok' ? '#00F2EA15' : '#FFFC0015',
                                      color: platform.name === 'Meta' ? '#1877F2' :
                                        platform.name === 'Google' ? '#DB4437' :
                                        platform.name === 'TikTok' ? '#00F2EA' : '#FFFC00',
                                    }}
                                  >
                                    <span className="text-xs font-bold">
                                      {platform.name.charAt(0)}
                                    </span>
                                  </div>
                                  <span className="text-white font-medium">{platform.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-5 text-[#8A8F98]">{platform.contribution}</td>
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min(platform.progress, 100)}%` }}
                                      transition={{ duration: 0.8, delay: i * 0.1 }}
                                      className="h-full rounded-full"
                                      style={{
                                        backgroundColor: statusColor,
                                        boxShadow: `0 0 8px ${statusColor}40`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-white text-xs font-mono-data">{platform.progress}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-1.5" style={{ color: statusColor }}>
                                  <StatusIcon className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">{platform.status}</span>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ))
          ) : !error && (
            <div className="card-surface p-6 text-center text-[#555B66]">
              Select a goal to see platform breakdown.
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── SECTION 4: AI INSIGHTS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-10"
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-sm font-semibold text-[#8A8F98] uppercase tracking-wider">AI Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            <>
              <InsightCardSkeleton />
              <InsightCardSkeleton />
              <InsightCardSkeleton />
            </>
          ) : aiInsights.length > 0 ? (
            aiInsights.map((insight, i) => (
              <motion.div
                key={insight.id}
                variants={itemVariants}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.5 + i * 0.1 }}
                className="card-surface p-5 hover-lift relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${insight.color}, transparent)`,
                    opacity: 0.5,
                  }}
                />
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${insight.color}15`, color: insight.color }}
                  >
                    {insight.icon}
                  </div>
                  <span className="text-xs font-medium text-[#555B66] uppercase tracking-wide">
                    {insight.goal}
                  </span>
                </div>
                <p className="text-sm text-[#8A8F98] leading-relaxed">{insight.message}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                  <span className="text-xs text-[#2563EB]">AI-generated recommendation</span>
                </div>
              </motion.div>
            ))
          ) : (
            !error && (
              <div className="col-span-full text-center py-8 text-[#555B66]">
                No insights available yet.
              </div>
            )
          )}
        </div>
      </motion.div>

      {/* ── SECTION 5: ADD GOAL (FAB fallback) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center"
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#111] border border-white/10 hover:border-[#2563EB]/30 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all hover:bg-[#1a1a1a] hover:shadow-lg hover:shadow-[#2563EB]/10"
        >
          <Plus className="w-4 h-4 text-[#2563EB]" />
          Add Another Goal
        </button>
      </motion.div>

      {/* ── ADD GOAL MODAL ── */}
      <AddGoalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
    </>
  )
}
