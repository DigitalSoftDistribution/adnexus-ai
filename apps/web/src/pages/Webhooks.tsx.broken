import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Webhook,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/useToast'
import SEO from '../components/SEO'

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json()
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json()
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json()
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json()
}

const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === ''

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const ALL_EVENT_TYPES = [
  { key: 'draft.created', label: 'Draft Created', category: 'Drafts' },
  { key: 'draft.approved', label: 'Draft Approved', category: 'Drafts' },
  { key: 'draft.rejected', label: 'Draft Rejected', category: 'Drafts' },
  { key: 'draft.executed', label: 'Draft Executed', category: 'Drafts' },
  { key: 'campaign.created', label: 'Campaign Created', category: 'Campaigns' },
  { key: 'campaign.updated', label: 'Campaign Updated', category: 'Campaigns' },
  { key: 'campaign.paused', label: 'Campaign Paused', category: 'Campaigns' },
  { key: 'campaign.resumed', label: 'Campaign Resumed', category: 'Campaigns' },
  { key: 'campaign.ended', label: 'Campaign Ended', category: 'Campaigns' },
  { key: 'ad.created', label: 'Ad Created', category: 'Ads' },
  { key: 'ad.updated', label: 'Ad Updated', category: 'Ads' },
  { key: 'ad.rejected', label: 'Ad Rejected', category: 'Ads' },
  { key: 'budget.alert', label: 'Budget Alert', category: 'Budget' },
  { key: 'goal.reached', label: 'Goal Reached', category: 'Performance' },
  { key: 'goal.alert', label: 'Goal Alert', category: 'Performance' },
  { key: 'report.generated', label: 'Report Generated', category: 'Reports' },
  { key: 'member.invited', label: 'Member Invited', category: 'Team' },
  { key: 'integration.connected', label: 'Integration Connected', category: 'Integrations' },
  { key: 'integration.disconnected', label: 'Integration Disconnected', category: 'Integrations' },
  { key: 'export.completed', label: 'Export Completed', category: 'Exports' },
]

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_WEBHOOKS = [
  {
    id: 'wh_1',
    url: 'https://hooks.slack.com/services/T000/B000/XXXX',
    events: ['draft.approved', 'draft.rejected', 'campaign.updated', 'budget.alert'],
    secret: 'sec_slack_webhook_123',
    active: true,
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-06-18T08:30:00Z',
    lastDelivery: { status: 'success', event: 'draft.approved', timestamp: '2026-06-18T10:15:00Z', statusCode: 200 },
    deliveryCount: 342,
    successRate: 99.4,
  },
  {
    id: 'wh_2',
    url: 'https://api.zapier.com/hooks/catch/123456/abcdef',
    events: ['campaign.created', 'campaign.updated', 'campaign.paused', 'campaign.ended'],
    secret: 'sec_zapier_456',
    active: true,
    createdAt: '2026-04-01T14:00:00Z',
    updatedAt: '2026-06-17T16:45:00Z',
    lastDelivery: { status: 'success', event: 'campaign.updated', timestamp: '2026-06-17T18:20:00Z', statusCode: 200 },
    deliveryCount: 128,
    successRate: 100,
  },
  {
    id: 'wh_3',
    url: 'https://example.com/webhooks/adnexus',
    events: ['report.generated', 'export.completed'],
    secret: 'sec_custom_789',
    active: false,
    createdAt: '2026-05-10T09:00:00Z',
    updatedAt: '2026-06-10T12:00:00Z',
    lastDelivery: { status: 'failed', event: 'report.generated', timestamp: '2026-06-10T12:05:00Z', statusCode: 500 },
    deliveryCount: 45,
    successRate: 88.9,
  },
]

const MOCK_DELIVERIES = [
  { id: 'dlv_1', webhookId: 'wh_1', event: 'draft.approved', status: 'success', statusCode: 200, timestamp: '2026-06-18T10:15:00Z', duration: 230, responseBody: '{"ok":true}' },
  { id: 'dlv_2', webhookId: 'wh_1', event: 'draft.rejected', status: 'success', statusCode: 200, timestamp: '2026-06-18T09:45:00Z', duration: 180, responseBody: '{"ok":true}' },
  { id: 'dlv_3', webhookId: 'wh_1', event: 'budget.alert', status: 'success', statusCode: 200, timestamp: '2026-06-18T08:30:00Z', duration: 195, responseBody: '{"ok":true}' },
  { id: 'dlv_4', webhookId: 'wh_1', event: 'campaign.updated', status: 'failed', statusCode: 408, timestamp: '2026-06-17T16:00:00Z', duration: 5000, responseBody: '{"error":"timeout"}' },
  { id: 'dlv_5', webhookId: 'wh_1', event: 'draft.approved', status: 'success', statusCode: 200, timestamp: '2026-06-17T14:20:00Z', duration: 210, responseBody: '{"ok":true}' },
  { id: 'dlv_6', webhookId: 'wh_2', event: 'campaign.updated', status: 'success', statusCode: 200, timestamp: '2026-06-17T18:20:00Z', duration: 320, responseBody: '{"status":"ok"}' },
  { id: 'dlv_7', webhookId: 'wh_2', event: 'campaign.created', status: 'success', statusCode: 200, timestamp: '2026-06-17T12:00:00Z', duration: 280, responseBody: '{"status":"ok"}' },
  { id: 'dlv_8', webhookId: 'wh_3', event: 'report.generated', status: 'failed', statusCode: 500, timestamp: '2026-06-10T12:05:00Z', duration: 1200, responseBody: 'Internal Server Error' },
]

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const cardTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(date) {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function useAsync(fn, deps = [], mockData) {
  const [data, setData] = useState(() => (isDemo && mockData !== undefined ? mockData : null))
  const [loading, setLoading] = useState(() => !(isDemo && mockData !== undefined))
  const [error, setError] = useState(null)

  const refetch = useCallback(() => {
    if (isDemo && mockData !== undefined) {
      setData(mockData)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fn()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, deps)

  useEffect(() => {
    if (isDemo && mockData !== undefined) return
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch])

  return { data, loading, error, refetch }
}

/* ------------------------------------------------------------------ */
/*  Loading / Error components                                         */
/* ------------------------------------------------------------------ */

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
    </div>
  )
}

function ErrorMessage({ message, retry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <AlertTriangle size={24} style={{ color: 'var(--status-error)' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
        <Icon size={20} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-xs max-w-xs text-center" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
    </div>
  )
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */

export default function Webhooks() {
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [expandedWebhookId, setExpandedWebhookId] = useState(null)
  const [testingId, setTestingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const mockWebhooks = isDemo ? MOCK_WEBHOOKS : undefined
  const { data: webhooks, loading, error, refetch } = useAsync(
    () => apiGet('/api/v1/webhooks').then((r) => r.data),
    [],
    mockWebhooks,
  )

  const handleToggle = async (id, active) => {
    if (isDemo) {
      setTogglingId(id)
      setTimeout(() => { setTogglingId(null); refetch() }, 400)
      return
    }
    setTogglingId(id)
    try {
      await apiPut(`/api/v1/webhooks/${id}`, { active: !active })
      toast.success(active ? 'Webhook deactivated' : 'Webhook activated')
      refetch()
    } catch (e) {
      toast.error('Failed to toggle webhook', e.message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleTest = async (id) => {
    if (isDemo) {
      setTestingId(id)
      setTimeout(() => {
        setTestingId(null)
        toast.success('Test payload sent', 'A test event was delivered successfully.')
      }, 800)
      return
    }
    setTestingId(id)
    try {
      const res = await apiPost(`/api/v1/webhooks/${id}/test`, {})
      toast.success('Test payload sent', res.data?.message || 'Test event delivered successfully.')
      refetch()
    } catch (e) {
      toast.error('Test failed', e.message)
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (isDemo) { setDeletingId(null); refetch(); return }
    try {
      await apiDelete(`/api/v1/webhooks/${id}`)
      toast.success('Webhook deleted')
      setDeletingId(null)
      refetch()
    } catch (e) {
      toast.error('Failed to delete webhook', e.message)
    }
  }

  const handleSave = async (payload) => {
    if (isDemo) {
      setShowAddModal(false)
      setEditingWebhook(null)
      toast.success(editingWebhook ? 'Webhook updated' : 'Webhook created')
      refetch()
      return
    }
    try {
      if (editingWebhook) {
        await apiPut(`/api/v1/webhooks/${editingWebhook.id}`, payload)
        toast.success('Webhook updated')
      } else {
        await apiPost('/api/v1/webhooks', payload)
        toast.success('Webhook created')
      }
      setShowAddModal(false)
      setEditingWebhook(null)
      refetch()
    } catch (e) {
      toast.error(editingWebhook ? 'Failed to update' : 'Failed to create', e.message)
    }
  }

  const filteredWebhooks = (webhooks || []).filter((wh) => {
    const matchesStatus = filterStatus === 'all' ? true : filterStatus === 'active' ? wh.active : !wh.active
    const matchesSearch = !searchQuery || wh.url.toLowerCase().includes(searchQuery.toLowerCase()) || wh.events.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const activeCount = (webhooks || []).filter((wh) => wh.active).length
  const totalDeliveries = (webhooks || []).reduce((sum, wh) => sum + (wh.deliveryCount || 0), 0)

  return (
    <>
    <SEO
      title="Webhooks"
      description="Configure and manage webhooks for real-time event notifications. Connect AdNexus AI events to your external systems and workflows."
      keywords="webhooks, event notifications, real-time events, API integration"
    />
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-space text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Webhooks
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Configure and manage your webhook endpoints for real-time event notifications.
          </p>
        </div>
        <Button onClick={() => { setEditingWebhook(null); setShowAddModal(true) }} className="gap-1.5 self-start">
          <Plus size={14} />
          Add Webhook
        </Button>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { label: 'Active Webhooks', value: activeCount, icon: Activity, color: 'var(--status-active)' },
          { label: 'Total Webhooks', value: (webhooks || []).length, icon: Webhook, color: 'var(--accent)' },
          { label: 'Total Deliveries', value: totalDeliveries.toLocaleString(), icon: Send, color: 'var(--text-secondary)' },
        ].map((stat) => (
          <div key={stat.label} className="card-surface flex items-center gap-4 px-5 py-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${stat.color}20`, color: stat.color }}
            >
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold font-space" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            {['all', 'active', 'inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className="px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
                style={{
                  background: filterStatus === status ? 'var(--bg-primary)' : 'transparent',
                  color: filterStatus === status ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: filterStatus === status ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search webhooks..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>
      </motion.div>

      {/* Webhooks list */}
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} retry={refetch} />}

      {!loading && !error && filteredWebhooks.length === 0 && (
        <EmptyState
          icon={Webhook}
          title="No webhooks found"
          description={searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'Create your first webhook to start receiving event notifications.'}
        />
      )}

      {!loading && !error && filteredWebhooks.length > 0 && (
        <div className="space-y-3">
          {filteredWebhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              isExpanded={expandedWebhookId === webhook.id}
              onToggleExpand={() => setExpandedWebhookId(expandedWebhookId === webhook.id ? null : webhook.id)}
              onToggleActive={() => handleToggle(webhook.id, webhook.active)}
              onTest={() => handleTest(webhook.id)}
              onEdit={() => { setEditingWebhook(webhook); setShowAddModal(true) }}
              onDelete={() => setDeletingId(webhook.id)}
              testing={testingId === webhook.id}
              toggling={togglingId === webhook.id}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <WebhookFormModal
        open={showAddModal}
        onOpenChange={(open) => { if (!open) { setShowAddModal(false); setEditingWebhook(null) } }}
        onSubmit={handleSave}
        initialData={editingWebhook}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone and all event deliveries to this endpoint will stop immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ================================================================== */
/*  WEBHOOK CARD                                                       */
/* ================================================================== */

function WebhookCard({ webhook, isExpanded, onToggleExpand, onToggleActive, onTest, onEdit, onDelete, testing, toggling }) {
  const [showSecret, setShowSecret] = useState(false)

  const statusColor = webhook.active
    ? webhook.lastDelivery?.status === 'failed'
      ? 'var(--status-warning)'
      : 'var(--status-active)'
    : 'var(--text-muted)'

  return (
    <motion.div
      {...cardTransition}
      className="card-surface overflow-hidden"
    >
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: webhook.active ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.1)', color: statusColor }}
        >
          <Webhook size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {webhook.url}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] capitalize flex-shrink-0"
              style={{
                borderColor: webhook.active ? 'rgba(16,185,129,0.3)' : 'rgba(156,163,175,0.3)',
                color: webhook.active ? 'var(--status-active)' : 'var(--text-muted)',
              }}
            >
              {webhook.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''}
            </span>
            <span style={{ color: 'var(--border-subtle)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {webhook.deliveryCount?.toLocaleString() || 0} deliveries
            </span>
            {webhook.lastDelivery && (
              <>
                <span style={{ color: 'var(--border-subtle)' }}>·</span>
                <span className="text-xs flex items-center gap-1">
                  {webhook.lastDelivery.status === 'success' ? (
                    <CheckCircle2 size={10} style={{ color: 'var(--status-active)' }} />
                  ) : (
                    <XCircle size={10} style={{ color: 'var(--status-error)' }} />
                  )}
                  <span style={{ color: webhook.lastDelivery.status === 'success' ? 'var(--status-active)' : 'var(--status-error)' }}>
                    {webhook.lastDelivery.statusCode}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(webhook.lastDelivery.timestamp)}
                  </span>
                </span>
              </>
            )}
            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
              {webhook.successRate !== undefined && `${webhook.successRate}% success`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Switch
            checked={webhook.active}
            onCheckedChange={onToggleActive}
            disabled={toggling}
          />
          <button
            onClick={onTest}
            disabled={testing || !webhook.active}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
            style={{ color: 'var(--text-tertiary)' }}
            title="Send test payload"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}
            title="Edit webhook"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
            style={{ color: 'var(--text-tertiary)' }}
            title="Delete webhook"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-tertiary)' }}
            title={isExpanded ? 'Collapse' : 'View delivery log'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded: events & secret & delivery log */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {/* Events */}
              <div className="pt-4">
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Subscribed Events
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {webhook.events.map((eventKey) => {
                    const eventDef = ALL_EVENT_TYPES.find((e) => e.key === eventKey)
                    return (
                      <Badge
                        key={eventKey}
                        variant="outline"
                        className="text-[11px]"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                      >
                        {eventDef?.label || eventKey}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              {/* Secret key */}
              {webhook.secret && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Secret Key
                  </label>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-mono-data block truncate"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                      {showSecret ? webhook.secret : '•'.repeat(Math.min(webhook.secret.length, 24))}
                    </code>
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)] flex-shrink-0"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(webhook.secret); toast.success('Copied to clipboard') }}
                      className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)] flex-shrink-0"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Delivery log */}
              <WebhookDeliveryLog webhookId={webhook.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ================================================================== */
/*  DELIVERY LOG                                                       */
/* ================================================================== */

function WebhookDeliveryLog({ webhookId }) {
  const mockDeliveries = isDemo ? MOCK_DELIVERIES.filter((d) => d.webhookId === webhookId) : undefined
  const { data: deliveries, loading, error } = useAsync(
    () => apiGet(`/api/v1/webhooks/${webhookId}/deliveries`).then((r) => r.data),
    [webhookId],
    mockDeliveries,
  )

  if (loading) return <div className="py-6"><LoadingSpinner /></div>
  if (error) return <ErrorMessage message={error} />

  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          icon={Clock}
          title="No deliveries yet"
          description="Event deliveries will appear here once this webhook receives events."
        />
      </div>
    )
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
        Recent Deliveries
      </label>
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['Event', 'Status', 'Code', 'Time', 'Duration', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery, idx) => (
              <motion.tr
                key={delivery.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                style={{ borderTop: '1px solid var(--border-subtle)' }}
                className="hover:bg-[var(--bg-hover)]"
              >
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    {ALL_EVENT_TYPES.find((e) => e.key === delivery.event)?.label || delivery.event}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1 text-xs">
                    {delivery.status === 'success' ? (
                      <CheckCircle2 size={12} style={{ color: 'var(--status-active)' }} />
                    ) : (
                      <XCircle size={12} style={{ color: 'var(--status-error)' }} />
                    )}
                    <span
                      style={{
                        color: delivery.status === 'success' ? 'var(--status-active)' : 'var(--status-error)',
                      }}
                      className="capitalize"
                    >
                      {delivery.status}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="text-xs font-mono-data"
                    style={{
                      color: delivery.statusCode >= 200 && delivery.statusCode < 300
                        ? 'var(--status-active)'
                        : delivery.statusCode >= 400
                          ? 'var(--status-error)'
                          : 'var(--status-warning)',
                    }}
                  >
                    {delivery.statusCode}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {timeAgo(delivery.timestamp)}
                </td>
                <td className="px-3 py-2.5 text-xs font-mono-data" style={{ color: 'var(--text-tertiary)' }}>
                  {delivery.duration < 1000 ? `${delivery.duration}ms` : `${(delivery.duration / 1000).toFixed(1)}s`}
                </td>
                <td className="px-3 py-2.5">
                  {delivery.responseBody && (
                    <code
                      className="text-[10px] px-2 py-1 rounded font-mono-data block max-w-[120px] truncate"
                      style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}
                      title={delivery.responseBody}
                    >
                      {delivery.responseBody}
                    </code>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  WEBHOOK FORM MODAL                                                 */
/* ================================================================== */

function WebhookFormModal({ open, onOpenChange, onSubmit, initialData }) {
  const [url, setUrl] = useState(initialData?.url || '')
  const [secret, setSecret] = useState(initialData?.secret || '')
  const [selectedEvents, setSelectedEvents] = useState(initialData?.events || [])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [eventFilter, setEventFilter] = useState('')

  useEffect(() => {
    if (open) {
      setUrl(initialData?.url || '')
      setSecret(initialData?.secret || '')
      setSelectedEvents(initialData?.events || [])
      setErrors({})
      setEventFilter('')
    }
  }, [open, initialData])

  const toggleEvent = (eventKey) => {
    setSelectedEvents((prev) =>
      prev.includes(eventKey) ? prev.filter((e) => e !== eventKey) : [...prev, eventKey],
    )
  }

  const validate = () => {
    const errs = {}
    if (!url.trim()) errs.url = 'URL is required'
    else if (!/^https?:\/\/\S+$/i.test(url.trim())) errs.url = 'Must be a valid HTTP(S) URL'
    if (selectedEvents.length === 0) errs.events = 'Select at least one event'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    await onSubmit({ url: url.trim(), events: selectedEvents, secret: secret.trim() })
    setSubmitting(false)
  }

  const categories = [...new Set(ALL_EVENT_TYPES.map((e) => e.category))]

  const filteredEvents = eventFilter
    ? ALL_EVENT_TYPES.filter((e) => e.label.toLowerCase().includes(eventFilter.toLowerCase()) || e.key.toLowerCase().includes(eventFilter.toLowerCase()))
    : ALL_EVENT_TYPES

  const selectAllInCategory = (category) => {
    const categoryEvents = ALL_EVENT_TYPES.filter((e) => e.category === category).map((e) => e.key)
    setSelectedEvents((prev) => [...new Set([...prev, ...categoryEvents])])
  }

  const deselectAllInCategory = (category) => {
    const categoryEvents = ALL_EVENT_TYPES.filter((e) => e.category === category).map((e) => e.key)
    setSelectedEvents((prev) => prev.filter((e) => !categoryEvents.includes(e)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook size={18} style={{ color: 'var(--accent)' }} />
            {initialData ? 'Edit Webhook' : 'Add Webhook'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update your webhook endpoint configuration.'
              : 'Create a new webhook endpoint to receive event notifications.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Endpoint URL <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (errors.url) setErrors((prev) => ({ ...prev, url: undefined })) }}
              placeholder="https://your-app.com/webhooks/adnexus"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-primary)',
                border: `1px solid ${errors.url ? 'var(--status-error)' : 'var(--border-subtle)'}`,
                color: 'var(--text-primary)',
              }}
            />
            {errors.url && <p className="text-xs mt-1" style={{ color: 'var(--status-error)' }}>{errors.url}</p>}
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Secret Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="whsec_... (optional, for HMAC signature verification)"
                className="w-full px-3 py-2.5 pr-20 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Used to sign webhook payloads with HMAC-SHA256. Include this in your endpoint to verify authenticity.
            </p>
          </div>

          {/* Event Types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Event Types <span style={{ color: 'var(--status-error)' }}>*</span>
                {selectedEvents.length > 0 && (
                  <span className="ml-2 text-[10px] font-normal normal-case" style={{ color: 'var(--accent)' }}>
                    ({selectedEvents.length} selected)
                  </span>
                )}
              </label>
              {eventFilter === '' && (
                <button
                  onClick={() => setSelectedEvents(ALL_EVENT_TYPES.map((e) => e.key))}
                  className="text-[11px] font-medium transition-colors hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Select All
                </button>
              )}
            </div>

            <input
              type="text"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              placeholder="Filter events..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />

            {errors.events && <p className="text-xs mb-2" style={{ color: 'var(--status-error)' }}>{errors.events}</p>}

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {categories.map((category) => {
                const categoryEvents = filteredEvents.filter((e) => e.category === category)
                if (categoryEvents.length === 0) return null
                const allSelected = categoryEvents.every((e) => selectedEvents.includes(e.key))
                const someSelected = categoryEvents.some((e) => selectedEvents.includes(e.key)) && !allSelected

                return (
                  <div key={category} className="rounded-lg p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                        {category}
                      </span>
                      <div className="flex items-center gap-2">
                        {someSelected && (
                          <span className="text-[10px]" style={{ color: 'var(--accent)' }}>Partial</span>
                        )}
                        <button
                          onClick={() => allSelected ? deselectAllInCategory(category) : selectAllInCategory(category)}
                          className="text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
                          style={{
                            color: allSelected ? 'var(--status-error)' : 'var(--accent)',
                            background: allSelected ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.1)',
                          }}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {categoryEvents.map((eventDef) => {
                        const isChecked = selectedEvents.includes(eventDef.key)
                        return (
                          <button
                            key={eventDef.key}
                            onClick={() => toggleEvent(eventDef.key)}
                            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left transition-all hover:bg-[var(--bg-hover)]"
                            style={{
                              background: isChecked ? 'rgba(37,99,235,0.08)' : 'transparent',
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
                              style={{
                                borderColor: isChecked ? 'var(--accent)' : 'var(--border-subtle)',
                                background: isChecked ? 'var(--accent)' : 'transparent',
                              }}
                            >
                              {isChecked && <Check size={10} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium block" style={{ color: 'var(--text-primary)' }}>
                                {eventDef.label}
                              </span>
                              <span className="text-[10px] font-mono-data block truncate" style={{ color: 'var(--text-muted)' }}>
                                {eventDef.key}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {initialData ? 'Save Changes' : 'Create Webhook'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
