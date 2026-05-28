import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, CheckCircle, Shield, Save, Loader2,
  Eye, FileText, Users, Settings, BarChart3, DollarSign,
  Target, Image, Megaphone, Palette, Bell, X,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { scopesApi, clientsApi, type ClientScope, type ApiEndpoint, type ScopeLevel, type AgencyClient } from '@/lib/api'
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
}

/* ------------------------------------------------------------------ */
/*  SCOPE LEVEL CONFIG                                                  */
/* ------------------------------------------------------------------ */
const LEVEL_CONFIG: Record<ScopeLevel, { label: string; color: string; description: string }> = {
  none: { label: 'None', color: '#3D434C', description: 'No access' },
  read: { label: 'Read', color: '#6B7280', description: 'View only' },
  'draft-only': { label: 'Draft', color: '#F59E0B', description: 'Draft changes' },
  full: { label: 'Full', color: '#10B981', description: 'Full access' },
}

const LEVEL_ORDER: ScopeLevel[] = ['none', 'read', 'draft-only', 'full']

/* ------------------------------------------------------------------ */
/*  ENDPOINT ICONS                                                      */
/* ------------------------------------------------------------------ */
const ENDPOINT_ICONS: Record<string, React.ReactNode> = {
  Campaigns: <Megaphone size={14} />,
  Drafts: <FileText size={14} />,
  Audiences: <Users size={14} />,
  Creatives: <Palette size={14} />,
  Reports: <BarChart3 size={14} />,
  Billing: <DollarSign size={14} />,
  Team: <Shield size={14} />,
  Settings: <Settings size={14} />,
}

/* ------------------------------------------------------------------ */
/*  SCOPE RADIO CELL                                                    */
/* ------------------------------------------------------------------ */
function ScopeRadio({ level, selected, onChange }: { level: ScopeLevel; selected: boolean; onChange: () => void }) {
  const cfg = LEVEL_CONFIG[level]
  return (
    <button
      onClick={onChange}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 mx-auto"
      title={`${cfg.label}: ${cfg.description}`}
      style={{
        background: selected ? `${cfg.color}25` : 'transparent',
        border: `2px solid ${selected ? cfg.color : 'var(--border-subtle)'}`,
      }}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.15 }}
          className="w-3 h-3 rounded-full"
          style={{ background: cfg.color }}
        />
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  SCOPE ROW                                                           */
/* ------------------------------------------------------------------ */
function ScopeRow({ endpoint, scopeValue, onChange }: {
  endpoint: ApiEndpoint
  scopeValue: ScopeLevel
  onChange: (level: ScopeLevel) => void
}) {
  return (
    <tr
      className="transition-colors duration-100 hover:bg-[var(--bg-hover)]"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <span style={{ color: 'var(--text-secondary)' }}>
            {ENDPOINT_ICONS[endpoint.category] || <Target size={14} />}
          </span>
          <div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {endpoint.name}
            </span>
            <span className="block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {endpoint.category}
            </span>
          </div>
        </div>
      </td>
      {LEVEL_ORDER.map((level) => (
        <td key={level} className="py-3 px-2 text-center">
          <ScopeRadio
            level={level}
            selected={scopeValue === level}
            onChange={() => onChange(level)}
          />
        </td>
      ))}
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function ClientScopes() {
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])
  const [scopes, setScopes] = useState<ClientScope[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [localScopes, setLocalScopes] = useState<Record<string, ScopeLevel>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [clientsData, endpointsData, scopesData] = await Promise.all([
        clientsApi.list(),
        scopesApi.endpoints(),
        scopesApi.list(),
      ])
      setClients(clientsData)
      setEndpoints(endpointsData)
      setScopes(scopesData)
      if (clientsData.length > 0 && !selectedClientId) {
        setSelectedClientId(clientsData[0].id)
      }
    } catch {
      toast({ title: 'Failed to load scopes data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // Sync local scopes when client changes
  useEffect(() => {
    if (!selectedClientId) return
    const clientScope = scopes.find((s) => s.clientId === selectedClientId)
    if (clientScope) {
      setLocalScopes({ ...clientScope.scopes })
    } else {
      // Default to read-only if no scopes exist
      const defaults: Record<string, ScopeLevel> = {}
      endpoints.forEach((e) => { defaults[e.key] = 'read' })
      setLocalScopes(defaults)
    }
    setHasChanges(false)
  }, [selectedClientId, scopes, endpoints])

  const selectedClient = useMemo(() =>
    clients.find((c) => c.id === selectedClientId) || null
  , [clients, selectedClientId])

  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, ApiEndpoint[]> = {}
    endpoints.forEach((e) => {
      if (!groups[e.category]) groups[e.category] = []
      groups[e.category].push(e)
    })
    return groups
  }, [endpoints])

  const handleScopeChange = (endpointKey: string, level: ScopeLevel) => {
    setLocalScopes((prev) => ({ ...prev, [endpointKey]: level }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!selectedClientId) return
    setSaving(true)
    try {
      await scopesApi.update(selectedClientId, localScopes)
      toast('success', 'Scopes saved', `Permissions updated for ${selectedClient?.name}`)
      const updatedScopes = await scopesApi.list()
      setScopes(updatedScopes)
      setHasChanges(false)
    } catch {
      toast({ title: 'Failed to save scopes', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleTemplate = async (template: 'standard' | 'read-only' | 'full') => {
    if (!selectedClientId) return
    setSaving(true)
    try {
      const result = await scopesApi.applyTemplate(selectedClientId, template)
      setLocalScopes({ ...result.scopes })
      toast({ title: `${template === 'standard' ? 'Standard' : template === 'read-only' ? 'Read-Only' : 'Full'} template applied`, variant: 'success' })
      const updatedScopes = await scopesApi.list()
      setScopes(updatedScopes)
      setHasChanges(false)
    } catch {
      toast({ title: 'Failed to apply template', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const scopeCount = useMemo(() => {
    const vals = Object.values(localScopes)
    return {
      none: vals.filter((v) => v === 'none').length,
      read: vals.filter((v) => v === 'read').length,
      draft: vals.filter((v) => v === 'draft-only').length,
      full: vals.filter((v) => v === 'full').length,
    }
  }, [localScopes])

  return (
    <>
    <SEO
      title="Client Scopes"
      description="Manage client access scopes and permissions. Define which campaigns, reports, and features each client can access."
      keywords="client scopes, permissions, access control, client management"
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
              Client API Scopes
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Control which API endpoints each client workspace can access
            </p>
          </div>
        </motion.div>

        {/* ---- CONTROLS ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6"
        >
          {/* Client Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={loading}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 min-w-[240px]"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              {selectedClient ? (
                <>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: selectedClient.color }}>
                    {selectedClient.initials}
                  </span>
                  <span className="flex-1 text-left">{selectedClient.name}</span>
                </>
              ) : (
                <span className="flex-1 text-left" style={{ color: 'var(--text-tertiary)' }}>Select client...</span>
              )}
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-full min-w-[240px] rounded-lg overflow-hidden z-40 shadow-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                >
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => { setSelectedClientId(client.id); setDropdownOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors duration-100 hover:bg-[var(--bg-hover)]"
                      style={{ color: selectedClientId === client.id ? 'var(--accent)' : 'var(--text-primary)' }}
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: client.color }}>
                        {client.initials}
                      </span>
                      {client.name}
                      {selectedClientId === client.id && <CheckCircle size={14} className="ml-auto" style={{ color: C.statusActive }} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Template Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] mr-1" style={{ color: 'var(--text-secondary)' }}>Templates:</span>
            <button
              onClick={() => handleTemplate('standard')}
              disabled={saving || !selectedClientId}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 disabled:opacity-50"
              style={{ background: `${C.accent}15`, color: C.accent, border: '1px solid var(--border-subtle)' }}
            >
              Standard Access
            </button>
            <button
              onClick={() => handleTemplate('read-only')}
              disabled={saving || !selectedClientId}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 disabled:opacity-50"
              style={{ background: `${LEVEL_CONFIG.read.color}15`, color: LEVEL_CONFIG.read.color, border: '1px solid var(--border-subtle)' }}
            >
              Read-Only
            </button>
            <button
              onClick={() => handleTemplate('full')}
              disabled={saving || !selectedClientId}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 disabled:opacity-50"
              style={{ background: `${LEVEL_CONFIG.full.color}15`, color: LEVEL_CONFIG.full.color, border: '1px solid var(--border-subtle)' }}
            >
              Full Access
            </button>
          </div>
        </motion.div>

        {/* ---- SCOPE SUMMARY ---- */}
        {selectedClient && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex flex-wrap items-center gap-4 mb-6 p-3 rounded-lg"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            {LEVEL_ORDER.map((level) => (
              <div key={level} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: LEVEL_CONFIG[level].color }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {LEVEL_CONFIG[level].label}: {scopeCount[level === 'draft-only' ? 'draft' : level]}
                </span>
              </div>
            ))}
            {hasChanges && (
              <span className="flex items-center gap-1 ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${C.statusWarning}15`, color: C.statusWarning }}>
                <Bell size={10} />
                Unsaved changes
              </span>
            )}
          </motion.div>
        )}

        {/* ---- SCOPE MATRIX TABLE ---- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-surface overflow-hidden"
        >
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th scope="col" className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>
                      API Endpoint
                    </th>
                    {LEVEL_ORDER.map((level) => (
                      <th scope="col" key={level} className="py-3 px-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] w-24" style={{ color: LEVEL_CONFIG[level].color }}>
                        {LEVEL_CONFIG[level].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedEndpoints).map(([category, eps]) => (
                    <tbody key={category}>
                      <tr>
                        <td colSpan={5} className="py-2 px-4 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-secondary)' }}>
                          <div className="flex items-center gap-1.5">
                            {ENDPOINT_ICONS[category] || <Target size={12} />}
                            {category}
                          </div>
                        </td>
                      </tr>
                      {eps.map((endpoint) => (
                        <ScopeRow
                          key={endpoint.key}
                          endpoint={endpoint}
                          scopeValue={localScopes[endpoint.key] || 'none'}
                          onChange={(level) => handleScopeChange(endpoint.key, level)}
                        />
                      ))}
                    </tbody>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* ---- LEGEND ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center gap-6"
        >
          {LEVEL_ORDER.map((level) => (
            <div key={level} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: LEVEL_CONFIG[level].color }} />
              <div>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{LEVEL_CONFIG[level].label}</span>
                <span className="text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>{LEVEL_CONFIG[level].description}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ---- SAVE BAR ---- */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-xl z-40 shadow-2xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-active)' }}
            >
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Unsaved changes for <strong style={{ color: 'var(--text-primary)' }}>{selectedClient?.name}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const clientScope = scopes.find((s) => s.clientId === selectedClientId)
                    if (clientScope) setLocalScopes({ ...clientScope.scopes })
                    setHasChanges(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  <X size={12} />
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 disabled:opacity-50"
                  style={{ background: C.accent, color: 'white' }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  )
}
