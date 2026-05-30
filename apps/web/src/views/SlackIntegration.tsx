// @ts-nocheck
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO';
import {
  ChevronDown, Send, RefreshCw,
  AlertTriangle,
  Sun, DollarSign, Palette, ClipboardCheck, BarChart3, Activity, Users,
  ArrowLeft, LogOut, MessageSquare, Loader2,
  Globe, Eye, EyeOff, Copy, Check, Shield,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
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
  slackPurple: '#4A154B',
  slackGreen: '#36C5F0',
  slackAubergine: '#E01E5A',
  slackBlue: '#36C5F0',
  slackYellow: '#ECB22E',
}

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
interface NotificationToggle {
  id: number
  label: string
  description: string
  frequency: string
  icon: React.ReactNode
  defaultOn: boolean
  category: 'alerts' | 'summaries' | 'team'
}

interface DeliveryLogEntry {
  id: number
  date: string
  time: string
  type: string
  channel: string
  status: 'Delivered' | 'Failed'
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                           */
/* ------------------------------------------------------------------ */
const NOTIFICATIONS: NotificationToggle[] = [
  { id: 1, label: 'Morning Brief delivery', description: 'Receive daily Morning Brief in your Slack channel', frequency: 'Daily 8 AM', icon: <Sun size={16} />, defaultOn: true, category: 'summaries' },
  { id: 2, label: 'Anomaly alerts', description: 'Instant alerts when anomalies are detected in campaign performance', frequency: 'Instant', icon: <AlertTriangle size={16} />, defaultOn: true, category: 'alerts' },
  { id: 3, label: 'Budget cap warnings', description: 'Get notified when campaigns approach or exceed budget limits', frequency: 'Instant', icon: <DollarSign size={16} />, defaultOn: true, category: 'alerts' },
  { id: 4, label: 'Creative fatigue alerts', description: 'Alert when ad creatives show fatigue signals and need refresh', frequency: 'Instant', icon: <Palette size={16} />, defaultOn: true, category: 'alerts' },
  { id: 5, label: 'Draft approvals', description: 'Notification when AI drafts need your review and approval', frequency: 'Instant', icon: <ClipboardCheck size={16} />, defaultOn: true, category: 'team' },
  { id: 6, label: 'Weekly performance summary', description: 'Weekly digest of campaign performance across all platforms', frequency: 'Mondays', icon: <BarChart3 size={16} />, defaultOn: true, category: 'summaries' },
  { id: 7, label: 'Campaign status changes', description: 'Updates when campaigns are paused, activated, or edited', frequency: 'Instant', icon: <Activity size={16} />, defaultOn: false, category: 'alerts' },
  { id: 8, label: 'Team member actions', description: 'Real-time feed of team actions on campaigns', frequency: 'Real-time', icon: <Users size={16} />, defaultOn: false, category: 'team' },
]

const DELIVERY_LOG: DeliveryLogEntry[] = [
  { id: 1, date: 'May 20, 2026', time: '8:00 AM', type: 'Morning Brief', channel: '#marketing-alerts', status: 'Delivered' },
  { id: 2, date: 'May 20, 2026', time: '7:42 AM', type: 'Anomaly Alert', channel: '#marketing-alerts', status: 'Delivered' },
  { id: 3, date: 'May 19, 2026', time: '3:15 PM', type: 'Budget Warning', channel: '#marketing-alerts', status: 'Delivered' },
  { id: 4, date: 'May 19, 2026', time: '8:00 AM', type: 'Morning Brief', channel: '#marketing-alerts', status: 'Delivered' },
  { id: 5, date: 'May 18, 2026', time: '11:30 AM', type: 'Draft Approval', channel: '#marketing-alerts', status: 'Delivered' },
  { id: 6, date: 'May 18, 2026', time: '9:15 AM', type: 'Weekly Summary', channel: '#marketing-alerts', status: 'Delivered' },
  { id: 7, date: 'May 17, 2026', time: '4:22 PM', type: 'Creative Fatigue', channel: '#marketing-alerts', status: 'Delivered' },
  { id: 8, date: 'May 16, 2026', time: '8:00 AM', type: 'Morning Brief', channel: '#marketing-alerts', status: 'Failed' },
]

/* ------------------------------------------------------------------ */
/*  ANIMATION VARIANTS                                                  */
/* ------------------------------------------------------------------ */
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
}

/* ------------------------------------------------------------------ */
/*  LOADING SKELETONS                                                   */
/* ------------------------------------------------------------------ */
function SkeletonToggle() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-lg animate-pulse">
      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-hover)' }} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3 rounded w-36" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-2.5 rounded w-48" style={{ background: 'var(--bg-hover)' }} />
      </div>
      <div className="w-11 h-6 rounded-full flex-shrink-0" style={{ background: 'var(--bg-hover)' }} />
    </div>
  )
}

function SkeletonLogRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
      <div className="h-3 rounded w-20" style={{ background: 'var(--bg-hover)' }} />
      <div className="h-3 rounded w-24" style={{ background: 'var(--bg-hover)' }} />
      <div className="h-3 rounded w-20" style={{ background: 'var(--bg-hover)' }} />
      <div className="h-3 rounded w-16 ml-auto" style={{ background: 'var(--bg-hover)' }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
export default function SlackIntegration() {
  const [toggles, setToggles] = useState<Record<number, boolean>>(
    Object.fromEntries(NOTIFICATIONS.map((n) => [n.id, n.defaultOn]))
  )
  const [channelOpen, setChannelOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState('#marketing-alerts')
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected')
  const [webhookVisible, setWebhookVisible] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [webhookCopied, setWebhookCopied] = useState(false)
  const [activeNotifFilter, setActiveNotifFilter] = useState<'all' | 'alerts' | 'summaries' | 'team'>('all')

  const webhookUrl = 'https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN'

  setTimeout(() => setIsLoading(false), 700)

  const toggleSwitch = (id: number) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const channels = ['#marketing-alerts', '#general', '#ad-ops', '#notifications']

  const handleTestMessage = () => {
    setTestSent(true)
    setTimeout(() => setTestSent(false), 2000)
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).catch(() => {})
    setWebhookCopied(true)
    setTimeout(() => setWebhookCopied(false), 2000)
  }

  const handleConnect = () => {
    setConnectionStatus('connecting')
    setTimeout(() => setConnectionStatus('connected'), 2000)
  }

  const handleDisconnect = () => {
    setConnectionStatus('disconnected')
  }

  const filteredNotifications = activeNotifFilter === 'all'
    ? NOTIFICATIONS
    : NOTIFICATIONS.filter(n => n.category === activeNotifFilter)

  return (
    <>
    <SEO
      title="Slack Integration"
      description="Connect AdNexus AI with Slack. Receive campaign alerts, share reports, and manage approvals directly from your Slack workspace."
      keywords="Slack integration, Slack alerts, team notifications, collaboration"
    />
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-6" style={{ background: 'var(--bg-primary)' }}>
      {/* ========== HEADER ========== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="mb-8"
      >
        <Link to="/settings" className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors hover:text-white cursor-pointer" style={{ color: C.textSecondary }}>
          <ArrowLeft size={14} />
          Back to Integrations
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: C.slackPurple }}>
            <MessageSquare size={20} style={{ color: C.slackGreen }} />
          </div>
          <div>
            <h2 className="font-space font-semibold text-2xl sm:text-4xl" style={{ color: C.textPrimary, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              Slack Integration
            </h2>
            <p className="text-sm" style={{ color: C.textSecondary }}>Connect your Slack workspace for real-time campaign alerts</p>
          </div>
        </div>
      </motion.div>

      {/* ========== CONNECTION STATUS ========== */}
      <motion.div
        custom={0.05}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="card-surface p-5 mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {connectionStatus === 'connected' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.1)', color: C.statusActive }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.statusActive, animation: 'pulse-dot 2s infinite' }} />
                Connected
              </span>
            )}
            {connectionStatus === 'connecting' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(59,130,246,0.1)', color: C.statusInfo }}>
                <Loader2 size={12} className="animate-spin" />
                Connecting...
              </span>
            )}
            {connectionStatus === 'disconnected' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: C.statusError }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.statusError }} />
                Disconnected
              </span>
            )}
            <span className="text-sm font-medium" style={{ color: C.textPrimary }}>
              Workspace: <span className="font-mono-data">adnexus-team</span>
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Channel selector */}
            <div className="relative">
              <button
                onClick={() => setChannelOpen(!channelOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={{ background: C.bgHover, color: C.textPrimary, border: '1px solid var(--border-subtle)' }}
              >
                <MessageSquare size={14} style={{ color: C.textSecondary }} />
                {selectedChannel}
                <ChevronDown size={14} style={{ color: C.textSecondary, transform: channelOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }} />
              </button>
              {channelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 top-full mt-1 rounded-lg overflow-hidden z-50 min-w-[180px]"
                  style={{ background: C.bgElevated, border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
                >
                  {channels.map((ch) => (
                    <button
                      key={ch}
                      onClick={() => { setSelectedChannel(ch); setChannelOpen(false) }}
                      className="block w-full text-left px-4 py-2 text-sm transition-colors duration-100 hover:bg-[var(--bg-hover)]"
                      style={{ color: ch === selectedChannel ? C.accent : C.textPrimary }}
                    >
                      {ch}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTestMessage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{ background: C.bgHover, color: C.textSecondary, border: '1px solid var(--border-subtle)' }}
            >
              {testSent ? <><Check size={12} style={{ color: C.statusActive }} /> Sent</> : <><Send size={12} />Test Message</>}
            </motion.button>

            {connectionStatus === 'connected' ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{ background: 'rgba(239,68,68,0.1)', color: C.statusError, border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <LogOut size={12} />
                Disconnect
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConnect}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-150"
                style={{ background: C.accent }}
              >
                {connectionStatus === 'connecting' ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Slack'}
              </motion.button>
            )}
          </div>
        </div>

        {/* Webhook URL */}
        {connectionStatus === 'connected' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t"
            style={{ borderColor: C.borderSubtle }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield size={12} style={{ color: C.textTertiary }} />
                <span className="text-xs font-medium" style={{ color: C.textSecondary }}>Webhook URL</span>
              </div>
              <button
                onClick={() => setWebhookVisible(!webhookVisible)}
                className="flex items-center gap-1 text-[10px] cursor-pointer"
                style={{ color: C.textTertiary }}
              >
                {webhookVisible ? <><EyeOff size={10} /> Hide</> : <><Eye size={10} /> Show</>}
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-xs font-mono-data flex-1 truncate" style={{ color: C.textTertiary }}>
                {webhookVisible ? webhookUrl : webhookUrl.replace(/./g, '\u2022').slice(0, 55)}
              </span>
              <button
                onClick={handleCopyWebhook}
                className="p-1.5 rounded-md transition-colors cursor-pointer flex-shrink-0"
                style={{ color: C.textSecondary }}
                title="Copy webhook URL"
              >
                {webhookCopied ? <Check size={14} style={{ color: C.statusActive }} /> : <Copy size={14} />}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ========== NOTIFICATION TYPES ========== */}
      <motion.div
        custom={0.15}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="card-surface p-5 mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="font-space font-semibold text-lg" style={{ color: C.textPrimary }}>Notification Types</h3>
          <div className="flex gap-1">
            {(['all', 'alerts', 'summaries', 'team'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveNotifFilter(f)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-all cursor-pointer"
                style={{
                  background: activeNotifFilter === f ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: activeNotifFilter === f ? '#fff' : C.textSecondary,
                  border: `1px solid ${activeNotifFilter === f ? 'var(--accent)' : C.borderSubtle}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonToggle key={i} />)}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredNotifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.04, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                className="flex items-center gap-4 px-4 py-3.5 rounded-lg transition-colors duration-100"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.bgHover }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ color: C.textSecondary }}>{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: C.textPrimary }}>{n.label}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: C.bgHover, color: C.textTertiary }}>
                      {n.frequency}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{n.description}</p>
                </div>
                <ToggleSwitch enabled={!!toggles[n.id]} onChange={() => toggleSwitch(n.id)} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ========== MESSAGE PREVIEWS ========== */}
      <motion.div
        custom={0.3}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="mb-6"
      >
        <h3 className="font-space font-semibold text-lg mb-4" style={{ color: C.textPrimary }}>
          Message Previews
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Morning Brief Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="card-surface p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: C.slackPurple, color: 'white' }}>
                S
              </div>
              <span className="text-xs font-semibold" style={{ color: C.textSecondary }}>AdNexus AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(16,185,129,0.15)', color: C.statusActive }}>Daily</span>
            </div>
            <div className="rounded-lg p-3" style={{ background: C.bgElevated, border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: C.textPrimary }}>Morning Brief &mdash; May 20</p>
              <p className="text-xs mb-3" style={{ color: C.textSecondary }}>Yesterday: $6,247 revenue | ROAS 3.8x | 4 actions drafted</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-1 rounded text-[10px] font-medium" style={{ background: C.accent, color: 'white' }}>View Full Brief</span>
                <span className="px-2 py-1 rounded text-[10px] font-medium" style={{ background: C.statusActive, color: '#050505' }}>Approve All</span>
                <span className="px-2 py-1 rounded text-[10px] font-medium" style={{ background: C.bgHover, color: C.textPrimary }}>View Drafts</span>
              </div>
              <p className="text-[10px] mt-2" style={{ color: C.textTertiary }}>Generated at 8:00 AM &middot; #marketing-alerts</p>
            </div>
          </motion.div>

          {/* Alert Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="card-surface p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: C.slackPurple, color: 'white' }}>S</div>
              <span className="text-xs font-semibold" style={{ color: C.textSecondary }}>AdNexus AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(239,68,68,0.15)', color: C.statusError }}>Alert</span>
            </div>
            <div className="rounded-lg p-3" style={{ background: C.bgElevated, border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${C.statusError}` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: C.statusError }}>Budget Alert</p>
              <p className="text-xs mb-1" style={{ color: C.textPrimary }}>Retargeting campaign at 93% of monthly budget</p>
              <p className="text-xs mb-3" style={{ color: C.textSecondary }}>Current: $5,600 / $6,000 | 11 days remaining</p>
              <span className="px-2 py-1 rounded text-[10px] font-medium" style={{ background: C.bgHover, color: C.textPrimary }}>View in Dashboard</span>
              <p className="text-[10px] mt-2" style={{ color: C.textTertiary }}>Triggered 7:42 AM &middot; #marketing-alerts</p>
            </div>
          </motion.div>

          {/* Approval Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.45, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="card-surface p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: C.slackPurple, color: 'white' }}>S</div>
              <span className="text-xs font-semibold" style={{ color: C.textSecondary }}>AdNexus AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(245,158,11,0.15)', color: C.statusWarning }}>Approval</span>
            </div>
            <div className="rounded-lg p-3" style={{ background: C.bgElevated, border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs mb-2" style={{ color: C.textSecondary }}>AI Agent wants to increase Summer Sale budget by 30%</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono-data text-xs" style={{ color: C.textTertiary }}>$500</span>
                <span className="text-xs" style={{ color: C.textSecondary }}>{'\u2192'}</span>
                <span className="font-mono-data text-xs font-bold" style={{ color: C.statusActive }}>$650</span>
              </div>
              <p className="text-[10px] mb-3" style={{ color: C.textTertiary }}>Reason: ROAS 4.2x, scale opportunity</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-1 rounded text-[10px] font-medium" style={{ background: C.statusActive, color: '#050505' }}>Approve</span>
                <span className="px-2 py-1 rounded text-[10px] font-medium" style={{ background: C.statusError, color: 'white' }}>Reject</span>
                <span className="px-2 py-1 rounded text-[10px] font-medium" style={{ background: C.bgHover, color: C.textPrimary }}>View Details</span>
              </div>
              <p className="text-[10px] mt-2" style={{ color: C.textTertiary }}>Action required &middot; #marketing-alerts</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ========== DELIVERY LOG ========== */}
      <motion.div
        custom={0.45}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="card-surface overflow-hidden"
      >
        <div className="p-5 border-b" style={{ borderColor: C.borderSubtle }}>
          <h3 className="font-space font-semibold text-lg" style={{ color: C.textPrimary }}>Delivery Log</h3>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonLogRow key={i} />)}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Date', 'Time', 'Type', 'Channel', 'Status', 'Actions'].map((h) => (
                    <th scope="col" key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textTertiary }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DELIVERY_LOG.map((entry, i) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 + i * 0.04 }}
                    className="transition-colors duration-100"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.bgHover }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <td className="px-4 py-3.5">
                      <span className="text-sm block" style={{ color: C.textPrimary }}>{entry.date}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono-data" style={{ color: C.textTertiary }}>{entry.time}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm" style={{ color: C.textPrimary }}>{entry.type}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono-data text-sm" style={{ color: C.textSecondary }}>{entry.channel}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: entry.status === 'Delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: entry.status === 'Delivered' ? C.statusActive : C.statusError }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: entry.status === 'Delivered' ? C.statusActive : C.statusError }} />
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150" style={{ background: C.bgHover, color: C.textSecondary, border: '1px solid var(--border-subtle)' }}>
                        <RefreshCw size={10} />Resend
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  TOGGLE SWITCH                                                       */
/* ------------------------------------------------------------------ */
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 cursor-pointer"
      style={{ background: enabled ? C.statusActive : 'rgba(255,255,255,0.1)' }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
      />
    </button>
  )
}
