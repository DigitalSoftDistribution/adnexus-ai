// @ts-nocheck
import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/SEO';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalIcon,
  Clock,
  FileText,
  DollarSign,
  X,
  Plus,
  Eye,
  Edit3,
  Trash2,
  LayoutGrid,
  Columns3,
  CalendarDays,
  List,
  Filter,
  Target,
  Megaphone,
  PenTool,
  BarChart3,
} from 'lucide-react'

/* ─────────────────────── types ─────────────────────── */

type ViewMode = 'month' | 'week' | 'day' | 'agenda'
type Platform = 'Meta' | 'Google' | 'TikTok' | 'Snap' | 'Drafts' | 'AI Agent' | 'Report' | 'Custom'
type EventStatus = 'Active' | 'Running' | 'Scheduled' | 'Ended' | 'Draft' | 'Generated' | 'Due'
type EventType = 'campaign' | 'draft' | 'report' | 'goal'

interface CalendarEvent {
  id: string
  title: string
  platform: Platform
  status: EventStatus
  type: EventType
  startDate: string // YYYY-MM-DD
  endDate?: string
  budget?: string
  time?: string
  notes?: string
}

/* ─────────────────────── mock data ─────────────────────── */

const MOCK_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Summer Sale', platform: 'Meta', status: 'Active', type: 'campaign', startDate: '2026-05-01', endDate: '2026-05-31', budget: '$500/day' },
  { id: '2', title: 'Search Brand', platform: 'Google', status: 'Active', type: 'campaign', startDate: '2026-05-01', endDate: '2026-05-31', budget: '$400/day' },
  { id: '3', title: 'FYP Viral', platform: 'TikTok', status: 'Active', type: 'campaign', startDate: '2026-05-05', endDate: '2026-05-31', budget: '$300/day' },
  { id: '4', title: 'Story Ads Promo', platform: 'Snap', status: 'Ended', type: 'campaign', startDate: '2026-05-10', endDate: '2026-05-20' },
  { id: '5', title: 'Lookalike Test', platform: 'Google', status: 'Active', type: 'campaign', startDate: '2026-05-12', endDate: '2026-05-26' },
  { id: '6', title: 'Budget reallocation', platform: 'AI Agent', status: 'Draft', type: 'draft', startDate: '2026-05-15', notes: 'AI drafted budget reallocation across campaigns' },
  { id: '7', title: 'Video Hook A/B Test', platform: 'Meta', status: 'Running', type: 'campaign', startDate: '2026-05-18', endDate: '2026-05-25', budget: '$200/day' },
  { id: '8', title: 'Pause Display Remarketing', platform: 'AI Agent', status: 'Draft', type: 'draft', startDate: '2026-05-20', notes: 'AI suggested pausing underperforming campaign' },
  { id: '9', title: 'Weekly Performance Report', platform: 'Report', status: 'Due', type: 'report', startDate: '2026-05-22', time: '17:00' },
  { id: '10', title: 'Creative refresh deadline', platform: 'Custom', status: 'Due', type: 'goal', startDate: '2026-05-25', time: '23:59' },
  { id: '11', title: 'Morning Brief', platform: 'AI Agent', status: 'Generated', type: 'report', startDate: '2026-05-28', time: '08:00' },
  { id: '12', title: 'In-Feed vs TopView Test', platform: 'TikTok', status: 'Scheduled', type: 'campaign', startDate: '2026-06-01', endDate: '2026-06-14', budget: '$350/day' },
  { id: '13', title: 'Monthly report', platform: 'Report', status: 'Scheduled', type: 'report', startDate: '2026-06-01', time: '09:00' },
  { id: '14', title: 'ROAS Goal Check', platform: 'Custom', status: 'Scheduled', type: 'goal', startDate: '2026-05-30' },
]

/* ─────────────────────── type-based colors ─────────────────────── */

const TYPE_COLORS: Record<EventType, { bg: string; text: string; dot: string; border: string }> = {
  campaign: { bg: 'rgba(59,130,246,0.12)',  text: '#3B82F6', dot: '#3B82F6', border: '#3B82F640' },
  draft:    { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B', dot: '#F59E0B', border: '#F59E0B40' },
  report:   { bg: 'rgba(139,92,246,0.12)',  text: '#8B5CF6', dot: '#8B5CF6', border: '#8B5CF640' },
  goal:     { bg: 'rgba(16,185,129,0.12)',  text: '#10B981', dot: '#10B981', border: '#10B98140' },
}

const PLATFORM_COLORS: Record<Platform, { bg: string; text: string; dot: string }> = {
  Meta:       { bg: 'rgba(24,119,242,0.12)', text: '#1877F2', dot: '#1877F2' },
  Google:     { bg: 'rgba(219,68,55,0.12)',  text: '#DB4437', dot: '#DB4437' },
  TikTok:     { bg: 'rgba(0,242,234,0.12)',  text: '#00C8C0', dot: '#00C8C0' },
  Snap:       { bg: 'rgba(255,200,0,0.12)',  text: '#C8A000', dot: '#C8A000' },
  Drafts:     { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6', dot: '#8B5CF6' },
  'AI Agent': { bg: 'rgba(16,185,129,0.12)', text: '#10B981', dot: '#10B981' },
  Report:     { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6', dot: '#8B5CF6' },
  Custom:     { bg: 'rgba(138,143,152,0.12)', text: '#8A8F98', dot: '#8A8F98' },
}

const PLATFORM_ORDER: Platform[] = ['Meta', 'Google', 'TikTok', 'Snap', 'Drafts', 'AI Agent', 'Report', 'Custom']

const TYPE_ICONS: Record<EventType, React.ReactNode> = {
  campaign: <Megaphone size={10} />,
  draft:    <PenTool size={10} />,
  report:   <BarChart3 size={10} />,
  goal:     <Target size={10} />,
}

/* ─────────────────────── helpers ─────────────────────── */

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

function parseDateKey(key: string): Date {
  return new Date(key + 'T00:00:00')
}

function isWithinRange(dateKey: string, start: string, end?: string): boolean {
  const d = parseDateKey(dateKey).getTime()
  const s = parseDateKey(start).getTime()
  const e = end ? parseDateKey(end).getTime() : s
  return d >= s && d <= e
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day).getDay()
  return d === 0 || d === 6
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

/* ─────────────────────── component ─────────────────────── */

export default function CampaignCalendar() {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(4) // May 2026 (0-indexed)
  const [view, setView] = useState<ViewMode>('month')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showNewEventModal, setShowNewEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [eventDetailPos, setEventDetailPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Type filters
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set(['campaign', 'draft', 'report', 'goal']))
  const [activePlatforms, setActivePlatforms] = useState<Set<Platform>>(new Set(PLATFORM_ORDER))

  const toggleType = useCallback((t: EventType) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }, [])

  const togglePlatform = useCallback((p: Platform) => {
    setActivePlatforms(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }, [])

  const filteredEvents = useMemo(
    () => MOCK_EVENTS.filter(e => activeTypes.has(e.type) && activePlatforms.has(e.platform)),
    [activeTypes, activePlatforms]
  )

  // Navigation
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
  }, [])

  useEffect(() => {
    setSelectedDay(null)
  }, [year, month, view])

  const selectedDateKey = selectedDay ? toDateKey(year, month, selectedDay) : toDateKey(year, month, 15)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev()
      if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToPrev, goToNext])

  const handleEventClick = (ev: CalendarEvent, clientX: number, clientY: number) => {
    const x = Math.min(clientX, window.innerWidth - 340)
    const y = Math.min(clientY, window.innerHeight - 300)
    setEventDetailPos({ x, y })
    setSelectedEvent(ev)
  }

  const upcomingEvents = useMemo(() => {
    const base = selectedDay ? parseDateKey(toDateKey(year, month, selectedDay)) : new Date()
    const startT = base.getTime()
    const endT = startT + 7 * 86400000
    return MOCK_EVENTS.filter(e => {
      const t = parseDateKey(e.startDate).getTime()
      return t >= startT && t <= endT
    }).sort((a, b) => parseDateKey(a.startDate).getTime() - parseDateKey(b.startDate).getTime())
  }, [year, month, selectedDay])

  /* ─────────────── render ─────────────── */
  return (
    <>
    <SEO
      title="Campaign Calendar"
      description="Visualize your campaign timeline, schedule launches, plan content, and coordinate team activities with the campaign calendar."
      keywords="campaign calendar, content calendar, schedule, timeline, campaign planning"
    />
    <div className="min-h-[100dvh] p-6 lg:p-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-space font-semibold text-2xl lg:text-3xl" style={{ color: 'var(--text-primary)' }}>
              Campaign Calendar
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Plan and visualize campaign timelines across platforms
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Add Event Button */}
            <button
              onClick={() => { setSelectedDay(new Date().getDate()); setShowNewEventModal(true) }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Plus size={14} /> Add Event
            </button>

            {/* View switcher */}
            <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              {([
                ['month', LayoutGrid, 'Month'],
                ['week', Columns3, 'Week'],
                ['day', CalendarDays, 'Day'],
                ['agenda', List, 'Agenda'],
              ] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                  style={{
                    background: view === v ? 'var(--accent)' : 'transparent',
                    color: view === v ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Today button */}
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              Today
            </button>

            {/* Prev / Next */}
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
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex gap-6">
          {/* Calendar area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {view === 'month' && (
                <MonthView
                  key="month"
                  year={year}
                  month={month}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                  onCellClick={(day) => { setSelectedDay(day); setShowNewEventModal(true) }}
                />
              )}
              {view === 'week' && (
                <WeekView key="week" year={year} month={month} events={filteredEvents} onEventClick={handleEventClick} />
              )}
              {view === 'day' && (
                <DayView
                  key="day"
                  dateKey={selectedDateKey}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                />
              )}
              {view === 'agenda' && (
                <AgendaView key="agenda" year={year} month={month} events={filteredEvents} onEventClick={handleEventClick} />
              )}
            </AnimatePresence>
          </div>

          {/* ===== RIGHT SIDEBAR ===== */}
          <aside className="hidden xl:block w-72 shrink-0 space-y-5">
            {/* Add Event CTA */}
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => { setSelectedDay(new Date().getDate()); setShowNewEventModal(true) }}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                <Plus size={14} /> Add New Event
              </button>
            </div>

            {/* Upcoming events */}
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h3 className="font-space font-medium text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                Upcoming (7 Days)
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No upcoming events</p>
              ) : (
                <div className="space-y-2.5">
                  {upcomingEvents.slice(0, 6).map(ev => (
                    <button
                      key={ev.id}
                      onClick={(e) => handleEventClick(ev, e.clientX, e.clientY)}
                      className="w-full text-left flex items-start gap-2 p-2 rounded-lg transition-colors duration-100"
                      style={{ background: 'transparent' }}
                      onMouseEnter={el => { el.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={el => { el.currentTarget.style.background = 'transparent' }}
                    >
                      <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: TYPE_COLORS[ev.type].dot }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          {ev.startDate} {ev.platform !== 'Custom' && `· ${ev.platform}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type filters */}
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Filter size={13} style={{ color: 'var(--text-secondary)' }} />
                <h3 className="font-space font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Event Types</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['campaign', 'draft', 'report', 'goal'] as EventType[]).map(t => {
                  const active = activeTypes.has(t)
                  const c = TYPE_COLORS[t]
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 capitalize"
                      style={{
                        background: active ? c.bg : 'transparent',
                        color: active ? c.text : 'var(--text-tertiary)',
                        border: `1px solid ${active ? c.border : 'var(--border-subtle)'}`,
                        opacity: active ? 1 : 0.6,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Platform filters */}
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Filter size={13} style={{ color: 'var(--text-secondary)' }} />
                <h3 className="font-space font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Platforms</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_ORDER.map(p => {
                  const active = activePlatforms.has(p)
                  const c = PLATFORM_COLORS[p]
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150"
                      style={{
                        background: active ? c.bg : 'transparent',
                        color: active ? c.text : 'var(--text-tertiary)',
                        border: `1px solid ${active ? c.dot + '40' : 'var(--border-subtle)'}`,
                        opacity: active ? 1 : 0.6,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h3 className="font-space font-medium text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Legend</h3>
              <div className="space-y-2">
                {[
                  ['Campaign', '#3B82F6', 'Active/Running campaigns'],
                  ['Draft', '#F59E0B', 'Pending approval drafts'],
                  ['Report', '#8B5CF6', 'Scheduled/generated reports'],
                  ['Goal', '#10B981', 'Deadlines and milestones'],
                  ['Ended', '#EF4444', 'Completed or stopped'],
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
            </div>
          </aside>
        </div>
      </div>

      {/* ===== NEW EVENT MODAL ===== */}
      <AnimatePresence>
        {showNewEventModal && (
          <NewEventModal
            dateKey={selectedDay ? toDateKey(year, month, selectedDay) : toDateKey(year, month, 1)}
            onClose={() => setShowNewEventModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ===== EVENT DETAIL POPOVER ===== */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailPopover
            event={selectedEvent}
            position={eventDetailPos}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
    </>
  )
}

/* ══════════════════════════════════════════════
   MONTH VIEW
   ══════════════════════════════════════════════ */

function MonthView({
  year,
  month,
  events,
  onEventClick,
  onCellClick,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  onEventClick: (ev: CalendarEvent, x: number, y: number) => void
  onCellClick: (day: number) => void
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
    return events.filter(e => isWithinRange(key, e.startDate, e.endDate))
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
    >
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7" style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
        {cells.map((cell, idx) => {
          const dayEvents = getEventsForDay(cell.day, cell.isCurrentMonth)
          return (
            <div
              key={idx}
              onClick={() => cell.isCurrentMonth && onCellClick(cell.day)}
              className="relative min-h-[110px] p-1.5 transition-colors duration-100 cursor-pointer"
              style={{
                background: cell.isToday
                  ? 'rgba(37,99,235,0.05)'
                  : cell.isWeekend
                    ? 'rgba(255,255,255,0.015)'
                    : 'transparent',
                borderRight: (idx % 7 !== 6) ? '1px solid var(--border-subtle)' : 'none',
                borderBottom: (idx < 35) ? '1px solid var(--border-subtle)' : 'none',
              }}
              onMouseEnter={e => { if (cell.isCurrentMonth) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => {
                if (cell.isToday) e.currentTarget.style.background = 'rgba(37,99,235,0.05)'
                else if (cell.isWeekend) e.currentTarget.style.background = 'rgba(255,255,255,0.015)'
                else e.currentTarget.style.background = 'transparent'
              }}
            >
              <div className="flex justify-end mb-1">
                <span
                  className="flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full"
                  style={{
                    color: cell.isToday ? '#fff' : cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    background: cell.isToday ? 'var(--accent)' : 'transparent',
                    opacity: cell.isCurrentMonth ? 1 : 0.4,
                  }}
                >
                  {cell.day}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <EventPill key={ev.id} event={ev} onClick={(e) => { e.stopPropagation(); onEventClick(ev, e.clientX, e.clientY) }} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] px-1" style={{ color: 'var(--text-tertiary)' }}>
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   EVENT PILL — Color-coded by TYPE
   ══════════════════════════════════════════════ */

function EventPill({ event: ev, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const colors = TYPE_COLORS[ev.type]

  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition-all duration-150 hover:translate-y-[-1px] hover:shadow-sm"
      style={{
        background: colors.bg,
        color: colors.text,
        borderLeft: `2px solid ${colors.dot}`,
      }}
      title={`${ev.title} · ${ev.platform} · ${ev.status}${ev.budget ? ` · ${ev.budget}` : ''}`}
    >
      <span style={{ opacity: 0.7 }}>{TYPE_ICONS[ev.type]}</span>
      <span className="truncate">{ev.title}</span>
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto"
        style={{
          background: ev.status === 'Active' || ev.status === 'Running' ? '#10B981'
            : ev.status === 'Ended' ? '#EF4444'
              : ev.status === 'Scheduled' ? '#F59E0B'
                : ev.status === 'Draft' ? '#8B5CF6'
                  : '#3B82F6'
        }}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════
   WEEK VIEW
   ══════════════════════════════════════════════ */

function WeekView({
  year,
  month,
  events,
  onEventClick,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  onEventClick: (ev: CalendarEvent, x: number, y: number) => void
}) {
  const weekStart = getFirstDayOfMonth(year, month)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const day = 1 - weekStart + i
    return day > 0 ? day : null
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="grid grid-cols-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="p-3 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>GMT-5</div>
        {DAY_NAMES.map((d, i) => (
          <div key={d} className="p-3 text-center text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            <div style={{ color: 'var(--text-tertiary)' }}>{d}</div>
            <div className="text-lg font-semibold mt-0.5">{weekDates[i] ?? '-'}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-8" style={{ height: '600px', overflowY: 'auto' }}>
        <div className="border-r" style={{ borderColor: 'var(--border-subtle)' }}>
          {HOURS.map(h => (
            <div key={h} className="h-12 px-2 flex items-start justify-end" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-[10px] -mt-2" style={{ color: 'var(--text-tertiary)' }}>
                {h <= 12 ? `${h} AM` : `${h - 12} PM`}
              </span>
            </div>
          ))}
        </div>

        {DAY_NAMES.map((_, colIdx) => {
          const day = weekDates[colIdx]
          const dayEvents = day ? events.filter(e => isWithinRange(toDateKey(year, month, day), e.startDate, e.endDate)) : []
          return (
            <div key={colIdx} className="relative border-r" style={{ borderColor: 'var(--border-subtle)' }}>
              {HOURS.map(h => (
                <div key={h} className="h-12" style={{ borderBottom: '1px solid var(--border-subtle)' }} />
              ))}
              {dayEvents.map(ev => {
                const tc = TYPE_COLORS[ev.type]
                return (
                  <div
                    key={ev.id}
                    onClick={(e) => onEventClick(ev, e.clientX, e.clientY)}
                    className="absolute left-0.5 right-0.5 rounded px-1.5 py-1 text-[10px] font-medium cursor-pointer truncate hover:translate-y-[-1px] transition-transform"
                    style={{
                      background: tc.bg,
                      color: tc.text,
                      borderLeft: `2px solid ${tc.dot}`,
                      top: `${(dayEvents.indexOf(ev) * 28) + 4}px`,
                      zIndex: 2,
                    }}
                  >
                    <span className="flex items-center gap-0.5">
                      <span style={{ opacity: 0.7 }}>{TYPE_ICONS[ev.type]}</span>
                      {ev.title}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   DAY VIEW
   ══════════════════════════════════════════════ */

function DayView({
  dateKey,
  events,
  onEventClick,
}: {
  dateKey: string
  events: CalendarEvent[]
  onEventClick: (ev: CalendarEvent, x: number, y: number) => void
}) {
  const dayEvents = events.filter(e => isWithinRange(dateKey, e.startDate, e.endDate))
  const date = parseDateKey(dateKey)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="font-space font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Day events list */}
      <div className="p-4 space-y-2" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {dayEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalIcon size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No events on this day</p>
          </div>
        ) : (
          dayEvents.map(ev => {
            const tc = TYPE_COLORS[ev.type]
            const pc = PLATFORM_COLORS[ev.platform]
            return (
              <div
                key={ev.id}
                onClick={(e) => onEventClick(ev, e.clientX, e.clientY)}
                className="rounded-lg p-3 cursor-pointer transition-all hover:translate-y-[-1px]"
                style={{ background: tc.bg, borderLeft: `3px solid ${tc.dot}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: tc.text }}>{ev.title}</span>
                  <StatusBadge status={ev.status} />
                  <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize" style={{ background: pc.bg, color: pc.text }}>
                    {ev.platform}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {ev.budget && <span className="text-[10px] font-mono-data" style={{ color: 'var(--text-secondary)' }}>{ev.budget}</span>}
                  {ev.time && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      <Clock size={9} />{ev.time}
                    </span>
                  )}
                </div>
                {ev.notes && <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>{ev.notes}</p>}
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   AGENDA VIEW
   ══════════════════════════════════════════════ */

function AgendaView({
  year,
  month,
  events,
  onEventClick,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  onEventClick: (ev: CalendarEvent, x: number, y: number) => void
}) {
  const daysInMonth = getDaysInMonth(year, month)

  const grouped: { date: string; dayNum: number; events: CalendarEvent[] }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const key = toDateKey(year, month, d)
    const dayEvents = events.filter(e => isWithinRange(key, e.startDate, e.endDate))
    if (dayEvents.length > 0) grouped.push({ date: key, dayNum: d, events: dayEvents })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="font-space font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          {formatMonthYear(year, month)} — Agenda
        </h2>
      </div>

      <div>
        {grouped.length === 0 ? (
          <div className="p-8 text-center">
            <CalIcon size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No events this month</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date} className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="w-20 shrink-0 p-4 text-center" style={{ borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                <div className="font-space font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                  {group.dayNum}
                </div>
                <div className="text-[10px] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(group.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              </div>

              <div className="flex-1 p-3 space-y-2">
                {group.events.map(ev => {
                  const tc = TYPE_COLORS[ev.type]
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => onEventClick(ev, e.clientX, e.clientY)}
                      className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors duration-100"
                      style={{ background: 'transparent' }}
                      onMouseEnter={el => { el.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={el => { el.currentTarget.style.background = 'transparent' }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tc.dot }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</span>
                          <StatusBadge status={ev.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] font-medium capitalize" style={{ color: tc.text }}>{ev.type}</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{ev.platform}</span>
                          {ev.budget && <span className="text-[11px] font-mono-data" style={{ color: 'var(--text-secondary)' }}>{ev.budget}</span>}
                          {ev.time && (
                            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                              <Clock size={10} />{ev.time}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   STATUS BADGE
   ══════════════════════════════════════════════ */

function StatusBadge({ status }: { status: EventStatus }) {
  const color =
    status === 'Active' || status === 'Running' ? 'rgba(16,185,129,0.15)'
      : status === 'Ended' ? 'rgba(239,68,68,0.15)'
        : status === 'Scheduled' ? 'rgba(245,158,11,0.15)'
          : status === 'Draft' ? 'rgba(139,92,246,0.15)'
            : 'rgba(59,130,246,0.15)'
  const text =
    status === 'Active' || status === 'Running' ? '#10B981'
      : status === 'Ended' ? '#EF4444'
        : status === 'Scheduled' ? '#F59E0B'
          : status === 'Draft' ? '#8B5CF6'
            : '#3B82F6'

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: color, color: text }}>
      <span className="w-1 h-1 rounded-full" style={{ background: text }} />
      {status}
    </span>
  )
}

/* ══════════════════════════════════════════════
   NEW EVENT MODAL
   ══════════════════════════════════════════════ */

function NewEventModal({ dateKey, onClose }: { dateKey: string; onClose: () => void }) {
  const [type, setType] = useState<EventType>('campaign')
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState<Platform>('Meta')
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')

  const eventTypes: { label: string; value: EventType; color: string }[] = [
    { label: 'Campaign', value: 'campaign', color: '#3B82F6' },
    { label: 'Draft', value: 'draft', color: '#F59E0B' },
    { label: 'Report', value: 'report', color: '#8B5CF6' },
    { label: 'Goal', value: 'goal', color: '#10B981' },
  ]
  const platforms: Platform[] = ['Meta', 'Google', 'TikTok', 'Snap', 'AI Agent', 'Report', 'Custom']

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
        className="relative z-10 w-full max-w-md rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
      >
        <div className="absolute top-0 left-0 right-0 h-[60px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Plus size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="font-space font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>New Calendar Event</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-white/5">
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <CalIcon size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {parseDateKey(dateKey).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Event type */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Event Type</label>
            <div className="grid grid-cols-2 gap-2">
              {eventTypes.map(et => (
                <button
                  key={et.value}
                  onClick={() => setType(et.value)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all"
                  style={{
                    borderColor: type === et.value ? et.color : 'var(--border-subtle)',
                    background: type === et.value ? `${et.color}15` : 'var(--bg-secondary)',
                    color: type === et.value ? et.color : 'var(--text-secondary)',
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: et.color }} />
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>

          {/* Platform */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Platform</label>
            <div className="flex flex-wrap gap-2">
              {platforms.map(p => {
                const pc = PLATFORM_COLORS[p]
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150"
                    style={{
                      background: platform === p ? pc.bg : 'var(--bg-secondary)',
                      color: platform === p ? pc.text : 'var(--text-tertiary)',
                      border: `1px solid ${platform === p ? pc.dot + '40' : 'var(--border-subtle)'}`,
                    }}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Time</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>

          {/* Notes */}
          <div className="mb-5">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Save to Calendar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   EVENT DETAIL POPOVER
   ══════════════════════════════════════════════ */

function EventDetailPopover({
  event: ev,
  position,
  onClose,
}: {
  event: CalendarEvent
  position: { x: number; y: number }
  onClose: () => void
}) {
  const tc = TYPE_COLORS[ev.type]
  const pc = PLATFORM_COLORS[ev.platform]

  return (
    <motion.div
      className="fixed z-50 w-80 rounded-xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
    >
      <div className="absolute top-0 left-0 right-0 h-[60px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 p-1 rounded-md transition-colors hover:bg-white/5"
      >
        <X size={14} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      <div className="p-4 relative">
        {/* Type badge */}
        <div className="flex items-center gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: tc.bg, color: tc.text }}>
            <span style={{ opacity: 0.7 }}>{TYPE_ICONS[ev.type]}</span>
            <span className="capitalize">{ev.type}</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: pc.bg, color: pc.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: pc.dot }} />
            {ev.platform}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-space font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{ev.title}</h3>
        <div className="mb-3"><StatusBadge status={ev.status} /></div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {ev.startDate}{ev.endDate ? ` — ${ev.endDate}` : ''}
            </span>
          </div>
          {ev.budget && (
            <div className="flex items-center gap-2">
              <DollarSign size={12} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs font-mono-data" style={{ color: 'var(--text-secondary)' }}>{ev.budget}</span>
            </div>
          )}
          {ev.time && (
            <div className="flex items-center gap-2">
              <CalIcon size={12} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ev.time}</span>
            </div>
          )}
          {ev.notes && (
            <div className="flex items-start gap-2">
              <FileText size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ev.notes}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            <Eye size={12} /> View
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            <Edit3 size={12} /> Edit
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
            <Trash2 size={12} /> Remove
          </button>
        </div>
      </div>
    </motion.div>
  )
}
