// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Play, Pause, Plus, Trash2, Edit3, Check, X,
  ChevronRight, Zap, Shield, TrendingUp, AlertCircle, ArrowRight,
  BarChart3, Clock, Settings, Sparkles, Filter, Bot, FileText,
  Loader2, ChevronDown, Activity, Cpu, Target, Eye,
  SlidersHorizontal, Bell, RefreshCw, Search, CheckCircle2,
  XCircle, AlertTriangle, Lightbulb, Gauge, Plug, Server,
  MessageSquare, Mail, Smartphone, ToggleLeft, ToggleRight,
  Info, Copy, CheckCheck, Wifi, WifiOff
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import { agentApi, draftsApi, apiPost, apiGet } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useRealtime } from '../hooks/useRealtime';
import { Spinner } from '../components/ui/spinner';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '../components/ui/empty';
import SEO from '../components/SEO';

/* ──────────────────────── CONSTANTS ──────────────────────── */
const C = {
  bg: '#050505', card: '#111111', cardHover: '#161616', accent: '#c3f53b',
  text: '#ffffff', muted: '#666666', muted2: '#444444', border: 'rgba(255,255,255,0.06)',
  red: '#ef4444', green: '#22c55e', yellow: '#eab308', blue: '#3b82f6',
  purple: '#a855f7', orange: '#f97316'
};

const METRICS = [
  { key: 'roas', label: 'ROAS', operators: ['gt', 'lt', 'eq'] },
  { key: 'cpa', label: 'CPA', operators: ['gt', 'lt', 'eq'] },
  { key: 'ctr', label: 'CTR', operators: ['gt', 'lt', 'eq'] },
  { key: 'spend', label: 'Spend', operators: ['gt', 'lt', 'eq'] },
  { key: 'impressions', label: 'Impressions', operators: ['gt', 'lt'] },
  { key: 'conversions', label: 'Conversions', operators: ['gt', 'lt'] },
  { key: 'frequency', label: 'Frequency', operators: ['gt', 'lt'] },
  { key: 'days_running', label: 'Days Running', operators: ['gt', 'lt'] },
];

/* ──────────────────────── TYPES ──────────────────────── */
interface AgentStatus {
  isRunning: boolean;
  lastRun?: string;
  nextScheduledRun?: string;
  rulesActive: number;
  rulesPaused: number;
  rulesTotal?: number;
  optimizationsToday: number;
  pendingDrafts: number;
  draftsCreatedToday?: number;
  optimizationsApplied?: number;
  budgetSaved?: number;
  creditsTotal?: number;
  creditsUsed?: number;
  recentLogs?: OptimizationLogEntry[];
  creditsPct?: number;
}

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  platform: string;
  condition: string;
  action: string;
  status: 'Active' | 'Paused';
  createdBy: string;
  lastTriggered: string;
  triggerCount: number;
}

interface OptimizationLogEntry {
  id: string;
  timestamp?: string;
  createdAt?: string;
  type?: string;
  actionType?: string;
  action?: string;
  campaign?: string;
  campaignName?: string;
  platform?: string;
  before?: string;
  after?: string;
  beforeValue?: number;
  afterValue?: number;
  confidence?: number;
  actionTaken?: string;
  status?: string;
  ruleName?: string;
  details?: string;
}

interface AIRecommendation {
  id: string;
  severity: string;
  type: string;
  title: string;
  description: string;
  metric: string;
  campaign: string;
  platform: string;
  confidence: number;
  impact: string;
  createdAt: string;
  status?: string;
  sparklineData?: number[];
}

/* ──────────────────────── FALLBACK MOCK DATA (for demo mode) ──────────────────────── */
const DEMO_INSIGHTS: AIRecommendation[] = [
  { id: 'in_1', severity: 'Critical', type: 'warning', title: 'ROAS Dropped 15% on Meta Campaign X', description: 'ROAS has fallen from 4.2x to 3.57x over the past 48h on Meta Campaign "Summer Sale 2026". Recommend immediate budget reallocation of $320 from underperforming ad sets to top performers.', metric: 'ROAS 3.57x', campaign: 'Summer Sale 2026', platform: 'Meta', confidence: 91, impact: '-$1,240/wk', createdAt: '2026-06-18T08:15:00Z' },
  { id: 'in_2', severity: 'Warning', type: 'risk', title: 'Creative Fatigue Detected on 3 TikTok Ads', description: 'CTR has declined 34% on 3 TikTok creatives after 50k+ impressions each. Frequency climbing to 2.8x. Recommend creative refresh within 24-48 hours to prevent CPA increase.', metric: 'CTR ↓ 34%', campaign: 'TikTok FYP - Viral', platform: 'TikTok', confidence: 88, impact: '+$890 if fixed', createdAt: '2026-06-18T06:30:00Z' },
  { id: 'in_3', severity: 'Opportunity', type: 'opportunity', title: 'Google Campaign CPA 40% Below Target', description: 'Search - Brand Terms CPA is $12.40 vs target of $20. Room to scale budget by 60% while maintaining efficient CPA. Estimated additional 140 conversions/week at current trajectory.', metric: 'CPA $12.40', campaign: 'Search - Brand Terms', platform: 'Google', confidence: 94, impact: '+$6,200/wk', createdAt: '2026-06-18T05:00:00Z' },
];

const DEMO_ACTIONS = [
  { id: 'a1', time: '08:32 AM', action: 'Increased budget 20%', campaign: 'Summer Sale 2026', platform: 'Meta', status: 'Auto-executed', impact: '+$480 budget', icon: TrendingUp },
  { id: 'a2', time: '08:15 AM', action: 'ROAS drop alert', campaign: 'Summer Sale 2026', platform: 'Meta', status: 'Pending', impact: 'Review needed', icon: AlertCircle },
  { id: 'a3', time: '07:45 AM', action: 'Created pause draft', campaign: 'YouTube - Product Demo', platform: 'Google', status: 'Pending', impact: '-$720/wk waste', icon: Pause },
  { id: 'a4', time: '07:20 AM', action: 'Flagged creative fatigue', campaign: 'TikTok FYP - Viral', platform: 'TikTok', status: 'Approved', impact: '+$890 potential', icon: Eye },
  { id: 'a5', time: '06:55 AM', action: 'Scaled budget 25%', campaign: 'Search - Brand Terms', platform: 'Google', status: 'Auto-executed', impact: '+$210 budget', icon: TrendingUp },
  { id: 'a6', time: '06:30 AM', action: 'Bid adjustment -15%', campaign: 'Display - Remarketing', platform: 'Google', status: 'Auto-executed', impact: '-$340/wk CPA', icon: SlidersHorizontal },
  { id: 'a7', time: '05:15 AM', action: 'Frequency alert', campaign: 'Lookalike - Purchasers', platform: 'Meta', status: 'Approved', impact: 'Monitor', icon: Bell },
];

const DEMO_RULES: AutomationRule[] = [
  { id: 'rule_1', name: 'Pause if CPA > $50', platform: 'Meta', condition: 'CPA > $50 for 3d', action: 'Pause campaign + notify', status: 'Active', createdBy: 'AI Agent', lastTriggered: '2 hours ago', triggerCount: 23 },
  { id: 'rule_2', name: 'Scale if ROAS > 4x', platform: 'All', condition: 'ROAS > 4x for 2d', action: 'Increase budget 20%', status: 'Active', createdBy: 'You', lastTriggered: '45 min ago', triggerCount: 45 },
  { id: 'rule_3', name: 'Alert if CTR < 1%', platform: 'Meta', condition: 'CTR < 1% after 10k imp', action: 'Flag creative fatigue', status: 'Active', createdBy: 'You', lastTriggered: '3 hours ago', triggerCount: 18 },
  { id: 'rule_4', name: 'Reduce budget if spend > 80%', platform: 'Google', condition: 'Daily spend > 80% of budget', action: 'Decrease budget 15%', status: 'Active', createdBy: 'AI Agent', lastTriggered: '6 hours ago', triggerCount: 12 },
  { id: 'rule_5', name: 'Auto-pause 0 conversions', platform: 'All', condition: '0 conv after $200 spend', action: 'Create pause draft', status: 'Active', createdBy: 'You', lastTriggered: '12 hours ago', triggerCount: 9 },
  { id: 'rule_6', name: 'Weekend B2B reduction', platform: 'Google', condition: 'Weekend + B2B campaign', action: 'Reduce budget 30%', status: 'Paused', createdBy: 'AI Agent', lastTriggered: '3 days ago', triggerCount: 8 },
  { id: 'rule_7', name: 'TikTok trending scale', platform: 'TikTok', condition: 'ROAS > 3.5x for 2d', action: 'Increase budget 25%', status: 'Active', createdBy: 'You', lastTriggered: '1 hour ago', triggerCount: 16 },
  { id: 'rule_8', name: 'Snap frequency cap', platform: 'Snap', condition: 'Frequency > 3x in 7d', action: 'Alert + reduce bid 10%', status: 'Paused', createdBy: 'AI Agent', lastTriggered: '1 week ago', triggerCount: 7 },
];

const DEMO_LOGS: OptimizationLogEntry[] = [
  { id: 'l1', timestamp: '2026-06-18 08:32:14', type: 'Budget', campaign: 'Summer Sale 2026', platform: 'Meta', before: '$400', after: '$480', confidence: 94, actionTaken: 'Auto-executed', actionType: 'increase' },
  { id: 'l2', timestamp: '2026-06-18 08:15:42', type: 'Alert', campaign: 'Summer Sale 2026', platform: 'Meta', before: 'ROAS 4.2x', after: 'ROAS 3.57x', confidence: 91, actionTaken: 'Draft created', actionType: 'alert' },
  { id: 'l3', timestamp: '2026-06-18 07:45:18', type: 'Pause', campaign: 'YouTube - Product Demo', platform: 'Google', before: 'CPA $72.30', after: 'Paused', confidence: 96, actionTaken: 'Pending approval', actionType: 'pause' },
  { id: 'l4', timestamp: '2026-06-18 07:20:55', type: 'Creative', campaign: 'TikTok FYP - Viral', platform: 'TikTok', before: 'CTR 2.1%', after: 'CTR 1.38%', confidence: 88, actionTaken: 'Flagged for review', actionType: 'alert' },
  { id: 'l5', timestamp: '2026-06-18 06:55:33', type: 'Budget', campaign: 'Search - Brand Terms', platform: 'Google', before: '$350', after: '$420', confidence: 94, actionTaken: 'Auto-executed', actionType: 'increase' },
  { id: 'l6', timestamp: '2026-06-18 06:30:12', type: 'Bid', campaign: 'Display - Remarketing', platform: 'Google', before: 'CPA $44.20', after: 'CPA $37.60', confidence: 82, actionTaken: 'Auto-executed', actionType: 'adjust' },
  { id: 'l7', timestamp: '2026-06-18 05:15:48', type: 'Alert', campaign: 'Lookalike - Purchasers', platform: 'Meta', before: 'Freq 1.8x', after: 'Freq 3.2x', confidence: 89, actionTaken: 'Alert sent', actionType: 'alert' },
  { id: 'l8', timestamp: '2026-06-18 04:45:22', type: 'Budget', campaign: 'Retargeting - Cart', platform: 'Meta', before: '$180', after: '$216', confidence: 91, actionTaken: 'Auto-executed', actionType: 'increase' },
  { id: 'l9', timestamp: '2026-06-18 03:20:10', type: 'Pause', campaign: 'TopView - Launch', platform: 'TikTok', before: '$215 spent, 0 conv', after: 'Paused', confidence: 98, actionTaken: 'Pending approval', actionType: 'pause' },
  { id: 'l10', timestamp: '2026-06-17 22:15:35', type: 'Bid', campaign: 'Snap Ads - App Install', platform: 'Snap', before: 'CPA $38.00', after: 'CPA $34.20', confidence: 77, actionTaken: 'Auto-executed', actionType: 'adjust' },
  { id: 'l11', timestamp: '2026-06-17 18:30:27', type: 'Budget', campaign: 'FYP - Viral Hook', platform: 'TikTok', before: '$280', after: '$350', confidence: 89, actionTaken: 'Auto-executed', actionType: 'increase' },
  { id: 'l12', timestamp: '2026-06-17 14:20:44', type: 'Creative', campaign: 'AR Lens - Branded', platform: 'Snap', before: 'CTR 0.8%', after: 'CTR 0.3%', confidence: 93, actionTaken: 'Flagged for review', actionType: 'alert' },
  { id: 'l13', timestamp: '2026-06-17 10:05:19', type: 'Budget', campaign: 'Collection - Products', platform: 'Meta', before: '$160', after: '$192', confidence: 85, actionTaken: 'Auto-executed', actionType: 'increase' },
  { id: 'l14', timestamp: '2026-06-17 06:45:52', type: 'Alert', campaign: 'Brand Awareness Q2', platform: 'Meta', before: 'CTR 1.2%', after: 'CTR 0.4%', confidence: 90, actionTaken: 'Alert sent', actionType: 'alert' },
  { id: 'l15', timestamp: '2026-06-17 02:10:38', type: 'Bid', campaign: 'Story Ads - Promo', platform: 'Snap', before: 'CPA $38.00', after: 'CPA $46.50', confidence: 73, actionTaken: 'Draft created', actionType: 'adjust' },
];

const SPARK_DATA_1 = [
  { v: 4.2 }, { v: 4.1 }, { v: 3.9 }, { v: 4.0 }, { v: 3.95 }, { v: 3.8 }, { v: 3.75 }, { v: 3.6 }, { v: 3.57 }, { v: 3.5 }, { v: 3.45 }, { v: 3.4 }
];
const SPARK_DATA_2 = [
  { v: 2.1 }, { v: 1.95 }, { v: 1.85 }, { v: 1.8 }, { v: 1.7 }, { v: 1.6 }, { v: 1.5 }, { v: 1.45 }, { v: 1.38 }, { v: 1.3 }, { v: 1.25 }, { v: 1.2 }
];
const SPARK_DATA_3 = [
  { v: 18 }, { v: 17 }, { v: 16.5 }, { v: 15.8 }, { v: 15.2 }, { v: 14.5 }, { v: 13.8 }, { v: 13.2 }, { v: 12.8 }, { v: 12.6 }, { v: 12.5 }, { v: 12.4 }
];
const ACTIVITY_SPARK = [
  { v: 12 }, { v: 18 }, { v: 15 }, { v: 22 }, { v: 28 }, { v: 24 }, { v: 32 }, { v: 35 }, { v: 30 }, { v: 38 }, { v: 42 }, { v: 45 }
];
const CONFIDENCE_DISTRIBUTION = [
  { range: '90-100%', count: 8 }, { range: '80-89%', count: 12 }, { range: '70-79%', count: 6 },
  { range: '60-69%', count: 3 }, { range: '50-59%', count: 1 },
];

/* ──────────────────────── UTILS ──────────────────────── */
const severityColor = (s: string) => {
  switch (s) {
    case 'Critical': return { bg: `${C.red}18`, text: C.red, border: `${C.red}30` };
    case 'Warning': return { bg: `${C.yellow}18`, text: C.yellow, border: `${C.yellow}30` };
    case 'Opportunity': return { bg: `${C.green}18`, text: C.green, border: `${C.green}30` };
    default: return { bg: `${C.blue}18`, text: C.blue, border: `${C.blue}30` };
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'Active': return { bg: `${C.green}18`, text: C.green };
    case 'active': return { bg: `${C.green}18`, text: C.green };
    case 'Paused': return { bg: `${C.muted2}30`, text: C.muted };
    case 'paused': return { bg: `${C.muted2}30`, text: C.muted };
    case 'Auto-executed': return { bg: `${C.blue}18`, text: C.blue };
    case 'Pending': return { bg: `${C.yellow}18`, text: C.yellow };
    case 'Approved': return { bg: `${C.green}18`, text: C.green };
    case 'Draft created': return { bg: `${C.purple}18`, text: C.purple };
    case 'Flagged for review': return { bg: `${C.orange}18`, text: C.orange };
    case 'Alert sent': return { bg: `${C.yellow}18`, text: C.yellow };
    case 'Pending approval': return { bg: `${C.yellow}18`, text: C.yellow };
    case 'success': return { bg: `${C.green}18`, text: C.green };
    case 'warning': return { bg: `${C.yellow}18`, text: C.yellow };
    case 'error': return { bg: `${C.red}18`, text: C.red };
    default: return { bg: `${C.muted2}30`, text: C.muted };
  }
};

const actionIcon = (type: string) => {
  switch (type) {
    case 'increase': return <TrendingUp className="w-3.5 h-3.5" style={{ color: C.green }} />;
    case 'increase_budget': return <TrendingUp className="w-3.5 h-3.5" style={{ color: C.green }} />;
    case 'pause': return <Pause className="w-3.5 h-3.5" style={{ color: C.red }} />;
    case 'pause_campaign': return <Pause className="w-3.5 h-3.5" style={{ color: C.red }} />;
    case 'alert': return <Bell className="w-3.5 h-3.5" style={{ color: C.yellow }} />;
    case 'create_alert': return <Bell className="w-3.5 h-3.5" style={{ color: C.yellow }} />;
    case 'notify_team': return <Bell className="w-3.5 h-3.5" style={{ color: C.yellow }} />;
    case 'adjust': return <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: C.blue }} />;
    case 'adjust_bid': return <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: C.blue }} />;
    case 'decrease_budget': return <TrendingUp className="w-3.5 h-3.5" style={{ color: C.orange }} />;
    default: return <Activity className="w-3.5 h-3.5" style={{ color: C.muted }} />;
  }
};

const formatTimestamp = (ts: string | undefined) => {
  if (!ts) return 'Never';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
};

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function AIAgentPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'logs' | 'settings'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logFilter, setLogFilter] = useState('All');
  const [logPlatformFilter, setLogPlatformFilter] = useState('All');
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [autoLowRisk, setAutoLowRisk] = useState(true);
  const [autoMediumRisk, setAutoMediumRisk] = useState(false);
  const [autoHighRisk, setAutoHighRisk] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifSlack, setNotifSlack] = useState(false);
  const [mcpStatus, setMcpStatus] = useState('connected');
  const { toast } = useToast();

  /* ── Data state ── */
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<OptimizationLogEntry[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});
  const [isTogglingAgent, setIsTogglingAgent] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [executingRecs, setExecutingRecs] = useState<Record<string, boolean>>({});
  const [creatingDrafts, setCreatingDrafts] = useState<Record<string, boolean>>({});

  /* ── Real-time ── */
  const { lastEvent, connected: realtimeConnected, connectionState } = useRealtime({ enabled: true });

  /* ── Create Rule Modal State ── */
  const [newRule, setNewRule] = useState({ name: '', platform: 'Meta', condition: '', action: '' });

  /* ═══════════ API HELPERS ═══════════ */
  const handleApiError = useCallback((label: string, err: any) => {
    const msg = err?.response?.data?.message || err?.message || 'Unknown error';
    console.error(`[AIAgent] ${label}:`, err);
    setFetchErrors(prev => ({ ...prev, [label]: msg }));
    toast({ title: `${label}: ${msg}`, variant: 'destructive' });
  }, [toast]);

  /* ── Fetch Agent Status ── */
  const fetchStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const data = await apiGet<AgentStatus>('/agent/status');
      setAgentStatus(data);
      setFetchErrors(prev => { const n = { ...prev }; delete n['Status']; return n; });
    } catch (err) {
      handleApiError('Status', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [handleApiError]);

  /* ── Fetch Rules ── */
  const fetchRules = useCallback(async () => {
    try {
      const data = await apiGet<AutomationRule[]>('/agent/rules');
      const mapped = data.map(r => ({
        ...r,
        condition: typeof r.condition === 'string' ? r.condition : r.condition?.metric ? `${r.condition.metric} ${r.condition.operator} ${r.condition.value}${r.condition.timeWindow ? ` for ${r.condition.timeWindow}` : ''}` : 'Custom condition',
        action: typeof r.action === 'string' ? r.action : r.action?.type || 'Custom action',
        status: r.status === 'active' || r.status === 'Active' ? 'Active' : 'Paused',
        createdBy: r.createdBy || 'AI Agent',
        lastTriggered: r.lastTriggered || r.lastAppliedAt || 'Never',
        triggerCount: r.triggerCount || 0,
      }));
      setRules(mapped);
      setFetchErrors(prev => { const n = { ...prev }; delete n['Rules']; return n; });
    } catch (err) {
      handleApiError('Rules', err);
    }
  }, [handleApiError]);

  /* ── Fetch Logs ── */
  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiGet<OptimizationLogEntry[]>('/agent/logs');
      const mapped = data.map(l => ({
        ...l,
        timestamp: l.timestamp || l.createdAt,
        type: l.type || l.actionType || 'Action',
        campaign: l.campaign || l.campaignName || '-',
        actionType: l.actionType || l.type || 'action',
        actionTaken: l.actionTaken || l.status || 'Completed',
        before: l.before ?? (l.beforeValue != null ? String(l.beforeValue) : '-'),
        after: l.after ?? (l.afterValue != null ? String(l.afterValue) : '-'),
        confidence: l.confidence ?? 85,
      }));
      setLogs(mapped);
      setFetchErrors(prev => { const n = { ...prev }; delete n['Logs']; return n; });
    } catch (err) {
      handleApiError('Logs', err);
    }
  }, [handleApiError]);

  /* ── Fetch Recommendations ── */
  const fetchRecommendations = useCallback(async () => {
    try {
      const data = await apiGet<AIRecommendation[]>('/agent/recommendations');
      setRecommendations(data);
      setFetchErrors(prev => { const n = { ...prev }; delete n['Recommendations']; return n; });
    } catch (err) {
      handleApiError('Recommendations', err);
    }
  }, [handleApiError]);

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchStatus(silent),
        fetchRules(),
        fetchLogs(),
        fetchRecommendations(),
      ]);
    } catch (err) {
      setError('Failed to load AI Agent data. Please try again.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [fetchStatus, fetchRules, fetchLogs, fetchRecommendations]);

  /* ── Initial load ── */
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── Auto-refresh status every 30s ── */
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  /* ── Real-time events ── */
  useEffect(() => {
    if (!lastEvent) return;
    const { type, payload } = lastEvent;
    if (type === 'ai.recommendation') {
      fetchRecommendations();
      fetchStatus(true);
    } else if (type === 'metrics.updated') {
      fetchStatus(true);
    } else if (type === 'alert.triggered') {
      fetchLogs();
      fetchRecommendations();
    } else if (type === 'campaign.updated') {
      fetchStatus(true);
      fetchLogs();
    }
  }, [lastEvent, fetchRecommendations, fetchStatus, fetchLogs]);

  /* ── Toggle agent (pause/resume) ── */
  const handleToggleAgent = async () => {
    setIsTogglingAgent(true);
    try {
      if (agentStatus?.isRunning) {
        await apiPost('/agent/pause');
        toast({ title: 'Agent paused', variant: 'success' });
      } else {
        await apiPost('/agent/resume');
        toast({ title: 'Agent resumed', variant: 'success' });
      }
      await fetchStatus();
    } catch (err) {
      handleApiError('Toggle Agent', err);
    } finally {
      setIsTogglingAgent(false);
    }
  };

  /* ── Run Now ── */
  const handleRunNow = async () => {
    setIsRunningNow(true);
    try {
      await apiPost('/agent/run');
      toast({ title: 'Agent evaluation started', variant: 'success' });
      await fetchAll(true);
    } catch (err) {
      handleApiError('Run Now', err);
    } finally {
      setIsRunningNow(false);
    }
  };

  /* ── Create Rule ── */
  const handleCreateRule = async () => {
    if (!newRule.name.trim()) {
      toast({ title: 'Rule name is required', variant: 'destructive' });
      return;
    }
    try {
      await apiPost('/agent/rules', {
        name: newRule.name,
        platform: newRule.platform,
        condition: newRule.condition || 'Custom condition',
        action: newRule.action || 'Custom action',
        status: 'active',
      });
      toast({ title: `Rule "${newRule.name}" created`, variant: 'success' });
      setNewRule({ name: '', platform: 'Meta', condition: '', action: '' });
      setShowCreateModal(false);
      await fetchRules();
      await fetchStatus();
    } catch (err) {
      handleApiError('Create Rule', err);
    }
  };

  /* ── Toggle Rule Status ── */
  const handleToggleRuleStatus = async (id: string) => {
    try {
      await apiPost(`/agent/rules/${id}/toggle`);
      await fetchRules();
      await fetchStatus();
      toast({ title: 'Rule status updated', variant: 'success' });
    } catch (err) {
      handleApiError('Toggle Rule', err);
    }
  };

  /* ── Delete Rule ── */
  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await apiPost(`/agent/rules/${id}/delete`);
      setRules(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Rule deleted', variant: 'success' });
      await fetchStatus();
    } catch (err) {
      handleApiError('Delete Rule', err);
    }
  };

  /* ── Execute Recommendation ── */
  const handleExecuteRecommendation = async (id: string) => {
    setExecutingRecs(prev => ({ ...prev, [id]: true }));
    try {
      await apiPost(`/agent/recommendations/${id}/execute`);
      toast({ title: 'Recommendation executed', variant: 'success' });
      await fetchRecommendations();
      await fetchStatus();
      await fetchLogs();
    } catch (err) {
      handleApiError('Execute Recommendation', err);
    } finally {
      setExecutingRecs(prev => ({ ...prev, [id]: false }));
    }
  };

  /* ── Create Draft from Recommendation ── */
  const handleCreateDraft = async (rec: AIRecommendation) => {
    setCreatingDrafts(prev => ({ ...prev, [rec.id]: true }));
    try {
      await apiPost(`/agent/recommendations/${rec.id}/draft`, {
        title: rec.title,
        description: rec.description,
        campaignName: rec.campaign,
        platform: rec.platform,
        severity: rec.severity,
        impact: rec.impact,
        metric: rec.metric,
      });
      toast({ title: 'Draft created successfully', variant: 'success' });
      await fetchRecommendations();
      await fetchStatus();
    } catch (err) {
      handleApiError('Create Draft', err);
    } finally {
      setCreatingDrafts(prev => ({ ...prev, [rec.id]: false }));
    }
  };

  /* ── Computed values ── */
  const isRunning = agentStatus?.isRunning ?? true;
  const activeRules = rules.filter(r => r.status === 'Active').length;
  const pausedRules = rules.filter(r => r.status === 'Paused').length;
  const totalRules = rules.length;
  const optimizationsToday = agentStatus?.optimizationsToday ?? 0;
  const creditsUsed = agentStatus?.creditsUsed ?? 0;
  const creditsTotal = agentStatus?.creditsTotal ?? 1000;
  const creditsPct = creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0;
  const pendingDrafts = agentStatus?.pendingDrafts ?? 0;

  /* ── Use recommendations or fallback ── */
  const insightsToShow = recommendations.length > 0 ? recommendations : DEMO_INSIGHTS;
  const logsToShow = logs.length > 0 ? logs : DEMO_LOGS;
  const rulesToShow = rules.length > 0 ? rules : DEMO_RULES;

  /* ── Recent actions from status or logs ── */
  const recentActions = useMemo(() => {
    if (agentStatus?.recentLogs && agentStatus.recentLogs.length > 0) {
      return agentStatus.recentLogs.slice(0, 7).map((l, i) => ({
        id: l.id || `a${i}`,
        time: formatTimestamp(l.createdAt || l.timestamp),
        action: l.action || l.ruleName || l.actionType || 'Optimization',
        campaign: l.campaignName || l.campaign || '-',
        platform: l.platform || 'Meta',
        status: l.status === 'success' ? 'Auto-executed' : l.status === 'warning' ? 'Pending' : 'Approved',
        impact: l.details || '-',
        icon: l.actionType === 'increase_budget' || l.actionType === 'increase' ? TrendingUp :
              l.actionType === 'pause_campaign' || l.actionType === 'pause' ? Pause :
              l.actionType === 'create_alert' || l.actionType === 'alert' ? Bell :
              SlidersHorizontal,
      }));
    }
    return DEMO_ACTIONS;
  }, [agentStatus?.recentLogs]);

  /* ── Filtered logs ── */
  const filteredLogs = useMemo(() => {
    return logsToShow.filter(l => {
      const typeMatch = logFilter === 'All' || (l.type || l.actionType) === logFilter;
      const platformMatch = logPlatformFilter === 'All' || l.platform === logPlatformFilter;
      return typeMatch && platformMatch;
    });
  }, [logsToShow, logFilter, logPlatformFilter]);

  /* ── Sparkline data for recommendations ── */
  const getSparkData = (idx: number) => {
    if (idx === 0) return SPARK_DATA_1;
    if (idx === 1) return SPARK_DATA_2;
    return SPARK_DATA_3;
  };

  /* ═══════════ LOADING STATE ═══════════ */
  if (isLoading) {
    return (
      <>
      <SEO
        title="AI Agent"
      description="Your autonomous AI marketing agent. Get intelligent campaign recommendations, automated optimizations, anomaly detection, and proactive performance alerts."
      keywords="AI agent, marketing automation, campaign optimization, AI recommendations, autonomous marketing"
      />
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: C.bg }}>
        <Spinner className="w-8 h-8" style={{ color: C.accent }} />
        <p className="text-sm" style={{ color: C.muted }}>Loading AI Agent...</p>
      </div>
      </>
    );
  }

  /* ═══════════ ERROR STATE ═══════════ */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <Empty>
          <EmptyMedia><AlertCircle className="w-10 h-10" style={{ color: C.red }} /></EmptyMedia>
          <EmptyHeader>
            <EmptyTitle style={{ color: C.text }}>Failed to Load</EmptyTitle>
            <EmptyDescription style={{ color: C.muted }}>{error}</EmptyDescription>
          </EmptyHeader>
          <button onClick={() => fetchAll()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90" style={{ background: C.accent, color: '#000' }}>
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="px-6 py-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${C.accent}15` }}>
                <Brain className="w-6 h-6" style={{ color: C.accent }} />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2" style={{ background: isRunning ? C.green : C.red, borderColor: C.bg }} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                AI Agent
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: isRunning ? `${C.green}18` : `${C.red}18`, color: isRunning ? C.green : C.red }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: isRunning ? C.green : C.red }} />
                  {isRunning ? 'Running' : 'Paused'}
                </span>
                {/* Realtime indicator */}
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: realtimeConnected ? `${C.blue}18` : `${C.muted2}30`, color: realtimeConnected ? C.blue : C.muted }}>
                  {realtimeConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {realtimeConnected ? 'Live' : 'Offline'}
                </span>
              </h1>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                Last run: {formatTimestamp(agentStatus?.lastRun)} · Next scan: {formatTimestamp(agentStatus?.nextScheduledRun)} · {activeRules} rules active · {pendingDrafts} pending drafts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleRunNow} disabled={isRunningNow} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/10 disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.05)', color: C.text }}>
              {isRunningNow ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />} Run Now
            </button>
            <button onClick={handleToggleAgent} disabled={isTogglingAgent} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50" style={{ background: isRunning ? `${C.red}18` : `${C.green}18`, color: isRunning ? C.red : C.green, border: `1px solid ${isRunning ? `${C.red}30` : `${C.green}30`}` }}>
              {isTogglingAgent ? <Spinner className="w-4 h-4" /> : isRunning ? <><Pause className="w-4 h-4" /> Pause Agent</> : <><Play className="w-4 h-4" /> Resume Agent</>}
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Rules Active', value: `${activeRules}/${totalRules}`, sub: `${pausedRules} paused`, icon: Target, color: C.blue, spark: ACTIVITY_SPARK },
            { label: 'Optimizations Today', value: String(optimizationsToday), sub: agentStatus ? '+8 vs yesterday' : 'Loading...', icon: Zap, color: C.accent, spark: ACTIVITY_SPARK },
            { label: 'Time Saved', value: agentStatus ? `${Math.round((agentStatus.optimizationsApplied || 0) * 0.08)}h` : '12h', sub: 'This week', icon: Clock, color: C.green, spark: ACTIVITY_SPARK },
            { label: 'Credits Used', value: `${creditsUsed}/${creditsTotal}`, sub: `${creditsPct}% of limit`, icon: Cpu, color: C.purple, pct: creditsPct },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl p-5 relative overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-xs font-medium" style={{ color: C.muted }}>{s.label}</span>
              </div>
              <div className="text-2xl font-semibold text-white mb-0.5">{s.value}</div>
              <div className="text-xs" style={{ color: C.muted }}>{s.sub}</div>
              {s.spark && (
                <div className="absolute bottom-0 right-0 left-0 h-10 opacity-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={s.spark}>
                      <Area type="monotone" dataKey="v" stroke={s.color} fill={s.color} fillOpacity={0.3} strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              {s.pct !== undefined && (
                <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${C.muted}20` }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, background: s.pct > 90 ? C.red : s.pct > 75 ? C.yellow : C.green }} />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* ═══════════════ TABS ═══════════════ */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: C.border }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3, count: recommendations.length },
            { id: 'rules', label: 'Automation Rules', icon: SlidersHorizontal, count: totalRules },
            { id: 'logs', label: 'Optimization Logs', icon: Activity, count: logs.length },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative" style={{ color: activeTab === tab.id ? C.accent : C.muted }}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: activeTab === tab.id ? `${C.accent}20` : C.border, color: activeTab === tab.id ? C.accent : C.muted }}>{tab.count}</span>}
              {activeTab === tab.id && <motion.div layoutId="agentTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: C.accent }} />}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════
            TAB 1: DASHBOARD
        ════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              {/* ── AI Insight Cards ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5" style={{ color: C.accent }} />
                    AI Insights
                  </h2>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${C.accent}15`, color: C.accent }}>{recommendations.length} new today</span>
                </div>

                {/* Error state for recommendations */}
                {fetchErrors['Recommendations'] && (
                  <div className="rounded-xl p-4 mb-4 flex items-center gap-3" style={{ background: `${C.red}10`, border: `1px solid ${C.red}30` }}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: C.red }} />
                    <div>
                      <p className="text-sm" style={{ color: C.red }}>Failed to load recommendations</p>
                      <button onClick={fetchRecommendations} className="text-xs mt-1 underline" style={{ color: C.accent }}>Retry</button>
                    </div>
                  </div>
                )}

                {recommendations.length === 0 && !fetchErrors['Recommendations'] ? (
                  /* Empty state */
                  <Empty>
                    <EmptyMedia><Sparkles className="w-10 h-10" style={{ color: C.muted }} /></EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle style={{ color: C.text }}>No New Insights</EmptyTitle>
                      <EmptyDescription style={{ color: C.muted }}>The AI Agent is monitoring your campaigns. Insights will appear here when opportunities or issues are detected.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {insightsToShow.map((insight, idx) => {
                      const sev = severityColor(insight.severity);
                      const sparkData = getSparkData(idx);
                      const isExecuting = executingRecs[insight.id] || false;
                      const isCreatingDraft = creatingDrafts[insight.id] || false;
                      return (
                        <motion.div key={insight.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="rounded-xl p-5 group" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide" style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                              {insight.severity}
                            </span>
                            <span className="text-xs" style={{ color: C.muted }}>{insight.confidence}% confidence</span>
                          </div>
                          {/* Title */}
                          <h3 className="text-white font-medium mb-2 text-sm leading-snug">{insight.title}</h3>
                          {/* Sparkline */}
                          <div className="h-14 mb-3">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={sparkData}>
                                <defs>
                                  <linearGradient id={`grad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={sev.text} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={sev.text} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke={sev.text} fill={`url(#grad_${idx})`} strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Description */}
                          <p className="text-xs mb-4 leading-relaxed" style={{ color: C.muted }}>{insight.description}</p>
                          {/* Metric pill */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: `${sev.text}12`, color: sev.text }}>
                              {insight.metric}
                            </span>
                            <span className="px-2 py-1 rounded-lg text-xs" style={{ background: `${insight.impact.startsWith('+') ? C.green : C.red}12`, color: insight.impact.startsWith('+') ? C.green : C.red }}>
                              {insight.impact}
                            </span>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                            <button onClick={() => handleExecuteRecommendation(insight.id)} disabled={isExecuting} className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50" style={{ color: C.accent }}>
                              {isExecuting ? <Spinner className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Execute
                            </button>
                            <ChevronRight className="w-3 h-3 mx-1" style={{ color: C.muted2 }} />
                            <button onClick={() => handleCreateDraft(insight)} disabled={isCreatingDraft} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50" style={{ background: C.accent, color: '#000' }}>
                              {isCreatingDraft ? <Spinner className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />} Create Draft
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Recent Actions Table ── */}
              <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: C.blue }} />
                    Recent Actions
                  </h3>
                  <button onClick={() => setActiveTab('logs')} className="text-xs flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: C.accent }}>
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {['Time', 'Action', 'Campaign', 'Platform', 'Status', 'Impact'].map(h => (
                          <th scope="col" key={h} className="text-left text-xs font-medium px-5 py-3" style={{ color: C.muted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentActions.map((a, i) => {
                        const st = statusBadge(a.status);
                        return (
                          <tr key={a.id} className="group transition-colors hover:bg-white/[0.02]" style={{ borderBottom: i < recentActions.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                            <td className="px-5 py-3.5 text-xs text-white whitespace-nowrap">{a.time}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <a.icon className="w-3.5 h-3.5" style={{ color: C.accent }} />
                                <span className="text-xs text-white">{a.action}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs" style={{ color: C.muted }}>{a.campaign}</td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: `${C.blue}12`, color: C.blue }}>{a.platform}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.text }}>{a.status}</span>
                            </td>
                            <td className="px-5 py-3.5 text-xs" style={{ color: a.impact.startsWith('+') ? C.green : a.impact.includes('waste') || a.impact.includes('Review') ? C.yellow : C.blue }}>{a.impact}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {recentActions.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="w-10 h-10 mx-auto mb-2" style={{ color: C.muted2 }} />
                    <p className="text-sm" style={{ color: C.muted }}>No recent actions</p>
                  </div>
                )}
              </div>

              {/* ── Mini charts row ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: C.green }} />
                    Optimization Activity (12h)
                  </h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ACTIVITY_SPARK}>
                        <defs>
                          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.green} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="v" hide />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }}
                          itemStyle={{ color: C.green }}
                          formatter={(value: number) => [`${value} actions`, 'Count']}
                          labelFormatter={() => ''}
                        />
                        <Area type="monotone" dataKey="v" stroke={C.green} fill="url(#actGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Gauge className="w-4 h-4" style={{ color: C.blue }} />
                    Confidence Distribution
                  </h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={CONFIDENCE_DISTRIBUTION} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="range" type="category" width={60} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                          itemStyle={{ color: C.blue }}
                          formatter={(value: number) => [`${value} optimizations`, 'Count']}
                          labelFormatter={(label: string) => `Confidence: ${label}`}
                        />
                        <Bar dataKey="count" fill={C.blue} radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 2: AUTOMATION RULES
          ════════════════════════════════════════════════════════ */}
          {activeTab === 'rules' && (
            <motion.div key="rules" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              {fetchErrors['Rules'] && (
                <div className="rounded-xl p-4 mb-4 flex items-center gap-3" style={{ background: `${C.red}10`, border: `1px solid ${C.red}30` }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: C.red }} />
                  <div>
                    <p className="text-sm" style={{ color: C.red }}>Failed to load rules</p>
                    <button onClick={fetchRules} className="text-xs mt-1 underline" style={{ color: C.accent }}>Retry</button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-white">Automation Rules</h2>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>{activeRules} active · {pausedRules} paused · {rulesToShow.reduce((s, r) => s + (r.triggerCount || 0), 0).toLocaleString()} total triggers</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90" style={{ background: C.accent, color: '#000' }}>
                  <Plus className="w-4 h-4" /> Create Rule
                </button>
              </div>

              {rulesToShow.length === 0 ? (
                <Empty>
                  <EmptyMedia><SlidersHorizontal className="w-10 h-10" style={{ color: C.muted }} /></EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle style={{ color: C.text }}>No Rules Yet</EmptyTitle>
                    <EmptyDescription style={{ color: C.muted }}>Create your first automation rule to let the AI Agent optimize your campaigns.</EmptyDescription>
                  </EmptyHeader>
                  <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90" style={{ background: C.accent, color: '#000' }}>
                    <Plus className="w-4 h-4" /> Create Rule
                  </button>
                </Empty>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {['Rule Name', 'Platform', 'Condition', 'Action', 'Status', 'Created By', 'Last Triggered', ''].map(h => (
                            <th scope="col" key={h} className="text-left text-xs font-medium px-5 py-3.5" style={{ color: C.muted }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rulesToShow.map((rule, i) => {
                          const st = statusBadge(rule.status);
                          return (
                            <tr key={rule.id} className="group transition-colors hover:bg-white/[0.02]" style={{ borderBottom: i < rulesToShow.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${C.accent}10` }}>
                                    <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: C.accent }} />
                                  </div>
                                  <div>
                                    <div className="text-sm text-white font-medium">{rule.name}</div>
                                    <div className="text-xs" style={{ color: C.muted }}>{rule.triggerCount} triggers</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: `${C.blue}12`, color: C.blue }}>{rule.platform}</span>
                              </td>
                              <td className="px-5 py-4 text-xs" style={{ color: C.muted }}>{rule.condition}</td>
                              <td className="px-5 py-4 text-xs" style={{ color: C.muted }}>{rule.action}</td>
                              <td className="px-5 py-4">
                                <button onClick={() => handleToggleRuleStatus(rule.id)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer" style={{ background: st.bg, color: st.text }}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.text }} />
                                  {rule.status}
                                </button>
                              </td>
                              <td className="px-5 py-4 text-xs" style={{ color: C.muted }}>{rule.createdBy}</td>
                              <td className="px-5 py-4 text-xs" style={{ color: C.muted }}>{rule.lastTriggered}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button className="p-1.5 rounded-md hover:bg-white/5 transition-colors" title="Edit">
                                    <Edit3 className="w-3.5 h-3.5" style={{ color: C.muted }} />
                                  </button>
                                  <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" style={{ color: C.red }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 3: OPTIMIZATION LOGS
          ════════════════════════════════════════════════════════ */}
          {activeTab === 'logs' && (
            <motion.div key="logs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              {fetchErrors['Logs'] && (
                <div className="rounded-xl p-4 mb-4 flex items-center gap-3" style={{ background: `${C.red}10`, border: `1px solid ${C.red}30` }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: C.red }} />
                  <div>
                    <p className="text-sm" style={{ color: C.red }}>Failed to load logs</p>
                    <button onClick={fetchLogs} className="text-xs mt-1 underline" style={{ color: C.accent }}>Retry</button>
                  </div>
                </div>
              )}

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-medium text-white">Optimization Logs</h2>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>{filteredLogs.length} entries · Last 48 hours</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Type filter */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <Filter className="w-3.5 h-3.5" style={{ color: C.muted }} />
                    <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="bg-transparent text-xs text-white outline-none cursor-pointer" style={{ color: C.text }}>
                      {['All', 'Budget', 'Pause', 'Bid', 'Alert', 'Creative'].map(f => (
                        <option key={f} value={f} style={{ background: C.card }}>{f}</option>
                      ))}
                    </select>
                  </div>
                  {/* Platform filter */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <Server className="w-3.5 h-3.5" style={{ color: C.muted }} />
                    <select value={logPlatformFilter} onChange={e => setLogPlatformFilter(e.target.value)} className="bg-transparent text-xs text-white outline-none cursor-pointer" style={{ color: C.text }}>
                      {['All', 'Meta', 'Google', 'TikTok', 'Snap'].map(f => (
                        <option key={f} value={f} style={{ background: C.card }}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {['Timestamp', 'Type', 'Campaign', 'Platform', 'Before', 'After', 'Confidence', 'Action Taken'].map(h => (
                          <th scope="col" key={h} className="text-left text-xs font-medium px-5 py-3.5" style={{ color: C.muted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, i) => {
                        const st = statusBadge(log.actionTaken || log.status);
                        return (
                          <tr key={log.id} className="group transition-colors hover:bg-white/[0.02]" style={{ borderBottom: i < filteredLogs.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                            <td className="px-5 py-3.5 text-xs text-white whitespace-nowrap font-mono">{log.timestamp || log.createdAt}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                {actionIcon(log.actionType || log.type)}
                                <span className="text-xs text-white">{log.type || log.actionType}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs" style={{ color: C.muted }}>{log.campaign || log.campaignName}</td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: `${C.blue}12`, color: C.blue }}>{log.platform}</span>
                            </td>
                            <td className="px-5 py-3.5 text-xs" style={{ color: C.muted }}>{log.before}</td>
                            <td className="px-5 py-3.5 text-xs font-medium" style={{ color: (log.actionType || log.type) === 'pause' || (log.actionType || log.type) === 'pause_campaign' ? C.red : (log.actionType || log.type) === 'increase' || (log.actionType || log.type) === 'increase_budget' ? C.green : C.blue }}>{log.after}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: `${C.muted}20` }}>
                                  <div className="h-full rounded-full" style={{ width: `${log.confidence ?? 85}%`, background: (log.confidence ?? 85) >= 90 ? C.green : (log.confidence ?? 85) >= 75 ? C.yellow : C.red }} />
                                </div>
                                <span className="text-xs" style={{ color: (log.confidence ?? 85) >= 90 ? C.green : (log.confidence ?? 85) >= 75 ? C.yellow : C.red }}>{log.confidence ?? 85}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.text }}>{log.actionTaken || log.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredLogs.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-10 h-10 mx-auto mb-2" style={{ color: C.muted2 }} />
                    <p className="text-sm" style={{ color: C.muted }}>No logs match your filters</p>
                    <button onClick={() => { setLogFilter('All'); setLogPlatformFilter('All'); }} className="text-xs mt-2 underline" style={{ color: C.accent }}>Clear filters</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 4: SETTINGS
          ════════════════════════════════════════════════════════ */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <div className="max-w-3xl">
                <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5" style={{ color: C.accent }} />
                  Agent Settings
                </h2>

                {/* ── Confidence Threshold ── */}
                <div className="rounded-xl p-6 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${C.purple}15` }}>
                      <Gauge className="w-5 h-5" style={{ color: C.purple }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">Confidence Threshold</h3>
                      <p className="text-xs" style={{ color: C.muted }}>Minimum AI confidence before suggesting or executing optimizations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min={0} max={100} value={confidenceThreshold}
                      onChange={e => setConfidenceThreshold(Number(e.target.value))}
                      className="flex-1 accent-lime-400 cursor-pointer"
                      style={{ accentColor: C.accent }}
                    />
                    <span className="text-lg font-semibold text-white w-16 text-right">{confidenceThreshold}%</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs" style={{ color: C.muted }}>More suggestions</span>
                    <span className="text-xs" style={{ color: C.muted }}>More cautious</span>
                  </div>
                  {/* Visual indicator */}
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${confidenceThreshold >= 80 ? C.green : confidenceThreshold >= 60 ? C.yellow : C.red}10`, border: `1px solid ${confidenceThreshold >= 80 ? C.green : confidenceThreshold >= 60 ? C.yellow : C.red}20` }}>
                    <Info className="w-3.5 h-3.5" style={{ color: confidenceThreshold >= 80 ? C.green : confidenceThreshold >= 60 ? C.yellow : C.red }} />
                    <span className="text-xs" style={{ color: confidenceThreshold >= 80 ? C.green : confidenceThreshold >= 60 ? C.yellow : C.red }}>
                      {confidenceThreshold >= 80 ? 'Conservative: Only high-confidence actions will be executed' : confidenceThreshold >= 60 ? 'Balanced: Good mix of suggestions and auto-actions' : 'Aggressive: Many suggestions, higher risk of false positives'}
                    </span>
                  </div>
                </div>

                {/* ── Auto-execute Toggles ── */}
                <div className="rounded-xl p-6 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${C.blue}15` }}>
                      <Zap className="w-5 h-5" style={{ color: C.blue }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">Auto-execute Settings</h3>
                      <p className="text-xs" style={{ color: C.muted }}>Automatically execute optimizations based on risk level</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {/* Low risk */}
                    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4" style={{ color: C.green }} />
                        <div>
                          <div className="text-sm text-white">Low Risk</div>
                          <div className="text-xs" style={{ color: C.muted }}>Changes under $5 impact</div>
                        </div>
                      </div>
                      <button onClick={() => setAutoLowRisk(!autoLowRisk)} className="transition-colors">
                        {autoLowRisk ? <ToggleRight className="w-8 h-8" style={{ color: C.accent }} /> : <ToggleLeft className="w-8 h-8" style={{ color: C.muted2 }} />}
                      </button>
                    </div>
                    {/* Medium risk */}
                    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4" style={{ color: C.yellow }} />
                        <div>
                          <div className="text-sm text-white">Medium Risk</div>
                          <div className="text-xs" style={{ color: C.muted }}>Changes under $100 impact</div>
                        </div>
                      </div>
                      <button onClick={() => setAutoMediumRisk(!autoMediumRisk)} className="transition-colors">
                        {autoMediumRisk ? <ToggleRight className="w-8 h-8" style={{ color: C.accent }} /> : <ToggleLeft className="w-8 h-8" style={{ color: C.muted2 }} />}
                      </button>
                    </div>
                    {/* High risk */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4" style={{ color: C.red }} />
                        <div>
                          <div className="text-sm text-white">High Risk</div>
                          <div className="text-xs" style={{ color: C.muted }}>Always require approval</div>
                        </div>
                      </div>
                      <button onClick={() => setAutoHighRisk(!autoHighRisk)} className="transition-colors">
                        {autoHighRisk ? <ToggleRight className="w-8 h-8" style={{ color: C.accent }} /> : <ToggleLeft className="w-8 h-8" style={{ color: C.muted2 }} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Notification Preferences ── */}
                <div className="rounded-xl p-6 mb-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${C.yellow}15` }}>
                      <Bell className="w-5 h-5" style={{ color: C.yellow }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">Notification Preferences</h3>
                      <p className="text-xs" style={{ color: C.muted }}>How you want to be notified about AI actions</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4" style={{ color: C.muted }} />
                        <span className="text-sm text-white">Email notifications</span>
                      </div>
                      <button onClick={() => setNotifEmail(!notifEmail)} className="transition-colors">
                        {notifEmail ? <ToggleRight className="w-8 h-8" style={{ color: C.accent }} /> : <ToggleLeft className="w-8 h-8" style={{ color: C.muted2 }} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4" style={{ color: C.muted }} />
                        <span className="text-sm text-white">In-app notifications</span>
                      </div>
                      <button onClick={() => setNotifInApp(!notifInApp)} className="transition-colors">
                        {notifInApp ? <ToggleRight className="w-8 h-8" style={{ color: C.accent }} /> : <ToggleLeft className="w-8 h-8" style={{ color: C.muted2 }} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4" style={{ color: C.muted }} />
                        <span className="text-sm text-white">Slack notifications</span>
                      </div>
                      <button onClick={() => setNotifSlack(!notifSlack)} className="transition-colors">
                        {notifSlack ? <ToggleRight className="w-8 h-8" style={{ color: C.accent }} /> : <ToggleLeft className="w-8 h-8" style={{ color: C.muted2 }} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── MCP Integration ── */}
                <div className="rounded-xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${C.green}15` }}>
                      <Plug className="w-5 h-5" style={{ color: C.green }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-white">MCP Integration</h3>
                      <p className="text-xs" style={{ color: C.muted }}>Model Context Protocol connection status</p>
                    </div>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: mcpStatus === 'connected' ? `${C.green}18` : `${C.yellow}18`, color: mcpStatus === 'connected' ? C.green : C.yellow }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: mcpStatus === 'connected' ? C.green : C.yellow }} />
                      {mcpStatus === 'connected' ? 'Connected' : 'Connecting...'}
                    </span>
                  </div>
                  <div className="rounded-lg p-4 mb-4" style={{ background: '#0a0a0a', border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono" style={{ color: C.muted }}>Endpoint</span>
                      <button onClick={() => { navigator.clipboard?.writeText('https://mcp.adtech.com/v1/agent'); toast({ title: 'Copied to clipboard', variant: 'success' }); }} className="p-1 rounded hover:bg-white/5 transition-colors" title="Copy">
                        <Copy className="w-3 h-3" style={{ color: C.muted }} />
                      </button>
                    </div>
                    <code className="text-xs font-mono text-white">https://mcp.adtech.com/v1/agent</code>
                    <div className="flex items-center gap-6 mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                      <div>
                        <span className="text-xs block mb-0.5" style={{ color: C.muted }}>Latency</span>
                        <span className="text-sm text-white font-mono">42ms</span>
                      </div>
                      <div>
                        <span className="text-xs block mb-0.5" style={{ color: C.muted }}>Version</span>
                        <span className="text-sm text-white font-mono">v2.4.1</span>
                      </div>
                      <div>
                        <span className="text-xs block mb-0.5" style={{ color: C.muted }}>Uptime</span>
                        <span className="text-sm text-white font-mono">99.97%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toast({ title: 'MCP connection refreshed', variant: 'success' })} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90" style={{ background: `${C.accent}18`, color: C.accent }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh Connection
                    </button>
                    <button onClick={() => setMcpStatus(mcpStatus === 'connected' ? 'disconnected' : 'connected')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90" style={{ background: `${C.red}18`, color: C.red }}>
                      <X className="w-3.5 h-3.5" /> Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════ CREATE RULE MODAL ═══════════════════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="w-full max-w-lg rounded-xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Plus className="w-5 h-5" style={{ color: C.accent }} />
                  Create Automation Rule
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <X className="w-5 h-5" style={{ color: C.muted }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Rule Name</label>
                  <input value={newRule.name} onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Pause if CPA > $50" className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-colors focus:ring-1" style={{ background: '#0a0a0a', border: `1px solid ${C.border}` }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Platform</label>
                    <select value={newRule.platform} onChange={e => setNewRule(prev => ({ ...prev, platform: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none" style={{ background: '#0a0a0a', border: `1px solid ${C.border}` }}>
                      {['Meta', 'Google', 'TikTok', 'Snap', 'All'].map(p => <option key={p} value={p} style={{ background: C.card }}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Status</label>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: `${C.green}12`, border: `1px solid ${C.green}30` }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: C.green }} />
                      <span className="text-sm" style={{ color: C.green }}>Active on create</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Condition</label>
                  <input value={newRule.condition} onChange={e => setNewRule(prev => ({ ...prev, condition: e.target.value }))} placeholder="e.g. CPA > $50 for 3 consecutive days" className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none" style={{ background: '#0a0a0a', border: `1px solid ${C.border}` }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: C.muted }}>Action</label>
                  <input value={newRule.action} onChange={e => setNewRule(prev => ({ ...prev, action: e.target.value }))} placeholder="e.g. Pause campaign and notify team" className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none" style={{ background: '#0a0a0a', border: `1px solid ${C.border}` }} />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5" style={{ color: C.muted, border: `1px solid ${C.border}` }}>
                  Cancel
                </button>
                <button onClick={handleCreateRule} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:opacity-90" style={{ background: C.accent, color: '#000' }}>
                  Create Rule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
