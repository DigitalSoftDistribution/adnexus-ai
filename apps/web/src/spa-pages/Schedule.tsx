// @ts-nocheck
import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalIcon,
  Clock,
  Plus,
  X,
  Rocket,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Megaphone,
  TrendingUp,
  AlertOctagon,
  PenTool,
  Zap,
  Brain,
  Timer,
  XCircle,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import type { PendingDraft, Campaign, AutomationRule } from '../lib/api'
import SEO from '../components/SEO';

/* ══════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════ */

type ScheduleEventType = 'launch' | 'report' | 'optimization' | 'alert' | 'draft'
type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snapchat' | 'LinkedIn' | 'All'

interface ScheduleEvent {
  id: string
  title: string
  type: ScheduleEventType
  date: string // YYYY-MM-DD
  time: string
  platform: Platform
  description: string
  notes?: string
}

interface AISuggestion {
  id: string
  title: string
  description: string
  confidence: number
  type: 'launch' | 'timing' | 'budget' | 'audience'
}

/* ══════════════════════════════════════════════
   EVENT TYPE CONFIG
   ══════════════════════════════════════════════ */

const EVENT_CONFIG: Record<ScheduleEventType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  launch:        { label: 'Launch',        color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: '#10B98140', icon: <Rocket size={10} /> },
  report:        { label: 'Report',        color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  border: '#3B82F640', icon: <FileText size={10} /> },
  optimization:  { label: 'Optimization',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  border: '#8B5CF640', icon: <Sparkles size={10} /> },
  alert:         { label: 'Alert',         color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: '#EF444440', icon: <AlertTriangle size={10} /> },
  draft:         { label: 'Draft Due',     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: '#F59E0B40', icon: <CheckCircle2 size={10} /> },
}

const PLATFORM_CONFIG: Record<Platform, { color: string }> = {
  Meta:       { color: '#1877F2' },
  Google:     { color: '#DB4437' },
  TikTok:     { color: '#00C8C0' },
  Snapchat:   { color: '#C8A000' },
  LinkedIn:   { color: '#0A66C2' },
  All:        { color: '#8B5CF6' },
}

/* ══════════════════════════════════════════════
   AI SUGGESTIONS MOCK (kept — no backend endpoint)
   ══════════════════════════════════════════════ */

const AI_SUGGESTIONS: AISuggestion[] = [
  { id: 'a1', title: 'Summer Sale 2.0 Launch Timing',     description: "AI recommends launching 'Summer Sale 2.0' on June 15 based on historical performance data showing 23% higher conversion rates on mid-month launches.", confidence: 94, type: 'launch' },
  { id: 'a2', title: 'TikTok Optimal Time Window',        description: 'Optimal time for TikTok campaign engagement: 7-9 PM based on audience activity patterns. Expected +18% engagement vs. current schedule.', confidence: 91, type: 'timing' },
  { id: 'a3', title: 'Budget Reallocation',               description: 'Shift $350/day from underperforming Snapchat ads to TikTok based on ROAS analysis. Projected +15% overall return.', confidence: 88, type: 'budget' },
  { id: 'a4', title: 'Lookalike Audience Expansion',      description: 'Create 1% lookalike from top 5% converters on Meta. AI predicts +22% reach with maintained CPA.', confidence: 86, type: 'audience' },
]

/* ══════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════ */

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function toDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day).getDay()
  return d === 0 || d === 6
}

function getDaysUntil(dateStr: string): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `In ${diffDays} days`
  return `${Math.floor(diffDays / 7)}w ${diffDays % 7}d`
}

function toISODate(d: string | Date | undefined | null): string | null {
  if (!d) return null
  try {
    const date = typeof d === 'string' ? new Date(d) : d
    if (isNaN(date.getTime())) return null
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return null
  }
}

function normalizePlatform(p: string | undefined): Platform {
  if (!p) return 'All'
  const map: Record<string, Platform> = {
    meta: 'Meta', facebook: 'Meta', fb: 'Meta',
    google: 'Google', goog: 'Google',
    tiktok: 'TikTok', tt: 'TikTok',
    snap: 'Snapchat', snapchat: 'Snapchat',
    linkedin: 'LinkedIn', li: 'LinkedIn',
    all: 'All',
  }
  return map[p.toLowerCase()] || (p as Platform)
}

/** Transform API data into unified ScheduleEvent[] */
function buildEvents(
  drafts: PendingDraft[],
  campaigns: Campaign[],
  rules: AutomationRule[],
): ScheduleEvent[] {
  const events: ScheduleEvent[] = []

  // ── Drafts → 'draft' events ──
  for (const d of drafts) {
    const date = toISODate(d.createdAt) || toISODate(d.expiresAt)
    if (!date) continue
    events.push({
      id: `draft-${d.id}`,
      title: d.title || d.ruleName || 'Draft',
      type: 'draft',
      date,
      time: '09:00',
      platform: normalizePlatform(d.platform),
      description: d.description || d.changeSummary || `Draft status: ${d.status}`,
      notes: d.aiReasoning ? `AI: ${d.aiReasoning}` : undefined,
    })
    // If draft has an expiresAt, add an alert event
    if (d.expiresAt) {
      const expDate = toISODate(d.expiresAt)
      if (expDate && expDate !== date) {
        events.push({
          id: `draft-exp-${d.id}`,
          title: `${d.title || 'Draft'} Expires`,
          type: 'alert',
          date: expDate,
          time: '23:59',
          platform: normalizePlatform(d.platform),
          description: `Draft approval deadline — ${d.status}`,
          notes: d.impactEstimate || undefined,
        })
      }
    }
  }

  // ── Campaigns → 'launch' events from createdAt ──
  for (const c of campaigns) {
    const date = toISODate(c.createdAt)
    if (!date) continue
    const statusLabel = c.status === 'Active' ? 'Active' : c.status === 'Paused' ? 'Paused' : c.status === 'Ended' ? 'Ended' : 'Draft'
    events.push({
      id: `camp-${c.id}`,
      title: `${c.name} — ${statusLabel}`,
      type: c.status === 'Active' ? 'launch' : 'alert',
      date,
      time: '09:00',
      platform: normalizePlatform(c.platform),
      description: `${c.platform} campaign · ${c.objective} · $${c.budget}/day budget`,
      notes: c.status === 'Active' ? `Spend: $${c.spend?.toLocaleString() || 0} · CTR: ${c.ctr ?? '-'}%` : `Status: ${c.status}`,
    })
    // Add end-of-month report event based on campaign updatedAt
    if (c.updatedAt) {
      const updated = toISODate(c.updatedAt)
      if (updated && updated !== date) {
        events.push({
          id: `camp-upd-${c.id}`,
          title: `${c.name} Updated`,
          type: 'report',
          date: updated,
          time: '17:00',
          platform: normalizePlatform(c.platform),
          description: `Campaign performance update · ${c.objective}`,
        })
      }
    }
  }

  // ── Rules → 'optimization' events ──
  for (const r of rules) {
    const date = toISODate(r.createdAt) || toISODate(r.updatedAt)
    if (!date) continue
    const cond = r.condition
      ? `${r.condition.metric} ${r.condition.operator} ${r.condition.value}`
      : r.conditions?.map(c => `${c.metric} ${c.operator} ${c.value}`).join(', ')
    events.push({
      id: `rule-${r.id}`,
      title: r.name,
      type: 'optimization',
      date,
      time: '14:00',
      platform: normalizePlatform(r.platform || (r.platforms?.[0])),
      description: r.description || `Rule: ${cond || 'Custom condition'}`,
      notes: r.status === 'active'
        ? `${r.triggerCount || 0} triggers · ${r.appliedCount || 0} applied`
        : `Status: paused`,
    })
    // If rule was last triggered, add that as an event
    if (r.lastTriggered || r.lastAppliedAt) {
      const lastDate = toISODate(r.lastTriggered) || toISODate(r.lastAppliedAt)
      if (lastDate && lastDate !== date) {
        events.push({
          id: `rule-trig-${r.id}`,
          title: `${r.name} Triggered`,
          type: 'optimization',
          date: lastDate,
          time: '10:00',
          platform: normalizePlatform(r.platform || (r.platforms?.[0])),
          description: `Rule automatically triggered · ${r.description || ''}`,
        })
      }
    }
  }

  return events
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ══════════════════════════════════════════════
   SKELETON COMPONENTS
   ══════════════════════════════════════════════ */

function CalendarSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="h-5 w-40 rounded" style={{ background: 'var(--bg-hover)' }} />
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-1.5 text-center">
              <div className="h-3 w-6 mx-auto rounded" style={{ background: 'var(--bg-hover)' }} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="rounded-lg p-1.5" style={{ minHeight: 60 }}>
              <div className="h-5 w-5 rounded-full mb-1" style={{ background: 'var(--bg-hover)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="hidden xl:block w-80 shrink-0 space-y-5 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <div className="h-4 w-32 rounded mb-3" style={{ background: 'var(--bg-hover)' }} />
          <div className="space-y-2">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-8 rounded" style={{ background: 'var(--bg-hover)' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */

export default function Schedule() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState<ScheduleEventType | 'all'>('all')

  /* ── Data fetching ── */
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [drafts, campaigns, rules] = await Promise.all([
        apiGet<PendingDraft[]>('/drafts', { params: { status: 'pending,approved,scheduled' } }),
        apiGet<Campaign[]>('/campaigns'),
        apiGet<AutomationRule[]>('/agent/rules'),
      ])
      const combined = buildEvents(drafts, campaigns, rules)
      setEvents(combined)
    } catch (err: any) {
      console.error('[Schedule] Failed to load calendar data:', err)
      setError(err?.message || 'Failed to load schedule data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [retryCount])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRetry = () => setRetryCount(c => c + 1)

  const goToPrev = useCallback(() => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }, [month])

  const goToNext = useCallback(() => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }, [month])

  const goToToday = useCallback(() => {
    const n = new Date()
    setYear(n.getFullYear())
    setMonth(n.getMonth())
    setSelectedDay(n.getDate())
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev()
      if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToPrev, goToNext])

  const selectedDateKey = selectedDay ? toDateKey(year, month, selectedDay) : null

  const eventsForSelectedDay = useMemo(() => {
    if (!selectedDateKey) return []
    return events.filter(e => e.date === selectedDateKey)
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [selectedDateKey, events])

  const upcomingEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today.getTime() + 7 * 86400000)
    return events.filter(e => {
      const d = new Date(e.date + 'T00:00:00')
      return d >= today && d <= nextWeek
    }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  }, [events])

  const filteredEvents = useMemo(() => {
    return activeFilter === 'all' ? events : events.filter(e => e.type === activeFilter)
  }, [activeFilter, events])

  /* ── Stats ── */
  const stats = useMemo(() => ({
    launch: events.filter(e => e.type === 'launch').length,
    report: events.filter(e => e.type === 'report').length,
    optimization: events.filter(e => e.type === 'optimization').length,
    alert: events.filter(e => e.type === 'alert').length,
    draft: events.filter(e => e.type === 'draft').length,
    total: events.length,
  }), [events])

  /* ═══════ ERROR STATE ═══════ */
  if (error && !loading) {
    return (
      <>
      <SEO
        title="Schedule"
      description="Schedule campaigns, reports, and automated actions. Set up recurring tasks and time-based triggers for your marketing workflow."
      keywords="schedule, campaign scheduling, automation, recurring tasks, timed triggers"
      />
      <div className="min-h-[100dvh] p-6 lg:p-8 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl p-8 max-w-md text-center"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: '#EF4444' }} />
          <h2 className="font-space font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            Failed to Load Schedule
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </motion.div>
      </div>
      </>
    )
  }

  return (
    <div className="min-h-[100dvh] p-6 lg:p-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1600px] mx-auto">

        {/* ═══════ HEADER ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="font-space font-semibold text-2xl lg:text-3xl" style={{ color: 'var(--text-primary)' }}>
              Schedule
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Campaign launches, reports, AI optimizations, and deadlines
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Plus size={14} /> Create Event
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              Today
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                className="p-1.5 rounded-lg transition-all duration-150 hover:scale-105"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center" style={{ color: 'var(--text-primary)' }}>
                {formatMonthYear(year, month)}
              </span>
              <button
                onClick={goToNext}
                className="p-1.5 rounded-lg transition-all duration-150 hover:scale-105"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {loading && (
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                <Loader2 size={12} className="animate-spin" /> Loading...
              </span>
            )}
          </div>
        </motion.div>

        {/* ═══════ FILTER BAR ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap items-center gap-2 mb-5"
        >
          <span className="text-[11px] font-medium mr-1" style={{ color: 'var(--text-tertiary)' }}>Filter:</span>
          {[
            { key: 'all',           label: 'All',            color: '#8B5CF6', count: stats.total },
            { key: 'launch',        label: 'Launches',       color: '#10B981', count: stats.launch },
            { key: 'report',        label: 'Reports',        color: '#3B82F6', count: stats.report },
            { key: 'optimization',  label: 'Optimizations',  color: '#8B5CF6', count: stats.optimization },
            { key: 'alert',         label: 'Alerts',         color: '#EF4444', count: stats.alert },
            { key: 'draft',         label: 'Drafts',         color: '#F59E0B', count: stats.draft },
          ].map(f => {
            const isActive = activeFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key as ScheduleEventType | 'all')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150"
                style={{
                  background: isActive ? `${f.color}18` : 'transparent',
                  color: isActive ? f.color : 'var(--text-tertiary)',
                  border: `1px solid ${isActive ? `${f.color}40` : 'var(--border-subtle)'}`,
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />
                {f.label}
                <span className="text-[10px] opacity-60">({f.count})</span>
              </button>
            )
          })}
        </motion.div>

        {/* ═══════ MAIN GRID ═══════ */}
        <div className="flex gap-6">

          {/* ─── LEFT: Calendar + Selected Day ─── */}
          <div className="flex-[2] min-w-0 space-y-5">

            {/* Section 1: Calendar View */}
            {loading ? (
              <CalendarSkeleton />
            ) : (
              <CalendarGrid
                year={year}
                month={month}
                events={filteredEvents}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            )}

            {/* Section 2: Selected Day Detail */}
            {!loading && (
              <AnimatePresence mode="wait">
                {selectedDay && selectedDateKey && (
                  <DayDetailPanel
                    key={selectedDateKey}
                    dateKey={selectedDateKey}
                    events={eventsForSelectedDay}
                  />
                )}
              </AnimatePresence>
            )}

            {/* Section 5: AI-Suggested Schedule */}
            {!loading && <AISuggestionsPanel suggestions={AI_SUGGESTIONS} />}
          </div>

          {/* ─── RIGHT: Sidebar ─── */}
          {loading ? (
            <SidebarSkeleton />
          ) : (
            <aside className="hidden xl:block w-80 shrink-0 space-y-5">

              {/* Section 4: Create Event CTA */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  <Plus size={14} /> Create New Event
                </button>
              </motion.div>

              {/* Section 3: Upcoming Events */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Timer size={14} style={{ color: 'var(--accent)' }} />
                  <h3 className="font-space font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    Upcoming (Next 7 Days)
                  </h3>
                </div>
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No upcoming events</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map(ev => {
                      const cfg = EVENT_CONFIG[ev.type]
                      const countdown = getDaysUntil(ev.date)
                      const isToday = countdown === 'Today'
                      const isTomorrow = countdown === 'Tomorrow'
                      return (
                        <div
                          key={ev.id}
                          className="flex items-start gap-2.5 p-2 rounded-lg transition-colors duration-100"
                          style={{ background: 'transparent' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <span
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ background: cfg.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {ev.title}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              {ev.platform} &middot; {ev.time}
                            </p>
                          </div>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{
                              background: isToday ? 'rgba(239,68,68,0.15)' : isTomorrow ? 'rgba(245,158,11,0.15)' : 'var(--bg-secondary)',
                              color: isToday ? '#EF4444' : isTomorrow ? '#F59E0B' : 'var(--text-secondary)',
                            }}
                          >
                            {countdown}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>

              {/* Legend */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <h3 className="font-space font-medium text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                  Legend
                </h3>
                <div className="space-y-2">
                  {[
                    ['Campaign Launch',     '#10B981', 'New campaign going live'],
                    ['Scheduled Report',    '#3B82F6', 'Auto-generated reports'],
                    ['AI Optimization',     '#8B5CF6', 'AI-planned adjustments'],
                    ['Budget Alert',        '#EF4444', 'Deadlines & thresholds'],
                    ['Draft Deadline',      '#F59E0B', 'Approval deadlines'],
                  ].map(([label, color, desc]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                        <span className="text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <h3 className="font-space font-medium text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                  This Month
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Launches',        count: stats.launch,       color: '#10B981', icon: <Rocket size={12} /> },
                    { label: 'Reports',         count: stats.report,       color: '#3B82F6', icon: <FileText size={12} /> },
                    { label: 'Optimizations',   count: stats.optimization, color: '#8B5CF6', icon: <Sparkles size={12} /> },
                    { label: 'Alerts',          count: stats.alert,        color: '#EF4444', icon: <AlertTriangle size={12} /> },
                    { label: 'Draft Deadlines', count: stats.draft,        color: '#F59E0B', icon: <CheckCircle2 size={12} /> },
                    { label: 'Total',           count: stats.total,        color: '#8B5CF6', icon: <CalIcon size={12} /> },
                  ].map(s => (
                    <div
                      key={s.label}
                      className="rounded-lg p-2.5"
                      style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}
                    >
                      <div className="flex items-center gap-1 mb-1" style={{ color: s.color }}>
                        {s.icon}
                        <span className="text-[10px] font-medium">{s.label}</span>
                      </div>
                      <span className="text-lg font-semibold font-mono-data" style={{ color: 'var(--text-primary)' }}>
                        {s.count}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </aside>
          )}
        </div>
      </div>

      {/* ═══════ CREATE EVENT MODAL ═══════ */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateEventModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════
   CALENDAR GRID (Section 1)
   ══════════════════════════════════════════════ */

function CalendarGrid({
  year,
  month,
  events,
  selectedDay,
  onSelectDay,
}: {
  year: number
  month: number
  events: ScheduleEvent[]
  selectedDay: number | null
  onSelectDay: (day: number) => void
}) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const daysInPrevMonth = getDaysInMonth(year, month - 1)

  const cells: { day: number; isCurrentMonth: boolean; isWeekend: boolean; isToday: boolean }[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const isWk = month === 0 ? isWeekend(year - 1, 11, d) : isWeekend(year, month - 1, d)
    const isTd = month === 0 ? isToday(year - 1, 11, d) : isToday(year, month - 1, d)
    cells.push({ day: d, isCurrentMonth: false, isWeekend: isWk, isToday: isTd })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, isWeekend: isWeekend(year, month, d), isToday: isToday(year, month, d) })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const isWk = month === 11 ? isWeekend(year + 1, 0, d) : isWeekend(year, month + 1, d)
    const isTd = month === 11 ? isToday(year + 1, 0, d) : isToday(year, month + 1, d)
    cells.push({ day: d, isCurrentMonth: false, isWeekend: isWk, isToday: isTd })
  }

  const getEventsForDay = (day: number, isCurrent: boolean) => {
    if (!isCurrent) return []
    const key = toDateKey(year, month, day)
    return events.filter(e => e.date === key)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-space font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            {formatMonthYear(year, month)}
          </h2>
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {events.length} events
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            const dayEvents = getEventsForDay(cell.day, cell.isCurrentMonth)
            const isSelected = cell.isCurrentMonth && selectedDay === cell.day

            const eventDots = dayEvents.slice(0, 4).map(ev => {
              const cfg = EVENT_CONFIG[ev.type]
              return { color: cfg.color, type: ev.type }
            })

            return (
              <button
                key={idx}
                onClick={() => cell.isCurrentMonth && onSelectDay(cell.day)}
                className="relative rounded-lg p-1.5 text-left transition-all duration-100"
                style={{
                  background: isSelected ? 'rgba(139,92,246,0.12)' : cell.isToday ? 'rgba(37,99,235,0.06)' : 'transparent',
                  border: isSelected ? '1.5px solid #8B5CF6' : '1.5px solid transparent',
                  opacity: cell.isCurrentMonth ? 1 : 0.3,
                  minHeight: 60,
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  if (isSelected) e.currentTarget.style.background = 'rgba(139,92,246,0.12)'
                  else if (cell.isToday) e.currentTarget.style.background = 'rgba(37,99,235,0.06)'
                  else e.currentTarget.style.background = 'transparent'
                }}
              >
                <span
                  className="flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1"
                  style={{
                    color: cell.isToday ? '#fff' : 'var(--text-primary)',
                    background: cell.isToday ? 'var(--accent)' : 'transparent',
                  }}
                >
                  {cell.day}
                </span>

                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-[3px] mt-0.5">
                    {eventDots.map((dot, di) => (
                      <span
                        key={di}
                        className="w-[6px] h-[6px] rounded-full"
                        style={{ background: dot.color }}
                        title={EVENT_CONFIG[dot.type].label}
                      />
                    ))}
                    {dayEvents.length > 4 && (
                      <span className="text-[8px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        +{dayEvents.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {dayEvents.length === 1 && (
                  <div
                    className="mt-1 px-1 py-0.5 rounded text-[9px] font-medium truncate"
                    style={{
                      background: EVENT_CONFIG[dayEvents[0].type].bg,
                      color: EVENT_CONFIG[dayEvents[0].type].color,
                    }}
                  >
                    {dayEvents[0].title}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   DAY DETAIL PANEL (Section 2)
   ══════════════════════════════════════════════ */

function DayDetailPanel({ dateKey, events }: { dateKey: string; events: ScheduleEvent[] }) {
  const date = new Date(dateKey + 'T00:00:00')
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="font-space font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            {dateStr}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <CalIcon size={18} style={{ color: 'var(--text-muted)' }} />
      </div>

      <div className="p-4">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <CalIcon size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No events on this day</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map(ev => {
              const cfg = EVENT_CONFIG[ev.type]
              const pc = PLATFORM_CONFIG[ev.platform]
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 p-3 rounded-lg transition-all duration-100 group"
                  style={{ background: `${cfg.bg}`, borderLeft: `3px solid ${cfg.color}` }}
                >
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span className="text-[10px] font-mono-data" style={{ color: 'var(--text-secondary)' }}>
                      {ev.time}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {ev.title}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: `${pc.color}18`, color: pc.color }}
                      >
                        {ev.platform}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {ev.description}
                    </p>
                    {ev.notes && (
                      <p className="text-[10px] mt-1 font-medium" style={{ color: cfg.color }}>
                        {ev.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded transition-colors hover:bg-white/10" style={{ color: 'var(--text-tertiary)' }}>
                      <Eye size={12} />
                    </button>
                    <button className="p-1 rounded transition-colors hover:bg-white/10" style={{ color: 'var(--text-tertiary)' }}>
                      <Edit3 size={12} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   AI SUGGESTIONS PANEL (Section 5)
   ══════════════════════════════════════════════ */

function AISuggestionsPanel({ suggestions }: { suggestions: AISuggestion[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <Brain size={16} style={{ color: '#8B5CF6' }} />
        <h2 className="font-space font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          AI-Suggested Schedule
        </h2>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}
        >
          AI
        </span>
      </div>

      <div className="p-4 space-y-3">
        {suggestions.map(sugg => {
          const typeIcon =
            sugg.type === 'launch'   ? <Rocket size={12} />
            : sugg.type === 'timing' ? <Clock size={12} />
            : sugg.type === 'budget' ? <TrendingUp size={12} />
            : <Megaphone size={12} />

          return (
            <motion.div
              key={sugg.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(139,92,246,0.12)' }}
              >
                <span style={{ color: '#8B5CF6' }}>{typeIcon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {sugg.title}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}
                  >
                    {sugg.confidence}% match
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {sugg.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all hover:opacity-80"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}
                  >
                    <Zap size={10} /> Apply
                  </button>
                  <button
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all hover:opacity-80"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   CREATE EVENT MODAL (Section 4)
   ══════════════════════════════════════════════ */

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const [eventType, setEventType] = useState<ScheduleEventType>('launch')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('09:00')
  const [platform, setPlatform] = useState<Platform>('Meta')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  const eventTypes: { key: ScheduleEventType; label: string }[] = [
    { key: 'launch',        label: 'Campaign Launch' },
    { key: 'report',        label: 'Scheduled Report' },
    { key: 'optimization',  label: 'AI Optimization' },
    { key: 'alert',         label: 'Budget Alert' },
    { key: 'draft',         label: 'Draft Deadline' },
  ]

  const platforms: Platform[] = ['Meta', 'Google', 'TikTok', 'Snapchat', 'LinkedIn', 'All']

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />

      <motion.div
        className="relative z-10 w-full max-w-lg rounded-xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="absolute top-0 left-0 right-0 h-[60px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Plus size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="font-space font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                Create New Event
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-white/5">
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {/* Event Type */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Event Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map(et => {
                const cfg = EVENT_CONFIG[et.key]
                const isActive = eventType === et.key
                return (
                  <button
                    key={et.key}
                    onClick={() => setEventType(et.key)}
                    className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-all"
                    style={{
                      borderColor: isActive ? cfg.color : 'var(--border-subtle)',
                      background: isActive ? cfg.bg : 'var(--bg-secondary)',
                      color: isActive ? cfg.color : 'var(--text-secondary)',
                    }}
                  >
                    <span>{cfg.icon}</span>
                    {et.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Summer Sale Campaign Launch"
              className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
            />
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  colorScheme: 'dark',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  colorScheme: 'dark',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
              />
            </div>
          </div>

          {/* Platform */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {platforms.map(p => {
                const pc = PLATFORM_CONFIG[p]
                const isActive = platform === p
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                    style={{
                      background: isActive ? `${pc.color}18` : 'var(--bg-secondary)',
                      color: isActive ? pc.color : 'var(--text-secondary)',
                      border: `1px solid ${isActive ? `${pc.color}40` : 'var(--border-subtle)'}`,
                    }}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this event..."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all resize-none"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
            />
          </div>

          {/* Notes */}
          <div className="mb-5">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Notes <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes, budget info, etc."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all resize-none"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Create Event
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
