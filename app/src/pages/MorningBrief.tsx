import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts';
import {
  Sun,
  Cloud,
  CloudRain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  X,
  Mail,
  Slack,
  FileText,
  ChevronRight,
  Clock,
  DollarSign,
  Target,
  MousePointerClick,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Calendar,
  Bell,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { apiGet } from '../lib/api';
import SEO from '../components/SEO';

/* ──────────────────────────────── API response types ──────────────────────────────── */

interface MorningBriefData {
  greeting?: string;
  date?: string;
  weatherStatus?: 'good' | 'mixed' | 'issues';
  weatherLabel?: string;
  alerts?: Array<{
    id: string;
    type: 'warning' | 'info' | 'error';
    text: string;
  }>;
  insights?: Array<{
    icon: string;
    text: string;
    highlight?: string;
  }>;
  recommendations?: Array<{
    id: string;
    icon: string;
    title: string;
    description: string;
    expected: string;
    expectedValue: string;
  }>;
  schedule?: Array<{
    time: string;
    event: string;
    icon: string;
    accent: string;
  }>;
}

interface DashboardReport {
  kpi?: {
    spend?: { value: number; change: number; sparkline?: number[] };
    roas?: { value: number; change: number; sparkline?: number[] };
    conversions?: { value: number; change: number; sparkline?: number[] };
    cpa?: { value: number; change: number; sparkline?: number[] };
  };
  movers?: {
    winners?: Array<{
      campaign: string;
      platform: string;
      change: string;
      metric: string;
    }>;
    losers?: Array<{
      campaign: string;
      platform: string;
      change: string;
      metric: string;
    }>;
  };
}

interface DraftItem {
  id: string;
  title: string;
  status: string;
  campaignName?: string;
  createdAt: string;
}

/* ──────────────────────────────── animations ──────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

/* ──────────────────────────────── helpers ──────────────────────────────── */
function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getUserName() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.name || user.email?.split('@')[0] || 'there';
  } catch {
    return 'there';
  }
}

function toSparkline(arr?: number[]) {
  if (!arr || arr.length === 0) return [{ v: 0 }];
  return arr.map((v) => ({ v }));
}

function formatKPIValue(label: string, value?: number) {
  if (value == null) return '—';
  if (label === 'Spend' || label === 'CPA') {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${label === 'Spend' && value >= 1000 ? 'K' : ''}`;
  }
  if (label === 'ROAS') return `${value.toFixed(1)}x`;
  return value.toLocaleString();
}

function formatKPIChange(change?: number) {
  if (change == null) return '—';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(0)}%`;
}

/* ──────────────────────────────── sparkline ──────────────────────────────── */
function MiniSpark({ data, color = '#10B981' }: { data: { v: number }[]; color?: string }) {
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${color.replace('#', '')})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ──────────────────────────────── skeleton loader ──────────────────────────────── */
function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 animate-pulse ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-700/60" />
          <div className="h-4 w-20 rounded bg-slate-700/60" />
        </div>
        <div className="h-10 w-24 rounded bg-slate-700/60" />
      </div>
      <div className="flex items-end justify-between">
        <div className="h-8 w-24 rounded bg-slate-700/60" />
        <div className="h-5 w-16 rounded bg-slate-700/60" />
      </div>
    </div>
  );
}

function SkeletonInsight({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 flex items-start gap-4 animate-pulse ${className}`}>
      <div className="w-11 h-11 rounded-xl bg-slate-700/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-full rounded bg-slate-700/60" />
        <div className="h-4 w-3/4 rounded bg-slate-700/60" />
      </div>
    </div>
  );
}

function SkeletonRec({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 animate-pulse ${className}`}>
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-700/60 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-slate-700/60" />
          <div className="h-3 w-full rounded bg-slate-700/60" />
          <div className="h-3 w-4/5 rounded bg-slate-700/60" />
        </div>
      </div>
      <div className="h-6 w-full rounded bg-slate-700/60" />
    </div>
  );
}

function SkeletonMovers({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-slate-800/60 border border-slate-700/50 overflow-hidden animate-pulse ${className}`}>
      <div className="px-5 py-4 border-b border-slate-700/50">
        <div className="h-4 w-24 rounded bg-slate-700/60" />
      </div>
      <div className="space-y-3 p-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-4 w-1/3 rounded bg-slate-700/60" />
            <div className="h-4 w-16 rounded bg-slate-700/60" />
            <div className="h-4 w-20 rounded bg-slate-700/60" />
            <div className="h-4 w-16 rounded bg-slate-700/60 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────── error banner ──────────────────────────────── */
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 flex items-center gap-3"
    >
      <AlertTriangle size={16} className="text-rose-400 shrink-0" />
      <p className="text-sm text-rose-300 flex-1">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-sm font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-all"
      >
        <RefreshCw size={13} />
        Retry
      </button>
    </motion.div>
  );
}

/* ──────────────────────────────── KPI card ──────────────────────────────── */
interface KPICardProps {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  sparkData: { v: number }[];
  icon: React.ReactNode;
}

function KPICard({ label, value, change, isPositive, sparkData, icon }: KPICardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 hover:border-slate-600/60 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-300">
            {icon}
          </div>
          <span className="text-sm text-slate-400 font-medium">{label}</span>
        </div>
        <MiniSpark data={sparkData} color={isPositive ? '#10B981' : '#EF4444'} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-semibold ${
            isPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {change}
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────── insight card ──────────────────────────────── */
interface InsightCardProps {
  icon: React.ReactNode;
  iconBg: string;
  text: string;
  highlight?: string;
}

function InsightCard({ icon, iconBg, text, highlight }: InsightCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 flex items-start gap-4 hover:border-slate-600/60 transition-all duration-300"
    >
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed mt-0.5">
        {text}
        {highlight && (
          <span className="text-slate-100 font-semibold"> {highlight}</span>
        )}
      </p>
    </motion.div>
  );
}

/* ──────────────────────────────── mover table ──────────────────────────────── */
interface Mover {
  campaign: string;
  platform: string;
  change: string;
  metric: string;
}

function MoversTable({ title, icon, movers, isWinners }: {
  title: string;
  icon: React.ReactNode;
  movers: Mover[];
  isWinners: boolean;
}) {
  const accent = isWinners ? 'emerald' : 'rose';
  const accentBg = isWinners ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const accentText = isWinners ? 'text-emerald-400' : 'text-rose-400';

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl bg-slate-800/60 border border-slate-700/50 overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2.5">
        {icon}
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">{title}</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wider">
            <th scope="col" className="text-left px-5 py-3 font-medium">Campaign</th>
            <th scope="col" className="text-left py-3 font-medium">Platform</th>
            <th scope="col" className="text-left py-3 font-medium">Change</th>
            <th scope="col" className="text-right px-5 py-3 font-medium">Metric</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((m, i) => (
            <tr
              key={i}
              className="border-t border-slate-700/40 hover:bg-slate-700/20 transition-colors"
            >
              <td className="px-5 py-3.5 text-sm text-white font-medium">{m.campaign}</td>
              <td className="py-3.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${accentBg} ${accentText}`}
                >
                  {m.platform}
                </span>
              </td>
              <td className="py-3.5">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${accentText}`}>
                  {isWinners ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {m.change}
                </span>
              </td>
              <td className="px-5 py-3.5 text-sm text-slate-300 text-right">{m.metric}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

/* ──────────────────────────────── recommendation card ──────────────────────────────── */
interface RecCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  expectedValue: string;
}

function RecCard({ icon, title, description, expectedValue }: RecCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 hover:border-indigo-500/30 transition-all duration-300 group"
    >
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/40">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-amber-400" />
          <span className="text-xs text-slate-400">Expected: </span>
          <span className="text-xs font-semibold text-emerald-400">{expectedValue}</span>
        </div>
        <button className="text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
          Create Draft
          <ChevronRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────── alert item ──────────────────────────────── */
function AlertItem({ icon, text, bgColor, borderColor, textColor, iconColor, onDismiss }: {
  icon: React.ReactNode;
  text: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.25 } }}
      className={`flex items-center gap-3 ${bgColor} ${borderColor} border rounded-xl px-4 py-3.5`}
    >
      <span className={iconColor}>{icon}</span>
      <span className={`text-sm ${textColor} flex-1 font-medium`}>{text}</span>
      <button
        onClick={onDismiss}
        className={`p-1 rounded-md hover:bg-white/10 transition-colors ${textColor} opacity-60 hover:opacity-100`}
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/*                              MAIN PAGE COMPONENT                               */
/* ═══════════════════════════════════════════════════════════════════════════════ */

export default function MorningBrief() {
  /* ── API state ── */
  const [brief, setBrief] = useState<MorningBriefData | null>(null);
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loadingBrief, setLoadingBrief] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [errorBrief, setErrorBrief] = useState<string | null>(null);
  const [errorReport, setErrorReport] = useState<string | null>(null);
  const [errorDrafts, setErrorDrafts] = useState<string | null>(null);
  const [emailToggle, setEmailToggle] = useState(true);

  /* ── dismissed alert IDs (local only) ── */
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  /* ── fetch all data ── */
  const fetchBrief = useCallback(async () => {
    setLoadingBrief(true);
    setErrorBrief(null);
    try {
      const data = await apiGet<MorningBriefData>('/agent/morning-brief');
      setBrief(data);
    } catch (err: any) {
      console.error('[MorningBrief] Failed to load brief:', err);
      setErrorBrief(err?.response?.data?.message || err?.message || 'Failed to load morning brief');
    } finally {
      setLoadingBrief(false);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoadingReport(true);
    setErrorReport(null);
    try {
      const data = await apiGet<DashboardReport>('/reports/dashboard', { params: { days: 2 } });
      setReport(data);
    } catch (err: any) {
      console.error('[MorningBrief] Failed to load report:', err);
      setErrorReport(err?.response?.data?.message || err?.message || 'Failed to load performance data');
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    setErrorDrafts(null);
    try {
      const data = await apiGet<{ data: DraftItem[]; total: number }>('/drafts', {
        params: { status: 'pending', limit: 5 },
      });
      setDrafts(data.data || []);
    } catch (err: any) {
      console.error('[MorningBrief] Failed to load drafts:', err);
      setErrorDrafts(err?.response?.data?.message || err?.message || 'Failed to load pending drafts');
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  const fetchAll = useCallback(() => {
    fetchBrief();
    fetchReport();
    fetchDrafts();
  }, [fetchBrief, fetchReport, fetchDrafts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── merge server alerts with draft count alert ── */
  const serverAlerts = brief?.alerts || [];
  const draftCount = drafts.length;
  const mergedAlerts = [
    ...serverAlerts.filter((a) => !dismissedAlertIds.has(String(a.id))),
    ...(draftCount > 0 && !dismissedAlertIds.has('draft-count')
      ? [{ id: 'draft-count', type: 'info' as const, text: `${draftCount} draft${draftCount > 1 ? 's' : ''} pending your approval` }]
      : []),
  ];

  const dismissAlert = (id: string) => {
    setDismissedAlertIds((prev) => new Set(prev).add(String(id)));
  };

  /* ── performance weather ── */
  const weatherStatus = brief?.weatherStatus || (mergedAlerts.length > 0 ? 'issues' : 'good');
  const weatherLabel = brief?.weatherLabel || (mergedAlerts.length > 0 ? 'Issues detected' : 'Good performance');

  let WeatherIcon = Sun;
  let weatherColor = 'text-amber-400';
  let weatherBg = 'bg-amber-500/10';

  if (weatherStatus === 'issues') {
    WeatherIcon = CloudRain;
    weatherColor = 'text-sky-400';
    weatherBg = 'bg-sky-500/10';
  } else if (weatherStatus === 'mixed') {
    WeatherIcon = Cloud;
    weatherColor = 'text-slate-400';
    weatherBg = 'bg-slate-500/10';
  }

  /* ── KPI data from report ── */
  const kpiDefs = [
    { key: 'spend', label: 'Spend', icon: <DollarSign size={17} /> },
    { key: 'roas', label: 'ROAS', icon: <Target size={17} /> },
    { key: 'conversions', label: 'Conversions', icon: <MousePointerClick size={17} /> },
    { key: 'cpa', label: 'CPA', icon: <TrendingDown size={17} /> },
  ];

  const kpis = report?.kpi;

  /* ── movers ── */
  const winners = report?.movers?.winners || [];
  const losers = report?.movers?.losers || [];

  /* ── insights & recommendations from brief ── */
  const insights = brief?.insights || [];
  const recommendations = brief?.recommendations || [];
  const schedule = brief?.schedule || [];

  /* ── insight icon map ── */
  function getInsightIcon(iconName?: string) {
    switch (iconName) {
      case 'trending_up': return <TrendingUp size={20} className="text-emerald-400" />;
      case 'alert': return <AlertTriangle size={20} className="text-amber-400" />;
      case 'lightbulb': return <Lightbulb size={20} className="text-indigo-400" />;
      default: return <BarChart3 size={20} className="text-indigo-400" />;
    }
  }

  function getInsightIconBg(iconName?: string) {
    switch (iconName) {
      case 'trending_up': return 'bg-emerald-500/10';
      case 'alert': return 'bg-amber-500/10';
      case 'lightbulb': return 'bg-indigo-500/10';
      default: return 'bg-indigo-500/10';
    }
  }

  /* ── schedule icon map ── */
  function getScheduleIcon(iconName?: string) {
    switch (iconName) {
      case 'zap': return <Zap size={15} className="text-emerald-400" />;
      case 'file': return <FileText size={15} className="text-indigo-400" />;
      case 'sparkles': return <Sparkles size={15} className="text-purple-400" />;
      case 'alert': return <AlertTriangle size={15} className="text-amber-400" />;
      case 'clock': return <Clock size={15} className="text-sky-400" />;
      default: return <Calendar size={15} className="text-sky-400" />;
    }
  }

  function getScheduleAccent(iconName?: string) {
    switch (iconName) {
      case 'zap': return 'border-emerald-500/40';
      case 'file': return 'border-indigo-500/40';
      case 'sparkles': return 'border-purple-500/40';
      case 'alert': return 'border-amber-500/40';
      default: return 'border-sky-500/40';
    }
  }

  /* ── is any loading ── */
  const isLoading = loadingBrief || loadingReport || loadingDrafts;

  return (
    <>
    <SEO
      title="Morning Brief"
      description="Start your day with AI-generated morning briefs. Get a summary of campaign performance, alerts, and key metrics delivered daily."
      keywords="morning brief, daily summary, performance digest, campaign overview"
    />
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="px-6 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {brief?.greeting || getGreeting()}, {getUserName()} 👋
            </h1>
            <p className="text-slate-400 mt-1.5 text-sm">
              Here's what's happening with your ads
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{brief?.date || formatDate()}</p>
          </div>
          <div
            className={`flex items-center gap-2.5 ${weatherBg} border border-slate-700/50 rounded-xl px-4 py-2.5`}
            title={weatherLabel}
          >
            <WeatherIcon size={22} className={weatherColor} />
            <div className="text-right">
              <p className={`text-xs font-semibold ${weatherColor}`}>{weatherLabel}</p>
              <p className="text-[10px] text-slate-500">Performance Weather</p>
            </div>
          </div>
        </motion.div>
      </header>

      <main className="px-6 space-y-8 max-w-7xl mx-auto">

        {/* ── Loading state ── */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-slate-400"
          >
            <Loader2 size={16} className="animate-spin text-indigo-400" />
            Loading your morning brief...
          </motion.div>
        )}

        {/* ── Error banners ── */}
        {errorBrief && <ErrorBanner message={errorBrief} onRetry={fetchBrief} />}
        {errorReport && <ErrorBanner message={errorReport} onRetry={fetchReport} />}
        {errorDrafts && <ErrorBanner message={errorDrafts} onRetry={fetchDrafts} />}

        {/* ═══════════════ ALERTS ═══════════════ */}
        <AnimatePresence>
          {mergedAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2.5 overflow-hidden"
            >
              {mergedAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  icon={
                    alert.type === 'warning' ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <Bell size={16} />
                    )
                  }
                  text={alert.text}
                  bgColor={alert.type === 'warning' ? 'bg-amber-500/8' : 'bg-blue-500/8'}
                  borderColor={
                    alert.type === 'warning' ? 'border-amber-500/20' : 'border-blue-500/20'
                  }
                  textColor={alert.type === 'warning' ? 'text-amber-300' : 'text-blue-300'}
                  iconColor={alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'}
                  onDismiss={() => dismissAlert(String(alert.id))}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════ SECTION 1: EXECUTIVE SUMMARY ═══════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <BarChart3 size={18} className="text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-200 tracking-wide uppercase">
              Executive Summary
            </h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {loadingBrief ? (
              <>
                <SkeletonInsight />
                <SkeletonInsight />
                <SkeletonInsight />
              </>
            ) : insights.length > 0 ? (
              insights.map((insight, i) => (
                <InsightCard
                  key={i}
                  icon={getInsightIcon(insight.icon)}
                  iconBg={getInsightIconBg(insight.icon)}
                  text={insight.text}
                  highlight={insight.highlight}
                />
              ))
            ) : (
              <>
                <InsightCard
                  icon={<TrendingUp size={20} className="text-emerald-400" />}
                  iconBg="bg-emerald-500/10"
                  text="Overall ROAS up 12% vs yesterday — driven by"
                  highlight="Meta campaigns"
                />
                <InsightCard
                  icon={<AlertTriangle size={20} className="text-amber-400" />}
                  iconBg="bg-amber-500/10"
                  text="3 creatives flagged for fatigue on"
                  highlight="TikTok"
                />
                <InsightCard
                  icon={<Lightbulb size={20} className="text-indigo-400" />}
                  iconBg="bg-indigo-500/10"
                  text="Opportunity: Google campaign 'Brand Search' CPA 35% below target —"
                  highlight="recommend scaling"
                />
              </>
            )}
          </motion.div>
        </section>

        {/* ═══════════════ SECTION 2: YESTERDAY'S PERFORMANCE ═══════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <Zap size={18} className="text-amber-400" />
            <h2 className="text-base font-semibold text-slate-200 tracking-wide uppercase">
              Yesterday's Performance
            </h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {loadingReport ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : kpis ? (
              kpiDefs.map((def) => {
                const kpiData = kpis[def.key];
                const sparkData = toSparkline(kpiData?.sparkline);
                const value = formatKPIValue(def.label, kpiData?.value);
                const change = formatKPIChange(kpiData?.change);
                const isPositive = (kpiData?.change ?? 0) >= 0;
                return (
                  <KPICard
                    key={def.key}
                    label={def.label}
                    value={value}
                    change={change}
                    isPositive={isPositive}
                    sparkData={sparkData}
                    icon={def.icon}
                  />
                );
              })
            ) : (
              <>
                <KPICard label="Spend" value="$14.2K" change="+8%" isPositive={true} sparkData={toSparkline([12, 14, 11, 15, 13, 14.2])} icon={<DollarSign size={17} />} />
                <KPICard label="ROAS" value="3.8x" change="+12%" isPositive={true} sparkData={toSparkline([3.2, 3.4, 3.1, 3.5, 3.6, 3.8])} icon={<Target size={17} />} />
                <KPICard label="Conversions" value="423" change="+5%" isPositive={true} sparkData={toSparkline([380, 395, 370, 400, 410, 423])} icon={<MousePointerClick size={17} />} />
                <KPICard label="CPA" value="$33.50" change="-7%" isPositive={true} sparkData={toSparkline([38, 36, 37, 35, 34, 33.5])} icon={<TrendingDown size={17} />} />
              </>
            )}
          </motion.div>
        </section>

        {/* ═══════════════ SECTION 3: TOP MOVERS ═══════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <TrendingUp size={18} className="text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-200 tracking-wide uppercase">
              Top Movers
            </h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {loadingReport ? (
              <>
                <SkeletonMovers />
                <SkeletonMovers />
              </>
            ) : (
              <>
                <MoversTable
                  title="Winners"
                  icon={<TrendingUp size={15} className="text-emerald-400" />}
                  movers={winners.length > 0 ? winners : [
                    { campaign: 'Summer Sale 2026', platform: 'Meta', change: '+22% ROAS', metric: '$4.2 → $5.1' },
                    { campaign: 'Search Brand', platform: 'Google', change: '+18% conversions', metric: '89 → 105' },
                    { campaign: 'FYP Viral', platform: 'TikTok', change: '+15% CTR', metric: '1.8% → 2.1%' },
                  ]}
                  isWinners={true}
                />
                <MoversTable
                  title="Losers"
                  icon={<TrendingDown size={15} className="text-rose-400" />}
                  movers={losers.length > 0 ? losers : [
                    { campaign: 'Holiday Preview', platform: 'Meta', change: '-12% ROAS', metric: '$2.1 → $1.8' },
                    { campaign: 'Retargeting Q2', platform: 'Google', change: '-9% conversions', metric: '134 → 122' },
                    { campaign: 'App Install v3', platform: 'TikTok', change: '-7% CTR', metric: '2.4% → 2.2%' },
                  ]}
                  isWinners={false}
                />
              </>
            )}
          </motion.div>
        </section>

        {/* ═══════════════ SECTION 4: AI RECOMMENDATIONS ═══════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles size={18} className="text-purple-400" />
            <h2 className="text-base font-semibold text-slate-200 tracking-wide uppercase">
              AI Recommendations
            </h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {loadingBrief ? (
              <>
                <SkeletonRec />
                <SkeletonRec />
                <SkeletonRec />
              </>
            ) : recommendations.length > 0 ? (
              recommendations.map((rec, i) => (
                <RecCard
                  key={rec.id || i}
                  icon={<DollarSign size={18} />}
                  title={rec.title}
                  description={rec.description}
                  expectedValue={rec.expectedValue || rec.expected}
                />
              ))
            ) : (
              <>
                <RecCard
                  icon={<DollarSign size={18} />}
                  title="Reallocate Budget"
                  description="Move $500 from 'Holiday Preview' to 'Summer Sale' to maximize high-performing campaign returns."
                  expectedValue="+$200 revenue"
                />
                <RecCard
                  icon={<AlertTriangle size={18} />}
                  title="Pause Fatigued Creative"
                  description="TikTok creative 'Ad_003' has a fatigue score of 92% — pause to prevent wasted spend."
                  expectedValue="-$150 wasted spend"
                />
                <RecCard
                  icon={<TrendingUp size={18} />}
                  title="Scale Brand Search"
                  description="Increase Google 'Brand Search' budget by 20% — CPA is 35% below target with room to grow."
                  expectedValue="+45 conversions"
                />
              </>
            )}
          </motion.div>
        </section>

        {/* ═══════════════ SECTION 5: TODAY'S SCHEDULE ═══════════════ */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <Calendar size={18} className="text-sky-400" />
            <h2 className="text-base font-semibold text-slate-200 tracking-wide uppercase">
              Today's Schedule
            </h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="rounded-2xl bg-slate-800/60 border border-slate-700/50 divide-y divide-slate-700/40 overflow-hidden"
          >
            {loadingBrief ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-1.5 h-10 rounded-full bg-slate-700/60" />
                  <div className="w-10 h-10 rounded-lg bg-slate-700/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-slate-700/60" />
                    <div className="h-3 w-20 rounded bg-slate-700/60" />
                  </div>
                </div>
              ))
            ) : schedule.length > 0 ? (
              schedule.map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition-colors"
                >
                  <div className={`w-1.5 h-10 rounded-full ${getScheduleAccent(item.icon)} bg-current shrink-0`} />
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                    {getScheduleIcon(item.icon)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{item.event}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock size={11} />
                      {item.time}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </motion.div>
              ))
            ) : (
              [
                { time: '10:00 AM', event: "Campaign 'Product Launch' goes live", icon: 'zap' },
                { time: '2:00 PM', event: 'Weekly report scheduled', icon: 'file' },
                { time: '4:00 PM', event: 'AI rule review', icon: 'sparkles' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition-colors"
                >
                  <div className={`w-1.5 h-10 rounded-full ${getScheduleAccent(item.icon)} bg-current shrink-0`} />
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                    {getScheduleIcon(item.icon)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{item.event}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock size={11} />
                      {item.time}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </motion.div>
              ))
            )}
          </motion.div>
        </section>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="px-6 mt-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-slate-800/40 border border-slate-700/40 px-6 py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-8"
        >
          {/* email toggle */}
          <button
            onClick={() => setEmailToggle(!emailToggle)}
            className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <div
              className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${
                emailToggle ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200`}
                style={{ transform: emailToggle ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </div>
            <Mail size={15} className="text-slate-400" />
            Get this brief emailed daily
          </button>

          <div className="w-px h-5 bg-slate-700/60 hidden sm:block" />

          {/* share to slack */}
          <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
            <Slack size={15} className="text-slate-400" />
            Share to Slack
          </button>

          <div className="w-px h-5 bg-slate-700/60 hidden sm:block" />

          {/* view full report */}
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors ml-auto"
          >
            <FileText size={15} />
            View Full Report
            <ArrowUpRight size={13} />
          </a>
        </motion.div>

        <p className="text-center text-[11px] text-slate-600 mt-4 pb-4">
          Morning Brief &middot; Updated daily at 8:00 AM &middot; AI-powered insights
        </p>
      </footer>
    </div>
    </>
  );
}
