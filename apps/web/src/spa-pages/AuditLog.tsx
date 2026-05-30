// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  User,
  Bot,
  Server,
  Globe,
  Filter,
  Calendar,
  FileDown,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Activity,
  Hash,
  Network,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import api from '../lib/api';
import { useUIStore } from '../stores/uiStore';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bgPage: '#0A0A0A',
  bgElevated: '#111111',
  bgHover: '#1a1a1a',
  bgCard: '#141414',
  bgInput: '#161616',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(37,99,235,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8F98',
  textTertiary: '#555B66',
  accent: '#2563EB',
  accentHover: '#1D4ED8',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  statusInfo: '#3B82F6',
  purple: '#A855F7',
  orange: '#F97316',
  teal: '#14B8A6',
  rose: '#F43F5E',
};

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
interface AuditLogEntry {
  id: string;
  created_at: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  action_category: string;
  platform: string | null;
  campaign_id: string | null;
  details: Record<string, unknown> | null;
  source: string | null;
  ip_address: string | null;
}

interface AuditFilters {
  startDate: string;
  endDate: string;
  actorType: string;
  actionCategory: string;
  entityType: string;
  search: string;
  page: number;
  limit: number;
}

/* ------------------------------------------------------------------ */
/*  ACTOR CONFIG                                                        */
/* ------------------------------------------------------------------ */
const actorConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  ai: { color: C.purple, icon: Bot, label: 'AI' },
  user: { color: C.accent, icon: User, label: 'User' },
  system: { color: C.textTertiary, icon: Server, label: 'System' },
  api: { color: C.statusWarning, icon: Globe, label: 'API' },
};

/* ------------------------------------------------------------------ */
/*  ACTION CATEGORY CONFIG                                              */
/* ------------------------------------------------------------------ */
const actionCategoryConfig: Record<string, { color: string; label: string }> = {
  campaign_create: { color: C.statusActive, label: 'Create' },
  campaign_update: { color: C.statusInfo, label: 'Update' },
  campaign_delete: { color: C.statusError, label: 'Delete' },
  budget_change: { color: C.accent, label: 'Budget' },
  status_change: { color: C.statusWarning, label: 'Status' },
  creative_upload: { color: C.purple, label: 'Creative' },
  creative_update: { color: C.purple, label: 'Creative' },
  rule_triggered: { color: C.orange, label: 'Rule' },
  approval_given: { color: C.statusActive, label: 'Approve' },
  rejection: { color: C.statusError, label: 'Reject' },
  agent_action: { color: C.teal, label: 'Agent' },
  agent_run: { color: C.teal, label: 'Agent' },
  draft_created: { color: C.statusInfo, label: 'Draft' },
  draft_create: { color: C.statusInfo, label: 'Draft' },
  draft_approved: { color: C.statusActive, label: 'Draft' },
  draft_approve: { color: C.statusActive, label: 'Draft' },
  draft_rejected: { color: C.statusError, label: 'Draft' },
  draft_reject: { color: C.statusError, label: 'Draft' },
  team_invite: { color: C.accent, label: 'Team' },
  user_signup: { color: C.statusActive, label: 'Auth' },
  user_login: { color: C.statusInfo, label: 'Auth' },
  user_invite: { color: C.accent, label: 'Auth' },
  setting_change: { color: C.textTertiary, label: 'Settings' },
  settings_update: { color: C.textTertiary, label: 'Settings' },
  webhook: { color: C.rose, label: 'Webhook' },
};

/* ------------------------------------------------------------------ */
/*  ENTITY TYPE CONFIG                                                  */
/* ------------------------------------------------------------------ */
const entityTypeConfig: Record<string, { color: string; label: string }> = {
  campaign: { color: C.accent, label: 'Campaign' },
  draft: { color: C.statusInfo, label: 'Draft' },
  creative: { color: C.purple, label: 'Creative' },
  rule: { color: C.orange, label: 'Rule' },
  user: { color: C.statusActive, label: 'User' },
  setting: { color: C.textTertiary, label: 'Setting' },
  agent: { color: C.teal, label: 'Agent' },
  webhook: { color: C.rose, label: 'Webhook' },
  approval: { color: C.statusActive, label: 'Approval' },
  unknown: { color: C.textTertiary, label: 'Unknown' },
};

/* ------------------------------------------------------------------ */
/*  SKELETON COMPONENTS                                                 */
/* ------------------------------------------------------------------ */
function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center px-4 py-3 gap-4"
          style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
        >
          <div className="h-3 rounded w-28 flex-shrink-0" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-32 flex-shrink-0" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-24 flex-shrink-0" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-20 flex-shrink-0" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-28 flex-shrink-0" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-24 flex-shrink-0" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-20 flex-shrink-0" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-24 flex-shrink-0" style={{ background: C.bgHover }} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EMPTY STATE                                                         */
/* ------------------------------------------------------------------ */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
      >
        <Clock size={28} style={{ color: C.textTertiary }} />
      </div>
      <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
        No audit log entries found
      </p>
      <p className="text-xs mt-1" style={{ color: C.textTertiary }}>
        Try adjusting your filters or date range
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ACTOR BADGE                                                         */
/* ------------------------------------------------------------------ */
function ActorBadge({ actorType, actorName }: { actorType: string; actorName: string | null }) {
  const cfg = actorConfig[actorType] ?? actorConfig.system;
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-2">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${cfg.color}15` }}
      >
        <Icon size={12} style={{ color: cfg.color }} />
      </span>
      <span className="text-xs font-medium truncate" style={{ color: C.textPrimary }}>
        {actorName || cfg.label}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  ACTION BADGE                                                        */
/* ------------------------------------------------------------------ */
function ActionBadge({ category }: { category: string }) {
  const cfg = actionCategoryConfig[category] ?? { color: C.textTertiary, label: category };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${cfg.color}15`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  ENTITY TYPE BADGE                                                   */
/* ------------------------------------------------------------------ */
function EntityTypeBadge({ type }: { type: string }) {
  const cfg = entityTypeConfig[type] ?? entityTypeConfig.unknown;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ background: `${cfg.color}10`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  CHANGES DIFF BADGE                                                  */
/* ------------------------------------------------------------------ */
function ChangesBadge({ details }: { details: Record<string, unknown> | null }) {
  if (!details) return <span className="text-[11px]" style={{ color: C.textTertiary }}>—</span>;

  // Look for changes array (from webhooks)
  const changes = details.changes as Array<{ field: string; oldValue: unknown; newValue: unknown }> | undefined;
  if (changes && changes.length > 0) {
    return (
      <div className="flex flex-col gap-0.5">
        {changes.slice(0, 2).map((c, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px]">
            <span style={{ color: C.textTertiary }}>{c.field}:</span>
            <span className="line-through" style={{ color: C.statusError }}>{String(c.oldValue).slice(0, 15)}</span>
            <ArrowRight size={8} style={{ color: C.textTertiary }} />
            <span style={{ color: C.statusActive }}>{String(c.newValue).slice(0, 15)}</span>
          </div>
        ))}
        {changes.length > 2 && (
          <span className="text-[10px]" style={{ color: C.textTertiary }}>+{changes.length - 2} more</span>
        )}
      </div>
    );
  }

  // Look for old/new budget pattern
  const oldBudget = details.oldBudget ?? details.old_budget ?? details.oldValue;
  const newBudget = details.newBudget ?? details.new_budget ?? details.newValue;
  if (oldBudget !== undefined && newBudget !== undefined) {
    return (
      <div className="flex items-center gap-1 text-[10px]">
        <span className="line-through" style={{ color: C.statusError }}>{String(oldBudget)}</span>
        <ArrowRight size={8} style={{ color: C.textTertiary }} />
        <span style={{ color: C.statusActive }}>{String(newBudget)}</span>
      </div>
    );
  }

  // Look for old/new bid pattern
  const oldBid = details.oldBid ?? details.old_bid;
  const newBid = details.newBid ?? details.new_bid;
  if (oldBid !== undefined && newBid !== undefined) {
    return (
      <div className="flex items-center gap-1 text-[10px]">
        <span className="line-through" style={{ color: C.statusError }}>{String(oldBid)}</span>
        <ArrowRight size={8} style={{ color: C.textTertiary }} />
        <span style={{ color: C.statusActive }}>{String(newBid)}</span>
      </div>
    );
  }

  // Look for direction-based budget change
  const direction = details.direction;
  const oldB = details.oldBudget ?? details.old_budget;
  const newB = details.newBudget ?? details.new_budget;
  if (direction && oldB !== undefined && newB !== undefined) {
    return (
      <div className="flex items-center gap-1 text-[10px]">
        <span className="line-through" style={{ color: C.statusError }}>${String(oldB)}</span>
        <ArrowRight size={8} style={{ color: C.textTertiary }} />
        <span style={{ color: direction === 'increase' ? C.statusActive : C.statusError }}>${String(newB)}</span>
      </div>
    );
  }

  // Check for draft_type details
  const draftType = details.draft_type ?? details.draftType;
  if (draftType) {
    return <span className="text-[10px]" style={{ color: C.textSecondary }}>{String(draftType)}</span>;
  }

  // Count number of detail keys
  const keys = Object.keys(details).filter(k => k !== 'entity_type' && k !== 'entity_id');
  if (keys.length > 0) {
    return <span className="text-[10px]" style={{ color: C.textSecondary }}>{keys.length} fields changed</span>;
  }

  return <span className="text-[10px]" style={{ color: C.textTertiary }}>—</span>;
}

/* ------------------------------------------------------------------ */
/*  DIFF MODAL                                                          */
/* ------------------------------------------------------------------ */
function DiffModal({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  const changes = entry.details?.changes as Array<{ field: string; oldValue: unknown; newValue: unknown }> | undefined;

  // Build flat key-value diff from details
  const detailEntries = Object.entries(entry.details || {}).filter(
    ([k]) => k !== 'changes' && k !== 'entity_type' && k !== 'entity_id'
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-2xl rounded-xl overflow-hidden"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${C.accent}15` }}
            >
              <Eye size={16} style={{ color: C.accent }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>
                Audit Entry Detail
              </h3>
              <p className="text-[11px]" style={{ color: C.textTertiary }}>
                {entry.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: C.bgHover }}
          >
            <X size={14} style={{ color: C.textSecondary }} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-lg p-3" style={{ background: C.bgHover }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={10} style={{ color: C.textTertiary }} />
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.textTertiary }}>Timestamp</span>
              </div>
              <span className="text-xs font-mono" style={{ color: C.textPrimary }}>
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
            <div className="rounded-lg p-3" style={{ background: C.bgHover }}>
              <div className="flex items-center gap-1.5 mb-1">
                <User size={10} style={{ color: C.textTertiary }} />
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.textTertiary }}>Actor</span>
              </div>
              <ActorBadge actorType={entry.actor_type} actorName={entry.actor_name} />
            </div>
            <div className="rounded-lg p-3" style={{ background: C.bgHover }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Activity size={10} style={{ color: C.textTertiary }} />
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.textTertiary }}>Action</span>
              </div>
              <div className="flex items-center gap-2">
                <ActionBadge category={entry.action_category} />
                <span className="text-xs" style={{ color: C.textPrimary }}>{entry.action}</span>
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: C.bgHover }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Network size={10} style={{ color: C.textTertiary }} />
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.textTertiary }}>IP Address</span>
              </div>
              <span className="text-xs font-mono" style={{ color: C.textPrimary }}>
                {entry.ip_address || '—'}
              </span>
            </div>
            <div className="rounded-lg p-3" style={{ background: C.bgHover }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Hash size={10} style={{ color: C.textTertiary }} />
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.textTertiary }}>Entity</span>
              </div>
              <div className="flex items-center gap-2">
                <EntityTypeBadge type={(entry.details?.entity_type as string) || 'unknown'} />
                <span className="text-xs font-mono" style={{ color: C.textSecondary }}>
                  {(entry.details?.entity_id as string) || entry.campaign_id || '—'}
                </span>
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: C.bgHover }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Globe size={10} style={{ color: C.textTertiary }} />
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: C.textTertiary }}>Source</span>
              </div>
              <span className="text-xs capitalize" style={{ color: C.textPrimary }}>
                {entry.source || '—'}
              </span>
            </div>
          </div>

          {/* Structured Changes */}
          {changes && changes.length > 0 && (
            <div className="mb-5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: C.textTertiary }}>
                Changes ({changes.length})
              </h4>
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.borderSubtle}` }}>
                {changes.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{
                      borderBottom: i < changes.length - 1 ? `1px solid ${C.borderSubtle}` : 'none',
                      background: i % 2 === 0 ? C.bgCard : C.bgElevated,
                    }}
                  >
                    <span className="text-[11px] font-medium w-24 flex-shrink-0" style={{ color: C.textSecondary }}>
                      {c.field}
                    </span>
                    <span className="text-[11px] line-through flex-1 truncate" style={{ color: C.statusError }}>
                      {String(c.oldValue ?? 'null')}
                    </span>
                    <ArrowRight size={12} style={{ color: C.textTertiary }} />
                    <span className="text-[11px] flex-1 truncate" style={{ color: C.statusActive }}>
                      {String(c.newValue ?? 'null')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detail Fields */}
          {detailEntries.length > 0 && (
            <div className="mb-5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: C.textTertiary }}>
                Details
              </h4>
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.borderSubtle}` }}>
                {detailEntries.map(([key, value], i) => (
                  <div
                    key={key}
                    className="flex items-start gap-3 px-3 py-2"
                    style={{
                      borderBottom: i < detailEntries.length - 1 ? `1px solid ${C.borderSubtle}` : 'none',
                      background: i % 2 === 0 ? C.bgCard : C.bgElevated,
                    }}
                  >
                    <span className="text-[10px] font-medium w-28 flex-shrink-0 capitalize" style={{ color: C.textTertiary }}>
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] flex-1 break-all" style={{ color: C.textPrimary }}>
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: C.textTertiary }}>
              Full Details (JSON)
            </h4>
            <pre
              className="rounded-lg p-3 text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all overflow-auto max-h-60"
              style={{ background: C.bgHover, color: C.textSecondary }}
            >
              {JSON.stringify(entry.details || {}, null, 2)}
            </pre>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function AuditLogPage() {
  const showToast = useUIStore((s) => s.showToast);

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const [filters, setFilters] = useState<AuditFilters>({
    startDate: '',
    endDate: '',
    actorType: 'all',
    actionCategory: 'all',
    entityType: 'all',
    search: '',
    page: 1,
    limit: 25,
  });

  const [showFilters, setShowFilters] = useState(false);

  /* ── Fetch entries ── */
  const fetchEntries = useCallback(async () => {
    const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';

    if (isDemo) {
      // Generate rich demo data
      const now = new Date();
      const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
      const demoData: AuditLogEntry[] = [
        {
          id: 'aud_1', created_at: daysAgo(0.3), actor_type: 'user', actor_id: 'u1', actor_name: 'Alice Cooper',
          action: 'Updated campaign budget', action_category: 'budget_change', platform: 'meta', campaign_id: 'camp_101',
          details: { entity_type: 'campaign', entity_id: 'camp_101', oldBudget: 500, newBudget: 750, reason: 'ROAS exceeded 3.5x' },
          source: 'dashboard', ip_address: '192.168.1.42',
        },
        {
          id: 'aud_2', created_at: daysAgo(0.8), actor_type: 'ai', actor_id: null, actor_name: 'AI Agent',
          action: 'Auto-scaled budget via rule', action_category: 'rule_triggered', platform: 'google', campaign_id: 'camp_205',
          details: { entity_type: 'campaign', entity_id: 'camp_205', oldBudget: 300, newBudget: 450, roas: 4.2, ruleId: 'rule_07' },
          source: 'ai_agent', ip_address: null,
        },
        {
          id: 'aud_3', created_at: daysAgo(1.2), actor_type: 'user', actor_id: 'u2', actor_name: 'Bob Martinez',
          action: 'Paused underperforming campaign', action_category: 'status_change', platform: 'tiktok', campaign_id: 'camp_332',
          details: { entity_type: 'campaign', entity_id: 'camp_332', changes: [{ field: 'status', oldValue: 'active', newValue: 'paused' }], cpa: 87.5 },
          source: 'dashboard', ip_address: '10.0.0.15',
        },
        {
          id: 'aud_4', created_at: daysAgo(1.5), actor_type: 'system', actor_id: null, actor_name: 'System',
          action: 'Webhook: campaign spend cap reached', action_category: 'webhook', platform: 'meta', campaign_id: 'camp_156',
          details: { entity_type: 'campaign', entity_id: 'camp_156', changes: [{ field: 'status', oldValue: 'active', newValue: 'ended' }], triggered_by: 'platform' },
          source: 'webhook', ip_address: null,
        },
        {
          id: 'aud_5', created_at: daysAgo(2.0), actor_type: 'user', actor_id: 'u3', actor_name: 'Carol Smith',
          action: 'Approved draft #482', action_category: 'draft_approved', platform: 'google', campaign_id: 'camp_205',
          details: { entity_type: 'draft', entity_id: 'draft_482', draft_id: 'draft_482', change_detail: 'bid increase from $2.50 to $3.20' },
          source: 'dashboard', ip_address: '172.16.0.8',
        },
        {
          id: 'aud_6', created_at: daysAgo(2.5), actor_type: 'api', actor_id: null, actor_name: 'API Client',
          action: 'Bulk campaign creation', action_category: 'campaign_create', platform: 'snap', campaign_id: 'camp_401',
          details: { entity_type: 'campaign', entity_id: 'camp_401', count: 5, objective: 'app_installs' },
          source: 'api', ip_address: '52.44.128.91',
        },
        {
          id: 'aud_7', created_at: daysAgo(3.0), actor_type: 'user', actor_id: 'u1', actor_name: 'Alice Cooper',
          action: 'Changed targeting age range', action_category: 'campaign_update', platform: 'meta', campaign_id: 'camp_120',
          details: { entity_type: 'campaign', entity_id: 'camp_120', changes: [{ field: 'age_range', oldValue: '18-34', newValue: '25-44' }, { field: 'interests', oldValue: ['gaming'], newValue: ['gaming', 'tech'] }] },
          source: 'dashboard', ip_address: '192.168.1.42',
        },
        {
          id: 'aud_8', created_at: daysAgo(3.5), actor_type: 'ai', actor_id: null, actor_name: 'AI Agent',
          action: 'Creative fatigue alert triggered', action_category: 'agent_action', platform: 'tiktok', campaign_id: 'camp_340',
          details: { entity_type: 'creative', entity_id: 'camp_340', alert: 'creative_fatigue', ctr: 0.8, impressions: 125000, recommendation: 'refresh creative assets' },
          source: 'ai_agent', ip_address: null,
        },
        {
          id: 'aud_9', created_at: daysAgo(4.2), actor_type: 'user', actor_id: 'u4', actor_name: 'David Lee',
          action: 'Invited new team member', action_category: 'team_invite', platform: null, campaign_id: null,
          details: { entity_type: 'user', entity_id: 'u5', email: 'newmember@company.com', role: 'analyst' },
          source: 'dashboard', ip_address: '10.0.0.22',
        },
        {
          id: 'aud_10', created_at: daysAgo(5.0), actor_type: 'user', actor_id: 'u2', actor_name: 'Bob Martinez',
          action: 'Updated automation rule threshold', action_category: 'setting_change', platform: null, campaign_id: null,
          details: { entity_type: 'setting', entity_id: 'rule_07', changes: [{ field: 'roas_threshold', oldValue: 3.0, newValue: 3.5 }] },
          source: 'dashboard', ip_address: '10.0.0.15',
        },
        {
          id: 'aud_11', created_at: daysAgo(5.5), actor_type: 'system', actor_id: null, actor_name: 'System',
          action: 'Daily budget sync completed', action_category: 'agent_run', platform: null, campaign_id: null,
          details: { entity_type: 'agent', entity_id: 'sync_job', campaigns_processed: 42, adjustments_made: 7 },
          source: 'system', ip_address: null,
        },
        {
          id: 'aud_12', created_at: daysAgo(6.0), actor_type: 'user', actor_id: 'u1', actor_name: 'Alice Cooper',
          action: 'Created new PMax campaign', action_category: 'campaign_create', platform: 'google', campaign_id: 'camp_512',
          details: { entity_type: 'campaign', entity_id: 'camp_512', budget: 5000, targeting: 'parents 25-54', objective: 'conversions' },
          source: 'dashboard', ip_address: '192.168.1.42',
        },
        {
          id: 'aud_13', created_at: daysAgo(6.5), actor_type: 'api', actor_id: null, actor_name: 'Slack Bot',
          action: 'Status change via Slack integration', action_category: 'status_change', platform: 'meta', campaign_id: 'camp_130',
          details: { entity_type: 'campaign', entity_id: 'camp_130', changes: [{ field: 'status', oldValue: 'active', newValue: 'paused' }], via: 'slack' },
          source: 'slack', ip_address: '54.162.128.40',
        },
        {
          id: 'aud_14', created_at: daysAgo(7.0), actor_type: 'user', actor_id: 'u3', actor_name: 'Carol Smith',
          action: 'Rejected draft #481', action_category: 'draft_rejected', platform: 'google', campaign_id: 'camp_210',
          details: { entity_type: 'draft', entity_id: 'draft_481', reason: 'CPA target too aggressive', draft_id: 'draft_481' },
          source: 'dashboard', ip_address: '172.16.0.8',
        },
        {
          id: 'aud_15', created_at: daysAgo(7.5), actor_type: 'ai', actor_id: null, actor_name: 'AI Agent',
          action: 'Auto-decreased budget (CPA spike)', action_category: 'budget_change', platform: 'snap', campaign_id: 'camp_420',
          details: { entity_type: 'campaign', entity_id: 'camp_420', direction: 'decrease', oldBudget: 800, newBudget: 600, cpa: 65.3, threshold: 50 },
          source: 'ai_agent', ip_address: null,
        },
        {
          id: 'aud_16', created_at: daysAgo(8.2), actor_type: 'user', actor_id: 'u4', actor_name: 'David Lee',
          action: 'Uploaded new creative set', action_category: 'creative_upload', platform: 'tiktok', campaign_id: 'camp_350',
          details: { entity_type: 'creative', entity_id: 'camp_350', creatives: 3, format: 'in_feed', video_duration: 15 },
          source: 'dashboard', ip_address: '10.0.0.22',
        },
        {
          id: 'aud_17', created_at: daysAgo(9.0), actor_type: 'system', actor_id: null, actor_name: 'System',
          action: 'Webhook received: Google Ads policy violation', action_category: 'webhook', platform: 'google', campaign_id: 'camp_220',
          details: { entity_type: 'campaign', entity_id: 'camp_220', policy_violation: 'destination_not_working', severity: 'warning' },
          source: 'webhook', ip_address: null,
        },
        {
          id: 'aud_18', created_at: daysAgo(10.0), actor_type: 'user', actor_id: 'u1', actor_name: 'Alice Cooper',
          action: 'Approved 3 drafts in bulk', action_category: 'approval_given', platform: 'meta', campaign_id: null,
          details: { entity_type: 'approval', entity_id: 'bulk_001', draft_ids: ['draft_478', 'draft_479', 'draft_480'], count: 3 },
          source: 'dashboard', ip_address: '192.168.1.42',
        },
      ];

      let filtered = [...demoData];

      if (filters.actorType !== 'all') filtered = filtered.filter(e => e.actor_type === filters.actorType);
      if (filters.actionCategory !== 'all') filtered = filtered.filter(e => e.action_category === filters.actionCategory);
      if (filters.entityType !== 'all') {
        filtered = filtered.filter(e => {
          const et = e.details?.entity_type as string;
          return et === filters.entityType;
        });
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(e =>
          (e.actor_name || '').toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          (e.campaign_id || '').toLowerCase().includes(q) ||
          (e.details?.entity_id as string || '').toLowerCase().includes(q)
        );
      }
      if (filters.startDate) {
        const sd = new Date(filters.startDate);
        filtered = filtered.filter(e => new Date(e.created_at) >= sd);
      }
      if (filters.endDate) {
        const ed = new Date(filters.endDate);
        ed.setDate(ed.getDate() + 1);
        filtered = filtered.filter(e => new Date(e.created_at) <= ed);
      }

      const start = (filters.page - 1) * filters.limit;
      const paginated = filtered.slice(start, start + filters.limit);
      setEntries(paginated);
      setTotal(filtered.length);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / filters.limit)));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.actorType && filters.actorType !== 'all') params.actor_type = filters.actorType;
      if (filters.actionCategory && filters.actionCategory !== 'all') params.action_category = filters.actionCategory;
      if (filters.entityType && filters.entityType !== 'all') params.entity_type = filters.entityType;
      if (filters.search) params.search = filters.search;

      const response = await api.get('/audit-log', { params });
      setEntries(response.data.data ?? []);
      setTotal(response.data.total ?? 0);
      setTotalPages(response.data.totalPages ?? 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch audit log');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  /* ── Update filter helper ── */
  const updateFilter = useCallback(<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  /* ── Export CSV ── */
  const handleExport = useCallback(async () => {
    const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';
    setIsExporting(true);
    try {
      let csv: string;
      if (isDemo) {
        const headers = ['ID', 'Timestamp', 'Actor Type', 'Actor Name', 'Action', 'Action Category', 'Entity Type', 'Entity ID', 'Platform', 'Source', 'IP Address'];
        const rows = entries.map(e => [
          e.id, e.created_at, e.actor_type, e.actor_name || '', e.action, e.action_category,
          (e.details?.entity_type as string) || '', (e.details?.entity_id as string) || '',
          e.platform || '', e.source || '', e.ip_address || '',
        ]);
        csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      } else {
        const params: Record<string, unknown> = {};
        if (filters.startDate) params.start_date = filters.startDate;
        if (filters.endDate) params.end_date = filters.endDate;
        if (filters.actorType !== 'all') params.actor_type = filters.actorType;
        if (filters.actionCategory !== 'all') params.action_category = filters.actionCategory;
        if (filters.entityType !== 'all') params.entity_type = filters.entityType;
        if (filters.search) params.search = filters.search;

        const response = await api.get('/audit-log/export', {
          params,
          responseType: 'text',
        });
        csv = response.data;
      }
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ type: 'success', title: 'Audit log exported' });
    } catch {
      showToast({ type: 'error', title: 'Export failed' });
    } finally {
      setIsExporting(false);
    }
  }, [entries, filters, showToast]);

  /* ── Action categories for filter ── */
  const actionCategories = useMemo(() => {
    const cats = new Set(entries.map(e => e.action_category));
    return Array.from(cats).sort();
  }, [entries]);

  return (
    <div className="flex flex-col h-full" style={{ background: C.bgPage }}>
      {/* ═══ Header ═══ */}
      <div className="px-6 pt-5 pb-3 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
              Audit Log
            </h1>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: `${C.accent}15`, color: C.accent }}
            >
              {total.toLocaleString()} entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                color: showFilters ? C.textPrimary : C.textSecondary,
                border: `1px solid ${showFilters ? C.borderActive : C.borderSubtle}`,
                background: showFilters ? `${C.accent}10` : 'transparent',
              }}
            >
              <Filter size={12} />
              Filters
              {(filters.actorType !== 'all' || filters.actionCategory !== 'all' || filters.entityType !== 'all' || filters.startDate || filters.endDate) && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: C.accent }}
                />
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
            >
              {isExporting ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
              Export CSV
            </button>
          </div>
        </div>

        {/* ═══ Search Bar ═══ */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search by user name, action, entity ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs outline-none transition-all"
            style={{
              background: C.bgInput,
              color: C.textPrimary,
              border: `1px solid ${C.borderSubtle}`,
            }}
          />
        </div>

        {/* ═══ Filter Panel ═══ */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 pb-1">
                {/* Date Range */}
                <div className="flex items-center gap-1.5">
                  <Calendar size={10} style={{ color: C.textTertiary }} />
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                    className="px-2 py-1.5 rounded-md text-[11px] outline-none"
                    style={{ background: C.bgInput, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                  />
                  <span style={{ color: C.textTertiary }}>to</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => updateFilter('endDate', e.target.value)}
                    className="px-2 py-1.5 rounded-md text-[11px] outline-none"
                    style={{ background: C.bgInput, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                  />
                </div>

                {/* Actor Type */}
                <div className="relative">
                  <User size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
                  <select
                    value={filters.actorType}
                    onChange={(e) => updateFilter('actorType', e.target.value)}
                    className="appearance-none pl-7 pr-6 py-1.5 rounded-md text-[11px] outline-none cursor-pointer"
                    style={{ background: C.bgInput, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                  >
                    <option value="all">All Actors</option>
                    <option value="user">User</option>
                    <option value="ai">AI Agent</option>
                    <option value="system">System</option>
                    <option value="api">API</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.textTertiary }} />
                </div>

                {/* Entity Type */}
                <div className="relative">
                  <Hash size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
                  <select
                    value={filters.entityType}
                    onChange={(e) => updateFilter('entityType', e.target.value)}
                    className="appearance-none pl-7 pr-6 py-1.5 rounded-md text-[11px] outline-none cursor-pointer"
                    style={{ background: C.bgInput, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                  >
                    <option value="all">All Entities</option>
                    <option value="campaign">Campaign</option>
                    <option value="draft">Draft</option>
                    <option value="creative">Creative</option>
                    <option value="rule">Rule</option>
                    <option value="user">User / Team</option>
                    <option value="setting">Setting</option>
                    <option value="agent">Agent</option>
                    <option value="webhook">Webhook</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.textTertiary }} />
                </div>

                {/* Action Category */}
                <div className="relative">
                  <Activity size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
                  <select
                    value={filters.actionCategory}
                    onChange={(e) => updateFilter('actionCategory', e.target.value)}
                    className="appearance-none pl-7 pr-6 py-1.5 rounded-md text-[11px] outline-none cursor-pointer"
                    style={{ background: C.bgInput, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
                  >
                    <option value="all">All Actions</option>
                    {actionCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {(actionCategoryConfig[cat]?.label || cat).replace(/_/g, ' ')}
                      </option>
                    ))}
                    <option value="budget_change">Budget Change</option>
                    <option value="status_change">Status Change</option>
                    <option value="campaign_create">Campaign Create</option>
                    <option value="campaign_update">Campaign Update</option>
                    <option value="campaign_delete">Campaign Delete</option>
                    <option value="draft_created">Draft Created</option>
                    <option value="draft_approved">Draft Approved</option>
                    <option value="draft_rejected">Draft Rejected</option>
                    <option value="creative_upload">Creative Upload</option>
                    <option value="rule_triggered">Rule Triggered</option>
                    <option value="agent_action">Agent Action</option>
                    <option value="agent_run">Agent Run</option>
                    <option value="team_invite">Team Invite</option>
                    <option value="user_signup">User Signup</option>
                    <option value="user_login">User Login</option>
                    <option value="setting_change">Setting Change</option>
                    <option value="webhook">Webhook</option>
                    <option value="approval_given">Approval Given</option>
                    <option value="rejection">Rejection</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.textTertiary }} />
                </div>

                {/* Clear Filters */}
                {(filters.actorType !== 'all' || filters.actionCategory !== 'all' || filters.entityType !== 'all' || filters.startDate || filters.endDate) && (
                  <button
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        startDate: '',
                        endDate: '',
                        actorType: 'all',
                        actionCategory: 'all',
                        entityType: 'all',
                        page: 1,
                      }));
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] transition-colors"
                    style={{ color: C.statusError }}
                  >
                    <X size={10} />
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ Error Banner ═══ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-6 mb-3 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2"
            style={{ background: `${C.statusError}15`, color: C.statusError, border: `1px solid ${C.statusError}30` }}
          >
            <AlertTriangle size={12} />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="hover:opacity-70">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Table ═══ */}
      <div className="flex-1 overflow-hidden px-6 pb-4">
        <div
          className="rounded-xl overflow-hidden h-full flex flex-col"
          style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
        >
          {/* Table Header */}
          <div
            className="flex items-center px-4 py-2.5 flex-shrink-0"
            style={{ background: C.bgElevated, borderBottom: `1px solid ${C.borderSubtle}` }}
          >
            {[
              { key: 'timestamp', label: 'Timestamp', width: '130px' },
              { key: 'actor', label: 'User', width: '150px' },
              { key: 'action', label: 'Action', width: '110px' },
              { key: 'entity', label: 'Entity Type', width: '90px' },
              { key: 'entityId', label: 'Entity ID', width: '110px' },
              { key: 'changes', label: 'Changes', width: '160px' },
              { key: 'ip', label: 'IP Address', width: '100px' },
              { key: 'detail', label: '', width: '40px' },
            ].map((col) => (
              <span
                key={col.key}
                className="text-[10px] font-semibold uppercase tracking-[0.06em] flex-shrink-0"
                style={{ color: C.textTertiary, width: col.width }}
              >
                {col.label}
              </span>
            ))}
          </div>

          {/* Table Body */}
          {isLoading && entries.length === 0 ? (
            <TableSkeleton />
          ) : entries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {entries.map((entry, i) => {
                const entityType = (entry.details?.entity_type as string) || 'unknown';
                const entityId = (entry.details?.entity_id as string) || entry.campaign_id;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: i * 0.01 }}
                    className="flex items-center px-4 py-3 cursor-pointer transition-colors duration-100 group"
                    style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
                    onClick={() => setSelectedEntry(entry)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = C.bgHover;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {/* Timestamp */}
                    <span
                      className="text-[11px] font-mono flex-shrink-0"
                      style={{ color: C.textSecondary, width: '130px' }}
                    >
                      {new Date(entry.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Actor */}
                    <span className="flex items-center flex-shrink-0" style={{ width: '150px' }}>
                      <ActorBadge actorType={entry.actor_type} actorName={entry.actor_name} />
                    </span>

                    {/* Action */}
                    <span className="flex-shrink-0" style={{ width: '110px' }}>
                      <ActionBadge category={entry.action_category} />
                    </span>

                    {/* Entity Type */}
                    <span className="flex-shrink-0" style={{ width: '90px' }}>
                      <EntityTypeBadge type={entityType} />
                    </span>

                    {/* Entity ID */}
                    <span
                      className="text-[11px] font-mono truncate flex-shrink-0"
                      style={{ color: C.textSecondary, width: '110px' }}
                    >
                      {entityId || '—'}
                    </span>

                    {/* Changes */}
                    <span className="flex-shrink-0" style={{ width: '160px' }}>
                      <ChangesBadge details={entry.details} />
                    </span>

                    {/* IP Address */}
                    <span
                      className="text-[11px] font-mono flex-shrink-0"
                      style={{ color: C.textTertiary, width: '100px' }}
                    >
                      {entry.ip_address || '—'}
                    </span>

                    {/* View Detail */}
                    <span className="flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: '40px' }}>
                      <Eye size={12} style={{ color: C.accent }} />
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Pagination ═══ */}
      {entries.length > 0 && (
        <div className="px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
          <span className="text-[11px]" style={{ color: C.textTertiary }}>
            Page {filters.page} of {totalPages} · {total.toLocaleString()} total entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={filters.page <= 1 || isLoading}
              className="p-1.5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
              style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (filters.page <= 3) {
                pageNum = i + 1;
              } else if (filters.page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = filters.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                  disabled={isLoading}
                  className="w-7 h-7 rounded-md text-[11px] font-medium transition-all disabled:cursor-not-allowed"
                  style={{
                    color: filters.page === pageNum ? '#FFFFFF' : C.textSecondary,
                    background: filters.page === pageNum ? C.accent : 'transparent',
                    border: filters.page === pageNum ? `1px solid ${C.accent}` : `1px solid ${C.borderSubtle}`,
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={filters.page >= totalPages || isLoading}
              className="p-1.5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
              style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Diff Modal ═══ */}
      <AnimatePresence>
        {selectedEntry && (
          <DiffModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
