import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  DollarSign,
  UserPlus,
  Check,
  X,
  Archive,
  Search,
  InboxIcon,
  Bot,
  Shield,
  Settings,
  MessageSquare,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import { useUIStore } from '../stores/uiStore';
import { useRealtime } from '../hooks/useRealtime';
import api from '../lib/api';
import type { Notification, NotificationCategory, NotificationSeverity } from '../stores/notificationStore';
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
  purple: '#A855F7',
  orange: '#F97316',
};

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
// Filter tabs matching backend type filter values
 type InboxTab = 'all' | 'drafts' | 'alerts' | 'ai' | 'system';

// Priority derived from severity mapping
 type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

interface CategoryConfig {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  SEVERITY → PRIORITY MAP                                             */
/* ------------------------------------------------------------------ */
function severityToPriority(severity: NotificationSeverity): NotificationPriority {
  switch (severity) {
    case 'error':
      return 'critical';
    case 'warning':
      return 'high';
    case 'success':
      return 'medium';
    case 'info':
    default:
      return 'low';
  }
}

const priorityConfig: Record<NotificationPriority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  high:     { label: 'High',     color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
  medium:   { label: 'Medium',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  low:      { label: 'Low',      color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
};

/* ------------------------------------------------------------------ */
/*  CATEGORY CONFIG                                                     */
/* ------------------------------------------------------------------ */
const categoryConfig: Record<NotificationCategory | 'unknown', CategoryConfig> = {
  campaign:    { icon: Target,        color: C.accent,       bg: `${C.accent}20`,       label: 'Campaign' },
  draft:       { icon: CheckCircle2,  color: C.statusActive, bg: `${C.statusActive}20`, label: 'Draft' },
  system:      { icon: Settings,      color: C.textTertiary, bg: `${C.textTertiary}20`, label: 'System' },
  comment:     { icon: MessageSquare, color: C.statusInfo,   bg: `${C.statusInfo}20`,   label: 'Comment' },
  approval:    { icon: Check,         color: C.statusActive, bg: `${C.statusActive}20`, label: 'Approval' },
  budget:      { icon: DollarSign,    color: C.statusWarning,bg: `${C.statusWarning}20`,label: 'Budget' },
  team:        { icon: UserPlus,      color: C.accent,       bg: `${C.accent}20`,       label: 'Team' },
  integration: { icon: Shield,        color: C.purple,       bg: `${C.purple}20`,       label: 'Integration' },
  unknown:     { icon: Bell,          color: C.textTertiary, bg: `${C.textTertiary}20`, label: 'General' },
};

const severityDot: Record<NotificationSeverity, string> = {
  info:    C.statusInfo,
  success: C.statusActive,
  warning: C.statusWarning,
  error:   C.statusError,
};

/* ------------------------------------------------------------------ */
/*  TABS                                                                */
/* ------------------------------------------------------------------ */
const TABS: { key: InboxTab; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'ai',     label: 'AI' },
  { key: 'system', label: 'System' },
];

/**
 * Determines if a notification matches the selected filter tab.
 * Maps tab keys to category/severity criteria.
 */
function tabMatches(tab: InboxTab, n: Notification): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'drafts':
      return n.category === 'draft' || n.category === 'approval';
    case 'alerts':
      return n.severity === 'warning' || n.severity === 'error' || n.category === 'budget' || n.category === 'campaign';
    case 'ai':
      // AI-generated notifications: drafts, approvals, AI recommendations, alerts from AI actor
      return n.category === 'draft' || n.category === 'approval' || n.actor?.name?.toLowerCase().includes('ai') || n.actor?.id === 'agent';
    case 'system':
      return n.category === 'system' || n.category === 'integration' || n.category === 'team';
    default:
      return true;
  }
}

/**
 * Convert tab key to backend `type` query param.
 * Returns `null` when no type filter should be applied.
 */
function tabToTypeParam(tab: InboxTab): string | null {
  switch (tab) {
    case 'drafts': return 'draft';
    case 'alerts': return 'alert';
    case 'ai':     return 'ai';
    case 'system': return 'system';
    case 'all':
    default:       return null;
  }
}

/* ------------------------------------------------------------------ */
/*  ACTION LABELS                                                       */
/* ------------------------------------------------------------------ */
function getActionLabel(category: NotificationCategory): string {
  switch (category) {
    case 'draft':
      return 'View Draft';
    case 'approval':
      return 'Review';
    case 'campaign':
      return 'View Campaign';
    case 'budget':
      return 'View Budget';
    case 'team':
      return 'Accept Invite';
    case 'system':
      return 'View Details';
    case 'comment':
      return 'View Thread';
    case 'integration':
      return 'Check Integration';
    default:
      return 'View';
  }
}

/* ------------------------------------------------------------------ */
/*  SKELETONS                                                           */
/* ------------------------------------------------------------------ */
function NotificationSkeleton() {
  return (
    <div
      className="rounded-lg p-3 flex gap-3 animate-pulse"
      style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
    >
      <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: C.bgHover }} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3.5 rounded w-3/4" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-12 flex-shrink-0" style={{ background: C.bgHover }} />
        </div>
        <div className="h-3 rounded w-full" style={{ background: C.bgHover }} />
        <div className="flex items-center gap-2">
          <div className="h-3 rounded w-16" style={{ background: C.bgHover }} />
          <div className="h-3 rounded w-10" style={{ background: C.bgHover }} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NOTIFICATION ICON                                                   */
/* ------------------------------------------------------------------ */
function NotificationTypeIcon({ category, severity }: { category: NotificationCategory; severity: NotificationSeverity }) {
  const cfg = categoryConfig[category] ?? categoryConfig.unknown;
  const Icon = cfg.icon;
  return (
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: cfg.bg }}
    >
      <Icon size={14} style={{ color: cfg.color }} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  EMPTY STATE                                                         */
/* ------------------------------------------------------------------ */
function EmptyState({ tab }: { tab: InboxTab }) {
  const messages: Record<InboxTab, string> = {
    all:    'No notifications yet',
    drafts: 'No draft notifications',
    alerts: 'No alerts right now',
    ai:     'No AI notifications',
    system: 'No system notifications',
  };
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: C.bgElevated, border: `1px solid ${C.borderSubtle}` }}
      >
        <InboxIcon size={28} style={{ color: C.textTertiary }} />
      </div>
      <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
        {messages[tab]}
      </p>
      <p className="text-xs mt-1" style={{ color: C.textTertiary }}>
        Check back later for updates
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE COMPONENT                                                 */
/* ------------------------------------------------------------------ */
export default function InboxPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    total,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    addNotification,
    setNotifications,
    setUnreadCount,
    setError,
  } = useNotificationStore();

  const showToast = useUIStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<InboxTab>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Real-time SSE for instant new notifications
  const { lastEvent } = useRealtime({ enabled: true });

  // Keep track of current page for pagination
  const [page] = useState(1);
  const limit = 20;

  // Fetch notifications on mount / tab change / page change
  useEffect(() => {
    const load = async () => {
      try {
        // Build query params
        const params: Record<string, unknown> = { page, limit };
        const typeParam = tabToTypeParam(activeTab);
        if (typeParam) params.type = typeParam;
        if (search.trim()) params.search = search.trim();

        setError(null);
        useNotificationStore.setState({ isLoading: true });

        const response = await api.get('/notifications', { params });
        const fetchedNotifications: Notification[] = response.data.data ?? [];
        const fetchedTotal = response.data.total ?? fetchedNotifications.length;

        setNotifications(fetchedNotifications, fetchedTotal);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
        setError(message);
      } finally {
        useNotificationStore.setState({ isLoading: false });
      }
    };

    load();
    // Also refresh unread count
    fetchUnreadCount();
  }, [activeTab, page, setError, setNotifications, fetchUnreadCount]);

  // Debounced search fetch
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      // Search is already handled via the useEffect above when search changes
      // but we trigger a re-fetch by calling the same logic
      const load = async () => {
        try {
          const params: Record<string, unknown> = { page, limit };
          const typeParam = tabToTypeParam(activeTab);
          if (typeParam) params.type = typeParam;
          if (search.trim()) params.search = search.trim();

          setError(null);
          useNotificationStore.setState({ isLoading: true });

          const response = await api.get('/notifications', { params });
          const fetchedNotifications: Notification[] = response.data.data ?? [];
          const fetchedTotal = response.data.total ?? fetchedNotifications.length;

          setNotifications(fetchedNotifications, fetchedTotal);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
          setError(message);
        } finally {
          useNotificationStore.setState({ isLoading: false });
        }
      };
      load();
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search, activeTab, page, setError, setNotifications]);

  // Handle real-time events
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'notification.created') {
      const payload = lastEvent.payload as Notification | undefined;
      if (payload) {
        addNotification(payload);
        showToast({ type: 'info', title: 'New notification', message: payload.title });
      }
    }
  }, [lastEvent, addNotification, showToast]);

  // Client-side filtering on top of server results for tab compatibility
  const filtered = useMemo(() => {
    let list = notifications;
    list = list.filter((n) => tabMatches(activeTab, n));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [notifications, activeTab, search]);

  // Expand/collapse
  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    []
  );

  // Mark read with toast + API call
  const handleMarkRead = useCallback(
    async (id: string) => {
      await markAsRead(id);
      showToast({ type: 'success', title: 'Marked as read' });
    },
    [markAsRead, showToast]
  );

  // Mark all read with toast
  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    showToast({ type: 'success', title: 'All notifications marked as read' });
  }, [markAllAsRead, showToast]);

  // Delete notification via DELETE /api/v1/notifications/:id
  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await api.delete(`/notifications/${id}`);
        removeNotification(id);
        showToast({ type: 'info', title: 'Notification deleted' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete notification';
        showToast({ type: 'error', title: 'Delete failed', message });
      } finally {
        setDeletingId(null);
      }
    },
    [removeNotification, showToast]
  );

  // Click to navigate
  const handleNavigate = useCallback(
    (n: Notification) => {
      if (n.actionUrl) {
        navigate(n.actionUrl);
      }
    },
    [navigate]
  );

  return (
    <>
    <SEO
      title="Inbox"
      description="View notifications, AI recommendations, campaign alerts, and team mentions in your AdNexus AI unified inbox."
      keywords="inbox, notifications, alerts, campaign notifications, team mentions"
    />
    <div className="flex flex-col h-full" style={{ background: C.bgPage }}>
      {/* ─── Header ─── */}
      <div className="px-6 pt-5 pb-3 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
              Inbox
            </h1>
            {unreadCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background: C.accent, color: '#fff' }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
            style={{ color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
          >
            <Check size={12} /> Mark All Read
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const count =
                tab.key === 'all'
                  ? total
                  : notifications.filter((n) => tabMatches(tab.key, n)).length;
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
                      layoutId="inbox-tab"
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
              placeholder="Search notifications..."
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

      {/* ─── Notification List ─── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((n, i) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  isExpanded={expandedId === n.id}
                  isDeleting={deletingId === n.id}
                  onToggleExpand={() => toggleExpand(n.id)}
                  onMarkRead={() => handleMarkRead(n.id)}
                  onDelete={() => handleDelete(n.id)}
                  onNavigate={() => handleNavigate(n)}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  NOTIFICATION CARD                                                   */
/* ------------------------------------------------------------------ */
function NotificationCard({
  notification: n,
  isExpanded,
  isDeleting,
  onToggleExpand,
  onMarkRead,
  onDelete,
  onNavigate,
  index,
}: {
  notification: Notification;
  isExpanded: boolean;
  isDeleting: boolean;
  onToggleExpand: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onNavigate: () => void;
  index: number;
}) {
  const cfg = categoryConfig[n.category] ?? categoryConfig.unknown;
  const sevColor = severityDot[n.severity] ?? C.textTertiary;
  const actionLabel = n.actionLabel || getActionLabel(n.category);
  const priority = severityToPriority(n.severity);
  const priCfg = priorityConfig[priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDeleting ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="rounded-lg transition-all duration-150 overflow-hidden"
      style={{
        background: C.bgElevated,
        border: `1px solid ${C.borderSubtle}`,
      }}
    >
      {/* Collapsed / Header Row */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left p-3 flex gap-3 items-start hover:opacity-90 transition-opacity"
      >
        <NotificationTypeIcon category={n.category} severity={n.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4
                className="text-sm leading-snug truncate"
                style={{
                  color: C.textPrimary,
                  fontWeight: !n.read ? 600 : 400,
                }}
              >
                {n.title}
              </h4>
              {!n.read && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: C.accent }} />
              )}
            </div>
            <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: C.textTertiary }}>
              {formatTime(n.createdAt)}
            </span>
          </div>
          <p className="text-xs mt-0.5 truncate text-left" style={{ color: C.textSecondary }}>
            {n.message}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {/* Category badge */}
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {n.category}
            </span>
            {/* Priority badge */}
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: priCfg.bg, color: priCfg.color }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: priCfg.color }} />
              {priCfg.label}
            </span>
            <div className="flex-1" />
            {isExpanded ? <ChevronUp size={12} style={{ color: C.textTertiary }} /> : <ChevronDown size={12} style={{ color: C.textTertiary }} />}
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
              <div className="pt-3 space-y-3">
                {/* Full message */}
                <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>
                  {n.message}
                </p>

                {/* Actor info */}
                {n.actor && (
                  <div className="flex items-center gap-2">
                    {n.actor.avatar ? (
                      <img src={n.actor.avatar} alt="" className="w-5 h-5 rounded-full" />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: C.bgHover, color: C.textSecondary }}
                      >
                        {n.actor.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs" style={{ color: C.textSecondary }}>
                      {n.actor.name}
                    </span>
                  </div>
                )}

                {/* Metadata */}
                {n.metadata && Object.keys(n.metadata).length > 0 && (
                  <div
                    className="rounded-lg p-3 font-mono-data text-[11px] overflow-auto max-h-40"
                    style={{ background: C.bgHover, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
                  >
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(n.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {n.actionUrl ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                      style={{ background: C.accent, color: '#fff' }}
                    >
                      {actionLabel}
                    </button>
                  ) : (
                    <button
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                      style={{ background: C.accent, color: '#fff' }}
                    >
                      {actionLabel}
                    </button>
                  )}
                  <div className="flex-1" />
                  {!n.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ color: C.statusActive }}
                    >
                      <Check size={12} /> Mark read
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    disabled={isDeleting}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                    style={{ color: C.statusError }}
                  >
                    <Trash2 size={12} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
