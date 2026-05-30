import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  campaignsApi,
  reportsApi,
  agentApi,
  draftsApi,
} from '../lib/api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  workspace_id: string;
}

export const DEMO_USER: AuthUser = {
  id: 'demo-user-123',
  email: 'demo@adnexus.ai',
  name: 'Demo User',
  role: 'admin',
  workspace_id: 'demo-workspace-123',
};

const buildDemoSession = (): Session => {
  const now = Date.now();
  return {
    access_token: 'demo_token_' + now,
    refresh_token: 'demo_refresh',
    expires_in: 3600,
    expires_at: now / 1000 + 3600,
    token_type: 'bearer',
    user: {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      user_metadata: { name: DEMO_USER.name },
      app_metadata: { role: DEMO_USER.role, workspace_id: DEMO_USER.workspace_id },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  } as Session;
};

/**
 * Creates a complete mock Supabase client that implements all auth methods
 * used across the codebase. This serves as a safe fallback when environment
 * variables are missing, enabling a fully functional demo mode.
 */
function createMockSupabaseClient(): SupabaseClient {
  const demoSession = buildDemoSession();

  const mockAuth = {
    signInWithPassword: async (_params: { email: string; password: string }) => ({
      data: { session: demoSession, user: demoSession.user },
      error: null,
    }),

    signUp: async (_params: { email: string; password: string; options?: Record<string, unknown> }) => ({
      data: { user: demoSession.user, session: demoSession },
      error: null,
    }),

    signOut: async () => ({ error: null }),

    getSession: async () => ({
      data: { session: demoSession },
      error: null,
    }),

    getUser: async () => ({
      data: { user: demoSession.user },
      error: null,
    }),

    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
      // Emit an initial SIGNED_IN event so the app recognises the demo session
      setTimeout(() => callback('SIGNED_IN', demoSession), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },

    resetPasswordForEmail: async (_email: string, _options?: Record<string, unknown>) => ({
      data: {},
      error: null,
    }),

    updateUser: async (_attributes: Record<string, unknown>) => ({
      data: { user: demoSession.user },
      error: null,
    }),

    resend: async (_params: Record<string, unknown>) => ({
      data: {},
      error: null,
    }),

    verifyOtp: async (_params: Record<string, unknown>) => ({
      data: { user: demoSession.user, session: demoSession },
      error: null,
    }),
  };

  // Build a minimal Supabase-like object with the methods the app uses
  const mockClient = {
    auth: mockAuth,
    from: (_table: string) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
    }),
    storage: {
      from: (_bucket: string) => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
      }),
    },
    realtime: {
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
        subscribe: () => {},
        unsubscribe: () => {},
      }),
      removeChannel: () => {},
      removeAllChannels: () => {},
    },
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null }),
    },
  };

  return mockClient as unknown as SupabaseClient;
}

/**
 * Safely initialises the Supabase client with environment variables.
 * Falls back to a mock client if variables are missing or createClient throws.
 */
function safeCreateClient(): { client: SupabaseClient; isDemoMode: boolean } {
  const isPlaceholder =
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('localhost') ||
    supabaseUrl.includes('your-project') ||
    supabaseUrl.includes('example') ||
    supabaseAnonKey.includes('your-anon-key') ||
    supabaseAnonKey.includes('local');

  if (isPlaceholder) {
    console.warn(
      '[AuthContext] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
        'Falling back to demo mode with a mock Supabase client.'
    );
    return { client: createMockSupabaseClient(), isDemoMode: true };
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return { client, isDemoMode: false };
  } catch (err) {
    console.warn(
      '[AuthContext] Failed to create Supabase client:',
      (err as Error)?.message || err,
      'Falling back to demo mode.'
    );
    return { client: createMockSupabaseClient(), isDemoMode: true };
  }
}

// ------------------------------------------------------------------------------
// Context Types
// ------------------------------------------------------------------------------

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ client: supabase, isDemoMode }] = useState(() => safeCreateClient());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const api = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const isDemo = !apiUrl || apiUrl === '' || apiUrl.includes('localhost:3000');

    const instance = axios.create({
      baseURL: isDemo ? 'http://demo.local/api/v1' : apiUrl,
      headers: { 'Content-Type': 'application/json' },
      timeout: isDemo ? 100 : 5000,
    });

    /**
     * Centralized mock-data generator for demo mode.
     * All URL paths are matched against the api.ts module wrappers so the
     * mock data stays consistent with what the dedicated helper functions
     * already return.
     */
    const generateMockResponse = async (path: string, config: InternalAxiosRequestConfig) => {
      const method = config.method?.toLowerCase() || 'get';
      const body = config.data ? JSON.parse(config.data) : {};

      // ---------- CAMPAIGNS ----------
      if (path === '/campaigns' || path === '/campaigns/') {
        if (method === 'get') {
          const params = config.params || {};
          return campaignsApi.list(params);
        }
        if (method === 'post') {
          return campaignsApi.create(body);
        }
      }
      const campaignDetailMatch = path.match(/^\/campaigns\/([^/]+)$/);
      if (campaignDetailMatch) {
        const id = campaignDetailMatch[1];
        if (method === 'get') {
          const all = await campaignsApi.list({ limit: 1000 });
          const found = all.data.find((c) => c.id === id);
          return found || null;
        }
        if (method === 'patch' || method === 'put') {
          return campaignsApi.update(id, body);
        }
        if (method === 'delete') {
          return { success: true };
        }
      }
      if (path === '/campaigns/bulk-pause' && method === 'post') {
        await campaignsApi.bulkPause(body.ids || []);
        return { success: true };
      }
      if (path === '/campaigns/bulk-duplicate' && method === 'post') {
        await campaignsApi.bulkDuplicate(body.ids || []);
        return { success: true };
      }
      if (path === '/campaigns/export' && method === 'post') {
        const csv = await campaignsApi.export(body.ids || []);
        return { csv };
      }
      if (path.match(/^\/campaigns\/[^/]+\/duplicate$/)) {
        const id = path.split('/')[2];
        return campaignsApi.duplicate(id);
      }

      // ---------- REPORTS / ANALYTICS ----------
      if (path === '/reports/kpi-summary' || path === '/analytics/kpi-summary') {
        return reportsApi.getKpiSummary(config.params?.days || 30);
      }
      if (path === '/reports/cross-platform' || path === '/analytics/cross-platform') {
        return reportsApi.getCrossPlatform(config.params?.days || 30);
      }
      if (path === '/reports/spend-trend' || path === '/analytics/spend-trend') {
        return reportsApi.getSpendTrend(config.params?.days || 30);
      }
      if (path === '/reports/funnel' || path === '/analytics/funnel') {
        return reportsApi.getFunnel(config.params?.days || 30);
      }
      if (path === '/reports/top-campaigns' || path === '/analytics/top-campaigns') {
        return reportsApi.getTopCampaigns(config.params?.days || 30, config.params?.limit || 10);
      }
      if (path === '/reports/scheduled' || path === '/reports/scheduled-reports') {
        if (method === 'get') return reportsApi.getScheduledReports();
        if (method === 'post') return reportsApi.createScheduledReport(body);
      }
      const scheduledReportMatch = path.match(/^\/reports\/scheduled\/([^/]+)$/);
      if (scheduledReportMatch) {
        const id = scheduledReportMatch[1];
        if (method === 'patch' || method === 'put') return reportsApi.updateScheduledReport(id, body);
        if (method === 'delete') return reportsApi.deleteScheduledReport(id);
      }
      if (path.match(/^\/reports\/scheduled\/[^/]+\/send$/)) {
        const id = path.split('/')[3];
        return reportsApi.sendReportNow(id);
      }

      // ---------- AGENT / AUTOMATION ----------
      if (path === '/agent/status' || path === '/automation/status') {
        return agentApi.getStatus();
      }
      if ((path === '/agent/toggle' || path === '/automation/toggle') && method === 'post') {
        await agentApi.toggleAgent();
        return { success: true };
      }
      if (path === '/agent/rules' || path === '/automation/rules') {
        if (method === 'get') return agentApi.getRules();
        if (method === 'post') return agentApi.createRule(body);
      }
      const ruleMatch = path.match(/^\/(?:agent|automation)\/rules\/([^/]+)$/);
      if (ruleMatch) {
        const id = ruleMatch[1];
        if (method === 'patch' || method === 'put') return agentApi.updateRule(id, body);
        if (method === 'delete') return agentApi.deleteRule(id);
      }
      if (path.match(/^\/(?:agent|automation)\/rules\/[^/]+\/toggle$/)) {
        const id = path.split('/')[3];
        return agentApi.toggleRule(id);
      }
      if (path === '/agent/logs' || path === '/automation/logs') {
        return agentApi.getOptimizationLogs(config.params?.limit || 50);
      }
      if ((path === '/agent/run-now' || path === '/automation/run-now') && method === 'post') {
        return agentApi.runNow();
      }

      // ---------- DRAFTS ----------
      if (path === '/drafts/pending') {
        return draftsApi.getPending();
      }
      if (path === '/drafts/recent') {
        return draftsApi.getRecent(config.params?.limit || 10);
      }
      if (path === '/drafts/stats') {
        return draftsApi.getStats();
      }
      if (path.match(/^\/drafts\/[^/]+\/approve$/)) {
        const id = path.split('/')[2];
        return draftsApi.approve(id);
      }
      if (path.match(/^\/drafts\/[^/]+\/discard$/)) {
        const id = path.split('/')[2];
        return draftsApi.discard(id);
      }

      // ---------- AUTH / USER ----------
      if (path === '/auth/me' || path === '/users/me') {
        return { user: { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name, role: DEMO_USER.role, workspace_id: DEMO_USER.workspace_id, avatar_url: DEMO_USER.avatar } };
      }
      if (path === '/auth/login' && method === 'post') {
        return { token: 'demo_token', user: DEMO_USER };
      }
      if (path === '/auth/register' && method === 'post') {
        return { token: 'demo_token', user: DEMO_USER };
      }

      // ---------- WORKSPACE ----------
      if (path === '/workspace' || path === '/workspaces/current') {
        return { id: DEMO_USER.workspace_id, name: 'Demo Workspace', owner_id: DEMO_USER.id };
      }

      // ---------- BILLING / CREDITS ----------
      if (path === '/billing/credits' || path === '/credits') {
        return { total: 500, used: 347, remaining: 153 };
      }
      if (path === '/billing/usage') {
        return { usage: [{ date: '2026-06-18', credits: 12 }] };
      }

      // ---------- SETTINGS ----------
      if (path === '/settings' || path === '/settings/workspace') {
        if (method === 'get') return { name: 'Demo Workspace', timezone: 'America/New_York', currency: 'USD' };
        if (method === 'patch' || method === 'put') return { ...body, updated: true };
      }

      // ---------- NOTIFICATIONS ----------
      if (path === '/notifications') {
        return { notifications: [], unreadCount: 0 };
      }

      // ---------- ADMIN ----------
      if (path === '/admin/stats') {
        return {
          total_users: 1248,
          active_workspaces: 342,
          total_ad_spend: 2847391.52,
          api_calls_today: 45231,
          recent_signups_7d: 89,
          plan_distribution: { free: 156, pro: 128, premium: 42, agency: 16 },
          generated_at: new Date().toISOString(),
        };
      }
      if (path === '/admin/users') {
        const names = [
          'Alex Chen', 'Sarah Miller', 'Jordan Wong', 'Emma Davis', 'Ryan Park',
          'Lisa Johnson', 'David Kim', 'Nina Patel', 'Marcus Lopez', 'Olivia Zhang',
        ];
        return {
          data: names.map((name, i) => ({
            id: `user-${i + 1}`,
            name,
            email: name.toLowerCase().replace(' ', '.') + '@example.com',
            avatar_url: null,
            role: ['owner', 'admin', 'analyst', 'viewer'][i % 4],
            workspace: `Workspace ${String.fromCharCode(65 + (i % 8))}`,
            workspace_id: `ws-${(i % 8) + 1}`,
            created_at: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
            last_active: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
          })),
          pagination: { page: 1, limit: 50, total: 1248, total_pages: 25 },
        };
      }
      if (path === '/admin/workspaces') {
        const wsNames = ['Acme Corp', 'Beta Studios', 'Gamma Digital', 'Delta Media', 'Epsilon Ads',
          'Zeta Marketing', 'Eta Creative', 'Theta Brands'];
        return {
          data: wsNames.map((name, i) => ({
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
          })),
          pagination: { page: 1, limit: 50, total: 342, total_pages: 7 },
        };
      }
      if (path === '/admin/errors') {
        return {
          data: [
            { id: 'err-1', message: 'Meta API rate limit exceeded', source: 'meta-api', stack: 'Error: Rate limit\n  at MetaClient.request (/src/platforms/meta.ts:142:13)', created_at: new Date(Date.now() - 0 * 3600000).toISOString(), resolved: false },
            { id: 'err-2', message: 'Failed to refresh Google access token', source: 'google-auth', stack: 'TokenRefreshError: invalid_grant\n  at OAuth2Client.refreshToken (/src/lib/oauth.ts:89:11)', created_at: new Date(Date.now() - 1 * 3600000).toISOString(), resolved: false },
            { id: 'err-3', message: 'Supabase connection timeout', source: 'db', stack: 'ConnectionError: timeout\n  at Socket.<anonymous> (/node_modules/@supabase/postgrest-js/...)', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), resolved: false },
            { id: 'err-4', message: 'Campaign validation failed', source: 'campaign-service', stack: 'ValidationError: Budget must be > 0\n  at validateCampaign (/src/services/campaigns.ts:203:9)', created_at: new Date(Date.now() - 3 * 3600000).toISOString(), resolved: true },
            { id: 'err-5', message: 'Webhook signature verification failed', source: 'webhooks', stack: 'WebhookError: Invalid signature\n  at verifyWebhook (/src/webhooks/index.ts:55:11)', created_at: new Date(Date.now() - 4 * 3600000).toISOString(), resolved: true },
          ],
        };
      }
      if (path === '/admin/api-usage') {
        const hours = [];
        for (let i = 23; i >= 0; i--) {
          const h = new Date();
          h.setHours(h.getHours() - i);
          hours.push({ hour: h.toISOString().slice(11, 13) + ':00', calls: Math.floor(Math.random() * 3000) + 500 });
        }
        return { data: hours };
      }
      if (path === '/admin/feature-flags') {
        const features = ['ai_agent', 'morning_brief', 'creative_studio', 'ab_testing', 'audience_manager', 'budget_pacing', 'competitive_intel', 'portfolio_optimizer'];
        const flags = [];
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
        return { data: flags };
      }
      if (path === '/admin/feature-flags' && method === 'post') {
        return { success: true, data: body };
      }

      // ---------- GENERIC FALLBACK ----------
      console.warn(`[DemoMode] No mock handler for ${method.toUpperCase()} ${path}. Returning empty object.`);
      return {};
    };

    // API interceptor: attach JWT from supabase session
    instance.interceptors.request.use(async (config) => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          config.headers.Authorization = `Bearer ${data.session.access_token}`;
        }
      } catch {
        // In demo mode or when auth is unavailable, proceed without a token
      }
      return config;
    });

    // 401 handler: sign out and redirect on auth failure
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        // In demo mode, return mock data for ANY failed request
        if (isDemo && error.config) {
          try {
            const mockData = await generateMockResponse(error.config.url || '', error.config);
            return Promise.resolve({
              data: mockData,
              status: 200,
              statusText: 'OK',
              headers: {},
              config: error.config,
            });
          } catch (mockErr) {
            console.warn('[DemoMode] Mock generation failed:', mockErr);
            return Promise.reject(error);
          }
        }

        if (error.response?.status === 401) {
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore sign-out errors in demo / degraded mode
          }
          setUser(null);
          setSession(null);
          window.location.href = '/signin';
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [supabase]);

  // ---------------------------------------------------------------------------
  // Fetch user profile from backend
  // ---------------------------------------------------------------------------
  const fetchUser = useCallback(
    async (activeSession: Session) => {
      if (isDemoMode) {
        setUser({ ...DEMO_USER });
        setIsLoading(false);
        return;
      }

      try {
        const token = activeSession.access_token;
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data.user;
        setUser({
          id: u.id,
          email: u.email,
          name: u.name,
          avatar: u.avatar_url,
          role: u.role || 'analyst',
          workspace_id: u.workspace_id,
        });
      } catch {
        setUser(null);
      }
      setIsLoading(false);
    },
    [api, isDemoMode]
  );

  // ---------------------------------------------------------------------------
  // Initialise auth state on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          if (data.session) {
            setSession(data.session);
            await fetchUser(data.session);
          } else {
            setIsLoading(false);
          }
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };
    init();

    let listener: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (cancelled) return;
        setSession(newSession);
        if (newSession) {
          fetchUser(newSession);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      });
      listener = data.subscription ? { subscription: data.subscription } : null;
    } catch {
      // listener not available in demo mode — safe to ignore
    }

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, [supabase, fetchUser, isDemoMode]);

  // ---------------------------------------------------------------------------
  // Auth actions
  // ---------------------------------------------------------------------------
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    if (isDemoMode) {
      setUser({ ...DEMO_USER, email });
      setSession(buildDemoSession());
    } else if (data.session) {
      // Set synchronously so navigate() sees isAuthenticated before ProtectedRoute checks
      const sbUser = data.session.user;
      setSession(data.session);
      setUser({
        id: sbUser.id,
        email: sbUser.email || email,
        name: (sbUser.user_metadata?.name as string) || email.split('@')[0],
        role: (sbUser.app_metadata?.role as string) || 'analyst',
        workspace_id: (sbUser.app_metadata?.workspace_id as string) || '',
      });
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);

    if (isDemoMode) {
      setUser({ ...DEMO_USER, email, name });
      setSession(buildDemoSession());
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // swallow errors in demo / degraded mode
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        isDemoMode,
        login,
        signup,
        logout,
        resetPassword,
        updatePassword,
        api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ------------------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------------------

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
