// @ts-nocheck
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Shield, Building2, Pencil, Send,
  Check, X, Key, Clock, Activity, Wifi, WifiOff,
  RefreshCw, Plus, Copy, Eye, EyeOff, Trash2,
  ChevronDown, AlertTriangle, Users, Bell,
  Lock, FileText, DollarSign, Zap, BarChart3,
  TrendingUp, CheckCircle2, XCircle, MoreHorizontal,
  Edit3, UserMinus, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Switch } from '../components/ui/switch'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import SEO from '../components/SEO';

/* ────────────────────────────────────────────────
   DESIGN TOKENS
   ──────────────────────────────────────────────── */
const C = {
  bg: '#0a0a0a',
  bgElevated: '#111111',
  bgCard: '#141414',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.10)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  accent: '#c3f53b',
  accentHover: '#b1e635',
  accentMuted: 'rgba(195,245,59,0.15)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
}

/* ────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────── */
interface TeamMember {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Editor' | 'Viewer'
  status: 'Active' | 'Invited'
  lastActive: string
  avatar?: string
}

interface ApiKey {
  id: string
  name: string
  prefix: string
  created: string
  lastUsed: string
  status: 'Active' | 'Revoked'
}

interface ConnectedAccount {
  id: string
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap'
  accountName: string
  status: 'Connected' | 'Disconnected'
  lastSynced: string
}

interface NotificationPref {
  id: string
  label: string
  description: string
  enabled: boolean
  icon: React.ElementType
}

/* ────────────────────────────────────────────────
   MOCK DATA
   ──────────────────────────────────────────────── */
const INITIAL_TEAM: TeamMember[] = [
  { id: '1', name: 'Alex Morgan', email: 'alex@adspirer.com', role: 'Admin', status: 'Active', lastActive: '2 min ago' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@adspirer.com', role: 'Editor', status: 'Active', lastActive: '15 min ago' },
  { id: '3', name: 'James Wilson', email: 'james@adspirer.com', role: 'Editor', status: 'Active', lastActive: '1 hr ago' },
  { id: '4', name: 'Priya Patel', email: 'priya@adspirer.com', role: 'Viewer', status: 'Active', lastActive: '3 hrs ago' },
  { id: '5', name: 'Marcus Johnson', email: 'marcus@adspirer.com', role: 'Viewer', status: 'Invited', lastActive: '-' },
]

const INITIAL_API_KEYS: ApiKey[] = [
  { id: '1', name: 'Production API', prefix: 'ak_live_••••X8f2', created: 'Jan 15, 2025', lastUsed: '2 hrs ago', status: 'Active' },
  { id: '2', name: 'Staging API', prefix: 'ak_test_••••K3m9', created: 'Feb 1, 2025', lastUsed: '5 days ago', status: 'Active' },
  { id: '3', name: 'Legacy Integration', prefix: 'ak_live_••••P7q1', created: 'Nov 10, 2024', lastUsed: '2 weeks ago', status: 'Revoked' },
  { id: '4', name: 'Mobile App', prefix: 'ak_live_••••N4v6', created: 'Mar 5, 2025', lastUsed: '1 day ago', status: 'Active' },
]

const INITIAL_ACCOUNTS: ConnectedAccount[] = [
  { id: '1', platform: 'Meta', accountName: 'Adspirer Meta Ads', status: 'Connected', lastSynced: '5 min ago' },
  { id: '2', platform: 'Google', accountName: 'Adspirer Google Ads', status: 'Connected', lastSynced: '12 min ago' },
  { id: '3', platform: 'TikTok', accountName: 'Adspirer TikTok', status: 'Connected', lastSynced: '1 hr ago' },
  { id: '4', platform: 'Snap', accountName: 'Adspirer Snap Ads', status: 'Disconnected', lastSynced: '3 days ago' },
]

const PERMISSIONS = [
  { action: 'View campaigns', admin: true, editor: true, viewer: true },
  { action: 'Create drafts', admin: true, editor: true, viewer: false },
  { action: 'Publish campaigns', admin: true, editor: false, viewer: false },
  { action: 'Approve changes', admin: true, editor: false, viewer: false },
  { action: 'Edit campaigns', admin: true, editor: true, viewer: false },
  { action: 'Delete campaigns', admin: true, editor: false, viewer: false },
  { action: 'View reports', admin: true, editor: true, viewer: true },
  { action: 'Export reports', admin: true, editor: true, viewer: false },
  { action: 'Manage billing', admin: true, editor: false, viewer: false },
  { action: 'Invite team', admin: true, editor: false, viewer: false },
  { action: 'Manage API keys', admin: true, editor: false, viewer: false },
  { action: 'Configure AI rules', admin: true, editor: true, viewer: false },
  { action: 'Access audit log', admin: true, editor: false, viewer: false },
  { action: 'White-label reports', admin: true, editor: false, viewer: false },
]

/* ────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────── */
function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getAvatarColor(name: string) {
  const colors = ['#c3f53b', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

/* ────────────────────────────────────────────────
   SECTION COMPONENTS
   ──────────────────────────────────────────────── */

/* ── Profile Card ── */
function ProfileCard({ profile, onEdit }: { profile: any; onEdit: () => void }) {
  return (
    <Card className="relative overflow-hidden" style={{ background: C.bgCard, borderColor: C.border }}>
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.accent}80, ${C.accent})` }} />
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20 text-lg font-bold ring-2" style={{ ringColor: C.accent }}>
              <AvatarFallback style={{ background: `${C.accent}20`, color: C.accent }}>
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 flex items-center justify-center"
              style={{ background: C.bgCard, borderColor: C.bgCard }}
            >
              <div className="h-3 w-3 rounded-full" style={{ background: C.success }} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: C.textPrimary }}>{profile.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: C.textSecondary }}>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {profile.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> {profile.role}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> {profile.workspace}
                  </span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shrink-0"
                style={{ background: C.accentMuted, color: C.accent }}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </motion.button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs" style={{ borderColor: C.accent, color: C.accent, background: C.accentMuted }}>
                {profile.role}
              </Badge>
              <Badge variant="outline" className="text-xs" style={{ borderColor: C.border, color: C.textSecondary }}>
                <CheckCircle2 className="h-3 w-3 mr-1" style={{ color: C.success }} /> Active
              </Badge>
              <Badge variant="outline" className="text-xs" style={{ borderColor: C.border, color: C.textSecondary }}>
                <Clock className="h-3 w-3 mr-1" /> Member since Jan 2024
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Team Members Table ── */
function TeamSection() {
  const { addToast } = useToast()
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<string>('')

  const handleRemove = (id: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== id))
    addToast({ title: 'Team member removed', type: 'success' })
  }

  const handleEdit = (member: TeamMember) => {
    setEditingId(member.id)
    setEditRole(member.role)
  }

  const handleSaveEdit = (id: string) => {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, role: editRole as any } : m)))
    setEditingId(null)
    addToast({ title: 'Role updated', type: 'success' })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' }
      case 'Editor': return { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' }
      case 'Viewer': return { bg: 'rgba(16,185,129,0.15)', color: '#10B981' }
      default: return { bg: C.accentMuted, color: C.accent }
    }
  }

  return (
    <Card style={{ background: C.bgCard, borderColor: C.border }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" style={{ color: C.accent }} />
          <CardTitle className="text-base font-semibold" style={{ color: C.textPrimary }}>Team Members</CardTitle>
        </div>
        <CardDescription style={{ color: C.textSecondary }}>Manage your workspace team and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Name', 'Email', 'Role', 'Status', 'Last Active', 'Actions'].map((h) => (
                  <th scope="col" key={h} className="pb-3 text-left font-medium text-xs uppercase tracking-wider px-3 first:pl-0 last:pr-0" style={{ color: C.textTertiary }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {team.map((member) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="group"
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <td className="py-3 px-3 first:pl-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 text-xs font-semibold">
                          <AvatarFallback style={{ background: `${getAvatarColor(member.name)}20`, color: getAvatarColor(member.name) }}>
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium" style={{ color: C.textPrimary }}>{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3" style={{ color: C.textSecondary }}>{member.email}</td>
                    <td className="py-3 px-3">
                      {editingId === member.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="rounded-md border px-2 py-1 text-xs outline-none"
                            style={{ background: C.bgElevated, borderColor: C.border, color: C.textPrimary }}
                          >
                            <option>Admin</option>
                            <option>Editor</option>
                            <option>Viewer</option>
                          </select>
                          <button onClick={() => handleSaveEdit(member.id)} className="rounded p-1" style={{ color: C.success }}>
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded p-1" style={{ color: C.danger }}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Badge className="text-xs" style={{ background: getRoleColor(member.role).bg, color: getRoleColor(member.role).color, border: 'none' }}>
                          {member.role}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Badge className="text-xs" style={{
                        background: member.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: member.status === 'Active' ? C.success : C.warning,
                        border: 'none'
                      }}>
                        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: member.status === 'Active' ? C.success : C.warning }} />
                        {member.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: C.textSecondary }}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" style={{ color: C.textTertiary }} />
                        {member.lastActive}
                      </span>
                    </td>
                    <td className="py-3 px-3 last:pr-0">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(member)}
                          className="rounded-md p-1.5 transition-colors"
                          style={{ color: C.textSecondary }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = C.textSecondary)}
                          title="Edit role"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="rounded-md p-1.5 transition-colors"
                          style={{ color: C.textSecondary }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.danger)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = C.textSecondary)}
                          title="Remove member"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Invite Member ── */
function InviteSection() {
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Editor')
  const [sending, setSending] = useState(false)

  const handleSend = () => {
    if (!email.trim()) {
      addToast({ title: 'Please enter an email', type: 'warning' })
      return
    }
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setEmail('')
      addToast({ title: `Invite sent to ${email}`, type: 'success' })
    }, 800)
  }

  return (
    <Card style={{ background: C.bgCard, borderColor: C.border }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5" style={{ color: C.accent }} />
          <CardTitle className="text-base font-semibold" style={{ color: C.textPrimary }}>Invite Member</CardTitle>
        </div>
        <CardDescription style={{ color: C.textSecondary }}>Add a new team member to your workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="h-10"
              style={{ background: C.bgElevated }}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 appearance-none rounded-md border px-4 pr-8 text-sm font-medium outline-none transition-colors cursor-pointer"
                style={{ background: C.bgElevated, borderColor: C.border, color: C.textPrimary }}
              >
                <option>Admin</option>
                <option>Editor</option>
                <option>Viewer</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: C.textTertiary }} />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: C.accent, color: '#0a0a0a' }}
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? 'Sending...' : 'Send Invite'}
            </motion.button>
          </div>
        </div>
        <p className="mt-3 text-xs" style={{ color: C.textTertiary }}>
          Invited members will receive an email with a link to join your workspace.
        </p>
      </CardContent>
    </Card>
  )
}

/* ── Role Permissions Matrix ── */
function PermissionsMatrix() {
  const roles = ['Admin', 'Editor', 'Viewer']
  const roleColors = {
    Admin: { header: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
    Editor: { header: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    Viewer: { header: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  }

  return (
    <Card style={{ background: C.bgCard, borderColor: C.border }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" style={{ color: C.accent }} />
          <CardTitle className="text-base font-semibold" style={{ color: C.textPrimary }}>Role Permissions</CardTitle>
        </div>
        <CardDescription style={{ color: C.textSecondary }}>Permission matrix for each workspace role</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th scope="col" className="pb-3 text-left font-medium text-xs uppercase tracking-wider min-w-[200px]" style={{ color: C.textTertiary }}>
                  Permission
                </th>
                {roles.map((role) => (
                  <th scope="col" key={role} className="pb-3 text-center font-semibold text-xs uppercase tracking-wider min-w-[90px]" style={{ color: roleColors[role as keyof typeof roleColors].header }}>
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm, idx) => (
                <tr
                  key={perm.action}
                  style={{ borderBottom: `1px solid ${C.border}` }}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="py-2.5 font-medium" style={{ color: C.textPrimary }}>{perm.action}</td>
                  {roles.map((role) => {
                    const hasPerm = perm[role.toLowerCase() as 'admin' | 'editor' | 'viewer']
                    return (
                      <td key={role} className="py-2.5 text-center">
                        {hasPerm ? (
                          <CheckCircle2 className="inline-block h-4.5 w-4.5" style={{ color: C.success }} />
                        ) : (
                          <XCircle className="inline-block h-4.5 w-4.5" style={{ color: C.textTertiary }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── API Keys ── */
function ApiKeysSection() {
  const { addToast } = useToast()
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_API_KEYS)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      addToast({ title: 'Please enter a key name', type: 'warning' })
      return
    }
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      prefix: `ak_live_••••${Math.random().toString(36).slice(-4)}`,
      created: 'Just now',
      lastUsed: 'Never',
      status: 'Active',
    }
    setKeys((prev) => [newKey, ...prev])
    setNewKeyName('')
    setShowCreate(false)
    addToast({ title: 'API key created', type: 'success' })
  }

  const handleRevoke = (id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'Revoked' as const } : k)))
    addToast({ title: 'API key revoked', type: 'success' })
  }

  const handleRegenerate = (id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, prefix: `ak_live_••••${Math.random().toString(36).slice(-4)}`, created: 'Just now' } : k)))
    addToast({ title: 'API key regenerated', type: 'success' })
  }

  const handleCopy = (prefix: string) => {
    addToast({ title: 'Key copied to clipboard', type: 'success' })
  }

  return (
    <Card style={{ background: C.bgCard, borderColor: C.border }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" style={{ color: C.accent }} />
            <div>
              <CardTitle className="text-base font-semibold" style={{ color: C.textPrimary }}>API Keys</CardTitle>
              <CardDescription style={{ color: C.textSecondary }}>Manage your API keys for integrations</CardDescription>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ background: C.accent, color: '#0a0a0a' }}
          >
            <Plus className="h-4 w-4" />
            Create Key
          </motion.button>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl"
                style={{ background: C.bgElevated, border: `1px solid ${C.border}` }}
              >
                <Input
                  placeholder="Key name (e.g., 'Zapier Integration')"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="flex-1 h-10"
                  style={{ background: C.bg }}
                />
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreate}
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{ background: C.accent, color: '#0a0a0a' }}
                  >
                    Create
                  </motion.button>
                  <button
                    onClick={() => { setShowCreate(false); setNewKeyName('') }}
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{ background: C.border, color: C.textSecondary }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Key Name', 'Key', 'Created', 'Last Used', 'Status', 'Actions'].map((h) => (
                  <th scope="col" key={h} className="pb-3 text-left font-medium text-xs uppercase tracking-wider px-3 first:pl-0 last:pr-0" style={{ color: C.textTertiary }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {keys.map((key) => (
                  <motion.tr
                    key={key.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <td className="py-3 px-3 first:pl-0 font-medium" style={{ color: C.textPrimary }}>{key.name}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <code
                          className="rounded-md px-2 py-1 text-xs font-mono"
                          style={{ background: C.bgElevated, color: C.accent }}
                        >
                          {revealedKey === key.id ? key.prefix.replace(/•/g, 'x') : key.prefix}
                        </code>
                        <button
                          onClick={() => setRevealedKey(revealedKey === key.id ? null : key.id)}
                          className="rounded p-1 transition-colors"
                          style={{ color: C.textTertiary }}
                          title={revealedKey === key.id ? 'Hide' : 'Reveal'}
                        >
                          {revealedKey === key.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => handleCopy(key.prefix)}
                          className="rounded p-1 transition-colors"
                          style={{ color: C.textTertiary }}
                          title="Copy"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: C.textSecondary }}>{key.created}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: C.textSecondary }}>{key.lastUsed}</td>
                    <td className="py-3 px-3">
                      <Badge className="text-xs" style={{
                        background: key.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: key.status === 'Active' ? C.success : C.danger,
                        border: 'none'
                      }}>
                        {key.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 last:pr-0">
                      <div className="flex items-center gap-1">
                        {key.status === 'Active' && (
                          <>
                            <button
                              onClick={() => handleRegenerate(key.id)}
                              className="rounded-md p-1.5 transition-colors"
                              style={{ color: C.textTertiary }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = C.info)}
                              onMouseLeave={(e) => (e.currentTarget.style.color = C.textTertiary)}
                              title="Regenerate"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRevoke(key.id)}
                              className="rounded-md p-1.5 transition-colors"
                              style={{ color: C.textTertiary }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = C.danger)}
                              onMouseLeave={(e) => (e.currentTarget.style.color = C.textTertiary)}
                              title="Revoke"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {key.status === 'Revoked' && (
                          <span className="text-xs italic" style={{ color: C.textTertiary }}>Revoked</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Connected Accounts ── */
function ConnectedAccounts() {
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(INITIAL_ACCOUNTS)
  const [syncing, setSyncing] = useState<string | null>(null)

  const platformMeta: Record<string, { color: string; icon: string }> = {
    Meta: { color: C.metaBlue, icon: 'M' },
    Google: { color: C.googleRed, icon: 'G' },
    TikTok: { color: C.tiktokCyan, icon: 'T' },
    Snap: { color: C.snapYellow, icon: 'S' },
  }

  const handleReconnect = (id: string) => {
    setSyncing(id)
    setTimeout(() => {
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'Connected' as const, lastSynced: 'Just now' } : a)))
      setSyncing(null)
      addToast({ title: 'Account reconnected', type: 'success' })
    }, 1500)
  }

  return (
    <Card style={{ background: C.bgCard, borderColor: C.border }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" style={{ color: C.accent }} />
          <div>
            <CardTitle className="text-base font-semibold" style={{ color: C.textPrimary }}>Connected Accounts</CardTitle>
            <CardDescription style={{ color: C.textSecondary }}>Ad platform integrations and sync status</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((account) => {
            const meta = platformMeta[account.platform]
            const isConnected = account.status === 'Connected'
            return (
              <motion.div
                key={account.id}
                whileHover={{ scale: 1.01 }}
                className="flex items-center gap-4 rounded-xl border p-4 transition-colors"
                style={{
                  borderColor: isConnected ? `${meta.color}30` : C.border,
                  background: isConnected ? `${meta.color}08` : C.bgElevated,
                }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                  style={{ background: `${meta.color}20`, color: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate" style={{ color: C.textPrimary }}>{account.accountName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: isConnected ? C.success : C.danger }}>
                      {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {account.status}
                    </span>
                    <span className="text-xs" style={{ color: C.textTertiary }}>•</span>
                    <span className="text-xs" style={{ color: C.textTertiary }}>{account.lastSynced}</span>
                  </div>
                </div>
                {!isConnected && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleReconnect(account.id)}
                    disabled={syncing === account.id}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                    style={{ background: C.accent, color: '#0a0a0a' }}
                  >
                    <RefreshCw className={`h-3 w-3 ${syncing === account.id ? 'animate-spin' : ''}`} />
                    {syncing === account.id ? 'Syncing...' : 'Reconnect'}
                  </motion.button>
                )}
                {isConnected && (
                  <Badge className="text-xs shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: C.success, border: 'none' }}>
                    <Check className="h-3 w-3 mr-1" /> Synced
                  </Badge>
                )}
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Notification Preferences ── */
function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPref[]>([
    { id: '1', label: 'Email Alerts', description: 'Critical alerts about campaign performance and errors', enabled: true, icon: AlertTriangle },
    { id: '2', label: 'Morning Brief', description: 'Daily summary of key metrics delivered every morning', enabled: true, icon: Bell },
    { id: '3', label: 'Draft Approvals', description: 'Notifications when drafts need your approval', enabled: true, icon: FileText },
    { id: '4', label: 'AI Actions', description: 'Alerts when AI performs automated actions on your behalf', enabled: false, icon: Zap },
    { id: '5', label: 'Weekly Reports', description: 'Weekly performance summary every Monday', enabled: true, icon: BarChart3 },
    { id: '6', label: 'Budget Alerts', description: 'Warnings when campaigns approach budget limits', enabled: true, icon: TrendingUp },
  ])

  const togglePref = (id: string) => {
    setPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)))
  }

  return (
    <Card style={{ background: C.bgCard, borderColor: C.border }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" style={{ color: C.accent }} />
          <div>
            <CardTitle className="text-base font-semibold" style={{ color: C.textPrimary }}>Notification Preferences</CardTitle>
            <CardDescription style={{ color: C.textSecondary }}>Choose which notifications you want to receive</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {prefs.map((pref, idx) => {
            const Icon = pref.icon
            return (
              <motion.div
                key={pref.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: pref.enabled ? C.accentMuted : 'rgba(255,255,255,0.04)', color: pref.enabled ? C.accent : C.textTertiary }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium" style={{ color: C.textPrimary }}>{pref.label}</h4>
                  <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{pref.description}</p>
                </div>
                <Switch
                  checked={pref.enabled}
                  onCheckedChange={() => togglePref(pref.id)}
                  className="shrink-0"
                  style={pref.enabled ? { background: C.accent } : {}}
                />
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────── */
export default function Profile() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

  const profile = useMemo(() => ({
    name: user?.name || 'Alex Morgan',
    email: user?.email || 'alex@adspirer.com',
    role: 'Admin',
    workspace: 'Adspirer HQ',
  }), [user])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  }

  return (
    <>
    <SEO
      title="Profile"
      description="Manage your AdNexus AI profile settings, personal information, preferences, and account security."
      keywords="profile, account settings, user profile, personal information"
    />
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* Page Header */}
      <div className="border-b" style={{ borderColor: C.border, background: C.bgElevated }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-6 rounded-full" style={{ background: C.accent }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent }}>Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: C.textPrimary }}>Profile & Team</h1>
            <p className="mt-1 text-sm" style={{ color: C.textSecondary }}>Manage your profile, team members, API keys, and integrations</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* 1. Profile Card */}
        <motion.div variants={itemVariants}>
          <ProfileCard profile={profile} onEdit={() => setIsEditing(true)} />
        </motion.div>

        {/* 2. Invite Member */}
        <motion.div variants={itemVariants}>
          <InviteSection />
        </motion.div>

        {/* 3. Team Members Table */}
        <motion.div variants={itemVariants}>
          <TeamSection />
        </motion.div>

        {/* 4. Role Permissions Matrix */}
        <motion.div variants={itemVariants}>
          <PermissionsMatrix />
        </motion.div>

        {/* 5. API Keys */}
        <motion.div variants={itemVariants}>
          <ApiKeysSection />
        </motion.div>

        {/* 6. Connected Accounts */}
        <motion.div variants={itemVariants}>
          <ConnectedAccounts />
        </motion.div>

        {/* 7. Notification Preferences */}
        <motion.div variants={itemVariants}>
          <NotificationPreferences />
        </motion.div>
      </motion.div>

      {/* Bottom spacer */}
      <div className="h-16" />
    </div>
    </>
  )
}
