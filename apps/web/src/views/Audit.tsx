// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Search,
  Bot,
  X,
  Check,
  Target,
  DollarSign,
  Pause,
  Upload,
  Zap,
  CheckCircle,
  Globe,
  Server,
  Smartphone,
  Calendar,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Clock,
  User,
  Settings,
  Loader2,
  FileDown,
  Filter,
} from 'lucide-react';
import { auditApi } from '../lib/auditApi';
import { useUIStore } from '../stores/uiStore';
import type { AuditEntry, AuditActorType, AuditActionCategory } from '../lib/auditApi';
import SEO from '../components/SEO';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bgPage: '#0A0A0A',
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
  metaBlue: '#1877F2',
  googleRed: '#DB4437',
  tiktokCyan: '#00F2EA',
  snapYellow: '#FFFC00',
  purple: '#A855F7',
  orange: '#F97316',
};

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
type ViewMode = 'timeline' | 'table';

/* ------------------------------------------------------------------ */
/*  ACTOR CONFIG                                                        */
/* ------------------------------------------------------------------ */
const actorConfig: Record<AuditActorType, { color: string; icon: React.ElementType; label: string }> = {
  ai: { color: C.purple, icon: Bot, label: 'AI' },
  user: { color: C.accent, icon: User, label: 'User' },
  system: { color: C.textTertiary, icon: Server, label: 'System' },
  api: { color: C.statusWarning, icon: Globe, label: 'API' },
};

/* ------------------------------------------------------------------ */
/*  ACTION CONFIG                                                       */
/* ------------------------------------------------------------------ */
const actionConfig: Record<string, { color: string; icon: React.ElementType }> = {
  'campaign_create': { color: C.statusActive, icon: Target },
  'campaign_update': { color: C.accent, icon: Check },
  'campaign_delete': { color: C.statusError, icon: X },
  'budget_change': { color: C.accent, icon: DollarSign },
  'status_change': { color: C.statusWarning, icon: Pause },
  'creative_upload': { color: C.purple, icon: Upload },
  'rule_triggered': { color: C.orange, icon: Zap },
  'approval_given': { color: C.statusActive, icon: CheckCircle },
  'rejection': { color: C.statusError, icon: X },
  'agent_action': { color: '#06B6D4', icon: Bot },
  'draft_create': { color: C.statusInfo, icon: Upload },
  'draft_approve': { color: C.statusActive, icon: CheckCircle },
  'draft_reject': { color: C.statusError, icon: X },
  'team_invite': { color: C.accent, icon: User },
  'login': { color: C.statusInfo, icon: Globe },
  'setting_change': { color: C.textTertiary, icon: Settings },
};

/* ------------------------------------------------------------------ */
/*  PLATFORM BADGE                                                      */
/* ------------------------------------------------------------------ */
const platformColors: Record<string, string> = {
  Meta: C.metaBlue,
  Google: C.googleRed,
  TikTok: C.tiktokCyan,
  Snap: C.snapYellow,
  all: C.accent,
};

function PlatformBadge({ name }: { name: string }) {
  const color = platformColors[name] || C.textTertiary;
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-xs" style={{ color: C.textSecondary }}>{name}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  ACTOR AVATAR                                                        */
/* ------------------------------------------------------------------ */
function ActorBadge({ actor, actorType }: { actor: string; actorType: AuditActorType }) {
  const cfg = actorConfig[actorType] ?? actorConfig.system;
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-2">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${cfg.color}20` }}
      >
        <Icon size={12} style={{ color: cfg.color }} />
      </span>
      <span className="text-xs font-medium truncate" style={{ color: C.textPrimary }}>
        {actor}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SKELETONS                                                           */
/* ------------------------------------------------------------------ */
function TimelineSkeleton() {
  return (
    <div className="space-y-4 animate-pulse pl-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-8 top-0 w-3 h-3 rounded-full" style={{ background: C.bgHover }} />
          <div className="rounded-lg p-4 space-y-2" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
            <div className="flex items-center gap-2">
              <div className="h-3 rounded w-20" style={{ background: C.bgHover }} />
              <div className="h-3 rounded w-16" style={{ background: C.bgHover }} />
            </div>
            <div className="h-3 rounded w-3/4" style={{ background: C.bgHover }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center px-4 py-3"
          style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
        >
          <div className="h-3 rounded w-24 flex-shrink-0" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-28 flex-shrink-0 ml-4" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-24 flex-shrink-0 ml-4" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-16 flex-shrink-0 ml-4" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-32 flex-shrink-0 ml-4" style={{ background: C.bgHover }} />
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
        No audit entries found
      </p>
      <p className="text-xs mt-1" style={{ color: C.textTertiary }}>
        Try adjusting your filters or date range
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function AuditPage() {
  const showToast = useUIStore((s) => s.showToast);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState<AuditActorType | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<AuditActionCategory | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    // Demo mode: serve realistic mock data when no backend is available
    const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';
    if (isDemo) {
      const now = new Date();
      const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
      const allEntries: AuditEntry[] = [
        {
          id: 'aud_1', timestamp: daysAgo(0.5), actor: 'AI Agent', actorType: 'ai',
          action: 'rule_triggered', actionCategory: 'rule_triggered', platform: 'Meta',
          campaign: 'Summer Sale 2026', campaignId: 'c_meta_01',
          details: { reason: 'ROAS exceeded 4.0x threshold', oldBudget: 400, newBudget: 480, roas: 4.2 },
          source: 'auto-optimizer', ipAddress: '—',
          metadata: { ruleId: 'rule_budget_scale_01', triggeredBy: 'roas_threshold' },
        },
        {
          id: 'aud_2', timestamp: daysAgo(1.2), actor: 'Demo User', actorType: 'user',
          action: 'login', actionCategory: 'login', platform: 'all', campaign: '',
          details: { browser: 'Chrome 126', os: 'macOS 14.5', location: 'San Francisco, CA', sessionId: 'sess_abc123xyz' },
          source: 'web-app', ipAddress: '192.168.1.105',
          metadata: { mfa: true, sessionId: 'sess_abc123xyz' },
        },
        {
          id: 'aud_3', timestamp: daysAgo(2.0), actor: 'Demo User', actorType: 'user',
          action: 'campaign_create', actionCategory: 'campaign_create', platform: 'Google',
          campaign: 'PMax - Back to School', campaignId: 'c_google_09',
          details: { budget: 5000, targeting: 'parents 25-54', objective: 'conversions', creatives: 3 },
          source: 'web-app', ipAddress: '192.168.1.105',
          metadata: { draftId: 'draft_07', approvedBy: 'Demo User' },
        },
        {
          id: 'aud_4', timestamp: daysAgo(3.5), actor: 'AI Agent', actorType: 'ai',
          action: 'budget_change', actionCategory: 'budget_change', platform: 'TikTok',
          campaign: 'Spark Ads - UGC', campaignId: 'c_tiktok_04',
          details: { direction: 'increase', oldBudget: 200, newBudget: 250, roas: 4.5, reason: 'ROAS 4.5x performance' },
          source: 'auto-optimizer', ipAddress: '—',
          metadata: { ruleId: 'rule_budget_scale_02', confidence: 0.94 },
        },
        {
          id: 'aud_5', timestamp: daysAgo(5.0), actor: 'Demo User', actorType: 'user',
          action: 'draft_approve', actionCategory: 'draft_approve', platform: 'Google',
          campaign: 'PMax - Ecommerce', campaignId: 'c_google_03',
          details: { draftType: 'bid_increase', oldBid: 12.0, newBid: 14.5, approvalNotes: 'CPA under target' },
          source: 'web-app', ipAddress: '192.168.1.110',
          metadata: { draftId: 'draft_14', reviewer: 'Demo User', sessionId: 'sess_def456uvw' },
        },
        {
          id: 'aud_6', timestamp: daysAgo(7.0), actor: 'AI Agent', actorType: 'ai',
          action: 'rule_triggered', actionCategory: 'rule_triggered', platform: 'Snap',
          campaign: 'AR Lens - Branded', campaignId: 'c_snap_02',
          details: { alert: 'creative_fatigue', ctr: 0.003, impressions: 78000, recommendation: 'refresh creative' },
          source: 'auto-optimizer', ipAddress: '—',
          metadata: { ruleId: 'rule_creative_fatigue_01', severity: 'warning' },
        },
        {
          id: 'aud_7', timestamp: daysAgo(8.5), actor: 'Demo User', actorType: 'user',
          action: 'login', actionCategory: 'login', platform: 'all', campaign: '',
          details: { browser: 'Firefox 127', os: 'Windows 11', location: 'Austin, TX', sessionId: 'sess_ghi789rst' },
          source: 'web-app', ipAddress: '10.0.0.42',
          metadata: { mfa: true, sessionId: 'sess_ghi789rst' },
        },
        {
          id: 'aud_8', timestamp: daysAgo(10.0), actor: 'AI Agent', actorType: 'ai',
          action: 'budget_change', actionCategory: 'budget_change', platform: 'Meta',
          campaign: 'Retargeting - Cart Abandoners', campaignId: 'c_meta_03',
          details: { direction: 'decrease', oldBudget: 1200, newBudget: 950, reason: 'CPA trending above $55 threshold', cpa: 58.3 },
          source: 'auto-optimizer', ipAddress: '—',
          metadata: { ruleId: 'rule_budget_cut_01', confidence: 0.89 },
        },
        {
          id: 'aud_9', timestamp: daysAgo(12.0), actor: 'Demo User', actorType: 'user',
          action: 'campaign_create', actionCategory: 'campaign_create', platform: 'TikTok',
          campaign: 'TopView - Product Launch', campaignId: 'c_tiktok_06',
          details: { budget: 8000, format: 'TopView', duration: 15, targeting: '18-34 tech enthusiasts' },
          source: 'web-app', ipAddress: '192.168.1.105',
          metadata: { draftId: 'draft_21', sessionId: 'sess_jkl012mno' },
        },
        {
          id: 'aud_10', timestamp: daysAgo(14.0), actor: 'AI Agent', actorType: 'ai',
          action: 'rule_triggered', actionCategory: 'rule_triggered', platform: 'Google',
          campaign: 'Search - Brand Terms', campaignId: 'c_google_01',
          details: { alert: 'frequency_cap', frequency: 3.2, days: 7, recommendation: 'expand audience' },
          source: 'auto-optimizer', ipAddress: '—',
          metadata: { ruleId: 'rule_freq_cap_01', severity: 'warning' },
        },
        {
          id: 'aud_11', timestamp: daysAgo(15.5), actor: 'Demo User', actorType: 'user',
          action: 'budget_change', actionCategory: 'budget_change', platform: 'Snap',
          campaign: 'Dynamic - Retargeting', campaignId: 'c_snap_01',
          details: { direction: 'increase', oldBudget: 600, newBudget: 750, roas: 4.1, reason: 'ROAS 4.1x validated' },
          source: 'web-app', ipAddress: '192.168.1.110',
          metadata: { approvalId: 'appr_03', sessionId: 'sess_pqr345stu' },
        },
        {
          id: 'aud_12', timestamp: daysAgo(18.0), actor: 'AI Agent', actorType: 'ai',
          action: 'budget_change', actionCategory: 'budget_change', platform: 'Meta',
          campaign: 'Lookalike - Purchasers', campaignId: 'c_meta_04',
          details: { direction: 'increase', oldBudget: 800, newBudget: 960, roas: 3.8, reason: 'ROAS 3.8x exceeded 3.5x threshold' },
          source: 'auto-optimizer', ipAddress: '—',
          metadata: { ruleId: 'rule_budget_scale_03', confidence: 0.91 },
        },
        {
          id: 'aud_13', timestamp: daysAgo(20.0), actor: 'Demo User', actorType: 'user',
          action: 'login', actionCategory: 'login', platform: 'all', campaign: '',
          details: { browser: 'Safari 17', os: 'macOS 14.4', location: 'New York, NY', sessionId: 'sess_vwx678yz' },
          source: 'web-app', ipAddress: '172.16.0.15',
          metadata: { mfa: true, sessionId: 'sess_vwx678yz' },
        },
        {
          id: 'aud_14', timestamp: daysAgo(22.0), actor: 'Demo User', actorType: 'user',
          action: 'draft_approve', actionCategory: 'draft_approve', platform: 'TikTok',
          campaign: 'In-Feed - App Installs', campaignId: 'c_tiktok_03',
          details: { draftType: 'audience_expansion', oldAudience: '3.2M', newAudience: '4.8M', cpi: 2.1 },
          source: 'web-app', ipAddress: '192.168.1.105',
          metadata: { draftId: 'draft_18', reviewer: 'Demo User', sessionId: 'sess_abc789def' },
        },
        {
          id: 'aud_15', timestamp: daysAgo(25.0), actor: 'AI Agent', actorType: 'ai',
          action: 'rule_triggered', actionCategory: 'rule_triggered', platform: 'Google',
          campaign: 'Display - Remarketing', campaignId: 'c_google_05',
          details: { alert: 'cpa_spike', cpa: 67.5, threshold: 50, recommendation: 'reduce bids 15%' },
          source: 'auto-optimizer', ipAddress: '—',
          metadata: { ruleId: 'rule_cpa_spike_01', severity: 'critical' },
        },
      ];
      let filtered = allEntries;
      if (actorFilter !== 'all') filtered = filtered.filter(e => e.actorType === actorFilter);
      if (actionFilter !== 'all') filtered = filtered.filter(e => e.actionCategory === actionFilter);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(e =>
          e.campaign.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q) || JSON.stringify(e.details).toLowerCase().includes(q)
        );
      }
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);
      setEntries(paginated);
      setTotal(filtered.length);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await auditApi.search({
        actorType: actorFilter,
        actionCategory: actionFilter,
        search,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      });
      setEntries(response.entries);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit log');
    } finally {
      setIsLoading(false);
    }
  }, [actorFilter, actionFilter, search, startDate, endDate, page, limit]);

  // Initial fetch
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Toggle expand
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Export
  const handleExport = useCallback(async () => {
    try {
      const isDemo = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';
      let csv: string;
      if (isDemo) {
        const demoRows = [
          ['Timestamp', 'Actor', 'Actor Type', 'Action', 'Campaign', 'Platform', 'IP Address', 'Source', 'Details'],
          [new Date(Date.now() - 0.5 * 86400000).toISOString(), 'AI Agent', 'ai', 'rule_triggered', 'Summer Sale 2026', 'Meta', '—', 'auto-optimizer', 'ROAS 4.2x → budget $400→$480'],
          [new Date(Date.now() - 1.2 * 86400000).toISOString(), 'Demo User', 'user', 'login', '—', 'all', '192.168.1.105', 'web-app', 'Chrome/macOS - sess_abc123xyz'],
          [new Date(Date.now() - 2.0 * 86400000).toISOString(), 'Demo User', 'user', 'campaign_create', 'PMax - Back to School', 'Google', '192.168.1.105', 'web-app', '$5K budget, parents 25-54'],
          [new Date(Date.now() - 3.5 * 86400000).toISOString(), 'AI Agent', 'ai', 'budget_change', 'Spark Ads - UGC', 'TikTok', '—', 'auto-optimizer', 'ROAS 4.5x → budget $200→$250'],
          [new Date(Date.now() - 5.0 * 86400000).toISOString(), 'Demo User', 'user', 'draft_approve', 'PMax - Ecommerce', 'Google', '192.168.1.110', 'web-app', 'Bid increase $12→$14.5 approved'],
          [new Date(Date.now() - 7.0 * 86400000).toISOString(), 'AI Agent', 'ai', 'rule_triggered', 'AR Lens - Branded', 'Snap', '—', 'auto-optimizer', 'Creative fatigue: CTR 0.3%, 78k imp'],
          [new Date(Date.now() - 10.0 * 86400000).toISOString(), 'AI Agent', 'ai', 'budget_change', 'Retargeting - Cart Abandoners', 'Meta', '—', 'auto-optimizer', 'CPA $58.3 → budget cut $1200→$950'],
          [new Date(Date.now() - 12.0 * 86400000).toISOString(), 'Demo User', 'user', 'campaign_create', 'TopView - Product Launch', 'TikTok', '192.168.1.105', 'web-app', '$8K TopView, 18-34 tech'],
          [new Date(Date.now() - 14.0 * 86400000).toISOString(), 'AI Agent', 'ai', 'rule_triggered', 'Search - Brand Terms', 'Google', '—', 'auto-optimizer', 'Frequency 3.2x in 7 days'],
          [new Date(Date.now() - 15.5 * 86400000).toISOString(), 'Demo User', 'user', 'budget_change', 'Dynamic - Retargeting', 'Snap', '192.168.1.110', 'web-app', 'ROAS 4.1x → budget $600→$750'],
          [new Date(Date.now() - 18.0 * 86400000).toISOString(), 'AI Agent', 'ai', 'budget_change', 'Lookalike - Purchasers', 'Meta', '—', 'auto-optimizer', 'ROAS 3.8x → budget $800→$960'],
          [new Date(Date.now() - 22.0 * 86400000).toISOString(), 'Demo User', 'user', 'draft_approve', 'In-Feed - App Installs', 'TikTok', '192.168.1.105', 'web-app', 'Audience expansion 3.2M→4.8M'],
          [new Date(Date.now() - 25.0 * 86400000).toISOString(), 'AI Agent', 'ai', 'rule_triggered', 'Display - Remarketing', 'Google', '—', 'auto-optimizer', 'CPA spike $67.5, threshold $50'],
        ];
        csv = demoRows.map(r => r.join(',')).join('\n');
      } else {
        csv = await auditApi.export({
          actorType: actorFilter,
          actionCategory: actionFilter,
          search,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
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
    }
  }, [actorFilter, actionFilter, search, startDate, endDate, showToast]);

  // Group entries by date for timeline view
  const grouped = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const entry of entries) {
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(entry);
    }
    return Array.from(map.entries());
  }, [entries]);

  return (
    <>
    <SEO
      title="Audit Log"
      description="Track all changes, actions, and events across your AdNexus AI workspace with a comprehensive audit trail."
      keywords="audit log, activity log, compliance, change tracking"
    />
    <div className="flex flex-col h-full" style={{ background: C.bgPage }}>
      {/* ─── Header ─── */}
      <div className="px-6 pt-5 pb-3 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
            Audit Log
          </h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div
              className="flex items-center rounded-lg overflow-hidden"
              style={{ border: `1px solid ${C.borderSubtle}` }}
            >
              <button
                onClick={() => setViewMode('timeline')}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: viewMode === 'timeline' ? C.bgElevated : 'transparent',
                  color: viewMode === 'timeline' ? C.textPrimary : C.textSecondary,
                }}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: viewMode === 'table' ? C.bgElevated : 'transparent',
                  color: viewMode === 'table' ? C.textPrimary : C.textSecondary,
                }}
              >
                Table
              </button>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
              style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
            >
              <FileDown size={12} /> Export
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, actors, campaigns..."
              className="pl-7 pr-3 py-1.5 rounded-md text-[11px] w-56 outline-none"
              style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
            />
          </div>

          {/* Actor Type Filter */}
          <div className="relative">
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value as AuditActorType | 'all')}
              className="appearance-none pl-7 pr-6 py-1.5 rounded-md text-[11px] outline-none cursor-pointer"
              style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
            >
              <option value="all">All Actors</option>
              <option value="ai">AI</option>
              <option value="user">User</option>
              <option value="system">System</option>
              <option value="api">API</option>
            </select>
            <User size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
          </div>

          {/* Action Category Filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AuditActionCategory | 'all')}
              className="appearance-none pl-7 pr-6 py-1.5 rounded-md text-[11px] outline-none cursor-pointer"
              style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
            >
              <option value="all">All Actions</option>
              <option value="campaign_create">Campaign Created</option>
              <option value="campaign_update">Campaign Updated</option>
              <option value="budget_change">Budget Changed</option>
              <option value="status_change">Status Changed</option>
              <option value="creative_upload">Creative Uploaded</option>
              <option value="rule_triggered">Rule Triggered</option>
              <option value="approval_given">Approval Given</option>
              <option value="rejection">Rejection</option>
              <option value="agent_action">Agent Action</option>
              <option value="draft_create">Draft Created</option>
              <option value="draft_approve">Draft Approved</option>
              <option value="draft_reject">Draft Rejected</option>
              <option value="team_invite">Team Invite</option>
            </select>
            <Filter size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Calendar size={10} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-6 pr-2 py-1.5 rounded-md text-[11px] outline-none"
                style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
              />
            </div>
            <span style={{ color: C.textTertiary }}>—</span>
            <div className="relative">
              <Calendar size={10} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: C.textTertiary }} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-6 pr-2 py-1.5 rounded-md text-[11px] outline-none"
                style={{ background: C.bgHover, color: C.textPrimary, border: `1px solid ${C.borderSubtle}` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Error Banner ─── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-6 mb-3 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between"
            style={{ background: `${C.statusError}15`, color: C.statusError, border: `1px solid ${C.statusError}30` }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:opacity-70">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        {isLoading && entries.length === 0 ? (
          viewMode === 'timeline' ? (
            <div className="overflow-y-auto h-full py-2">
              <TimelineSkeleton />
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden h-full flex flex-col" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
              <TableSkeleton />
            </div>
          )
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'timeline' ? (
          <div className="overflow-y-auto h-full py-2">
            <TimelineView
              grouped={grouped}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
            />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden h-full flex flex-col" style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}>
            <TableView entries={entries} />
          </div>
        )}
      </div>

      {/* ─── Pagination ─── */}
      <div className="px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
        <span className="text-[11px]" style={{ color: C.textTertiary }}>
          {total} entries
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
          >
            Prev
          </button>
          <span className="px-3 py-1 text-xs font-medium" style={{ color: C.textPrimary }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  TIMELINE VIEW                                                       */
/* ------------------------------------------------------------------ */
function TimelineView({
  grouped,
  expandedIds,
  onToggleExpand,
}: {
  grouped: [string, AuditEntry[]][];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="relative pl-4">
      {/* Vertical Line */}
      <div
        className="absolute left-4 top-0 bottom-0 w-px"
        style={{ background: C.borderSubtle }}
      />

      {grouped.map(([date, entries]) => (
        <div key={date} className="mb-6">
          {/* Date Header */}
          <div className="relative flex items-center gap-3 mb-3">
            <div
              className="absolute -left-4 w-2 h-2 rounded-full"
              style={{ background: C.accent, border: `2px solid ${C.bgPage}` }}
            />
            <h3 className="text-xs font-bold uppercase tracking-wider ml-4" style={{ color: C.textTertiary }}>
              {date}
            </h3>
          </div>

          {/* Entries */}
          <div className="space-y-2 ml-4">
            {entries.map((entry, i) => {
              const cfg = actionConfig[entry.actionCategory] ?? { color: C.textTertiary, icon: Clock };
              const actorCfg = actorConfig[entry.actorType] ?? actorConfig.system;
              const ActionIcon = cfg.icon;
              const isExpanded = expandedIds.has(entry.id);

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="relative"
                >
                  {/* Dot */}
                  <div
                    className="absolute -left-5 top-3 w-2.5 h-2.5 rounded-full"
                    style={{ background: cfg.color, border: `2px solid ${C.bgPage}` }}
                  />

                  <div
                    className="rounded-lg p-3 transition-all duration-150"
                    style={{
                      background: C.bgElevated,
                      border: `1px solid ${C.borderSubtle}`,
                    }}
                  >
                    {/* Header Row */}
                    <button
                      onClick={() => onToggleExpand(entry.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{ background: `${cfg.color}15`, color: cfg.color }}
                          >
                            <ActionIcon size={10} />
                            {entry.action}
                          </span>
                          <ActorBadge actor={entry.actor} actorType={entry.actorType} />
                          {entry.campaign !== '—' && entry.campaign && (
                            <span className="text-xs font-medium" style={{ color: C.textPrimary }}>
                              {entry.campaign}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] font-mono-data" style={{ color: C.textTertiary }}>
                            {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={12} style={{ color: C.textTertiary }} />
                          ) : (
                            <ChevronDown size={12} style={{ color: C.textTertiary }} />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expandable Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 mt-3 space-y-2" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] w-20" style={{ color: C.textTertiary }}>
                                Platform
                              </span>
                              <PlatformBadge name={entry.platform} />
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] w-20" style={{ color: C.textTertiary }}>
                                Source
                              </span>
                              <span className="text-xs" style={{ color: C.textSecondary }}>
                                {entry.source}
                              </span>
                            </div>
                            {entry.ipAddress && entry.ipAddress !== '—' && (
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] w-20" style={{ color: C.textTertiary }}>
                                  IP Address
                                </span>
                                <span className="text-xs font-mono-data" style={{ color: C.textSecondary }}>
                                  {entry.ipAddress}
                                </span>
                              </div>
                            )}
                            {/* JSON Details */}
                            {entry.details && Object.keys(entry.details).length > 0 && (
                              <div
                                className="rounded-lg p-2.5 mt-2 overflow-auto max-h-40"
                                style={{ background: C.bgHover }}
                              >
                                <pre
                                  className="text-[10px] font-mono-data leading-relaxed whitespace-pre-wrap break-all"
                                  style={{ color: C.textSecondary }}
                                >
                                  {JSON.stringify(entry.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TABLE VIEW                                                          */
/* ------------------------------------------------------------------ */
function TableView({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Table Header */}
      <div
        className="flex items-center px-4 py-2.5 sticky top-0 z-10"
        style={{ background: C.bgElevated, borderBottom: `1px solid ${C.borderSubtle}` }}
      >
        {['Timestamp', 'Actor', 'Action', 'Platform', 'Campaign', 'Source'].map((header) => (
          <span
            key={header}
            className="text-[11px] font-semibold uppercase tracking-[0.06em] flex-shrink-0"
            style={{
              color: C.textTertiary,
              width:
                header === 'Timestamp'
                  ? '110px'
                  : header === 'Actor'
                  ? '140px'
                  : header === 'Action'
                  ? '130px'
                  : header === 'Platform'
                  ? '80px'
                  : header === 'Campaign'
                  ? '140px'
                  : '80px',
            }}
          >
            {header}
          </span>
        ))}
      </div>

      {/* Table Body */}
      {entries.map((entry, i) => {
        const cfg = actionConfig[entry.actionCategory] ?? { color: C.textTertiary, icon: Clock };
        const ActionIcon = cfg.icon;
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: i * 0.01 }}
            className="flex items-center px-4 py-3 transition-colors duration-100"
            style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = C.bgHover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {/* Timestamp */}
            <span
              className="font-mono-data text-[11px] flex-shrink-0"
              style={{ color: C.textSecondary, width: '110px' }}
            >
              {new Date(entry.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {/* Actor */}
            <span className="flex items-center gap-2 flex-shrink-0" style={{ width: '140px' }}>
              <ActorBadge actor={entry.actor} actorType={entry.actorType} />
            </span>

            {/* Action */}
            <span className="flex-shrink-0" style={{ width: '130px' }}>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: `${cfg.color}15`, color: cfg.color }}
              >
                <ActionIcon size={10} />
                {entry.action}
              </span>
            </span>

            {/* Platform */}
            <span className="flex-shrink-0" style={{ width: '80px' }}>
              <PlatformBadge name={entry.platform} />
            </span>

            {/* Campaign */}
            <span
              className="text-xs font-medium truncate flex-shrink-0"
              style={{ color: entry.campaign !== '—' && entry.campaign ? C.textPrimary : C.textTertiary, width: '140px' }}
            >
              {entry.campaign || '—'}
            </span>

            {/* Source */}
            <span className="flex items-center gap-1 flex-shrink-0" style={{ width: '80px' }}>
              <span className="text-[11px]" style={{ color: C.textTertiary }}>
                {entry.source}
              </span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
