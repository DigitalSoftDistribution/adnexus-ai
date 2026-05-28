import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CountUp from 'react-countup'
import {
  Target, Plus, X, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Edit3, Pause, Trash2, Loader2,
  BarChart3, DollarSign, MousePointer, Users, Zap,
  Calendar, ChevronDown,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { goalsApi, campaignsApi, type PerformanceGoal, type GoalType, type GoalStatus, type GoalPlatform } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DESIGN CONSTANTS                                                    */
/* ------------------------------------------------------------------ */
const C = {
  accent: '#2563EB',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
}

const GOAL_TYPE_OPTIONS: GoalType[] = ['ROAS', 'CPA', 'CTR', 'Spend', 'Conversions', 'Custom']
const PLATFORM_OPTIONS: GoalPlatform[] = ['Meta', 'Google', 'TikTok', 'Snap', 'All']

const TYPE_CONFIG: Record<GoalType, { icon: React.ReactNode; color: string }> = {
  ROAS: { icon: <BarChart3 size={12} />, color: C.accent },
  CPA: { icon: <DollarSign size={12} />, color: C.statusActive },
  CTR: { icon: <MousePointer size={12} />, color: C.googleRed },
  Spend: { icon: <DollarSign size={12} />, color: C.statusWarning },
  Conversions: { icon: <Users size={12} />, color: C.tiktokCyan },
  Custom: { icon: <Zap size={12} />, color: C.statusActive },
}

const PLATFORM_COLORS: Record<string, string> = {
  Meta: C.metaBlue,
  Google: C.googleRed,
  TikTok: C.tiktokCyan,
  Snap: C.snapYellow,
  All: C.accent,
}

/* ------------------------------------------------------------------ */
/*  HELPER: PROGRESS PERCENTAGE                                         */
/* ------------------------------------------------------------------ */
function getProgress(current: number, target: number, type: GoalType): number {
  if (target === 0) return 0
  if (type === 'CPA') {
    return target >= current ? 100 : Math.round((target / current) * 100)
  }
  if (type === 'Spend') {
    return Math.min(100, Math.round((current / target) * 100))
  }
  return Math.min(100, Math.round((current / target) * 100))
}

/* ------------------------------------------------------------------ */
/*  STATUS BADGE                                                        */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: GoalStatus }) {
  const config = {
    'on-track': { color: C.statusActive, icon: <TrendingUp size={10} />, label: 'On Track' },
    'at-risk': { color: C.statusWarning, icon: <AlertTriangle size={10} />, label: 'At Risk' },
    'off-track': { color: C.statusError, icon: <TrendingDown size={10} />, label: 'Off Track' },
    'completed': { color: C.statusActive, icon: <CheckCircle size={10} />, label: 'Completed' },
  }
  const c = config[status]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${c.color}15`, color: c.color }}
    >
      {c.icon}
      {c.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  TYPE BADGE                                                          */
/* ------------------------------------------------------------------ */
function TypeBadge({ type }: { type: GoalType }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${cfg.color}15`, color: cfg.color }}
    >
      {cfg.icon}
      {type}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  PLATFORM BADGE                                                      */
/* ------------------------------------------------------------------ */
function PlatformBadge({ platform }: { platform: GoalPlatform }) {
  const color = PLATFORM_COLORS[platform] || C.accent
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${color}15`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {platform}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  PROGRESS BAR (CSS gradient)                                         */
/* ------------------------------------------------------------------ */
function ProgressBar({ current, target, type, status }: { current: number; target: number; type: GoalType; status: GoalStatus }) {
  const progress = getProgress(current, target, type)
  const barColors = {
    'on-track': { fill: C.statusActive, bg: `${C.statusActive}20` },
    'at-risk': { fill: C.statusWarning, bg: `${C.statusWarning}20` },
    'off-track': { fill: C.statusError, bg: `${C.statusError}20` },
    'completed': { fill: C.statusActive, bg: `${C.statusActive}20` },
  }
  const c = barColors[status]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
        <span className="font-mono-data font-semibold" style={{ color: c.fill }}>{progress}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: c.bg }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${c.fill}88, ${c.fill})` }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  GOAL CARD                                                           */
/* ------------------------------------------------------------------ */
function GoalCard({ goal, index, onEdit, onPause, onDelete }: {
  goal: PerformanceGoal
  index: number
  onEdit: (g: PerformanceGoal) => void
  onPause: (id: string) => void
  onDelete: (id: string) => void
}) {
  const progress = getProgress(goal.current, goal.target, goal.type)
  const __isCompleted = goal.status === 'completed'
  const isPaused = goal.status === 'off-track' && progress === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="bg-[#111111] p-5 flex flex-col gap-4 transition-all duration-200 hover:border-[var(--border-active)]"
      style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={goal.type} />
            <PlatformBadge platform={goal.platform} />
            <StatusBadge status={goal.status} />
          </div>
          <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {goal.name}
          </h3>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar current={goal.current} target={goal.target} type={goal.type} status={goal.status} />

      {/* Current vs Target */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5 p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          <span className="text-[10px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Current</span>
          <span className="font-mono-data text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {goal.type === 'CPA' || goal.type === 'Spend' ? '$' : ''}{goal.current}{goal.unit}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          <span className="text-[10px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Target</span>
          <span className="font-mono-data text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {goal.type === 'CPA' || goal.type === 'Spend' ? '$' : ''}{goal.target}{goal.unit}
          </span>
        </div>
      </div>

      {/* Date Range & Campaigns */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <Calendar size={12} />
          <span>{goal.startDate} &rarr; {goal.endDate}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {goal.campaigns.map((camp) => (
            <span key={camp} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              {camp}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => onEdit(goal)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150"
          style={{ background: 'var(--bg-secondary)', color: 'var(--accent)', border: '1px solid var(--border-subtle)' }}
        >
          <Edit3 size={12} />
          Edit
        </button>
        <button
          onClick={() => onPause(goal.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150"
          style={{ background: 'var(--bg-secondary)', color: isPaused ? C.statusActive : C.statusWarning, border: '1px solid var(--border-subtle)' }}
        >
          <Pause size={12} />
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => onDelete(goal.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ml-auto"
          style={{ background: `${C.statusError}10`, color: C.statusError, border: '1px solid var(--border-subtle)' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  GOAL CARD SKELETON                                                  */
/* ------------------------------------------------------------------ */
function GoalCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="bg-[#111111] p-5 flex flex-col gap-4"
      style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-2.5 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5 p-2.5 rounded-lg">
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex flex-col gap-0.5 p-2.5 rounded-lg">
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-auto pt-3">
        <Skeleton className="h-6 w-14 rounded-lg" />
        <Skeleton className="h-6 w-14 rounded-lg" />
        <Skeleton className="h-6 w-8 rounded-lg ml-auto" />
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CREATE / EDIT GOAL MODAL                                            */
/* ------------------------------------------------------------------ */
function GoalModal({ onClose, onSaved, editGoal }: { onClose: () => void; onSaved: () => void; editGoal?: PerformanceGoal }) {
  const [goalName, setGoalName] = useState(editGoal?.name || '')
  const [goalType, setGoalType] = useState<GoalType>(editGoal?.type || 'ROAS')
  const [targetValue, setTargetValue] = useState(editGoal ? String(editGoal.target) : '')
  const [unit, setUnit] = useState(editGoal?.unit || 'x')
  const [platform, setPlatform] = useState<GoalPlatform>(editGoal?.platform || 'All')
  const [startDate, setStartDate] = useState(editGoal?.startDate || '')
  const [endDate, setEndDate] = useState(editGoal?.endDate || '')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(editGoal?.campaigns || ['All campaigns'])
  const [alertWhen, setAlertWhen] = useState<'at-risk' | 'off-track' | 'never'>(editGoal?.alertWhen || 'at-risk')
  const [loading, setLoading] = useState(false)
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    campaignsApi.list({}).then((res) => {
      const names = res.data.map((c) => c.name)
      setAvailableCampaigns(['All campaigns', ...names])
    }).catch(() => {
      setAvailableCampaigns([
        'All campaigns',
        'Summer Sale', 'Retargeting', 'Search Brand', 'PMax',
        'FYP Viral', 'Spark Ads', 'App Install', 'Brand Awareness',
      ])
    })
  }, [])

  const toggleCampaign = (camp: string) => {
    if (camp === 'All campaigns') {
      setSelectedCampaigns(['All campaigns'])
      return
    }
    setSelectedCampaigns((prev) => {
      const filtered = prev.filter((c) => c !== 'All campaigns')
      if (filtered.includes(camp)) return filtered.filter((c) => c !== camp)
      return [...filtered, camp]
    })
  }

  const handleSubmit = async () => {
    if (!goalName.trim()) { toast({ title: 'Goal name is required', variant: 'destructive' }); return }
    if (!targetValue || isNaN(Number(targetValue))) { toast({ title: 'Valid target value is required', variant: 'destructive' }); return }
    if (!startDate) { toast({ title: 'Start date is required', variant: 'destructive' }); return }
    if (!endDate) { toast({ title: 'End date is required', variant: 'destructive' }); return }
    if (selectedCampaigns.length === 0) { toast({ title: 'Select at least one campaign', variant: 'destructive' }); return }

    setLoading(true)
    try {
      const input = {
        name: goalName.trim(),
        type: goalType,
        target: Number(targetValue),
        unit,
        platform,
        campaigns: selectedCampaigns,
        startDate,
        endDate,
        alertWhen,
      }
      if (editGoal) {
        await goalsApi.update(editGoal.id, input)
        toast('success', 'Goal updated', goalName)
      } else {
        await goalsApi.create(input)
        toast('success', 'Goal created', goalName)
      }
      onSaved()
      onClose()
    } catch {
      toast({ title: `Failed to ${editGoal ? 'update' : 'create'} goal`, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-base font-semibold font-space" style={{ color: 'var(--text-primary)' }}>
            {editGoal ? 'Edit Goal' : 'Create Goal'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Goal Name */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Goal Name</label>
            <input
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g., Q3 ROAS Target"
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none placeholder:text-[var(--text-muted)]"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Goal Type */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Goal Type</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setGoalType(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                  style={{
                    background: goalType === t ? `${TYPE_CONFIG[t].color}15` : 'var(--bg-secondary)',
                    color: goalType === t ? TYPE_CONFIG[t].color : 'var(--text-secondary)',
                    border: `1px solid ${goalType === t ? `${TYPE_CONFIG[t].color}40` : 'var(--border-subtle)'}`,
                  }}
                >
                  {TYPE_CONFIG[t].icon}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Target + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Target Value</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g., 4.0"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none placeholder:text-[var(--text-muted)]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="x, %, $, etc"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none placeholder:text-[var(--text-muted)]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                  style={{
                    background: platform === p ? `${PLATFORM_COLORS[p]}15` : 'var(--bg-secondary)',
                    color: platform === p ? PLATFORM_COLORS[p] : 'var(--text-secondary)',
                    border: `1px solid ${platform === p ? `${PLATFORM_COLORS[p]}40` : 'var(--border-subtle)'}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Campaigns Multi-Select */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Campaigns</label>
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              {availableCampaigns.map((camp) => (
                <button
                  key={camp}
                  onClick={() => toggleCampaign(camp)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150"
                  style={{
                    background: selectedCampaigns.includes(camp) ? `${C.accent}20` : 'var(--bg-elevated)',
                    color: selectedCampaigns.includes(camp) ? C.accent : 'var(--text-secondary)',
                    border: `1px solid ${selectedCampaigns.includes(camp) ? `${C.accent}40` : 'var(--border-subtle)'}`,
                  }}
                >
                  {camp}
                </button>
              ))}
            </div>
          </div>

          {/* Alert When */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Alert When</label>
            <div className="flex flex-col gap-1.5">
              {[
                { key: 'at-risk' as const, label: 'Goal becomes at risk' },
                { key: 'off-track' as const, label: 'Goal goes off track' },
                { key: 'never' as const, label: 'Never alert' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setAlertWhen(opt.key)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 text-left"
                  style={{
                    background: alertWhen === opt.key ? `${C.accent}10` : 'transparent',
                    border: `1px solid ${alertWhen === opt.key ? `${C.accent}30` : 'transparent'}`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: `2px solid ${alertWhen === opt.key ? C.accent : 'var(--text-muted)'}` }}
                  >
                    {alertWhen === opt.key && <div className="w-2 h-2 rounded-full" style={{ background: C.accent }} />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 disabled:opacity-50"
            style={{ background: C.accent, color: 'white' }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {editGoal ? 'Update Goal' : 'Create Goal'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function PerformanceGoals() {
  const [goals, setGoals] = useState<PerformanceGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<PerformanceGoal | undefined>()
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all')
  const { toast } = useToast()

  const fetchGoals = async () => {
    setLoading(true)
    try {
      const data = await goalsApi.list()
      setGoals(data)
    } catch {
      toast({ title: 'Failed to load goals', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const filteredGoals = useMemo(() => {
    if (statusFilter === 'all') return goals
    return goals.filter((g) => g.status === statusFilter)
  }, [goals, statusFilter])

  const stats = useMemo(() => {
    const totalGoals = goals.length
    const activeGoals = goals.filter((g) => g.status === 'on-track' || g.status === 'at-risk').length
    const onTrack = goals.filter((g) => g.status === 'on-track').length
    const atRisk = goals.filter((g) => g.status === 'at-risk').length
    const offTrack = goals.filter((g) => g.status === 'off-track').length
    const completed = goals.filter((g) => g.status === 'completed').length
    return { totalGoals, activeGoals, onTrack, atRisk, offTrack, completed }
  }, [goals])

  const handleDelete = async (id: string) => {
    try {
      await goalsApi.delete(id)
      toast({ title: 'Goal deleted', variant: 'success' })
      fetchGoals()
    } catch {
      toast({ title: 'Failed to delete goal', variant: 'destructive' })
    }
  }

  const handlePause = async (id: string) => {
    try {
      await goalsApi.toggleStatus(id)
      toast({ title: 'Goal status updated', variant: 'success' })
      fetchGoals()
    } catch {
      toast({ title: 'Failed to update goal', variant: 'destructive' })
    }
  }

  return (
    <>
    <SEO
      title="Performance Goals"
      description="Set and track performance goals for your campaigns. Monitor KPIs, benchmarks, and achievement progress in real-time."
      keywords="performance goals, KPI tracking, benchmarks, campaign objectives"
    />
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* ---- HEADER ---- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h2 className="font-space text-[36px] font-semibold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Performance Goals
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {stats.activeGoals} active &middot; {stats.completed} completed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as GoalStatus | 'all')}
                className="appearance-none px-4 py-2.5 pr-8 rounded-lg text-sm font-medium cursor-pointer outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                <option value="all">All Goals</option>
                <option value="on-track">On Track</option>
                <option value="at-risk">At Risk</option>
                <option value="off-track">Off Track</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <button
              onClick={() => { setEditingGoal(undefined); setShowCreateModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02]"
              style={{ background: C.accent, boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
            >
              <Plus size={16} />
              Create Goal
            </button>
          </div>
        </motion.div>

        {/* ---- OVERVIEW CARDS ---- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-surface p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            ))
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="card-surface p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Active Goals</span>
                  <Target size={14} style={{ color: C.accent }} />
                </div>
                <span className="font-mono-data text-[24px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                  <CountUp end={stats.activeGoals} duration={0.8} />/{stats.totalGoals}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{stats.completed} completed this month</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="card-surface p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>On Track</span>
                  <TrendingUp size={14} style={{ color: C.statusActive }} />
                </div>
                <span className="font-mono-data text-[24px] font-bold leading-none" style={{ color: C.statusActive }}>
                  <CountUp end={stats.onTrack} duration={0.8} />
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Meeting target pace</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="card-surface p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>At Risk</span>
                  <AlertTriangle size={14} style={{ color: C.statusWarning }} />
                </div>
                <span className="font-mono-data text-[24px] font-bold leading-none" style={{ color: C.statusWarning }}>
                  <CountUp end={stats.atRisk} duration={0.8} />
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Needs attention soon</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="card-surface p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Off Track</span>
                  <TrendingDown size={14} style={{ color: C.statusError }} />
                </div>
                <span className="font-mono-data text-[24px] font-bold leading-none" style={{ color: C.statusError }}>
                  <CountUp end={stats.offTrack} duration={0.8} />
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Immediate action needed</span>
              </motion.div>
            </>
          )}
        </div>

        {/* ---- GOALS GRID ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <GoalCardSkeleton key={i} index={i} />)
            : filteredGoals.map((goal, idx) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={idx}
                  onEdit={(g) => { setEditingGoal(g); setShowCreateModal(true) }}
                  onPause={handlePause}
                  onDelete={handleDelete}
                />
              ))
          }
        </div>

        {!loading && filteredGoals.length === 0 && (
          <div className="text-center py-16">
            <Target size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No goals found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {statusFilter !== 'all' ? 'Try changing your filter.' : 'Create your first performance goal.'}
            </p>
          </div>
        )}
      </div>

      {/* ---- CREATE / EDIT GOAL MODAL ---- */}
      <AnimatePresence>
        {showCreateModal && (
          <GoalModal
            onClose={() => { setShowCreateModal(false); setEditingGoal(undefined) }}
            onSaved={fetchGoals}
            editGoal={editingGoal}
          />
        )}
      </AnimatePresence>
    </div>
    </>
  )
}
