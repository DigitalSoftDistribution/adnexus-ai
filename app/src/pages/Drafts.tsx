import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Clock,
  Bot,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Pause,
  Upload,
  Target,
  Copy as CopyIcon,
  Users,
  DollarSign,
  BarChart3,
  ArrowRight,
  Zap,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertTriangle,
  User,
  ChevronRight,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { apiList, apiGet, apiPost } from '../lib/api';
import { useRealtime } from '../hooks/useRealtime';
import { useMutation } from '../hooks/useMutation';
import { toast } from '../hooks/useToast';
import type { Draft, DraftStatus, DraftComment } from '../stores/draftStore';
import type { AdPlatform } from '../stores/campaignStore';
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
};

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
type DraftTab = 'pending' | 'approved' | 'rejected' | 'applied';

interface DraftStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  applied: number;
}

/* ------------------------------------------------------------------ */
/*  API HELPERS                                                         */
/* ------------------------------------------------------------------ */
const tabToStatus: Record<DraftTab, DraftStatus | undefined> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  applied: undefined, // Applied = approved + applied filter; fallback to approved
};

/** Transform API response to Draft type */
function normalizeDraft(raw: any): Draft {
  return {
    id: raw.id || raw._id || String(Math.random()),
    workspaceId: raw.workspaceId || 'default',
    campaignId: raw.campaignId,
    campaignName: raw.campaignName,
    name: raw.name || raw.title || 'Untitled Draft',
    description: raw.description || raw.changeSummary || '',
    status: (raw.status || 'pending') as DraftStatus,
    platform: (raw.platform || 'Meta') as AdPlatform,
    assets: Array.isArray(raw.assets)
      ? raw.assets.map((a: any) => ({
          id: a.id || String(Math.random()),
          type: a.type || 'image',
          url: a.url || '',
          thumbnailUrl: a.thumbnailUrl,
          name: a.name || 'Asset',
          dimensions: a.dimensions,
          fileSize: a.fileSize,
          duration: a.duration,
        }))
      : [],
    copy: {
      headline: raw.copy?.headline,
      body: raw.copy?.body,
      cta: raw.copy?.cta,
      description: raw.copy?.description || raw.description,
    },
    comments: Array.isArray(raw.comments)
      ? raw.comments.map((c: any) => ({
          id: c.id || String(Math.random()),
          userId: c.userId || c.user_id || '',
          userName: c.userName || c.user_name || c.createdBy || 'Unknown',
          userAvatar: c.userAvatar || c.user_avatar,
          content: c.content || c.text || '',
          createdAt: c.createdAt || c.created_at || new Date().toISOString(),
          x: c.x,
          y: c.y,
        }))
      : [],
    submittedBy: raw.submittedBy || raw.createdBy || raw.created_by || 'system',
    submittedByName: raw.submittedByName || raw.createdBy || raw.created_by || 'System',
    submittedByAvatar: raw.submittedByAvatar,
    submittedAt: raw.submittedAt || raw.createdAt || raw.created_at || new Date().toISOString(),
    reviewedBy: raw.reviewedBy || raw.approvedBy || raw.approved_by || raw.resolvedBy,
    reviewedAt: raw.reviewedAt || raw.approvedAt || raw.approved_at || raw.resolvedAt,
    rejectionReason: raw.rejectionReason || raw.rejection_reason || raw.reason,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    version: raw.version || 1,
    scheduledAt: raw.scheduledAt || raw.scheduled_at,
    ...raw,
  };
}

async function fetchDraftsFromAPI(tab: DraftTab, page: number, limit: number, search: string): Promise<{ drafts: Draft[]; total: number; page: number; limit: number; totalPages: number }> {
  const params: Record<string, any> = { page, limit };

  // Map tab to API status filter
  const status = tabToStatus[tab];
  if (status) {
    params.status = status;
  } else if (tab === 'applied') {
    params.status = 'approved';
    params.applied = true;
  }

  if (search?.trim()) {
    params.search = search.trim();
  }

  const response = await apiList<any>('/drafts', { params });
  const drafts = (response.data || []).map(normalizeDraft);
  return {
    drafts,
    total: response.total || drafts.length,
    page: response.page || page,
    limit: response.limit || limit,
    totalPages: response.totalPages || 1,
  };
}

async function fetchDraftStats(): Promise<DraftStats> {
  const stats = await apiGet<any>('/drafts/stats');
  return {
    total: stats.total || 0,
    pending: stats.pending || 0,
    approved: stats.approved || 0,
    rejected: stats.rejected || 0,
    applied: stats.applied || stats.approved || 0,
  };
}

async function fetchDraftDetail(id: string): Promise<Draft> {
  const raw = await apiGet<any>(`/drafts/${id}`);
  return normalizeDraft(raw);
}

/* ------------------------------------------------------------------ */
/*  SOUND EFFECTS                                                       */
/* ------------------------------------------------------------------ */
function playApproveSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
}

function playRejectSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25);
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  } catch {
    // Audio not supported
  }
}

/* ------------------------------------------------------------------ */
/*  PLATFORM HELPERS                                                    */
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
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${color}20`, color }}
    >
      {name}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  STATUS CONFIG                                                       */
/* ------------------------------------------------------------------ */
const statusConfig: Record<DraftStatus, { color: string; label: string; icon: React.ElementType }> = {
  pending: { color: C.statusWarning, label: 'Pending', icon: Clock },
  approved: { color: C.statusActive, label: 'Approved', icon: CheckCircle2 },
  rejected: { color: C.statusError, label: 'Rejected', icon: X },
  needs_revision: { color: C.statusInfo, label: 'Needs Revision', icon: AlertTriangle },
};

/* ------------------------------------------------------------------ */
/*  TABS                                                                */
/* ------------------------------------------------------------------ */
const TABS: { key: DraftTab; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'applied', label: 'Applied' },
];

/* ------------------------------------------------------------------ */
/*  SKELETONS                                                           */
/* ------------------------------------------------------------------ */
function DraftCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 space-y-3 animate-pulse"
      style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
    >
      <div className="flex items-center gap-2">
        <div className="h-4 rounded w-20" style={{ background: C.bgHover }} />
        <div className="h-4 rounded w-14" style={{ background: C.bgHover }} />
        <div className="flex-1" />
        <div className="h-4 rounded w-16" style={{ background: C.bgHover }} />
      </div>
      <div className="h-4 rounded w-3/4" style={{ background: C.bgHover }} />
      <div className="h-3 rounded w-full" style={{ background: C.bgHover }} />
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-24" style={{ background: C.bgHover }} />
        </div>
        <div className="h-8 rounded w-20" style={{ background: C.bgHover }} />
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
    >
      <div className="h-3 rounded w-16 mb-2" style={{ background: C.bgHover }} />
      <div className="h-6 rounded w-12" style={{ background: C.bgHover }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EMPTY STATE                                                         */
/* ------------------------------------------------------------------ */
function EmptyState({ tab }: { tab: DraftTab }) {
  const messages: Record<DraftTab, { title: string; subtitle: string }> = {
    pending: {
      title: 'No pending drafts',
      subtitle: 'AI agents and team members create drafts that appear here for review',
    },
    approved: {
      title: 'No approved drafts',
      subtitle: 'Approved drafts will appear here',
    },
    rejected: {
      title: 'No rejected drafts',
      subtitle: 'Rejected drafts will appear here',
    },
    applied: {
      title: 'No applied drafts',
      subtitle: 'Approved drafts that have been applied to campaigns appear here',
    },
  };
  const msg = messages[tab];
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
      >
        <Target size={28} style={{ color: C.textTertiary }} />
      </div>
      <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
        {msg.title}
      </p>
      <p className="text-xs mt-1" style={{ color: C.textTertiary }}>
        {msg.subtitle}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  REJECT REASON MODAL                                                 */
/* ------------------------------------------------------------------ */
function RejectModal({
  draftName,
  onConfirm,
  onCancel,
  isLoading,
}: {
  draftName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-x-4 top-[30vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[440px] z-50 rounded-2xl overflow-hidden"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
      >
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>
            Reject Draft
          </h3>
          <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
            {draftName}
          </p>
        </div>
        <div className="p-5">
          <label className="block text-xs font-medium mb-2" style={{ color: C.textSecondary }}>
            Rejection Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Budget too high, targeting needs refinement..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none focus:ring-1"
            style={{
              background: C.bgHover,
              color: C.textPrimary,
              border: `1px solid ${C.borderSubtle}`,
            }}
          />
        </div>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading || !reason.trim()}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: C.statusError, color: '#fff' }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Rejecting...
              </span>
            ) : (
              'Reject Draft'
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState<DraftTab>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data state
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DraftStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Selection / modals
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [rejectingDraft, setRejectingDraft] = useState<Draft | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Realtime
  const { lastEvent, connected: sseConnected } = useRealtime({ enabled: true });

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch drafts ── */
  const loadDrafts = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    setError(null);
    try {
      const result = await fetchDraftsFromAPI(activeTab, page, limit, search);
      setDrafts(result.drafts);
      setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch drafts';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, search]);

  /* ── Fetch stats ── */
  const loadStats = useCallback(async () => {
    setStatsError(null);
    setIsStatsLoading(true);
    try {
      const s = await fetchDraftStats();
      setStats(s);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      setStatsError(message);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  /* ── Fetch detail ── */
  const loadDetail = useCallback(async (id: string) => {
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const draft = await fetchDraftDetail(id);
      setSelectedDraft(draft);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch draft details';
      setDetailError(message);
      // Fallback to list data
      const fromList = drafts.find((d) => d.id === id);
      if (fromList) setSelectedDraft(fromList);
    } finally {
      setIsDetailLoading(false);
    }
  }, [drafts]);

  /* ── Initial load ── */
  useEffect(() => {
    loadDrafts();
    loadStats();
  }, [loadDrafts, loadStats]);

  /* ── Realtime events ── */
  useEffect(() => {
    if (!lastEvent) return;
    switch (lastEvent.type) {
      case 'draft.created': {
        // Refresh current list if on pending tab
        if (activeTab === 'pending') {
          loadDrafts({ silent: true });
        }
        loadStats();
        toast.info('New draft', 'A new draft has been created and requires your review.');
        break;
      }
      case 'draft.approved':
      case 'draft.rejected': {
        loadDrafts({ silent: true });
        loadStats();
        break;
      }
      default:
        break;
    }
  }, [lastEvent, activeTab, loadDrafts, loadStats]);

  /* ── Search debounce ── */
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      loadDrafts();
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  /* ── Tab change resets page ── */
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  /* ── Approve mutation ── */
  const approveMutation = useMutation(
    async (id: string) => {
      await apiPost(`/drafts/${id}/approve`);
      return id;
    },
    {
      onSuccess: (id) => {
        if (soundEnabled) playApproveSound();
        toast.success('Draft approved', 'The draft has been approved successfully.');
        loadDrafts({ silent: true });
        loadStats();
        // Update detail view if open
        if (selectedId === id) {
          setSelectedDraft((prev) => (prev ? { ...prev, status: 'approved' as DraftStatus, reviewedAt: new Date().toISOString() } : prev));
        }
      },
      onError: (err) => {
        toast.error('Failed to approve draft', err.message);
      },
    }
  );

  /* ── Reject mutation ── */
  const rejectMutation = useMutation(
    async ({ id, reason }: { id: string; reason: string }) => {
      await apiPost(`/drafts/${id}/reject`, { reason });
      return { id, reason };
    },
    {
      onSuccess: ({ id, reason }) => {
        if (soundEnabled) playRejectSound();
        toast.success('Draft rejected', 'The draft has been rejected.');
        setRejectingDraft(null);
        loadDrafts({ silent: true });
        loadStats();
        if (selectedId === id) {
          setSelectedDraft((prev) =>
            prev ? { ...prev, status: 'rejected' as DraftStatus, reviewedAt: new Date().toISOString(), rejectionReason: reason } : prev
          );
        }
      },
      onError: (err) => {
        toast.error('Failed to reject draft', err.message);
      },
    }
  );

  /* ── Handlers ── */
  const handleApprove = useCallback(
    (id: string) => {
      approveMutation.mutate(id);
    },
    [approveMutation]
  );

  const handleReject = useCallback(
    (id: string) => {
      const draft = drafts.find((d) => d.id === id) || null;
      setRejectingDraft(draft);
    },
    [drafts]
  );

  const handleConfirmReject = useCallback(
    (reason: string) => {
      if (!rejectingDraft) return;
      rejectMutation.mutate({ id: rejectingDraft.id, reason });
    },
    [rejectMutation, rejectingDraft]
  );

  const handleViewDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      loadDetail(id);
    },
    [loadDetail]
  );

  const handleRetry = useCallback(() => {
    loadDrafts();
    loadStats();
  }, [loadDrafts, loadStats]);

  const handleRetryDetail = useCallback(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedDrafts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedDrafts((prev) => {
      if (prev.size === drafts.length) return new Set();
      return new Set(drafts.map((d) => d.id));
    });
  }, [drafts]);

  // Bulk actions
  const handleBulkApprove = useCallback(async () => {
    const ids = Array.from(selectedDrafts);
    let succeeded = 0;
    for (const id of ids) {
      try {
        await apiPost(`/drafts/${id}/approve`);
        succeeded++;
      } catch {
        // Individual errors handled silently in bulk
      }
    }
    if (soundEnabled) playApproveSound();
    toast.success(`${succeeded} drafts approved`, `${succeeded} of ${ids.length} drafts were approved.`);
    setSelectedDrafts(new Set());
    loadDrafts({ silent: true });
    loadStats();
  }, [selectedDrafts, soundEnabled, loadDrafts, loadStats]);

  const handleBulkReject = useCallback(async () => {
    const ids = Array.from(selectedDrafts);
    let succeeded = 0;
    for (const id of ids) {
      try {
        await apiPost(`/drafts/${id}/reject`, { reason: 'Bulk rejection' });
        succeeded++;
      } catch {
        // Individual errors handled silently in bulk
      }
    }
    if (soundEnabled) playRejectSound();
    toast.info(`${succeeded} drafts rejected`, `${succeeded} of ${ids.length} drafts were rejected.`);
    setSelectedDrafts(new Set());
    loadDrafts({ silent: true });
    loadStats();
  }, [selectedDrafts, soundEnabled, loadDrafts, loadStats]);

  // Derived
  const pendingCount = stats?.pending || 0;
  const approvedCount = stats?.approved || 0;
  const rejectedCount = stats?.rejected || 0;

  return (
    <>
    <SEO
      title="Drafts"
      description="Manage your saved campaign drafts, creative drafts, and pending approvals in AdNexus AI."
      keywords="drafts, saved campaigns, pending approval, creative drafts"
    />
    <div className="flex flex-col h-full" style={{ background: C.bgPage }}>
      {/* ─── Header ─── */}
      <div className="px-6 pt-5 pb-3 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
              Draft Queue
            </h1>
            {sseConnected && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                style={{ background: `${C.statusActive}20`, color: C.statusActive }}
              >
                <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: C.statusActive }} />
                LIVE
              </span>
            )}
            {pendingCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background: C.statusWarning, color: '#050505' }}
              >
                {pendingCount} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: C.textTertiary }}
              title={soundEnabled ? 'Sound on' : 'Sound off'}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
              style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
            >
              {bulkMode ? 'Done' : 'Select'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {isStatsLoading && !stats ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <div
                className="rounded-xl p-4"
                style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} style={{ color: C.statusWarning }} />
                  <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: C.textTertiary }}>
                    Pending
                  </span>
                </div>
                <span className="text-2xl font-bold" style={{ color: C.textPrimary }}>
                  {pendingCount}
                </span>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={12} style={{ color: C.statusActive }} />
                  <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: C.textTertiary }}>
                    Approved
                  </span>
                </div>
                <span className="text-2xl font-bold" style={{ color: C.statusActive }}>
                  {approvedCount}
                </span>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <X size={12} style={{ color: C.statusError }} />
                  <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: C.textTertiary }}>
                    Rejected
                  </span>
                </div>
                <span className="text-2xl font-bold" style={{ color: C.statusError }}>
                  {rejectedCount}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const count =
                tab.key === 'pending'
                  ? pendingCount
                  : tab.key === 'approved'
                    ? approvedCount
                    : tab.key === 'rejected'
                      ? rejectedCount
                      : stats?.applied || approvedCount;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ color: isActive ? C.textPrimary : C.textSecondary }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="drafts-tab"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {tab.label}
                    <span style={{ color: C.textTertiary }}>{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: C.textTertiary }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs w-56 outline-none focus:ring-1"
              style={{
                background: C.bgElevated,
                color: C.textPrimary,
                border: `1px solid ${C.borderSubtle}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── Error Banner ─── */}
      <AnimatePresence>
        {(error || statsError) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-6 mb-3 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between"
            style={{ background: `${C.statusError}15`, color: C.statusError, border: `1px solid ${C.statusError}30` }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} />
              <span>{error || statsError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors"
                style={{ background: `${C.statusError}20` }}
              >
                <RotateCw size={10} /> Retry
              </button>
              <button onClick={() => { setError(null); setStatsError(null); }} className="hover:opacity-70">
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bulk Actions Bar ─── */}
      <AnimatePresence>
        {bulkMode && selectedDrafts.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div
              className="mx-6 mb-3 px-4 py-2.5 rounded-lg flex items-center gap-3"
              style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
            >
              <span className="text-xs font-medium" style={{ color: C.textSecondary }}>
                {selectedDrafts.size} selected
              </span>
              <div className="flex-1" />
              <button
                onClick={handleBulkApprove}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: C.statusActive, color: '#050505' }}
              >
                <Check size={12} /> Approve
              </button>
              <button
                onClick={handleBulkReject}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: C.statusError, border: `1px solid ${C.statusError}40` }}
              >
                <X size={12} /> Reject
              </button>
              <button
                onClick={() => setSelectedDrafts(new Set())}
                className="px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: C.textSecondary }}
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Draft Cards ─── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading && drafts.length === 0 ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <DraftCardSkeleton key={i} />
            ))}
          </div>
        ) : drafts.length === 0 && !isLoading ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="flex flex-col gap-3">
            {bulkMode && drafts.length > 0 && (
              <button
                onClick={selectAll}
                className="mb-1 text-xs font-medium transition-colors hover:text-white text-left"
                style={{ color: C.textSecondary }}
              >
                {selectedDrafts.size === drafts.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
            <AnimatePresence mode="popLayout">
              {drafts.map((draft, i) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  isSelected={selectedDrafts.has(draft.id)}
                  bulkMode={bulkMode}
                  onToggleSelect={() => toggleSelect(draft.id)}
                  onApprove={() => handleApprove(draft.id)}
                  onReject={() => handleReject(draft.id)}
                  onViewDetail={() => handleViewDetail(draft.id)}
                  isApproving={approveMutation.isLoading}
                  isRejecting={rejectMutation.isLoading}
                  index={i}
                />
              ))}
            </AnimatePresence>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
                >
                  Previous
                </button>
                <span className="text-xs" style={{ color: C.textTertiary }}>
                  Page {page} of {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / limit) || isLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                  style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      <AnimatePresence>
        {selectedId && selectedDraft && (
          <DraftDetailModal
            draft={selectedDraft}
            isLoading={isDetailLoading}
            error={detailError}
            onClose={() => { setSelectedId(null); setSelectedDraft(null); setDetailError(null); }}
            onApprove={() => {
              handleApprove(selectedId);
            }}
            onReject={() => {
              handleReject(selectedId);
            }}
            onRetry={handleRetryDetail}
            isApproving={approveMutation.isLoading}
            isRejecting={rejectMutation.isLoading}
          />
        )}
      </AnimatePresence>

      {/* ─── Reject Modal ─── */}
      <AnimatePresence>
        {rejectingDraft && (
          <RejectModal
            draftName={rejectingDraft.name}
            onConfirm={handleConfirmReject}
            onCancel={() => setRejectingDraft(null)}
            isLoading={rejectMutation.isLoading}
          />
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  DRAFT CARD                                                          */
/* ------------------------------------------------------------------ */
function DraftCard({
  draft,
  isSelected,
  bulkMode,
  onToggleSelect,
  onApprove,
  onReject,
  onViewDetail,
  isApproving,
  isRejecting,
  index,
}: {
  draft: Draft;
  isSelected: boolean;
  bulkMode: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onViewDetail: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  index: number;
}) {
  const st = statusConfig[draft.status] ?? statusConfig.pending;
  const StatusIcon = st.icon;
  const isAi = draft.submittedBy === 'ai' || draft.submittedByName?.toLowerCase().includes('ai');
  const isActionLoading = isApproving || isRejecting;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="rounded-xl transition-all duration-150 group"
      style={{
        background: C.bgElevated,
        border: `1px solid ${isSelected ? C.accent : C.borderSubtle}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isSelected ? C.accent : 'rgba(255,255,255,0.10)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isSelected ? C.accent : C.borderSubtle;
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {bulkMode && (
            <div className="pt-0.5">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                className="w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  borderColor: isSelected ? C.accent : C.borderSubtle,
                  background: isSelected ? C.accent : 'transparent',
                }}
              >
                {isSelected && <Check size={10} className="text-white" />}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Top Row: Type badge + Platform + Status + Campaign */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: `${st.color}15`, color: st.color }}
              >
                <StatusIcon size={10} />
                {draft.status}
              </span>
              <PlatformBadge name={draft.platform} />
              {draft.campaignName && (
                <span className="text-xs font-medium" style={{ color: C.textPrimary }}>
                  {draft.campaignName}
                </span>
              )}
            </div>

            {/* Change Summary */}
            <h4 className="text-sm font-semibold mb-1" style={{ color: C.textPrimary }}>
              {draft.name}
            </h4>
            {draft.description && (
              <p className="text-xs mb-2" style={{ color: C.textSecondary }}>
                {draft.description}
              </p>
            )}

            {/* AI Reasoning */}
            {isAi && (
              <div
                className="rounded-lg p-2.5 mb-2 flex items-start gap-2"
                style={{
                  background: `${C.purple}10`,
                  border: `1px solid ${C.purple}20`,
                }}
              >
                <Sparkles size={12} className="flex-shrink-0 mt-0.5" style={{ color: C.purple }} />
                <p className="text-xs leading-relaxed" style={{ color: '#c4b5fd' }}>
                  AI-generated: {draft.description || 'Automated optimization based on performance data.'}
                </p>
              </div>
            )}

            {/* Bottom Row: Actor + Time + Actions */}
            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
              <div className="flex items-center gap-3">
                {/* Actor */}
                <div className="flex items-center gap-1.5">
                  {isAi ? (
                    <Bot size={12} style={{ color: C.accent }} />
                  ) : (
                    <User size={12} style={{ color: C.textSecondary }} />
                  )}
                  <span className="text-[11px]" style={{ color: C.textTertiary }}>
                    {draft.submittedByName || draft.submittedBy}
                  </span>
                </div>

                {/* Timestamp */}
                <span className="text-[11px]" style={{ color: C.textTertiary }}>
                  {formatTime(draft.submittedAt)}
                </span>

                {/* Reviewer */}
                {draft.reviewedBy && (
                  <span className="text-[11px]" style={{ color: C.textSecondary }}>
                    by {draft.reviewedBy}
                  </span>
                )}

                {/* Scheduled */}
                {(draft as Record<string, unknown>).scheduledAt && (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: C.statusInfo }}>
                    <Clock size={10} />
                    Scheduled
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                {draft.status === 'pending' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onApprove();
                      }}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-1"
                      style={{ background: C.statusActive, color: '#050505' }}
                    >
                      {isApproving && <Loader2 size={10} className="animate-spin" />}
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject();
                      }}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                      style={{ color: C.statusError, border: `1px solid ${C.statusError}40` }}
                    >
                      {isRejecting && <Loader2 size={10} className="animate-spin" />}
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail();
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: C.textSecondary }}
                >
                  Details <ChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  DRAFT DETAIL MODAL                                                  */
/* ------------------------------------------------------------------ */
function DraftDetailModal({
  draft,
  isLoading,
  error,
  onClose,
  onApprove,
  onReject,
  onRetry,
  isApproving,
  isRejecting,
}: {
  draft: Draft;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRetry: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const st = statusConfig[draft.status] ?? statusConfig.pending;
  const StatusIcon = st.icon;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-x-4 top-[5vh] bottom-[5vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[680px] z-50 rounded-2xl overflow-hidden flex flex-col"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${st.color}20` }}
            >
              <StatusIcon size={20} style={{ color: st.color }} />
            </span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: C.textPrimary }}>
                {draft.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{ background: `${st.color}15`, color: st.color }}
                >
                  {draft.status}
                </span>
                <PlatformBadge name={draft.platform} />
                {draft.campaignName && (
                  <span className="text-[11px]" style={{ color: C.textSecondary }}>
                    {draft.campaignName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: C.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: C.textTertiary }} />
              <span className="ml-2 text-xs" style={{ color: C.textSecondary }}>Loading details...</span>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div
              className="rounded-lg p-4 flex flex-col items-center gap-3"
              style={{ background: `${C.statusError}10`, border: `1px solid ${C.statusError}30` }}
            >
              <AlertTriangle size={20} style={{ color: C.statusError }} />
              <p className="text-xs text-center" style={{ color: C.statusError }}>{error}</p>
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: `${C.statusError}20`, color: C.statusError }}
              >
                <RotateCw size={10} /> Retry
              </button>
            </div>
          )}

          {/* Detail content */}
          {!isLoading && !error && (
            <>
              {/* Change Details */}
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.borderSubtle}` }}>
                <div className="px-3 py-2" style={{ background: C.bgHover, borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textTertiary }}>
                    Change Details
                  </span>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-28" style={{ color: C.textSecondary }}>Campaign</span>
                    <span className="text-xs font-medium" style={{ color: C.textPrimary }}>{draft.campaignName || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-28" style={{ color: C.textSecondary }}>Platform</span>
                    <PlatformBadge name={draft.platform} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-28" style={{ color: C.textSecondary }}>Submitted By</span>
                    <span className="text-xs font-medium" style={{ color: C.textPrimary }}>{draft.submittedByName || draft.submittedBy}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-28" style={{ color: C.textSecondary }}>Submitted At</span>
                    <span className="text-xs font-medium" style={{ color: C.textPrimary }}>{new Date(draft.submittedAt).toLocaleString()}</span>
                  </div>
                  {draft.reviewedBy && (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-28" style={{ color: C.textSecondary }}>Reviewed By</span>
                        <span className="text-xs font-medium" style={{ color: C.textPrimary }}>{draft.reviewedBy}</span>
                      </div>
                      {draft.reviewedAt && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs w-28" style={{ color: C.textSecondary }}>Reviewed At</span>
                          <span className="text-xs font-medium" style={{ color: C.textPrimary }}>{new Date(draft.reviewedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  {draft.rejectionReason && (
                    <div className="flex items-start gap-3">
                      <span className="text-xs w-28 flex-shrink-0" style={{ color: C.textSecondary }}>Rejection Reason</span>
                      <span className="text-xs font-medium" style={{ color: C.statusError }}>{draft.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* JSON Diff / Metadata */}
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.borderSubtle}` }}>
                <div className="px-3 py-2" style={{ background: C.bgHover, borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textTertiary }}>
                    Diff View
                  </span>
                </div>
                <div className="p-3 overflow-auto max-h-80">
                  <pre
                    className="text-[11px] font-mono-data leading-relaxed whitespace-pre-wrap break-all"
                    style={{ color: C.textSecondary }}
                  >
                    {JSON.stringify(
                      {
                        name: draft.name,
                        description: draft.description,
                        status: draft.status,
                        platform: draft.platform,
                        campaignId: draft.campaignId,
                        campaignName: draft.campaignName,
                        copy: draft.copy,
                        assets: draft.assets.map((a) => ({
                          id: a.id,
                          name: a.name,
                          type: a.type,
                          dimensions: a.dimensions,
                        })),
                        comments: draft.comments,
                        tags: draft.tags,
                        version: draft.version,
                        ...((draft as any).metadata || {}),
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>

              {/* Comments */}
              {draft.comments.length > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.borderSubtle}` }}>
                  <div className="px-3 py-2" style={{ background: C.bgHover, borderBottom: `1px solid ${C.borderSubtle}` }}>
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textTertiary }}>
                      Comments ({draft.comments.length})
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    {draft.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        {c.userAvatar ? (
                          <img src={c.userAvatar} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{ background: C.bgHover, color: C.textSecondary }}
                          >
                            {c.userName[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: C.textPrimary }}>{c.userName}</span>
                            <span className="text-[10px]" style={{ color: C.textTertiary }}>{formatTime(c.createdAt)}</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {draft.status === 'pending' && (
          <div className="px-5 py-4 flex items-center gap-2 flex-shrink-0" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
            <button
              onClick={onApprove}
              disabled={isApproving || isRejecting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1"
              style={{ background: C.statusActive, color: '#050505' }}
            >
              {isApproving && <Loader2 size={12} className="animate-spin" />}
              Approve
            </button>
            <button
              onClick={onReject}
              disabled={isApproving || isRejecting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
              style={{ color: C.statusError, border: `1px solid ${C.statusError}40` }}
            >
              {isRejecting && <Loader2 size={12} className="animate-spin" />}
              Reject
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  TIME FORMATTER                                                      */
/* ------------------------------------------------------------------ */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
