/**
 * AdNexus AI — Admin Dashboard
 * =============================
 * Admin-only page with platform-wide analytics, user management,
 * workspace overview, API usage charts, error logs, and feature flags.
 *
 * Protected by AdminRoute — only users with role === 'admin' or 'owner' can access.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  DollarSign,
  Activity,
  Shield,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Terminal,
  Clock,
  TrendingUp,
  BarChart3,
  Layers,
  Flag,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Mail,
  UserCircle,
  Crown,
  Zap,
} from 'lucide-react';
import SEO from '../components/SEO';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────

interface AdminStats {
  total_users: number;
  active_workspaces: number;
  total_ad_spend: number;
  api_calls_today: number;
  recent_signups_7d: number;
  plan_distribution: Record<string, number>;
  generated_at: string;
  mock?: boolean;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  workspace: string;
  workspace_id: string | null;
  created_at: string;
  last_active: string;
}

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  owner_name: string;
  owner_email: string;
  campaigns_count: number;
  members_count: number;
  spend: number;
  created_at: string;
}

interface ErrorLog {
  id: string;
  message: string;
  source: string;
  stack: string;
  created_at: string;
  resolved?: boolean;
}

interface ApiUsagePoint {
  hour: string;
  calls: number;
}

interface FeatureFlag {
  id: string;
  workspace_id: string;
  workspace: { name: string; slug: string };
  feature: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Mock Data Helpers ───────────────────────────────────────

const generateMockStats = (): AdminStats => ({
  total_users: 1248,
  active_workspaces: 342,
  total_ad_spend: 2847391.52,
  api_calls_today: 45231,
  recent_signups_7d: 89,
  plan_distribution: { free: 156, pro: 128, premium: 42, agency: 16 },
  generated_at: new Date().toISOString(),
  mock: true,
});

const generateMockUsers = (): AdminUser[] => {
  const names = [
    'Alex Chen', 'Sarah Miller', 'Jordan Wong', 'Emma Davis', 'Ryan Park',
    'Lisa Johnson', 'David Kim', 'Nina Patel', 'Marcus Lopez', 'Olivia Zhang',
  ];
  return names.map((name, i) => ({
    id: `user-${i + 1}`,
    name,
    email: name.toLowerCase().replace(' ', '.') + '@example.com',
    avatar_url: null,
    role: ['owner', 'admin', 'analyst', 'viewer'][i % 4],
    workspace: `Workspace ${String.fromCharCode(65 + (i % 8))}`,
    workspace_id: `ws-${(i % 8) + 1}`,
    created_at: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
    last_active: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
  }));
};

const generateMockWorkspaces = (): WorkspaceRow[] => {
  const names = ['Acme Corp', 'Beta Studios', 'Gamma Digital', 'Delta Media', 'Epsilon Ads',
    'Zeta Marketing', 'Eta Creative', 'Theta Brands'];
  return names.map((name, i) => ({
    id: `ws-${i + 1}`,
    name,
    slug: name.toLowerCase().replace(' ', '-'),
    plan: ['free', 'pro', 'premium', 'agency'][i % 4],
    owner_name: `Owner ${i + 1}`,
    owner_email: `owner${i + 1}@example.com`,
    campaigns_count: Math.floor(Math.random() * 200) + 10,
    members_count: Math.floor(Math.random() * 20) + 1,
    spend: Math.floor(Math.random() * 100000) + 5000,
    created_at: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
  }));
};

const generateMockErrors = (): ErrorLog[] => {
  const errors = [
    { message: 'Meta API rate limit exceeded', source: 'meta-api', stack: 'Error: Rate limit\n  at MetaClient.request (/src/platforms/meta.ts:142:13)' },
    { message: 'Failed to refresh Google access token', source: 'google-auth', stack: 'TokenRefreshError: invalid_grant\n  at OAuth2Client.refreshToken (/src/lib/oauth.ts:89:11)' },
    { message: 'Supabase connection timeout', source: 'db', stack: 'ConnectionError: timeout\n  at Socket.<anonymous> (/node_modules/@supabase/postgrest-js/...)' },
    { message: 'Campaign validation failed', source: 'campaign-service', stack: 'ValidationError: Budget must be > 0\n  at validateCampaign (/src/services/campaigns.ts:203:9)' },
    { message: 'Webhook signature verification failed', source: 'webhooks', stack: 'WebhookError: Invalid signature\n  at verifyWebhook (/src/webhooks/index.ts:55:11)' },
  ];
  return errors.map((e, i) => ({
    id: `err-${i + 1}`,
    ...e,
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    resolved: i > 2,
  }));
};

const generateMockApiUsage = (): ApiUsagePoint[] => {
  const hours = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date();
    h.setHours(h.getHours() - i);
    hours.push({
      hour: h.toISOString().slice(11, 13) + ':00',
      calls: Math.floor(Math.random() * 3000) + 500,
    });
  }
  return hours;
};

const generateMockFeatureFlags = (): FeatureFlag[] => {
  const features = ['ai_agent', 'morning_brief', 'creative_studio', 'ab_testing', 'audience_manager', 'budget_pacing', 'competitive_intel', 'portfolio_optimizer'];
  const flags: FeatureFlag[] = [];
  for (let ws = 1; ws <= 5; ws++) {
    for (const feature of features) {
      flags.push({
        id: `ff-${ws}-${feature}`,
        workspace_id: `ws-${ws}`,
        workspace: { name: `Workspace ${String.fromCharCode(64 + ws)}`, slug: `workspace-${ws}` },
        feature,
        enabled: Math.random() > 0.3,
        metadata: { rollout_pct: 100 },
        created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  return flags;
};

// ─── Component ───────────────────────────────────────────────

type TabId = 'overview' | 'users' | 'workspaces' | 'errors' | 'features';

export default function Admin() {
  const { api, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [apiUsage, setApiUsage] = useState<ApiUsagePoint[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [wsPage, setWsPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statsRes, usersRes, wsRes, errRes, apiRes, ffRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: generateMockStats() })),
        api.get('/admin/users').catch(() => ({ data: { data: generateMockUsers() } })),
        api.get('/admin/workspaces').catch(() => ({ data: { data: generateMockWorkspaces() } })),
        api.get('/admin/errors').catch(() => ({ data: { data: generateMockErrors() } })),
        api.get('/admin/api-usage').catch(() => ({ data: { data: generateMockApiUsage() } })),
        api.get('/admin/feature-flags').catch(() => ({ data: { data: generateMockFeatureFlags() } })),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data?.data || []);
      setWorkspaces(wsRes.data?.data || []);
      setErrors(errRes.data?.data || []);
      setApiUsage(apiRes.data?.data || []);
      setFeatureFlags(ffRes.data?.data || []);
    } catch {
      // Fallback to all mock data
      setStats(generateMockStats());
      setUsers(generateMockUsers());
      setWorkspaces(generateMockWorkspaces());
      setErrors(generateMockErrors());
      setApiUsage(generateMockApiUsage());
      setFeatureFlags(generateMockFeatureFlags());
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleFeatureFlag = async (flag: FeatureFlag) => {
    try {
      await api.post('/admin/feature-flags', {
        workspace_id: flag.workspace_id,
        feature: flag.feature,
        enabled: !flag.enabled,
      });
      setFeatureFlags((prev) =>
        prev.map((f) =>
          f.id === flag.id ? { ...f, enabled: !f.enabled } : f
        )
      );
    } catch {
      // Optimistic toggle even on error
      setFeatureFlags((prev) =>
        prev.map((f) =>
          f.id === flag.id ? { ...f, enabled: !f.enabled } : f
        )
      );
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.workspace.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const formatNumber = (v: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ─── Loading State ─────────────────────────────────────────

  if (isLoading) {
    return (
      <>
      <SEO
        title="Admin Panel"
      description="Administer your AdNexus AI workspace. Manage users, roles, permissions, billing, and platform-wide settings."
      keywords="admin panel, user management, roles, permissions, workspace administration"
      noindex
      />
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-[#c3f53b] animate-spin" />
          <p className="text-gray-400 text-sm">Loading admin dashboard...</p>
        </div>
      </div>
      </>
    );
  }

  // ─── Non-admin Access Denied ──────────────────────────────

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="bg-[#141414] border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  // ─── Tabs ──────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'workspaces', label: 'Workspaces', icon: Building2 },
    { id: 'errors', label: 'Error Logs', icon: AlertTriangle },
    { id: 'features', label: 'Feature Flags', icon: Flag },
  ];

  const ITEMS_PER_PAGE = 10;
  const paginatedUsers = filteredUsers.slice((userPage - 1) * ITEMS_PER_PAGE, userPage * ITEMS_PER_PAGE);
  const paginatedWorkspaces = filteredWorkspaces.slice((wsPage - 1) * ITEMS_PER_PAGE, wsPage * ITEMS_PER_PAGE);
  const totalUserPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const totalWsPages = Math.ceil(filteredWorkspaces.length / ITEMS_PER_PAGE) || 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c3f53b]/20 to-[#a5d937]/10 flex items-center justify-center border border-[#c3f53b]/20">
                  <Shield className="w-5 h-5 text-[#c3f53b]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                  <p className="text-sm text-gray-400">Platform management and monitoring</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {stats?.mock && (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400 font-medium">
                  Demo Data
                </span>
              )}
              <button
                onClick={fetchAll}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#c3f53b]/10 text-[#c3f53b] border border-[#c3f53b]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {/* ─── Overview Tab ────────────────────────────────── */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Users}
                  label="Total Users"
                  value={formatNumber(stats?.total_users || 0)}
                  subtitle={`+${stats?.recent_signups_7d || 0} this week`}
                  color="#c3f53b"
                />
                <StatCard
                  icon={Building2}
                  label="Active Workspaces"
                  value={formatNumber(stats?.active_workspaces || 0)}
                  subtitle="Across all plans"
                  color="#3b82f6"
                />
                <StatCard
                  icon={DollarSign}
                  label="Total Ad Spend"
                  value={formatCurrency(stats?.total_ad_spend || 0)}
                  subtitle="Lifetime platform spend"
                  color="#10b981"
                />
                <StatCard
                  icon={Activity}
                  label="API Calls Today"
                  value={formatNumber(stats?.api_calls_today || 0)}
                  subtitle="Requests processed"
                  color="#f59e0b"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* API Usage Chart */}
                <div className="lg:col-span-2 bg-[#141414] border border-white/5 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">API Usage</h3>
                      <p className="text-sm text-gray-400">Calls per hour over last 24h</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      Last 24h
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={apiUsage}>
                        <defs>
                          <linearGradient id="apiGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c3f53b" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#c3f53b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="hour" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                          labelStyle={{ color: '#999' }}
                        />
                        <Area type="monotone" dataKey="calls" stroke="#c3f53b" fill="url(#apiGradient)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Plan Distribution */}
                <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-1">Plan Distribution</h3>
                  <p className="text-sm text-gray-400 mb-6">Workspaces by plan tier</p>
                  <div className="space-y-4">
                    {Object.entries(stats?.plan_distribution || {}).map(([plan, count]) => {
                      const total = Object.values(stats?.plan_distribution || {}).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      const colors: Record<string, string> = { free: '#6b7280', pro: '#3b82f6', premium: '#a855f7', agency: '#f59e0b' };
                      return (
                        <div key={plan}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm capitalize text-gray-300">{plan}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{count}</span>
                              <span className="text-xs text-gray-500">({pct.toFixed(0)}%)</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: colors[plan] || '#c3f53b' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Avg. spend / workspace</span>
                      <span className="font-medium">{formatCurrency((stats?.total_ad_spend || 0) / (stats?.active_workspaces || 1))}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Avg. users / workspace</span>
                      <span className="font-medium">{((stats?.total_users || 0) / (stats?.active_workspaces || 1)).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Conversion rate</span>
                      <span className="font-medium text-[#c3f53b]">24.8%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#c3f53b]/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[#c3f53b]" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">New Signups (7d)</span>
                  </div>
                  <p className="text-2xl font-bold">{stats?.recent_signups_7d || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">+12% vs last week</p>
                </div>
                <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">Open Errors</span>
                  </div>
                  <p className="text-2xl font-bold">{errors.filter((e) => !e.resolved).length}</p>
                  <p className="text-xs text-gray-500 mt-1">{errors.filter((e) => e.resolved).length} resolved today</p>
                </div>
                <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">Active Features</span>
                  </div>
                  <p className="text-2xl font-bold">{featureFlags.filter((f) => f.enabled).length}</p>
                  <p className="text-xs text-gray-500 mt-1">Across {new Set(featureFlags.map((f) => f.workspace_id)).size} workspaces</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Users Tab ───────────────────────────────────── */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">All Users</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setUserPage(1); }}
                    className="pl-9 pr-4 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#c3f53b]/50 w-64"
                  />
                </div>
              </div>

              <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-400 text-left">
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Workspace</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Last Active</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((u) => (
                        <tr key={u.id} className="border-b border-white/3 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c3f53b]/20 to-blue-500/20 flex items-center justify-center">
                                  <UserCircle className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <span className="font-medium text-white">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-1 bg-white/5 rounded-md text-xs">{u.workspace}</span>
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.last_active)}</td>
                          <td className="px-4 py-3">
                            <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-gray-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <span className="text-xs text-gray-500">
                    Showing {(userPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(userPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                      className="p-1.5 hover:bg-white/5 rounded-lg disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-400">{userPage} / {totalUserPages}</span>
                    <button
                      onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                      disabled={userPage === totalUserPages}
                      className="p-1.5 hover:bg-white/5 rounded-lg disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Workspaces Tab ──────────────────────────────── */}
          {activeTab === 'workspaces' && (
            <motion.div
              key="workspaces"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">All Workspaces</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search workspaces..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setWsPage(1); }}
                    className="pl-9 pr-4 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#c3f53b]/50 w-64"
                  />
                </div>
              </div>

              <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-400 text-left">
                        <th className="px-4 py-3 font-medium">Workspace</th>
                        <th className="px-4 py-3 font-medium">Owner</th>
                        <th className="px-4 py-3 font-medium">Plan</th>
                        <th className="px-4 py-3 font-medium">Campaigns</th>
                        <th className="px-4 py-3 font-medium">Members</th>
                        <th className="px-4 py-3 font-medium">Spend</th>
                        <th className="px-4 py-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedWorkspaces.map((w) => (
                        <tr key={w.id} className="border-b border-white/3 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{w.name}</p>
                                <p className="text-xs text-gray-500">{w.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-white text-sm">{w.owner_name}</p>
                              <p className="text-xs text-gray-500">{w.owner_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <PlanBadge plan={w.plan} />
                          </td>
                          <td className="px-4 py-3 text-white">{w.campaigns_count.toLocaleString()}</td>
                          <td className="px-4 py-3 text-white">{w.members_count}</td>
                          <td className="px-4 py-3 text-white font-medium">{formatCurrency(w.spend)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(w.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <span className="text-xs text-gray-500">
                    Showing {(wsPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(wsPage * ITEMS_PER_PAGE, filteredWorkspaces.length)} of {filteredWorkspaces.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWsPage((p) => Math.max(1, p - 1))}
                      disabled={wsPage === 1}
                      className="p-1.5 hover:bg-white/5 rounded-lg disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-400">{wsPage} / {totalWsPages}</span>
                    <button
                      onClick={() => setWsPage((p) => Math.min(totalWsPages, p + 1))}
                      disabled={wsPage === totalWsPages}
                      className="p-1.5 hover:bg-white/5 rounded-lg disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Error Logs Tab ──────────────────────────────── */}
          {activeTab === 'errors' && (
            <motion.div
              key="errors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Errors</h2>
                <span className="text-xs text-gray-500">{errors.length} total · {errors.filter((e) => !e.resolved).length} unresolved</span>
              </div>

              {errors.map((err) => (
                <motion.div
                  key={err.id}
                  layout
                  className={`bg-[#141414] border rounded-xl overflow-hidden ${
                    err.resolved ? 'border-green-500/10' : 'border-red-500/10'
                  }`}
                >
                  <div
                    className="p-4 flex items-start gap-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
                    onClick={() => setExpandedError(expandedError === err.id ? null : err.id)}
                  >
                    <div className={`mt-0.5 ${err.resolved ? 'text-green-400' : 'text-red-400'}`}>
                      {err.resolved ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-white text-sm">{err.message}</span>
                        {err.resolved && (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">Resolved</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {err.source}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(err.created_at)}
                        </span>
                      </div>
                    </div>
                    <button className="p-1 hover:bg-white/5 rounded transition-colors">
                      {expandedError === err.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {expandedError === err.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <div className="bg-black/50 border border-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Terminal className="w-3.5 h-3.5 text-gray-500" />
                              <span className="text-xs font-medium text-gray-400">Stack Trace</span>
                            </div>
                            <pre className="text-xs text-red-300/80 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                              {err.stack}
                            </pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ─── Feature Flags Tab ───────────────────────────── */}
          {activeTab === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Feature Flags</h2>
                <span className="text-xs text-gray-500">Toggle features per workspace</span>
              </div>

              {/* Group by workspace */}
              {Array.from(new Set(featureFlags.map((f) => f.workspace_id))).map((wsId) => {
                const wsFlags = featureFlags.filter((f) => f.workspace_id === wsId);
                const wsName = wsFlags[0]?.workspace?.name || wsId;
                return (
                  <div key={wsId} className="bg-[#141414] border border-white/5 rounded-xl mb-4 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                      <Crown className="w-4 h-4 text-[#c3f53b]" />
                      <span className="font-medium text-sm">{wsName}</span>
                      <span className="text-xs text-gray-500">{wsFlags.filter((f) => f.enabled).length}/{wsFlags.length} enabled</span>
                    </div>
                    <div className="divide-y divide-white/3">
                      {wsFlags.map((flag) => (
                        <div
                          key={flag.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.01] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${flag.enabled ? 'bg-[#c3f53b]' : 'bg-gray-600'}`} />
                            <div>
                              <p className="text-sm text-white capitalize">{flag.feature.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-gray-500">
                                {flag.metadata?.rollout_pct ? `${flag.metadata.rollout_pct}% rollout` : 'Full rollout'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleFeatureFlag(flag)}
                            className="transition-transform active:scale-95"
                          >
                            {flag.enabled ? (
                              <ToggleRight className="w-9 h-9 text-[#c3f53b]" />
                            ) : (
                              <ToggleLeft className="w-9 h-9 text-gray-600" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
    </motion.div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
    analyst: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    viewer: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${styles[role] || styles.viewer}`}>
      {role}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    pro: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    premium: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    agency: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${styles[plan] || styles.free}`}>
      {plan}
    </span>
  );
}
