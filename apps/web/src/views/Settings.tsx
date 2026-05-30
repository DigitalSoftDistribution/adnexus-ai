// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link,
  Users,
  Bell,
  CreditCard,
  Shield,
  Plug,
  Code,
  Plus,
  Check,
  Trash2,
  Download,
  RefreshCw,
  ChevronRight,
  Copy,
  ExternalLink,
  Save,
  Smartphone,
  Globe,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Webhook,
  Zap,
  Brain,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: { Accept: 'application/json' } })
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

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json().catch(() => ({}))
}

async function apiDelete(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error((await res.json()).message || `HTTP ${res.status}`)
  return res.json().catch(() => ({}))
}

const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === ''

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TabKey = 'accounts' | 'team' | 'notifications' | 'billing' | 'security' | 'integrations' | 'api' | 'ai'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const tabTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(date: string): string {
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

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], mockData?: T) {
  const [data, setData] = useState<T | null>(isDemo ? mockData ?? null : null)
  const [loading, setLoading] = useState(isDemo ? (mockData !== undefined ? false : true) : true)
  const [error, setError] = useState<string | null>(null)

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
    if (isDemo && mockData !== undefined) {
      if (data !== mockData) setData(mockData)
      setLoading(false)
      return
    }
    refetch()
     
  }, [refetch])

  return { data, loading, error, refetch }
}

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

const tabs = [
  { key: 'accounts' as TabKey, label: 'Connected Accounts', icon: Link },
  { key: 'team' as TabKey, label: 'Team Members', icon: Users },
  { key: 'notifications' as TabKey, label: 'Notifications', icon: Bell },
  { key: 'billing' as TabKey, label: 'Billing', icon: CreditCard },
  { key: 'security' as TabKey, label: 'Security', icon: Shield },
  { key: 'integrations' as TabKey, label: 'Integrations', icon: Plug },
  { key: 'ai' as TabKey, label: 'AI Preferences', icon: Brain },
  { key: 'api' as TabKey, label: 'API & MCP', icon: Code },
]

const PLATFORM_COLORS: Record<string, string> = {
  Meta: '#1877F2',
  Google: '#DB4437',
  TikTok: '#00F2EA',
  Snap: '#FFFC00',
}

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  Owner: { bg: 'rgba(37,99,235,0.1)', color: '#2563EB' },
  Admin: { bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
  Analyst: { bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' },
  Viewer: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
}

/* ───────────────── Loading / Error / Empty ───────────────── */

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
    </div>
  )
}

function ErrorMessage({ message, retry }: { message: string; retry?: () => void }) {
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

/* ================================================================== */
/*  TAB 1 — CONNECTED ACCOUNTS                                         */
/* ================================================================== */

function ConnectedAccountsTab() {
  const mockAccounts = isDemo ? [
    { id: 'acc_1', platform: 'Meta' as const, name: 'Demo Workspace - Meta Ads', accountId: 'act_123456789', status: 'active' as const, lastSynced: '2026-06-18T10:00:00Z', brandColor: '#1877F2' },
    { id: 'acc_2', platform: 'Google' as const, name: 'Demo Workspace - Google Ads', accountId: '123-456-7890', status: 'active' as const, lastSynced: '2026-06-18T09:30:00Z', brandColor: '#DB4437' },
    { id: 'acc_3', platform: 'TikTok' as const, name: 'Demo Workspace - TikTok Ads', accountId: 'tiktok_987654', status: 'active' as const, lastSynced: '2026-06-18T08:15:00Z', brandColor: '#00F2EA' },
    { id: 'acc_4', platform: 'Snap' as const, name: 'Demo Workspace - Snap Ads', accountId: 'snap_456789', status: 'active' as const, lastSynced: '2026-06-18T07:45:00Z', brandColor: '#FFFC00' },
  ] : undefined
  const { data: accounts, loading, error, refetch } = useAsync(() => apiGet('/api/v1/settings/accounts'), [], mockAccounts)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [disconnectId, setDisconnectId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDisconnect = async (id: string) => {
    if (isDemo) { setDisconnectId(null); return }
    try {
      await apiDelete(`/api/v1/settings/accounts/${id}`)
      toast.success('Account disconnected', 'The account has been removed.')
      setDisconnectId(null)
      refetch()
    } catch (e: any) {
      toast.error('Failed to disconnect', e.message || 'An error occurred.')
    }
  }

  const handleRefresh = async (id: string) => {
    if (isDemo) { setRefreshingId(id); setTimeout(() => setRefreshingId(null), 800); return }
    setRefreshingId(id)
    try {
      await apiPost(`/api/v1/settings/accounts/${id}/refresh`, {})
      toast.success('Sync refreshed', 'Account data has been refreshed.')
    } catch (e: any) {
      toast.error('Refresh failed', e.message || 'Could not refresh account.')
    } finally {
      setRefreshingId(null)
      refetch()
    }
  }

  const handleConnect = async (platform: string) => {
    if (isDemo) { setShowConnectModal(false); return }
    try {
      await apiPost('/api/v1/settings/accounts', { platform })
      toast.success('Connection started', `Follow the OAuth flow to connect ${platform}.`)
      setShowConnectModal(false)
      refetch()
    } catch (e: any) {
      toast.error('Connection failed', e.message || 'Could not initiate connection.')
    }
  }

  const allPlatforms = ['Meta', 'Google', 'TikTok', 'Snap']
  const connectedPlatforms = new Set(accounts?.map((a: any) => a.platform) ?? [])
  const disconnectedPlatforms = allPlatforms.filter((p) => !connectedPlatforms.has(p as 'Meta' | 'Google' | 'TikTok' | 'Snap'))

  return (
    <motion.div {...tabTransition} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-space text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Connected Ad Accounts
        </h2>
        <Button
          onClick={() => setShowConnectModal(true)}
          size="sm"
          className="gap-1.5"
        >
          <Plus size={14} />
          Connect New Account
        </Button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} retry={refetch} />}

      {!loading && !error && (
        <>
          {/* Connected accounts */}
          <div className="space-y-3">
            {accounts?.map((account: any) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-surface flex items-center gap-4 px-4 py-3.5 group"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${account.brandColor || PLATFORM_COLORS[account.platform]}20`, color: account.brandColor || PLATFORM_COLORS[account.platform] }}
                >
                  <span className="text-xs font-bold">{account.platform?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {account.name}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background:
                          account.status === 'active'
                            ? 'var(--status-active)'
                            : account.status === 'error'
                              ? 'var(--status-error)'
                              : 'var(--status-warning)',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-data" style={{ color: 'var(--text-tertiary)' }}>
                      {account.accountId}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      · Synced {timeAgo(account.lastSynced)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] capitalize"
                    style={{
                      borderColor:
                        account.status === 'active'
                          ? 'rgba(16,185,129,0.3)'
                          : account.status === 'error'
                            ? 'rgba(239,68,68,0.3)'
                            : 'rgba(245,158,11,0.3)',
                      color:
                        account.status === 'active'
                          ? 'var(--status-active)'
                          : account.status === 'error'
                            ? 'var(--status-error)'
                            : 'var(--status-warning)',
                    }}
                  >
                    {account.status}
                  </Badge>
                  <button
                    onClick={() => handleRefresh(account.id)}
                    disabled={refreshingId === account.id}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Refresh sync"
                  >
                    <RefreshCw size={14} className={refreshingId === account.id ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => { setDisconnectId(account.id); setConfirmOpen(true) }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                    style={{ color: 'var(--status-error)' }}
                    title="Disconnect"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Disconnected platform cards */}
          {disconnectedPlatforms.length > 0 && (
            <div className="space-y-3 pt-2">
              {disconnectedPlatforms.map((platform) => (
                <div
                  key={platform}
                  className="card-surface flex items-center gap-4 px-4 py-3.5"
                  style={{ borderLeft: '3px solid var(--status-warning)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${PLATFORM_COLORS[platform]}15`,
                      color: PLATFORM_COLORS[platform],
                    }}
                  >
                    <span className="text-xs font-bold">{platform[0]}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {platform}
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--status-warning)' }}>
                      Not connected
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleConnect(platform)}>
                    <Plus size={12} />
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Connect Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Account</DialogTitle>
            <DialogDescription>Select a platform to connect a new ad account</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {allPlatforms.map((p) => (
              <button
                key={p}
                onClick={() => handleConnect(p)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg transition-all hover:scale-[1.02] cursor-pointer"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-lg font-bold" style={{ color: PLATFORM_COLORS[p] }}>
                  {p[0]}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {p}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => { setConfirmOpen(open); if (!open) setDisconnectId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this account? This will stop all data syncing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisconnectId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectId && handleDisconnect(disconnectId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

/* ================================================================== */
/*  TAB 2 — TEAM MEMBERS                                               */
/* ================================================================== */

function TeamTab() {
  const mockTeam = isDemo ? [
    { id: 'tm_1', name: 'Alex Rivera', email: 'alex@demoworkspace.com', role: 'Owner' as const, status: 'Active' as const, joinedAt: '2025-08-15T10:00:00Z', initials: 'AR' },
    { id: 'tm_2', name: 'Jordan Lee', email: 'jordan@demoworkspace.com', role: 'Admin' as const, status: 'Active' as const, joinedAt: '2025-09-20T11:00:00Z', initials: 'JL' },
    { id: 'tm_3', name: 'Casey Morgan', email: 'casey@demoworkspace.com', role: 'Analyst' as const, status: 'Active' as const, joinedAt: '2025-11-05T09:00:00Z', initials: 'CM' },
    { id: 'tm_4', name: 'Taylor Kim', email: 'taylor@demoworkspace.com', role: 'Viewer' as const, status: 'Active' as const, joinedAt: '2026-01-10T08:00:00Z', initials: 'TK' },
  ] : undefined
  const { data: members, loading, error, refetch } = useAsync(() => apiGet('/api/v1/settings/team'), [], mockTeam)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('Analyst')
  const [inviting, setInviting] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    if (isDemo) { setInviting(true); setTimeout(() => { setInviting(false); setShowInvite(false); setInviteEmail(''); setInviteRole('Analyst'); }, 600); return }
    setInviting(true)
    try {
      await apiPost('/api/v1/settings/team', { email: inviteEmail, role: inviteRole })
      toast.success('Invitation sent', `${inviteEmail} has been invited as ${inviteRole}.`)
      setShowInvite(false)
      setInviteEmail('')
      setInviteRole('Analyst')
      refetch()
    } catch (e: any) {
      toast.error('Invite failed', e.message || 'Could not send invitation.')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (isDemo) { setRemoveId(null); return }
    try {
      await apiDelete(`/api/v1/settings/team/${id}`)
      toast.success('Member removed', 'Team member has been removed.')
      setRemoveId(null)
      refetch()
    } catch (e: any) {
      toast.error('Remove failed', e.message || 'Could not remove member.')
    }
  }

  const handleRoleChange = async (id: string, role: string) => {
    if (isDemo) { setChangingRoleId(id); setTimeout(() => { setChangingRoleId(null); refetch() }, 400); return }
    setChangingRoleId(id)
    try {
      await apiPut(`/api/v1/settings/team/${id}`, { role })
      toast.success('Role updated', 'Member role has been updated.')
      refetch()
    } catch (e: any) {
      toast.error('Update failed', e.message || 'Could not update role.')
    } finally {
      setChangingRoleId(null)
    }
  }

  return (
    <motion.div {...tabTransition} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-space text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Team Members
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setShowInvite(true)}>
          <Plus size={14} />
          Invite Member
        </Button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} retry={refetch} />}

      {!loading && !error && (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map((h) => (
                    <th scope="col" key={h}
                      className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members?.map((member: any, idx: number) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="transition-colors hover:bg-[var(--bg-hover)] group"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                        >
                          {member.initials || member.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {member.email}
                    </td>
                    <td className="px-4 py-3">
                      {changingRoleId === member.id ? (
                        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          disabled={member.role === 'Owner'}
                          className="text-xs font-semibold px-2 py-1 rounded-full border-none outline-none cursor-pointer"
                          style={{
                            background: ROLE_STYLES[member.role]?.bg || 'rgba(139,92,246,0.1)',
                            color: ROLE_STYLES[member.role]?.color || '#8B5CF6',
                          }}
                        >
                          <option value="Owner" style={{ background: '#111' }}>Owner</option>
                          <option value="Admin" style={{ background: '#111' }}>Admin</option>
                          <option value="Analyst" style={{ background: '#111' }}>Analyst</option>
                          <option value="Viewer" style={{ background: '#111' }}>Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: member.status === 'Active' ? 'var(--status-active)' : 'var(--status-warning)',
                          }}
                        />
                        <span
                          className="text-xs"
                          style={{
                            color: member.status === 'Active' ? 'var(--status-active)' : 'var(--status-warning)',
                          }}
                        >
                          {member.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(member.joinedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setRemoveId(member.id); setRemoveConfirmOpen(true) }}
                        className="p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/10"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join your workspace</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                <option value="Admin">Admin</option>
                <option value="Analyst">Analyst</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <Loader2 size={14} className="animate-spin" /> : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation AlertDialog */}
      <AlertDialog open={removeConfirmOpen} onOpenChange={(open) => { setRemoveConfirmOpen(open); if (!open) setRemoveId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? They will lose access to your workspace immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRemoveId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeId && handleRemove(removeId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

/* ================================================================== */
/*  TAB 3 — NOTIFICATIONS                                              */
/* ================================================================== */

function NotificationsTab() {
  const mockPrefs = isDemo ? {
    email: { draftApproved: true, draftRejected: true, ruleTriggered: true, goalAlert: true, budgetAlert: true, dailyDigest: true, weeklySummary: true },
    inApp: { draftApproved: true, draftRejected: false, ruleTriggered: true, goalAlert: true, budgetAlert: true, dailyDigest: false, weeklySummary: true },
    slack: { enabled: true, channel: '#ad-alerts', webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXX' },
  } : undefined
  const { data: prefs, loading, error, refetch } = useAsync(() => apiGet('/api/v1/settings').then((r) => r.notifications), [], mockPrefs)
  const [saving, setSaving] = useState(false)
  const [localPrefs, setLocalPrefs] = useState<any>(null)
  const [slackTesting, setSlackTesting] = useState(false)

  useEffect(() => {
    if (prefs) setLocalPrefs(prefs)
  }, [prefs])

  const handleToggle = (category: 'email' | 'inApp', key: string, value: boolean) => {
    if (!localPrefs) return
    setLocalPrefs({
      ...localPrefs,
      [category]: { ...localPrefs[category], [key]: value },
    })
  }

  const handleSave = async () => {
    if (!localPrefs) return
    if (isDemo) { setSaving(true); setTimeout(() => { setSaving(false); toast.success('Preferences saved'); refetch() }, 600); return }
    setSaving(true)
    try {
      await apiPut('/api/v1/settings', { notifications: localPrefs })
      toast.success('Preferences saved', 'Notification preferences updated.')
      refetch()
    } catch (e: any) {
      toast.error('Save failed', e.message || 'Could not save preferences.')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSlack = async () => {
    if (!localPrefs?.slack?.webhookUrl) return
    if (isDemo) { setSlackTesting(true); setTimeout(() => { setSlackTesting(false); toast.success('Slack test sent') }, 800); return }
    setSlackTesting(true)
    try {
      await apiPost('/api/v1/settings/notifications/test-slack', { url: localPrefs.slack.webhookUrl })
      toast.success('Test message sent', 'Check your Slack channel.')
    } catch (e: any) {
      toast.error('Test failed', e.message || 'Could not send test message.')
    } finally {
      setSlackTesting(false)
    }
  }

  const toggleItems = [
    { key: 'draftApproved', label: 'Draft approved', desc: 'When a draft change is approved' },
    { key: 'draftRejected', label: 'Draft rejected', desc: 'When a draft change is rejected' },
    { key: 'ruleTriggered', label: 'Rule triggered', desc: 'When an automation rule fires' },
    { key: 'goalAlert', label: 'Goal alert', desc: 'When a performance goal is at risk' },
    { key: 'budgetAlert', label: 'Budget alert', desc: 'When campaign budget is nearly spent' },
    { key: 'dailyDigest', label: 'Daily digest', desc: 'Daily summary of all activity' },
    { key: 'weeklySummary', label: 'Weekly summary', desc: 'Weekly performance report' },
  ]

  return (
    <motion.div {...tabTransition} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-space text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Notification Preferences
        </h2>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </Button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} retry={refetch} />}

      {!loading && !error && localPrefs && (
        <>
          {/* Email Notifications */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <MailIcon size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Email Notifications
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {toggleItems.map((item) => (
                <div key={`email-${item.key}`} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {item.desc}
                    </p>
                  </div>
                  <Switch
                    checked={localPrefs.email[item.key as keyof typeof localPrefs.email]}
                    onCheckedChange={(v) => handleToggle('email', item.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Bell size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                In-App Notifications
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {toggleItems.map((item) => (
                <div key={`inapp-${item.key}`} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {item.desc}
                    </p>
                  </div>
                  <Switch
                    checked={localPrefs.inApp[item.key as keyof typeof localPrefs.inApp]}
                    onCheckedChange={(v) => handleToggle('inApp', item.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Slack Integration */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <MessageSquare size={16} style={{ color: '#8B5CF6' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Slack Integration
              </h3>
              {localPrefs.slack?.enabled && (
                <Badge variant="outline" className="ml-auto text-[10px]" style={{ borderColor: 'rgba(16,185,129,0.3)', color: 'var(--status-active)' }}>
                  Connected
                </Badge>
              )}
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Enable Slack notifications
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Send alerts to your Slack workspace
                  </p>
                </div>
                <Switch
                  checked={localPrefs.slack?.enabled ?? false}
                  onCheckedChange={(v) =>
                    setLocalPrefs({ ...localPrefs, slack: { ...localPrefs.slack, enabled: v } })
                  }
                />
              </div>
              {localPrefs.slack?.enabled && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      Webhook URL
                    </label>
                    <input
                      type="text"
                      value={localPrefs.slack?.webhookUrl || ''}
                      onChange={(e) =>
                        setLocalPrefs({
                          ...localPrefs,
                          slack: { ...localPrefs.slack, webhookUrl: e.target.value },
                        })
                      }
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      Channel
                    </label>
                    <input
                      type="text"
                      value={localPrefs.slack?.channel || ''}
                      onChange={(e) =>
                        setLocalPrefs({
                          ...localPrefs,
                          slack: { ...localPrefs.slack, channel: e.target.value },
                        })
                      }
                      placeholder="#ad-alerts"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleTestSlack} disabled={slackTesting} className="gap-1.5">
                    {slackTesting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Test Connection
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}

function MailIcon({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

/* ================================================================== */
/*  TAB 4 — BILLING                                                    */
/* ================================================================== */

function BillingTab() {
  const mockSubscription = isDemo ? { plan: 'Pro', status: 'active' as const, seats: 5, price: 499, interval: 'monthly' as const, nextBilling: '2026-07-15', paymentMethod: { type: 'Visa' as const, last4: '4242' }, features: ['AI Optimization', 'Advanced Analytics', 'API Access', 'Priority Support', 'Custom Integrations'] } : undefined
  const mockCredits = isDemo ? { used: 3420, limit: 5000, resetDate: '2026-07-01' } : undefined
  const mockInvoices = isDemo ? [
    { id: 'inv_1', date: '2026-06-01', amount: 499.00, status: 'Paid' as const, description: 'Pro Plan - June 2026' },
    { id: 'inv_2', date: '2026-05-01', amount: 499.00, status: 'Paid' as const, description: 'Pro Plan - May 2026' },
    { id: 'inv_3', date: '2026-04-01', amount: 499.00, status: 'Paid' as const, description: 'Pro Plan - April 2026' },
    { id: 'inv_4', date: '2026-03-01', amount: 499.00, status: 'Paid' as const, description: 'Pro Plan - March 2026' },
    { id: 'inv_5', date: '2026-02-01', amount: 499.00, status: 'Paid' as const, description: 'Pro Plan - February 2026' },
    { id: 'inv_6', date: '2026-01-01', amount: 499.00, status: 'Paid' as const, description: 'Pro Plan - January 2026' },
  ] : undefined
  const { data: subscription, loading: subLoading, error: subError, refetch: refetchSub } = useAsync(() => apiGet('/api/v1/settings').then((r) => r.billing?.subscription), [], mockSubscription)
  const { data: credits, loading: credLoading, error: credError, refetch: refetchCred } = useAsync(() => apiGet('/api/v1/settings').then((r) => r.billing?.credits), [], mockCredits)
  const { data: invoices, loading: invLoading, error: invError, refetch: refetchInv } = useAsync(() => apiGet('/api/v1/settings').then((r) => r.billing?.invoices), [], mockInvoices)
  const [managingBilling, setManagingBilling] = useState(false)

  const handleManageSubscription = async () => {
    if (isDemo) { setManagingBilling(true); setTimeout(() => setManagingBilling(false), 600); return }
    setManagingBilling(true)
    try {
      const { url } = await apiPost('/api/v1/settings/billing/portal', {})
      if (url) window.open(url, '_blank')
    } catch (e: any) {
      toast.error('Error', e.message || 'Could not open billing portal.')
    } finally {
      setManagingBilling(false)
    }
  }

  const loading = subLoading || credLoading || invLoading
  const error = subError || credError || invError

  return (
    <motion.div {...tabTransition} className="space-y-6">
      <h2 className="font-space text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Billing
      </h2>

      {loading && <LoadingSpinner />}
      {error && (
        <ErrorMessage
          message={error}
          retry={() => { refetchSub(); refetchCred(); refetchInv() }}
        />
      )}

      {!loading && !error && subscription && credits && (
        <>
          {/* Current Plan */}
          <div className="card-surface p-6" style={{ border: '1px solid var(--border-active)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {subscription.plan} Plan
                  </h3>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                  >
                    Current
                  </span>
                </div>
                <p className="font-mono-data text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  ${subscription.price}
                  <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                    /{subscription.interval === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </p>
              </div>
              <Button onClick={handleManageSubscription} disabled={managingBilling} size="sm" className="gap-1.5">
                {managingBilling ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                Manage
              </Button>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-2 mb-5">
              {subscription.features.map((f: string) => (
                <span
                  key={f}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  <Check size={10} className="inline mr-1" style={{ color: 'var(--status-active)' }} />
                  {f}
                </span>
              ))}
            </div>

            {/* Usage bars */}
            <div className="space-y-4 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    AI credits this month
                  </span>
                  <span className="text-xs font-mono-data" style={{ color: 'var(--text-primary)' }}>
                    {credits.used} / {credits.limit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((credits.used / credits.limit) * 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background:
                        credits.used / credits.limit > 0.9
                          ? 'var(--status-error)'
                          : credits.used / credits.limit > 0.7
                            ? 'var(--status-warning)'
                            : 'var(--accent)',
                    }}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Resets on {new Date(credits.resetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>Next billing: {new Date(subscription.nextBilling).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="mx-1">|</span>
              <CreditCard size={12} />
              <span>
                {subscription.paymentMethod.type} ending in {subscription.paymentMethod.last4}
              </span>
            </div>
          </div>

          {/* Invoice History */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Invoice History
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Date', 'Amount', 'Status', ''].map((h) => (
                    <th scope="col" key={h}
                      className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices?.map((inv: any, idx: number) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(inv.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono-data" style={{ color: 'var(--text-primary)' }}>
                      ${inv.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor:
                            inv.status === 'Paid'
                              ? 'rgba(16,185,129,0.3)'
                              : inv.status === 'Failed'
                                ? 'rgba(239,68,68,0.3)'
                                : 'rgba(245,158,11,0.3)',
                          color:
                            inv.status === 'Paid'
                              ? 'var(--status-active)'
                              : inv.status === 'Failed'
                                ? 'var(--status-error)'
                                : 'var(--status-warning)',
                        }}
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }}>
                        <Download size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  )
}

/* ================================================================== */
/*  TAB 5 — SECURITY                                                   */
/* ================================================================== */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextInput, SubmitButton } from '@/components/forms';
import SEO from '../components/SEO';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

function SecurityTab() {
  const mockSessions = isDemo ? [
    { id: 'sess_1', browser: 'Chrome 126', device: 'macOS', location: 'San Francisco, CA', ip: '203.0.113.45', current: true, lastActive: 'Active now' },
    { id: 'sess_2', browser: 'Safari 17', device: 'iPhone', location: 'San Francisco, CA', ip: '203.0.113.78', current: false, lastActive: '2 hours ago' },
    { id: 'sess_3', browser: 'Firefox 127', device: 'Windows 11', location: 'Austin, TX', ip: '198.51.100.22', current: false, lastActive: '3 days ago' },
    { id: 'sess_4', browser: 'Chrome 125', device: 'Linux', location: 'New York, NY', ip: '192.0.2.105', current: false, lastActive: '1 week ago' },
  ] : undefined
  const { data: sessions, loading, error, refetch } = useAsync(() => apiGet('/api/v1/settings').then((r) => r.security?.sessions), [], mockSessions)
  const [twoFA, setTwoFA] = useState(true)
  const [showTotpSetup, setShowTotpSetup] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [revokeAllConfirmOpen, setRevokeAllConfirmOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError: setFormError,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleChangePassword = async (data: ChangePasswordInput) => {
    setPwSuccess(false)
    if (isDemo) { setTimeout(() => { setPwSuccess(true); reset(); toast.success('Password updated') }, 400); return }
    try {
      await apiPut('/api/v1/settings/security/password', { currentPassword: data.currentPassword, newPassword: data.newPassword })
      setPwSuccess(true)
      toast.success('Password updated', 'Your password has been changed successfully.')
      reset()
    } catch (e: any) {
      setFormError('root', { message: e.message || 'Failed to change password' })
      toast.error('Update failed', e.message || 'Failed to change password.')
    }
  }

  const handleRevokeSession = async (id: string) => {
    if (isDemo) { return }
    try {
      await apiDelete(`/api/v1/settings/security/sessions/${id}`)
      toast.success('Session revoked')
      refetch()
    } catch (e: any) {
      toast.error('Error', e.message || 'Could not revoke session.')
    }
  }

  const handleRevokeAll = async () => {
    if (isDemo) { setRevokeAllConfirmOpen(false); return }
    try {
      await apiDelete('/api/v1/settings/security/sessions')
      toast.success('All sessions revoked', 'All other sessions have been terminated.')
      setRevokeAllConfirmOpen(false)
      refetch()
    } catch (e: any) {
      toast.error('Error', e.message || 'Could not revoke sessions.')
    }
  }

  return (
    <motion.div {...tabTransition} className="space-y-6">
      <h2 className="font-space text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Security
      </h2>

      {/* Change Password */}
      <div className="card-surface overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Shield size={16} style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Change Password
          </h3>
        </div>
        <form onSubmit={handleSubmit(handleChangePassword)} className="p-5 space-y-4">
          <TextInput
            label="Current Password"
            name="currentPassword"
            type="password"
            placeholder="Enter current password"
            register={register}
            error={errors.currentPassword?.message}
            required
            disabled={isSubmitting}
          />
          <TextInput
            label="New Password"
            name="newPassword"
            type="password"
            placeholder="Enter new password"
            register={register}
            error={errors.newPassword?.message}
            required
            disabled={isSubmitting}
          />
          <TextInput
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            register={register}
            error={errors.confirmPassword?.message}
            required
            disabled={isSubmitting}
          />
          {errors.root && <p className="text-xs" style={{ color: 'var(--status-error)' }}>{errors.root.message}</p>}
          {pwSuccess && <p className="text-xs" style={{ color: 'var(--status-active)' }}>Password updated successfully</p>}
          <SubmitButton
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
            variant="primary"
            size="sm"
            fullWidth={false}
          >
            Update Password
          </SubmitButton>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Shield size={18} style={{ color: 'var(--status-active)' }} />
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Two-Factor Authentication
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Add an extra layer of security with TOTP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: twoFA ? 'var(--status-active)' : 'var(--text-tertiary)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: twoFA ? 'var(--status-active)' : 'var(--text-tertiary)' }} />
              {twoFA ? 'Enabled' : 'Disabled'}
            </span>
            <Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); if (v) setShowTotpSetup(true) }} />
          </div>
        </div>
        {showTotpSetup && (
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-primary)', border: '1px dashed var(--border-subtle)' }}>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex items-center gap-4">
              <div
                className="w-32 h-32 rounded-lg flex items-center justify-center"
                style={{ background: '#fff' }}
              >
                <div className="w-28 h-28" style={{
                  background: 'repeating-conic-gradient(#000 0% 25%, transparent 0% 50%) 50% / 10px 10px',
                  borderRadius: 4,
                }} />
              </div>
              <div className="space-y-2">
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Or enter this setup key manually:
                </p>
                <code className="text-xs font-mono-data px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  XJ2K-9FMP-3LQW-7RVT
                </code>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowTotpSetup(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => { setShowTotpSetup(false); toast.success('2FA enabled') }}>
                <Check size={14} />
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="card-surface overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Active Sessions
          </h3>
          <Button variant="outline" size="sm" onClick={() => setRevokeAllConfirmOpen(true)} className="gap-1.5">
            <Trash2 size={12} />
            Revoke All
          </Button>
        </div>

        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} retry={refetch} />}

        {!loading && !error && (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {sessions?.map((session: any) => (
              <div key={session.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  {session.current ? (
                    <Globe size={16} style={{ color: 'var(--accent)' }} />
                  ) : (
                    <Smartphone size={16} style={{ color: 'var(--text-secondary)' }} />
                  )}
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {session.browser} on {session.device}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {session.location} · {session.ip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {session.current && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--status-active)' }}
                    >
                      Current
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {session.lastActive}
                  </span>
                  {!session.current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="p-1 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="Revoke session"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoke All Confirmation */}
      <AlertDialog open={revokeAllConfirmOpen} onOpenChange={setRevokeAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke All Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              This will terminate all other active sessions. You will remain logged in on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAll}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Revoke All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

/* ================================================================== */
/*  TAB 6 — INTEGRATIONS                                               */
/* ================================================================== */

function IntegrationsTab() {
  const mockConfig = isDemo ? {
    slack: { connected: true, workspace: 'Demo Workspace', channel: '#ad-alerts' },
    webhook: { url: 'https://api.demoworkspace.com/webhooks/adnexus', secret: 'whsec_••••••••••••••••', events: ['campaign.created', 'draft.approved', 'ai.optimization'] },
    crm: { enabled: true, url: 'https://demoworkspace.salesforce.com/webhooks/ leads' },
  } : undefined
  const { data: config, loading, error, refetch } = useAsync(() => apiGet('/api/v1/settings').then((r) => r.integrations), [], mockConfig)
  const [saving, setSaving] = useState(false)
  const [localConfig, setLocalConfig] = useState<any>(null)

  useEffect(() => {
    if (config) setLocalConfig(config)
  }, [config])

  const handleSave = async () => {
    if (!localConfig) return
    if (isDemo) { setSaving(true); setTimeout(() => { setSaving(false); toast.success('Integrations saved'); refetch() }, 600); return }
    setSaving(true)
    try {
      await apiPut('/api/v1/settings', { integrations: localConfig })
      toast.success('Integrations saved', 'Integration settings updated.')
      refetch()
    } catch (e: any) {
      toast.error('Save failed', e.message || 'Could not save integrations.')
    } finally {
      setSaving(false)
    }
  }

  const webhookEvents = [
    { key: 'campaign.created', label: 'Campaign Created' },
    { key: 'draft.approved', label: 'Draft Approved' },
    { key: 'draft.rejected', label: 'Draft Rejected' },
    { key: 'alert.triggered', label: 'Alert Triggered' },
    { key: 'rule.executed', label: 'Rule Executed' },
    { key: 'budget.threshold', label: 'Budget Threshold' },
  ]

  return (
    <motion.div {...tabTransition} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-space text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Integrations
        </h2>
        {localConfig && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </Button>
        )}
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} retry={refetch} />}

      {!loading && !error && localConfig && (
        <>
          {/* Slack */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <MessageSquare size={16} style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Slack</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {localConfig.slack?.connected ? `Connected to ${localConfig.slack.workspace}` : 'Not connected'}
                </p>
              </div>
              <div className="ml-auto">
                <Switch
                  checked={localConfig.slack?.connected ?? false}
                  onCheckedChange={(v) => setLocalConfig({ ...localConfig, slack: { ...localConfig.slack, connected: v } })}
                />
              </div>
            </div>
            {localConfig.slack?.connected && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Channel
                  </label>
                  <input
                    type="text"
                    value={localConfig.slack?.channel || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, slack: { ...localConfig.slack, channel: e.target.value } })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Webhook */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.15)' }}>
                <Webhook size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Webhook</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Configure webhook for real-time events
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Webhook URL
                </label>
                <input
                  type="text"
                  value={localConfig.webhook?.url || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, webhook: { ...localConfig.webhook, url: e.target.value } })}
                  placeholder="https://your-app.com/webhooks/adnexus"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Secret Key
                </label>
                <input
                  type="text"
                  value={localConfig.webhook?.secret || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, webhook: { ...localConfig.webhook, secret: e.target.value } })}
                  placeholder="whsec_..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono-data"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  Event Types
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {webhookEvents.map((evt) => (
                    <label key={evt.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localConfig.webhook?.events?.includes(evt.key) || false}
                        onChange={(e) => {
                          const events = e.target.checked
                            ? [...(localConfig.webhook?.events || []), evt.key]
                            : (localConfig.webhook?.events || []).filter((ev: string) => ev !== evt.key)
                          setLocalConfig({ ...localConfig, webhook: { ...localConfig.webhook, events } })
                        }}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{evt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CRM */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <ExternalLink size={16} style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CRM Forwarding</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Forward lead data to your CRM
                </p>
              </div>
              <div className="ml-auto">
                <Switch
                  checked={localConfig.crm?.enabled ?? false}
                  onCheckedChange={(v) => setLocalConfig({ ...localConfig, crm: { ...localConfig.crm, enabled: v } })}
                />
              </div>
            </div>
            {localConfig.crm?.enabled && (
              <div className="p-5">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  CRM Webhook URL
                </label>
                <input
                  type="text"
                  value={localConfig.crm?.url || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, crm: { ...localConfig.crm, url: e.target.value } })}
                  placeholder="https://company.hubspot.com/webhooks/..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>
            )}
          </div>

          {/* Zapier */}
          <div className="card-surface p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
              <Zap size={18} style={{ color: '#F97316' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Zapier</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Connect with 5000+ apps via Zapier. Use our API key to set up Zaps.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open('https://zapier.com/apps', '_blank')}>
              <ExternalLink size={12} />
              Open Zapier
            </Button>
          </div>
        </>
      )}
    </motion.div>
  )
}

/* ================================================================== */
/*  TAB 7 — AI PREFERENCES                                             */
/* ================================================================== */

function AIPreferencesTab() {
  const mockAI = isDemo ? {
    model: 'gpt-4o' as const,
    autoOptimize: true,
    creativeGeneration: true,
    budgetPacing: true,
    aBTesting: true,
    audienceTargeting: true,
    optimizationAggressiveness: 'balanced' as const,
    maxDailyChanges: 10,
    preferredMetrics: ['roas', 'cpa', 'ctr'],
    customInstructions: 'Focus on cost efficiency. Prioritize campaigns with ROAS above 2.0. Pause underperformers after 3 days.',
  } : undefined

  const { data: aiPrefs, loading, error, refetch } = useAsync(() => apiGet('/api/v1/settings/ai'), [], mockAI)
  const [saving, setSaving] = useState(false)
  const [localPrefs, setLocalPrefs] = useState<any>(null)

  useEffect(() => {
    if (aiPrefs) setLocalPrefs(aiPrefs)
  }, [aiPrefs])

  const handleToggle = (key: string, value: boolean) => {
    if (!localPrefs) return
    setLocalPrefs({ ...localPrefs, [key]: value })
  }

  const handleSave = async () => {
    if (!localPrefs) return
    if (isDemo) { setSaving(true); setTimeout(() => { setSaving(false); toast.success('AI preferences saved'); refetch() }, 600); return }
    setSaving(true)
    try {
      await apiPut('/api/v1/settings/ai', localPrefs)
      toast.success('AI preferences saved', 'Your AI optimization preferences have been updated.')
      refetch()
    } catch (e: any) {
      toast.error('Save failed', e.message || 'Could not save AI preferences.')
    } finally {
      setSaving(false)
    }
  }

  const toggleItems = [
    { key: 'autoOptimize', label: 'Auto-Optimize Campaigns', desc: 'Let AI automatically adjust bids, budgets, and targeting' },
    { key: 'creativeGeneration', label: 'AI Creative Generation', desc: 'Generate ad creatives, headlines, and copy with AI' },
    { key: 'budgetPacing', label: 'Smart Budget Pacing', desc: 'AI distributes budget across campaigns for optimal performance' },
    { key: 'aBTesting', label: 'Auto A/B Testing', desc: 'Automatically create and manage A/B tests' },
    { key: 'audienceTargeting', label: 'Audience Targeting', desc: 'AI discovers and targets high-value audience segments' },
  ]

  const modelOptions = [
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
    { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  ]

  const aggressivenessOptions = [
    { value: 'conservative', label: 'Conservative' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'aggressive', label: 'Aggressive' },
  ]

  const metricOptions = [
    { key: 'roas', label: 'ROAS' },
    { key: 'cpa', label: 'CPA' },
    { key: 'ctr', label: 'CTR' },
    { key: 'cpc', label: 'CPC' },
    { key: 'cvr', label: 'CVR' },
    { key: 'impressions', label: 'Impressions' },
  ]

  return (
    <motion.div {...tabTransition} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-space text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          AI Preferences
        </h2>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </Button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} retry={refetch} />}

      {!loading && !error && localPrefs && (
        <>
          {/* AI Model */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Brain size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                AI Model
              </h3>
            </div>
            <div className="p-5">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Model Selection
              </label>
              <select
                value={localPrefs.model || 'gpt-4o'}
                onChange={(e) => setLocalPrefs({ ...localPrefs, model: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                {modelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Zap size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                AI Features
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {toggleItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {item.desc}
                    </p>
                  </div>
                  <Switch
                    checked={localPrefs[item.key] ?? false}
                    onCheckedChange={(v) => handleToggle(item.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Optimization Behavior */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Shield size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Optimization Behavior
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Aggressiveness
                </label>
                <select
                  value={localPrefs.optimizationAggressiveness || 'balanced'}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, optimizationAggressiveness: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {aggressivenessOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Max Daily Changes
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={localPrefs.maxDailyChanges ?? 10}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, maxDailyChanges: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  Preferred Metrics
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {metricOptions.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(localPrefs.preferredMetrics || []).includes(m.key)}
                        onChange={(e) => {
                          const metrics = e.target.checked
                            ? [...(localPrefs.preferredMetrics || []), m.key]
                            : (localPrefs.preferredMetrics || []).filter((k: string) => k !== m.key)
                          setLocalPrefs({ ...localPrefs, preferredMetrics: metrics })
                        }}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Custom Instructions
              </h3>
            </div>
            <div className="p-5">
              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                Provide custom guidance for the AI when optimizing campaigns.
              </p>
              <textarea
                value={localPrefs.customInstructions || ''}
                onChange={(e) => setLocalPrefs({ ...localPrefs, customInstructions: e.target.value })}
                placeholder="E.g., Focus on cost efficiency. Prioritize campaigns with ROAS above 2.0."
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}

/* ================================================================== */
/*  TAB 8 — API & MCP                                                  */
/* ================================================================== */

function ApiMcpTab() {
  const mockKeys = isDemo ? [
    { id: 'key_1', name: 'Production API Key', preview: 'adx_live_sk_••••••••a3f7', permissions: ['read:campaigns', 'write:campaigns', 'read:reports'], createdAt: '2026-01-15T10:00:00Z', lastUsed: '2 hours ago' },
    { id: 'key_2', name: 'Zapier Integration', preview: 'adx_live_sk_••••••••b8e2', permissions: ['read:campaigns', 'read:reports', 'read:drafts'], createdAt: '2026-02-20T14:00:00Z', lastUsed: '1 day ago' },
    { id: 'key_3', name: 'Data Warehouse ETL', preview: 'adx_live_sk_••••••••c1d5', permissions: ['read:all'], createdAt: '2026-03-10T09:00:00Z', lastUsed: '5 minutes ago' },
    { id: 'key_4', name: 'Slack Bot', preview: 'adx_live_sk_••••••••d9a4', permissions: ['read:campaigns', 'write:alerts'], createdAt: '2026-04-01T11:00:00Z', lastUsed: '3 days ago' },
    { id: 'key_5', name: 'Staging Test Key', preview: 'adx_test_sk_••••••••e2b6', permissions: ['read:all', 'write:all'], createdAt: '2026-05-15T08:00:00Z', lastUsed: 'Never' },
  ] : undefined
  const { data: keys, loading, error, refetch } = useAsync(() => apiGet('/api/v1/settings').then((r) => r.apiKeys), [], mockKeys)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGenModal, setShowGenModal] = useState(false)
  const [genName, setGenName] = useState('')
  const [genRead, setGenRead] = useState(true)
  const [genWrite, setGenWrite] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleGenerate = async () => {
    if (!genName.trim()) return
    if (isDemo) { setGenerating(true); setTimeout(() => { setGenerating(false); setShowGenModal(false); setGenName(''); setGenRead(true); setGenWrite(false); toast.success('API key generated'); refetch() }, 600); return }
    setGenerating(true)
    try {
      const perms = [...(genRead ? ['read'] : []), ...(genWrite ? ['write'] : [])]
      await apiPost('/api/v1/settings/api-keys', { name: genName, permissions: perms })
      toast.success('API key generated', 'Your new API key has been created.')
      setShowGenModal(false)
      setGenName('')
      setGenRead(true)
      setGenWrite(false)
      refetch()
    } catch (e: any) {
      toast.error('Generation failed', e.message || 'Could not generate API key.')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (isDemo) { setRevokeId(null); return }
    try {
      await apiDelete(`/api/v1/settings/api-keys/${id}`)
      toast.success('API key revoked', 'The key has been invalidated.')
      setRevokeId(null)
      refetch()
    } catch (e: any) {
      toast.error('Revoke failed', e.message || 'Could not revoke API key.')
    }
  }

  const mcpConfigSnippet = `{
  "mcpServers": {
    "adnexus": {
      "url": "${API_BASE}/mcp/v1"
    }
  }
}`

  return (
    <motion.div {...tabTransition} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-space text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          API & MCP Configuration
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setShowGenModal(true)}>
          <Plus size={14} />
          Generate New Key
        </Button>
      </div>

      {/* API Keys Table */}
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} retry={refetch} />}

      {!loading && !error && (
        <div className="card-surface overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              API Keys
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Name', 'Key', 'Permissions', 'Created', 'Last Used', ''].map((h) => (
                    <th scope="col" key={h}
                      className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys?.map((key: any, idx: number) => (
                  <motion.tr
                    key={key.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="group"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {key.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono-data px-2 py-0.5 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
                          {key.preview}
                        </code>
                        <button
                          onClick={() => handleCopy(`adx_live_sk_${key.id}_secret`, key.id)}
                          className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--text-tertiary)' }}
                          title="Copy"
                        >
                          {copiedId === key.id ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {key.permissions.map((p: string) => (
                          <Badge key={p} variant="outline" className="text-[10px] capitalize">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(key.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {key.lastUsed}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setRevokeId(key.id); setRevokeConfirmOpen(true) }}
                        className="p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/10"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Revoke key"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MCP Server */}
      <div className="card-surface overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            MCP Server Endpoint
          </h3>
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--status-active)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--status-active)' }} />
            Active
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono-data"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              {API_BASE}/mcp/v1
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopy(`${API_BASE}/mcp/v1`, 'mcp-url')}>
              {copiedId === 'mcp-url' ? <Check size={14} /> : <Copy size={14} />}
              Copy URL
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent)' }}>
              <ExternalLink size={12} />
              View API Documentation
            </a>
            <a href="#" className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent)' }}>
              <ExternalLink size={12} />
              OpenAPI Spec
            </a>
          </div>
          <div className="relative rounded-lg p-4 overflow-x-auto" style={{ background: 'var(--bg-primary)' }}>
            <pre className="text-xs font-mono-data" style={{ color: 'var(--text-secondary)' }}>
              <code>{mcpConfigSnippet}</code>
            </pre>
            <button
              onClick={() => handleCopy(mcpConfigSnippet, 'mcp-config')}
              className="absolute top-2 right-2 p-1.5 rounded"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {copiedId === 'mcp-config' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="card-surface p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Rate Limits
        </h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Requests this hour
          </span>
          <span className="text-xs font-mono-data" style={{ color: 'var(--text-primary)' }}>
            500 / 1,000
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '50%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'var(--accent)' }}
          />
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
          Rate limit resets at the top of each hour.
        </p>
      </div>

      {/* Generate Key Modal */}
      <Dialog open={showGenModal} onOpenChange={setShowGenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>Create a new API key with specific permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Key Name
              </label>
              <input
                type="text"
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                placeholder="e.g., Production, Staging"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                Permissions
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genRead}
                    onChange={(e) => setGenRead(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Read</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>View campaigns, reports, analytics</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genWrite}
                    onChange={(e) => setGenWrite(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Write</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Create, update, and delete campaigns</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating || !genName.trim() || (!genRead && !genWrite)}>
              {generating ? <Loader2 size={14} className="animate-spin" /> : 'Generate Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation AlertDialog */}
      <AlertDialog open={revokeConfirmOpen} onOpenChange={(open) => { setRevokeConfirmOpen(open); if (!open) setRevokeId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately invalidate the API key. Any integrations using it will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeId && handleRevoke(revokeId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

/* ================================================================== */
/*  MAIN SETTINGS PAGE                                                 */
/* ================================================================== */

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') || 'accounts') as TabKey

  const setTab = (tab: TabKey) => {
    setSearchParams({ tab })
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'accounts':
        return <ConnectedAccountsTab />
      case 'team':
        return <TeamTab />
      case 'notifications':
        return <NotificationsTab />
      case 'billing':
        return <BillingTab />
      case 'security':
        return <SecurityTab />
      case 'integrations':
        return <IntegrationsTab />
      case 'ai':
        return <AIPreferencesTab />
      case 'api':
        return <ApiMcpTab />
      default:
        return <ConnectedAccountsTab />
    }
  }

  return (
    <>
    <SEO
      title="Settings"
      description="Manage your AdNexus AI account settings, team members, billing, API keys, integrations, and notification preferences."
      keywords="settings, account settings, team management, billing, API keys, integrations"
    />
    <div className="flex min-h-[calc(100dvh-64px)]">
      {/* Desktop sidebar */}
      <aside
        className="w-64 flex-shrink-0 py-6 px-3 hidden lg:block"
        style={{
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative"
                style={{
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-active-tab"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: 'var(--accent)' }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <Icon size={16} />
                <span>{tab.label}</span>
                <ChevronRight
                  size={14}
                  className="ml-auto transition-opacity"
                  style={{ color: 'var(--text-tertiary)', opacity: isActive ? 1 : 0 }}
                />
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile tab bar */}
      <div
        className="lg:hidden flex overflow-x-auto gap-1 px-4 py-3"
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content area */}
      <main className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-[720px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    </>
  )
}
