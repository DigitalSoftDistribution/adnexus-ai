import { useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CountUp from 'react-countup'
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts'
import {
  ChevronDown, Plus, CheckCircle, AlertTriangle, XCircle,
  ArrowUpRight, Eye, Activity, Users, Target, Zap,
  TrendingUp, BarChart3, DollarSign, PauseCircle,
  PlayCircle, X, Loader2, Globe, Hash,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/useToast'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DEMO MODE CHECK                                                   */
/* ------------------------------------------------------------------ */
const isDemoMode = (): boolean => {
  return !import.meta.env.VITE_API_URL || import.meta.env.VITE_DEMO_MODE === 'true'
}

/* ------------------------------------------------------------------ */
/*  TYPES (mirrored from api.ts for standalone safety)                */
/* ------------------------------------------------------------------ */
interface AgencyClient {
  id: string
  name: string
  initials: string
  color: string
  status: 'active' | 'paused'
  plan: string
  spend: number
  roas: number
  campaigns: number
  drafts: number
  teamMembers: number
  platforms: ('meta' | 'google' | 'tiktok' | 'snap')[]
  sparkline: number[]
  createdAt: string
}

interface ClientActivity {
  id: string
  action: string
  target: string
  time: string
  type: 'ai' | 'budget' | 'draft' | 'alert' | 'success' | 'platform' | 'team'
}

/* ------------------------------------------------------------------ */
/*  MOCK CLIENT DATA (5 clients)                                      */
/* ------------------------------------------------------------------ */
const MOCK_AGENCY_CLIENTS: AgencyClient[] = [
  {
    id: 'client_1',
    name: 'Acme Corp',
    initials: 'AC',
    color: '#2563EB',
    status: 'active',
    plan: 'enterprise',
    spend: 48293,
    roas: 3.8,
    campaigns: 12,
    drafts: 2,
    teamMembers: 5,
    platforms: ['meta', 'google', 'tiktok'],
    sparkline: [42, 45, 43, 48, 50, 47, 52],
    createdAt: '2026-01-15',
  },
  {
    id: 'client_2',
    name: 'BrightShop',
    initials: 'BS',
    color: '#10B981',
    status: 'active',
    plan: 'growth',
    spend: 32100,
    roas: 4.1,
    campaigns: 8,
    drafts: 1,
    teamMembers: 3,
    platforms: ['meta', 'google'],
    sparkline: [38, 40, 39, 42, 41, 44, 43],
    createdAt: '2026-02-01',
  },
  {
    id: 'client_3',
    name: 'TechStart',
    initials: 'TS',
    color: '#F59E0B',
    status: 'active',
    plan: 'scale',
    spend: 28500,
    roas: 2.1,
    campaigns: 6,
    drafts: 4,
    teamMembers: 6,
    platforms: ['meta', 'google', 'tiktok', 'snap'],
    sparkline: [35, 32, 30, 28, 29, 27, 26],
    createdAt: '2026-01-20',
  },
  {
    id: 'client_4',
    name: 'GreenLife',
    initials: 'GL',
    color: '#059669',
    status: 'paused',
    plan: 'starter',
    spend: 19800,
    roas: 3.5,
    campaigns: 4,
    drafts: 1,
    teamMembers: 2,
    platforms: ['meta', 'tiktok'],
    sparkline: [22, 24, 23, 25, 26, 25, 27],
    createdAt: '2026-03-01',
  },
  {
    id: 'client_5',
    name: 'FitBrand',
    initials: 'FB',
    color: '#EF4444',
    status: 'active',
    plan: 'growth',
    spend: 15200,
    roas: 1.4,
    campaigns: 5,
    drafts: 0,
    teamMembers: 3,
    platforms: ['google', 'snap'],
    sparkline: [20, 18, 16, 15, 14, 13, 12],
    createdAt: '2026-02-10',
  },
]

/* ------------------------------------------------------------------ */
/*  MOCK ACTIVITY DATA                                                */
/* ------------------------------------------------------------------ */
const MOCK_ACTIVITIES: ClientActivity[] = [
  { id: 'a1', action: 'AI paused 3 underperforming ad sets in', target: 'FitBrand', time: '2 min ago', type: 'ai' },
  { id: 'a2', action: 'Budget increased by 25% for', target: 'Acme Corp — Summer Sale', time: '15 min ago', type: 'budget' },
  { id: 'a3', action: 'New campaign draft created for', target: 'TechStart', time: '32 min ago', type: 'draft' },
  { id: 'a4', action: 'Creative fatigue alert:', target: 'BrightShop — Brand Awareness', time: '1 hr ago', type: 'alert' },
  { id: 'a5', action: 'ROAS target exceeded for', target: 'GreenLife', time: '2 hr ago', type: 'success' },
  { id: 'a6', action: 'Platform connected:', target: 'Snap Ads — TechStart', time: '3 hr ago', type: 'platform' },
  { id: 'a7', action: 'Team member added to', target: 'Acme Corp', time: '4 hr ago', type: 'team' },
  { id: 'a8', action: 'AI auto-adjusted bids for', target: 'FitBrand', time: '5 hr ago', type: 'ai' },
]

/* ------------------------------------------------------------------ */
/*  DESIGN CONSTANTS                                                  */
/* ------------------------------------------------------------------ */
const C = {
  accent: '#2563EB',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  statusInfo: '#06B6D4',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: C.metaBlue,
  google: C.googleRed,
  tiktok: C.tiktokCyan,
  snap: C.snapYellow,
}

const PLATFORM_NAMES: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  tiktok: 'TikTok',
  snap: 'Snap',
}

/* ------------------------------------------------------------------ */
/*  STATUS BADGE                                                      */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: AgencyClient['status'] }) {
  const config = {
    active: { color: C.statusActive, icon: <CheckCircle size={12} />, label: 'Active' },
    paused: { color: '#6B7280', icon: <PauseCircle size={12} />, label: 'Paused' },
  }
  const c = config[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: `${c.color}15`, color: c.color }}
    >
      {c.icon}
      {c.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  MINI SPARKLINE                                                    */
/* ------------------------------------------------------------------ */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i: String(i), v }))
  return (
    <div className="w-[80px] h-[32px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${color.replace('#', '')})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  KPI CARD                                                          */
/* ------------------------------------------------------------------ */
function KPICard({ label, value, prefix, suffix, sparklineData, icon, trend }: {
  label: string
  value: number
  prefix?: string
  suffix?: string
  sparklineData?: { day: string; value: number }[]
  icon: ReactNode
  trend?: { value: number; positive: boolean }
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="card-surface p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="font-mono-data text-[28px] font-bold leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {prefix}<CountUp end={value} duration={0.8} separator="," suffix={suffix || ''} />
        </span>
        {trend && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full mb-1"
            style={{ background: trend.positive ? `${C.statusActive}15` : `${C.statusError}15`, color: trend.positive ? C.statusActive : C.statusError }}
          >
            {trend.positive ? <ArrowUpRight size={10} /> : <TrendingUp size={10} />}
            {trend.value}%
          </span>
        )}
      </div>
      {sparklineData && (
        <div className="h-[40px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id="kpiSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={C.accent} strokeWidth={2} fill="url(#kpiSpark)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  KPI CARD SKELETON                                                 */
/* ------------------------------------------------------------------ */
function KPICardSkeleton() {
  return (
    <div className="card-surface p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-[40px] w-full" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CLIENT CARD                                                       */
/* ------------------------------------------------------------------ */
function ClientCard({ client, index, onToggleStatus }: { client: AgencyClient; index: number; onToggleStatus: (id: string) => void }) {
  const navigate = useNavigate()
  const sparkColor = client.status === 'active' ? C.statusActive : '#6B7280'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      whileHover={{ y: -2, borderColor: 'var(--border-active)' }}
      className="bg-[#111111] p-4 flex flex-col gap-3 transition-all duration-200"
      style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: client.color }}
          >
            {client.initials}
          </span>
          <div>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{client.name}</h4>
            <StatusBadge status={client.status} />
          </div>
        </div>
        <MiniSparkline data={client.sparkline} color={sparkColor} />
      </div>

      {/* Platform Icons */}
      <div className="flex items-center gap-1.5">
        {client.platforms.map((p) => (
          <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: `${PLATFORM_COLORS[p]}15`, color: PLATFORM_COLORS[p] }}
          >
            <Globe size={10} />
            {PLATFORM_NAMES[p]}
          </span>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Spend</span>
          <span className="font-mono-data text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            ${client.spend.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>ROAS</span>
          <span className="font-mono-data text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {client.roas}x
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Campaigns</span>
          <span className="font-mono-data text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {client.campaigns}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Team</span>
          <span className="font-mono-data text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {client.teamMembers}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => navigate(`/dashboard?client=${client.id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150"
          style={{ background: 'var(--bg-secondary)', color: 'var(--accent)', border: '1px solid var(--border-subtle)' }}
        >
          <Eye size={12} />
          View
        </button>
        <button
          onClick={() => onToggleStatus(client.id)}
          className="flex items-center justify-center p-1.5 rounded-lg transition-all duration-150"
          style={{ background: 'var(--bg-secondary)', color: client.status === 'active' ? '#6B7280' : C.statusActive, border: '1px solid var(--border-subtle)' }}
          title={client.status === 'active' ? 'Pause client' : 'Activate client'}
        >
          {client.status === 'active' ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
        </button>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  CLIENT CARD SKELETON                                              */
/* ------------------------------------------------------------------ */
function ClientCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="bg-[#111111] p-4 flex flex-col gap-3"
      style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-14 rounded-full" />
          </div>
        </div>
        <Skeleton className="w-[80px] h-[32px]" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-4 w-14 rounded" />
        <Skeleton className="h-4 w-14 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-auto pt-2">
        <Skeleton className="h-6 flex-1 rounded-lg" />
        <Skeleton className="h-6 w-7 rounded-lg" />
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  ACTIVITY ITEM                                                     */
/* ------------------------------------------------------------------ */
function ActivityItem({ activity }: { activity: ClientActivity }) {
  const iconMap: Record<ClientActivity['type'], ReactNode> = {
    ai: <Zap size={14} style={{ color: C.accent }} />,
    budget: <DollarSign size={14} style={{ color: C.statusActive }} />,
    draft: <Target size={14} style={{ color: C.statusInfo }} />,
    alert: <AlertTriangle size={14} style={{ color: C.statusWarning }} />,
    success: <CheckCircle size={14} style={{ color: C.statusActive }} />,
    platform: <Globe size={14} style={{ color: C.tiktokCyan }} />,
    team: <Users size={14} style={{ color: C.statusInfo }} />,
  }
  const typeColors: Record<ClientActivity['type'], string> = {
    ai: `${C.accent}15`,
    budget: `${C.statusActive}15`,
    draft: `${C.statusInfo}15`,
    alert: `${C.statusWarning}15`,
    success: `${C.statusActive}15`,
    platform: `${C.tiktokCyan}15`,
    team: `${C.statusInfo}15`,
  }

  return (
    <div className="flex items-center gap-3 py-3 group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: typeColors[activity.type] }}
      >
        {iconMap[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
          {activity.action}{' '}
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>{activity.target}</span>
        </p>
        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{activity.time}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ADD CLIENT MODAL                                                  */
/* ------------------------------------------------------------------ */
function AddClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('starter')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const plans = [
    { key: 'free', label: 'Free', desc: 'Up to 2 campaigns' },
    { key: 'starter', label: 'Starter', desc: 'Up to 10 campaigns' },
    { key: 'growth', label: 'Growth', desc: 'Up to 50 campaigns' },
    { key: 'scale', label: 'Scale', desc: 'Up to 200 campaigns' },
    { key: 'enterprise', label: 'Enterprise', desc: 'Unlimited' },
  ]

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Client name is required', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      if (isDemoMode()) {
        // Simulate creation in demo mode
        await new Promise((r) => setTimeout(r, 500))
        toast('success', 'Client created', `${name} has been added to your agency.`)
        onCreated()
        onClose()
      } else {
        // Attempt API call with fallback
        let apiModule
        try {
          apiModule = await import('@/lib/api')
        } catch {
          // Module not available, use local mock
        }
        if (apiModule?.clientsApi?.create) {
          await apiModule.clientsApi.create({ name: name.trim(), plan })
        }
        toast('success', 'Client created', `${name} has been added to your agency.`)
        onCreated()
        onClose()
      }
    } catch {
      toast('error', 'Failed to create client', 'Please try again.')
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
        className="w-full max-w-md rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-base font-semibold font-space" style={{ color: 'var(--text-primary)' }}>Add Client</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Client Name */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Client Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none placeholder:text-[var(--text-muted)]"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Plan Selection */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Plan</label>
            <div className="flex flex-col gap-1.5">
              {plans.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlan(p.key)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] transition-all duration-150"
                  style={{
                    background: plan === p.key ? `${C.accent}15` : 'var(--bg-secondary)',
                    border: `1px solid ${plan === p.key ? `${C.accent}40` : 'var(--border-subtle)'}`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: `2px solid ${plan === p.key ? C.accent : 'var(--text-muted)'}` }}
                  >
                    {plan === p.key && <div className="w-2 h-2 rounded-full" style={{ background: C.accent }} />}
                  </div>
                  <div>
                    <span className="font-semibold">{p.label}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{p.desc}</span>
                  </div>
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
            disabled={loading || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 disabled:opacity-50"
            style={{ background: C.accent, color: 'white' }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Add Client
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                         */
/* ------------------------------------------------------------------ */
export default function Agency() {
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [activities, setActivities] = useState<ClientActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [clientsApiModule, setClientsApiModule] = useState<any>(null)
  const { toast } = useToast()

  /* ---- Load API module lazily ---- */
  useEffect(() => {
    let cancelled = false
    const loadApi = async () => {
      if (isDemoMode()) return // No need to load in demo mode
      try {
        const mod = await import('@/lib/api')
        if (!cancelled) setClientsApiModule(mod)
      } catch {
        // Module not available — will use local mock fallback
      }
    }
    loadApi()
    return () => { cancelled = true }
  }, [])

  /* ---- Fetch clients with demo fallback ---- */
  const fetchClients = async () => {
    try {
      if (isDemoMode()) {
        // Use local mock data directly in demo mode
        await new Promise((r) => setTimeout(r, 400))
        setClients([...MOCK_AGENCY_CLIENTS])
        return
      }

      // Try API module first
      if (clientsApiModule?.clientsApi?.list) {
        const data = await clientsApiModule.clientsApi.list()
        setClients(data)
      } else {
        // Fallback: try dynamic import
        const mod = await import('@/lib/api')
        if (mod.clientsApi?.list) {
          const data = await mod.clientsApi.list()
          setClients(data)
        } else {
          setClients([...MOCK_AGENCY_CLIENTS])
        }
      }
    } catch {
      toast({ title: 'Failed to load clients — showing demo data', variant: 'destructive' })
      setClients([...MOCK_AGENCY_CLIENTS])
    } finally {
      setLoading(false)
    }
  }

  /* ---- Fetch activities with demo fallback ---- */
  const fetchActivities = async () => {
    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 300))
        setActivities([...MOCK_ACTIVITIES])
        return
      }

      if (clientsApiModule?.clientsApi?.activities) {
        const data = await clientsApiModule.clientsApi.activities()
        setActivities(data)
      } else {
        const mod = await import('@/lib/api')
        if (mod.clientsApi?.activities) {
          const data = await mod.clientsApi.activities()
          setActivities(data)
        } else {
          setActivities([...MOCK_ACTIVITIES])
        }
      }
    } catch {
      toast({ title: 'Failed to load activities — showing demo data', variant: 'destructive' })
      setActivities([...MOCK_ACTIVITIES])
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsApiModule])

  const filteredClients = useMemo(() => {
    if (statusFilter === 'all') return clients
    return clients.filter((c) => c.status === statusFilter)
  }, [clients, statusFilter])

  const stats = useMemo(() => {
    const totalClients = clients.length
    const activeClients = clients.filter((c) => c.status === 'active').length
    const totalSpend = clients.reduce((s, c) => s + c.spend, 0)
    const totalCampaigns = clients.reduce((s, c) => s + c.campaigns, 0)
    const totalDrafts = clients.reduce((s, c) => s + c.drafts, 0)
    return { totalClients, activeClients, totalSpend, totalCampaigns, totalDrafts }
  }, [clients])

  /* ---- Toggle status with demo fallback ---- */
  const handleToggleStatus = async (id: string) => {
    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 300))
        setClients((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, status: c.status === 'active' ? 'paused' : 'active' }
              : c
          )
        )
        const client = clients.find((c) => c.id === id)
        const newStatus = client?.status === 'active' ? 'paused' : 'active'
        toast('success', `Client ${newStatus === 'active' ? 'activated' : 'paused'}`, client?.name || '')
        return
      }

      if (clientsApiModule?.clientsApi?.toggleStatus) {
        const updated = await clientsApiModule.clientsApi.toggleStatus(id)
        setClients((prev) => prev.map((c) => (c.id === id ? updated : c)))
        toast('success', `Client ${updated.status === 'active' ? 'activated' : 'paused'}`, updated.name)
      } else {
        const mod = await import('@/lib/api')
        const updated = await mod.clientsApi.toggleStatus(id)
        setClients((prev) => prev.map((c) => (c.id === id ? updated : c)))
        toast('success', `Client ${updated.status === 'active' ? 'activated' : 'paused'}`, updated.name)
      }
    } catch {
      toast({ title: 'Failed to update client status', variant: 'destructive' })
    }
  }

  const SPARK_KPIS = [
    { day: 'Mon', value: 38000 },
    { day: 'Tue', value: 42000 },
    { day: 'Wed', value: 39000 },
    { day: 'Thu', value: 45000 },
    { day: 'Fri', value: 41000 },
    { day: 'Sat', value: 48000 },
    { day: 'Sun', value: 44500 },
  ]

  return (
    <>
    <SEO
      title="Agency Hub"
      description="Manage multiple client accounts, assign scopes, generate white-label reports, and streamline agency workflows with AdNexus AI."
      keywords="agency, client management, multi-client, white-label, agency tools"
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
              Agency Dashboard
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {stats.activeClients} active clients &middot; {stats.totalClients} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="appearance-none px-4 py-2.5 pr-8 rounded-lg text-sm font-medium cursor-pointer outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            </div>

            {/* Add Client */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:scale-[1.02]"
              style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
            >
              <Plus size={16} />
              Add Client
            </button>
          </div>
        </motion.div>

        {/* ---- STATS ROW ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {loading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : (
            <>
              <KPICard
                label="Total Clients"
                value={stats.totalClients}
                icon={<Users size={18} />}
                trend={{ value: 8, positive: true }}
              />
              <KPICard
                label="Total Ad Spend"
                value={stats.totalSpend}
                prefix="$"
                sparklineData={SPARK_KPIS}
                icon={<BarChart3 size={18} />}
                trend={{ value: 12.5, positive: true }}
              />
              <KPICard
                label="Total Campaigns"
                value={stats.totalCampaigns}
                icon={<Target size={18} />}
                trend={{ value: 6, positive: true }}
              />
              <KPICard
                label="Active Drafts"
                value={stats.totalDrafts}
                icon={<Hash size={18} />}
                trend={{ value: stats.totalDrafts > 10 ? -4 : 2, positive: stats.totalDrafts <= 10 }}
              />
            </>
          )}
        </div>

        {/* ---- CLIENT CARDS GRID ---- */}
        <div className="mb-4">
          <h3 className="font-space text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Client Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ClientCardSkeleton key={i} index={i} />)
              : filteredClients.map((client, i) => (
                  <ClientCard key={client.id} client={client} index={i} onToggleStatus={handleToggleStatus} />
                ))
            }
          </div>
          {!loading && filteredClients.length === 0 && (
            <div className="text-center py-16">
              <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No clients found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {statusFilter !== 'all' ? 'Try changing your filter.' : 'Add your first client to get started.'}
              </p>
            </div>
          )}
        </div>

        {/* ---- RECENT ACTIVITY ---- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="card-surface p-5 mt-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="font-space text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Recent Activity
            </h3>
          </div>
          {activityLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ---- ADD CLIENT MODAL ---- */}
      <AnimatePresence>
        {showAddModal && (
          <AddClientModal onClose={() => setShowAddModal(false)} onCreated={fetchClients} />
        )}
      </AnimatePresence>
    </div>
    </>
  )
}
