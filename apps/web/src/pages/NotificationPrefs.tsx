import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Send,
  Check,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Brain,
  TrendingDown,
  BarChart3,
  FileText,
  Zap,
  ChevronDown,
  Save,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChannelToggles {
  email: boolean
  slack: boolean
  inApp: boolean
  sms: boolean
}

interface EventToggles {
  draftApprovals: boolean
  aiActions: boolean
  budgetAlerts: boolean
  campaignUpdates: boolean
  weeklyReports: boolean
  creativeFatigue: boolean
}

interface QuietHours {
  enabled: boolean
  start: string
  end: string
  timezone: string
}

interface SlackConfig {
  enabled: boolean
  webhookUrl: string
  channel: string
}

interface EmailConfig {
  frequency: 'immediate' | 'daily' | 'weekly'
}

interface SMSConfig {
  enabled: boolean
  phoneNumber: string
}

interface NotificationSettings {
  channels: ChannelToggles
  events: EventToggles
  quietHours: QuietHours
  slack: SlackConfig
  email: EmailConfig
  sms: SMSConfig
}

/* ------------------------------------------------------------------ */
/*  Demo Data                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS: NotificationSettings = {
  channels: {
    email: true,
    slack: true,
    inApp: true,
    sms: false,
  },
  events: {
    draftApprovals: true,
    aiActions: true,
    budgetAlerts: true,
    campaignUpdates: false,
    weeklyReports: true,
    creativeFatigue: true,
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
    timezone: 'America/New_York',
  },
  slack: {
    enabled: true,
    webhookUrl: 'https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN',
    channel: '#ad-alerts',
  },
  email: {
    frequency: 'daily',
  },
  sms: {
    enabled: false,
    phoneNumber: '',
  },
}

const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
]

/* ------------------------------------------------------------------ */
/*  API Helpers                                                        */
/* ------------------------------------------------------------------ */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === ''

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json()
}

async function apiPut(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json().catch(() => ({}))
}

async function apiPost(path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json().catch(() => ({}))
}

/* ------------------------------------------------------------------ */
/*  Animation Helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionCard({
  icon: Icon,
  iconColor,
  title,
  description,
  children,
  badge,
}: {
  icon: React.ElementType
  iconColor: string
  title: string
  description?: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <motion.div
      variants={fadeIn}
      className="card-surface overflow-hidden"
    >
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}18`, color: iconColor }}
        >
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            {badge}
          </div>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  disabled = false,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  icon?: React.ElementType
  disabled?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-3.5 ${disabled ? 'opacity-50' : ''}`}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
          >
            <Icon size={14} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {description}
          </p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="flex-shrink-0 ml-4"
      />
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent)' }} />
    </div>
  )
}

function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <AlertTriangle size={28} style={{ color: 'var(--status-error)' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry} className="gap-1.5">
          <RefreshCw size={14} />
          Retry
        </Button>
      )}
    </div>
  )
}

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */

export default function NotificationPrefs() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingSlack, setTestingSlack] = useState(false)
  const [testingSMS, setTestingSMS] = useState(false)

  /* ── Fetch settings ── */
  const fetchSettings = useCallback(async () => {
    if (isDemo) {
      setSettings({ ...DEFAULT_SETTINGS })
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet('/api/v1/settings/notifications')
      setSettings(mergeWithDefaults(data))
    } catch (e: any) {
      setError(e.message || 'Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  /* ── Merge API data with defaults ── */
  function mergeWithDefaults(data: any): NotificationSettings {
    return {
      channels: { ...DEFAULT_SETTINGS.channels, ...data?.channels },
      events: { ...DEFAULT_SETTINGS.events, ...data?.events },
      quietHours: { ...DEFAULT_SETTINGS.quietHours, ...data?.quietHours },
      slack: { ...DEFAULT_SETTINGS.slack, ...data?.slack },
      email: { ...DEFAULT_SETTINGS.email, ...data?.email },
      sms: { ...DEFAULT_SETTINGS.sms, ...data?.sms },
    }
  }

  /* ── Handlers ── */
  const updateChannel = (key: keyof ChannelToggles, value: boolean) => {
    if (!settings) return
    setSettings({ ...settings, channels: { ...settings.channels, [key]: value } })
  }

  const updateEvent = (key: keyof EventToggles, value: boolean) => {
    if (!settings) return
    setSettings({ ...settings, events: { ...settings.events, [key]: value } })
  }

  const updateQuietHours = (updates: Partial<QuietHours>) => {
    if (!settings) return
    setSettings({ ...settings, quietHours: { ...settings.quietHours, ...updates } })
  }

  const updateSlack = (updates: Partial<SlackConfig>) => {
    if (!settings) return
    setSettings({ ...settings, slack: { ...settings.slack, ...updates } })
  }

  const updateEmailFreq = (frequency: EmailConfig['frequency']) => {
    if (!settings) return
    setSettings({ ...settings, email: { ...settings.email, frequency } })
  }

  const updateSMS = (updates: Partial<SMSConfig>) => {
    if (!settings) return
    setSettings({ ...settings, sms: { ...settings.sms, ...updates } })
  }

  /* ── Save ── */
  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 600))
      } else {
        await apiPut('/api/v1/settings/notifications', settings)
      }
      toast.success('Preferences saved', 'Your notification settings have been updated.')
    } catch (e: any) {
      toast.error('Save failed', e.message || 'Could not save preferences.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Test Slack ── */
  const handleTestSlack = async () => {
    if (!settings?.slack.webhookUrl) {
      toast.warning('Missing webhook', 'Please enter a Slack webhook URL first.')
      return
    }
    setTestingSlack(true)
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 800))
      } else {
        await apiPost('/api/v1/settings/notifications/test-slack', {
          url: settings.slack.webhookUrl,
        })
      }
      toast.success('Test message sent', 'Check your Slack channel for the test message.')
    } catch (e: any) {
      toast.error('Slack test failed', e.message || 'Could not send test message.')
    } finally {
      setTestingSlack(false)
    }
  }

  /* ── Test SMS ── */
  const handleTestSMS = async () => {
    if (!settings?.sms.phoneNumber) {
      toast.warning('Missing number', 'Please enter a phone number first.')
      return
    }
    setTestingSMS(true)
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 800))
      } else {
        await apiPost('/api/v1/settings/notifications/test-sms', {
          phoneNumber: settings.sms.phoneNumber,
        })
      }
      toast.success('SMS test sent', 'Check your phone for the test message.')
    } catch (e: any) {
      toast.error('SMS test failed', e.message || 'Could not send test SMS.')
    } finally {
      setTestingSMS(false)
    }
  }

  /* ── Reset to defaults ── */
  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS })
    toast.info('Defaults restored', 'Settings have been reset to defaults. Click Save to apply.')
  }

  /* ── Event type definitions ── */
  const eventTypes = [
    {
      key: 'draftApprovals' as keyof EventToggles,
      label: 'Draft Approvals',
      description: 'Get notified when drafts are approved or rejected',
      icon: ShieldCheck,
    },
    {
      key: 'aiActions' as keyof EventToggles,
      label: 'AI Actions',
      description: 'Alerts when the AI agent takes automated actions',
      icon: Brain,
    },
    {
      key: 'budgetAlerts' as keyof EventToggles,
      label: 'Budget Alerts',
      description: 'Warnings when campaign budgets near their limit',
      icon: TrendingDown,
    },
    {
      key: 'campaignUpdates' as keyof EventToggles,
      label: 'Campaign Updates',
      description: 'Status changes and performance milestones',
      icon: BarChart3,
    },
    {
      key: 'weeklyReports' as keyof EventToggles,
      label: 'Weekly Reports',
      description: 'Automated weekly performance summaries',
      icon: FileText,
    },
    {
      key: 'creativeFatigue' as keyof EventToggles,
      label: 'Creative Fatigue',
      description: 'Alerts when ad creative performance declines',
      icon: Zap,
    },
  ]

  /* ── Frequency options ── */
  const frequencyOptions: { value: EmailConfig['frequency']; label: string; desc: string }[] = [
    { value: 'immediate', label: 'Immediate', desc: 'Get emails as events happen' },
    { value: 'daily', label: 'Daily Digest', desc: 'One summary email per day' },
    { value: 'weekly', label: 'Weekly', desc: 'One summary email per week' },
  ]

  /* ── Generate time options ── */
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4)
    const minute = (i % 4) * 15
    const h = hour.toString().padStart(2, '0')
    const m = minute.toString().padStart(2, '0')
    return `${h}:${m}`
  })

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} retry={fetchSettings} />
  if (!settings) return <ErrorState message="No settings loaded" retry={fetchSettings} />

  return (
    <>
    <SEO
      title="Notification Preferences"
      description="Customize your AdNexus AI notification settings. Choose which alerts to receive, set delivery channels, and manage frequency preferences."
      keywords="notifications, alert settings, notification preferences, alert management"
    />
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="max-w-4xl mx-auto space-y-6 pb-12"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="font-space text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Notification Preferences
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Control how and when you receive notifications across all channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RefreshCw size={14} />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </Button>
        </div>
      </motion.div>

      {/* ── Section 1: Channel Toggles ── */}
      <SectionCard
        icon={Bell}
        iconColor="var(--accent)"
        title="Notification Channels"
        description="Choose which channels can send you notifications"
      >
        <div className="space-y-0 divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          <ToggleRow
            label="Email Notifications"
            description="Receive notifications via email"
            checked={settings.channels.email}
            onChange={(v) => updateChannel('email', v)}
            icon={Mail}
          />
          <ToggleRow
            label="Slack Notifications"
            description="Receive notifications in your Slack workspace"
            checked={settings.channels.slack}
            onChange={(v) => updateChannel('slack', v)}
            icon={MessageSquare}
          />
          <ToggleRow
            label="In-App Notifications"
            description="Receive notifications within the app"
            checked={settings.channels.inApp}
            onChange={(v) => updateChannel('inApp', v)}
            icon={Bell}
          />
          <ToggleRow
            label="SMS Notifications"
            description="Receive urgent notifications via text message"
            checked={settings.channels.sms}
            onChange={(v) => updateChannel('sms', v)}
            icon={Smartphone}
          />
        </div>
      </SectionCard>

      {/* ── Section 2: Event Types ── */}
      <SectionCard
        icon={Zap}
        iconColor="#F59E0B"
        title="Event Types"
        description="Select which events trigger notifications"
        badge={
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#F59E0B' }}>
            {Object.values(settings.events).filter(Boolean).length} of {Object.keys(settings.events).length} enabled
          </Badge>
        }
      >
        <div className="space-y-0">
          {eventTypes.map((event) => (
            <ToggleRow
              key={event.key}
              label={event.label}
              description={event.description}
              checked={settings.events[event.key]}
              onChange={(v) => updateEvent(event.key, v)}
              icon={event.icon}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── Section 3: Quiet Hours ── */}
      <SectionCard
        icon={Clock}
        iconColor="#8B5CF6"
        title="Quiet Hours"
        description="Pause notifications during specific hours"
        badge={
          settings.quietHours.enabled ? (
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'rgba(139,92,246,0.3)', color: '#8B5CF6' }}>
              Active
            </Badge>
          ) : null
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Enable Quiet Hours
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Suppress non-urgent notifications during this window
              </p>
            </div>
            <Switch
              checked={settings.quietHours.enabled}
              onCheckedChange={(v) => updateQuietHours({ enabled: v })}
            />
          </div>

          {settings.quietHours.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Start Time
                  </label>
                  <div className="relative">
                    <select
                      value={settings.quietHours.start}
                      onChange={(e) => updateQuietHours({ start: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none appearance-none cursor-pointer"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    End Time
                  </label>
                  <div className="relative">
                    <select
                      value={settings.quietHours.end}
                      onChange={(e) => updateQuietHours({ end: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none appearance-none cursor-pointer"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Timezone
                </label>
                <div className="relative">
                  <select
                    value={settings.quietHours.timezone}
                    onChange={(e) => updateQuietHours({ timezone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none appearance-none cursor-pointer"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </SectionCard>

      {/* ── Section 4: Slack Webhook ── */}
      <SectionCard
        icon={MessageSquare}
        iconColor="#8B5CF6"
        title="Slack Integration"
        description="Configure your Slack workspace for notifications"
        badge={
          settings.slack.enabled ? (
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'rgba(16,185,129,0.3)', color: 'var(--status-active)' }}>
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--status-error)' }}>
              Disconnected
            </Badge>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Enable Slack Notifications
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Send alerts to your configured Slack channel
              </p>
            </div>
            <Switch
              checked={settings.slack.enabled}
              onCheckedChange={(v) => updateSlack({ enabled: v })}
            />
          </div>

          {settings.slack.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-2"
            >
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Slack Webhook URL
                </label>
                <input
                  type="text"
                  value={settings.slack.webhookUrl}
                  onChange={(e) => updateSlack({ webhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/T00000000/B00000000/..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono-data"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Create an Incoming Webhook in your Slack App settings to get this URL.
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Channel
                </label>
                <input
                  type="text"
                  value={settings.slack.channel}
                  onChange={(e) => updateSlack({ channel: e.target.value })}
                  placeholder="#ad-alerts"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSlack}
                disabled={testingSlack || !settings.slack.webhookUrl}
                className="gap-1.5"
              >
                {testingSlack ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Test Connection
              </Button>
            </motion.div>
          )}
        </div>
      </SectionCard>

      {/* ── Section 5: Email Frequency ── */}
      <SectionCard
        icon={Mail}
        iconColor="#3B82F6"
        title="Email Frequency"
        description="Choose how often you want to receive email summaries"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {frequencyOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateEmailFreq(opt.value)}
              className="relative flex flex-col items-start gap-1 p-4 rounded-lg text-left transition-all cursor-pointer"
              style={{
                background:
                  settings.email.frequency === opt.value
                    ? 'rgba(59,130,246,0.1)'
                    : 'var(--bg-primary)',
                border:
                  settings.email.frequency === opt.value
                    ? '1.5px solid rgba(59,130,246,0.4)'
                    : '1px solid var(--border-subtle)',
              }}
            >
              {settings.email.frequency === opt.value && (
                <div className="absolute top-3 right-3">
                  <Check size={14} style={{ color: '#3B82F6' }} />
                </div>
              )}
              <span
                className="text-sm font-medium"
                style={{
                  color:
                    settings.email.frequency === opt.value
                      ? '#3B82F6'
                      : 'var(--text-primary)',
                }}
              >
                {opt.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Section 6: SMS Configuration ── */}
      <SectionCard
        icon={Smartphone}
        iconColor="#10B981"
        title="SMS Configuration"
        description="Set up phone number for urgent SMS alerts"
        badge={
          settings.sms.enabled ? (
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'rgba(16,185,129,0.3)', color: 'var(--status-active)' }}>
              Enabled
            </Badge>
          ) : null
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Enable SMS Alerts
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Receive critical alerts via text message
              </p>
            </div>
            <Switch
              checked={settings.sms.enabled}
              onCheckedChange={(v) => updateSMS({ enabled: v })}
            />
          </div>

          {settings.sms.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-2"
            >
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.sms.phoneNumber}
                  onChange={(e) => updateSMS({ phoneNumber: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSMS}
                disabled={testingSMS || !settings.sms.phoneNumber}
                className="gap-1.5"
              >
                {testingSMS ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Send Test SMS
              </Button>
            </motion.div>
          )}
        </div>
      </SectionCard>

      {/* ── Footer Save Bar ── */}
      <motion.div
        variants={fadeIn}
        className="flex items-center justify-between p-4 rounded-xl sticky bottom-4"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: saving
                ? 'var(--status-warning)'
                : 'var(--status-active)',
            }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {saving ? 'Saving changes...' : 'All changes saved locally'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </Button>
        </div>
      </motion.div>
    </motion.div>
    </>
  )
}
