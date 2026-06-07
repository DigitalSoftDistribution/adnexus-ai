import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

/* ═════════════════════════════════════════════════════════════════════ */
/*  ENVIRONMENT CONFIGURATION                                          */
/* ═════════════════════════════════════════════════════════════════════ */

type Environment = 'development' | 'staging' | 'production';

const getEnvironment = (): Environment => {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

const getBaseUrl = (): string => {
  const env = getEnvironment();
  // Allow explicit override via env var
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Environment-based defaults
  switch (env) {
    case 'production':
      return 'https://api.adnexus.app/api/v1';
    case 'staging':
      return 'https://api-staging.adnexus.app/api/v1';
    case 'development':
    default:
      return 'http://localhost:3000/api/v1';
  }
};

const ENV = getEnvironment();
const BASE_URL = getBaseUrl();
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;
const MAX_RETRIES = Number(import.meta.env.VITE_API_MAX_RETRIES) || 3;
const RETRY_DELAY_MS = Number(import.meta.env.VITE_API_RETRY_DELAY) || 1000;

/* ═════════════════════════════════════════════════════════════════════ */
/*  CIRCUIT BREAKER                                                    */
/* ═════════════════════════════════════════════════════════════════════ */

interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  nextRetryTime: number | null;
}

const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
const CIRCUIT_BREAKER_RESET_MS = 30000; // 30s before half-open

const circuitStates: Map<string, CircuitBreakerState> = new Map();

function getCircuitKey(config: InternalAxiosRequestConfig): string {
  return `${config.method?.toLowerCase() || 'get'}:${config.url}`;
}

function getCircuitState(key: string): CircuitBreakerState {
  if (!circuitStates.has(key)) {
    circuitStates.set(key, {
      status: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      nextRetryTime: null,
    });
  }
  return circuitStates.get(key)!;
}

function recordSuccess(key: string): void {
  const state = getCircuitState(key);
  if (state.status === 'half-open') {
    state.successCount += 1;
    if (state.successCount >= 2) {
      // Close the circuit after 2 consecutive successes in half-open
      circuitStates.set(key, {
        status: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        nextRetryTime: null,
      });
    }
  } else {
    state.failureCount = 0;
    state.successCount = 0;
  }
}

function recordFailure(key: string): void {
  const state = getCircuitState(key);
  state.failureCount += 1;
  state.lastFailureTime = Date.now();
  state.successCount = 0;

  if (state.status === 'half-open') {
    // Failed in half-open, go back to open
    state.status = 'open';
    state.nextRetryTime = Date.now() + CIRCUIT_BREAKER_RESET_MS;
  } else if (state.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    state.status = 'open';
    state.nextRetryTime = Date.now() + CIRCUIT_BREAKER_RESET_MS;
  }
}

function canExecute(key: string): boolean {
  const state = getCircuitState(key);
  if (state.status === 'closed') return true;
  if (state.status === 'open') {
    if (state.nextRetryTime && Date.now() >= state.nextRetryTime) {
      // Transition to half-open
      state.status = 'half-open';
      state.successCount = 0;
      return true;
    }
    return false;
  }
  return true; // half-open allows through
}

function getCircuitBreakerError(key: string): Error {
  const state = getCircuitState(key);
  const remainingMs = state.nextRetryTime ? Math.max(0, state.nextRetryTime - Date.now()) : CIRCUIT_BREAKER_RESET_MS;
  const err = new Error(
    `Circuit breaker is OPEN for ${key}. Retry after ${Math.ceil(remainingMs / 1000)}s.`
  );
  err.name = 'CircuitBreakerOpenError';
  (err as any).isCircuitBreaker = true;
  (err as any).retryAfterMs = remainingMs;
  return err;
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  REQUEST DEDUPLICATION                                              */
/* ═════════════════════════════════════════════════════════════════════ */

interface InflightRequest {
  promise: Promise<AxiosResponse>;
  timestamp: number;
}

const inflightRequests: Map<string, InflightRequest> = new Map();
const DEDUP_WINDOW_MS = 5000; // 5 seconds

function getDedupKey(config: InternalAxiosRequestConfig): string {
  const method = config.method?.toLowerCase() || 'get';
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  const data = config.data ? JSON.stringify(config.data) : '';
  return `${method}:${url}:${params}:${data}`;
}

function getInflightRequest(key: string): Promise<AxiosResponse> | null {
  const inflight = inflightRequests.get(key);
  if (inflight && Date.now() - inflight.timestamp < DEDUP_WINDOW_MS) {
    return inflight.promise;
  }
  if (inflight) {
    inflightRequests.delete(key);
  }
  return null;
}

export function registerInflight(key: string, promise: Promise<AxiosResponse>): void {
  inflightRequests.set(key, { promise, timestamp: Date.now() });
  // Auto-cleanup after window expires
  setTimeout(() => {
    const entry = inflightRequests.get(key);
    if (entry && Date.now() - entry.timestamp >= DEDUP_WINDOW_MS) {
      inflightRequests.delete(key);
    }
  }, DEDUP_WINDOW_MS + 100);
}

function cleanupInflight(key: string): void {
  inflightRequests.delete(key);
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  RETRY LOGIC                                                        */
/* ═════════════════════════════════════════════════════════════════════ */

function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }
  const status = error.response.status;
  // Retry on 5xx server errors, 429 rate limit, 408 timeout
  return status >= 500 || status === 429 || status === 408;
}

function getRetryDelay(attempt: number, error: AxiosError): number {
  // Check for Retry-After header on 429
  const retryAfter = error.response?.headers?.['retry-after'];
  if (retryAfter) {
    const delay = parseInt(retryAfter, 10) * 1000;
    if (!isNaN(delay)) return delay;
  }
  // Exponential backoff with jitter: base * 2^attempt + random(0, 1000ms)
  const jitter = Math.random() * 1000;
  return RETRY_DELAY_MS * Math.pow(2, attempt) + jitter;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  AUTH TOKEN MANAGEMENT                                              */
/* ═════════════════════════════════════════════════════════════════════ */

interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

let cachedTokens: AuthTokens | null = null;

async function getAuthTokens(): Promise<AuthTokens> {
  // Return cached if not expired
  if (cachedTokens && cachedTokens.expiresAt && Date.now() < cachedTokens.expiresAt - 60000) {
    return cachedTokens;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );
    const { data } = await supabase.auth.getSession();
    cachedTokens = {
      accessToken: data.session?.access_token || null,
      refreshToken: data.session?.refresh_token || null,
      expiresAt: data.session?.expires_at ? data.session.expires_at * 1000 : null,
    };
  } catch {
    // Fallback: try localStorage
    try {
      const token = localStorage.getItem('access_token');
      cachedTokens = {
        accessToken: token,
        refreshToken: localStorage.getItem('refresh_token'),
        expiresAt: null,
      };
    } catch {
      cachedTokens = { accessToken: null, refreshToken: null, expiresAt: null };
    }
  }
  return cachedTokens;
}

function clearAuthTokens(): void {
  cachedTokens = null;
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  PRODUCTION API CLIENT                                              */
/* ═════════════════════════════════════════════════════════════════════ */

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
    'X-Environment': ENV,
  },
});

// Request interceptor: auth tokens + workspace ID + dedup check
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 1. Add auth token
    try {
      const tokens = await getAuthTokens();
      if (tokens.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    } catch {
      // No auth available
    }

    // 2. Add workspace ID from localStorage
    try {
      const workspaceId = localStorage.getItem('workspace_id');
      if (workspaceId) {
        config.headers['X-Workspace-Id'] = workspaceId;
      }
    } catch {
      // localStorage unavailable
    }

    // 3. Circuit breaker check
    const circuitKey = getCircuitKey(config);
    if (!canExecute(circuitKey)) {
      throw getCircuitBreakerError(circuitKey);
    }

    // 4. Request deduplication for GET requests
    if (config.method?.toLowerCase() === 'get' && config.headers['X-Skip-Dedup'] !== 'true') {
      const dedupKey = getDedupKey(config);
      const inflight = getInflightRequest(dedupKey);
      if (inflight) {
        // Return a special marker that the response interceptor will catch
        config.headers['X-Dedup-Key'] = dedupKey;
        config.headers['X-Dedup-Active'] = 'true';
      }
    }

    // Log in dev
    if (ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params || '');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: retry + circuit breaker + dedup cleanup
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config as InternalAxiosRequestConfig;
    const circuitKey = getCircuitKey(config);
    recordSuccess(circuitKey);

    // Cleanup dedup
    const dedupKey = config.headers?.['X-Dedup-Key'] as string | undefined;
    if (dedupKey) {
      cleanupInflight(dedupKey);
    }

    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    if (!config) return Promise.reject(error);

    const circuitKey = getCircuitKey(config);

    // Handle dedup responses
    if (config.headers?.['X-Dedup-Active'] === 'true') {
      const dedupKey = config.headers['X-Dedup-Key'] as string;
      const inflight = getInflightRequest(dedupKey);
      if (inflight) {
        return inflight;
      }
    }

    // Circuit breaker: record failure
    if (isRetryableError(error)) {
      recordFailure(circuitKey);
    }

    // Retry logic
    const retryCount = (config as any).__retryCount || 0;
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      (config as any).__retryCount = retryCount + 1;
      const delay = getRetryDelay(retryCount, error);
      await sleep(delay);
      return api(config);
    }

    // 401 Unauthorized: clear tokens and trigger re-auth
    if (error.response?.status === 401) {
      clearAuthTokens();
      // Dispatch event for auth handling
      window.dispatchEvent(new CustomEvent('api:unauthorized', { detail: error }));
    }

    return Promise.reject(error);
  }
);

/* ═════════════════════════════════════════════════════════════════════ */
/*  API RESPONSE TYPES                                                 */
/* ═════════════════════════════════════════════════════════════════════ */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  status: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiSSEEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  HELPER: typed API methods                                          */
/* ═════════════════════════════════════════════════════════════════════ */

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, config);
  return response.data.data;
}

export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, data, config);
  return response.data.data;
}

export async function apiPut<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, data, config);
  return response.data.data;
}

export async function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.patch<ApiResponse<T>>(url, data, config);
  return response.data.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url, config);
  return response.data.data;
}

export async function apiList<T>(url: string, config?: AxiosRequestConfig): Promise<ApiListResponse<T>> {
  const response = await api.get<ApiListResponse<T>>(url, config);
  return response.data;
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  SSE CLIENT                                                         */
/* ═════════════════════════════════════════════════════════════════════ */

export interface SSEOptions {
  onMessage?: (event: ApiSSEEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
}

export function createSSEConnection(endpoint: string, options: SSEOptions = {}): EventSource {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectDelayMs = 1000,
    maxReconnectDelayMs = 30000,
  } = options;

  const baseUrl = BASE_URL.replace(/\/api\/v1$/, '');
  const url = `${baseUrl}${endpoint}`;

  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isManuallyClosed = false;

  function connect(): EventSource {
    const es = new EventSource(url);

    es.onopen = () => {
      reconnectAttempt = 0;
      onConnect?.();
    };

    es.onmessage = (event) => {
      try {
        const parsed: ApiSSEEvent = JSON.parse(event.data);
        onMessage?.(parsed);
      } catch {
        // Handle non-JSON messages
        onMessage?.({ type: 'message', payload: event.data, timestamp: new Date().toISOString() });
      }
    };

    es.onerror = (error) => {
      onError?.(error);
      if (es.readyState === EventSource.CLOSED && autoReconnect && !isManuallyClosed) {
        es.close();
        const delay = Math.min(
          reconnectDelayMs * Math.pow(2, reconnectAttempt),
          maxReconnectDelayMs
        );
        reconnectAttempt += 1;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          if (!isManuallyClosed) connect();
        }, delay);
      }
    };

    return es;
  }

  const es = connect();

  // Monkey-patch close to support manual disconnect
  const originalClose = es.close.bind(es);
  es.close = () => {
    isManuallyClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    originalClose();
    onDisconnect?.();
  };

  return es;
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  ENVIRONMENT EXPORTS                                                */
/* ═════════════════════════════════════════════════════════════════════ */

export { ENV, BASE_URL, DEFAULT_TIMEOUT, MAX_RETRIES, api };
export default api;

/* ═════════════════════════════════════════════════════════════════════ */
/*  EXISTING TYPE DEFINITIONS + API MODULES (unchanged below)          */
/* ═════════════════════════════════════════════════════════════════════ */

export interface Campaign {
  id: string;
  name: string;
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap';
  status: 'Active' | 'Paused' | 'Ended' | 'Draft';
  objective: string;
  budgetType: 'Daily' | 'Lifetime';
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  conversions: number | null;
  cpa: number | null;
  roas: number | null;
  bidStrategy: string;
  ageRange: string;
  gender: string;
  locations: string[];
  interests: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFilters {
  search?: string;
  platform?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCampaignInput {
  name: string;
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap';
  objective: string;
  budgetType: 'Daily' | 'Lifetime';
  budget: number;
  bidStrategy: string;
  ageRange: string;
  gender: string;
  locations: string[];
  interests: string[];
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ──────────────── Mock Data (20 rows) ──────────────── */

let MOCK_CAMPAIGNS: Campaign[] = [
  { id: 'c1', name: 'Summer Sale 2026', platform: 'Meta', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 500, spend: 12400, impressions: 445000, clicks: 12460, ctr: 2.8, conversions: 340, cpa: 36, roas: 4.2, bidStrategy: 'Lowest Cost', ageRange: '18-65+', gender: 'All', locations: ['US', 'CA'], interests: ['Shopping', 'Fashion'], createdAt: '2026-01-15', updatedAt: '2026-01-20' },
  { id: 'c2', name: 'Brand Awareness Q2', platform: 'Meta', status: 'Active', objective: 'Awareness', budgetType: 'Daily', budget: 300, spend: 8200, impressions: 683000, clicks: 8196, ctr: 1.2, conversions: 89, cpa: 92, roas: 1.8, bidStrategy: 'Lowest Cost', ageRange: '25-44', gender: 'All', locations: ['US'], interests: ['Lifestyle'], createdAt: '2026-02-01', updatedAt: '2026-02-10' },
  { id: 'c3', name: 'Retargeting - Cart Abandoners', platform: 'Meta', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 200, spend: 5600, impressions: 165000, clicks: 5610, ctr: 3.4, conversions: 210, cpa: 27, roas: 5.8, bidStrategy: 'Cost Cap', ageRange: '18-65+', gender: 'All', locations: ['US', 'CA', 'UK'], interests: ['Shopping'], createdAt: '2026-01-10', updatedAt: '2026-01-18' },
  { id: 'c4', name: 'Lookalike - Purchasers', platform: 'Meta', status: 'Paused', objective: 'Conversions', budgetType: 'Daily', budget: 150, spend: 3100, impressions: 148000, clicks: 3108, ctr: 2.1, conversions: 95, cpa: 33, roas: 3.9, bidStrategy: 'Lowest Cost', ageRange: '25-54', gender: 'All', locations: ['US'], interests: ['Lookalike'], createdAt: '2026-01-05', updatedAt: '2026-01-12' },
  { id: 'c5', name: 'Holiday Preview', platform: 'Meta', status: 'Ended', objective: 'Awareness', budgetType: 'Daily', budget: 400, spend: 0, impressions: 0, clicks: 0, ctr: null, conversions: null, cpa: null, roas: null, bidStrategy: 'Lowest Cost', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Holiday'], createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'c6', name: 'Search - Brand Terms', platform: 'Google', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 400, spend: 10800, impressions: 257000, clicks: 10836, ctr: 4.2, conversions: 520, cpa: 21, roas: 6.1, bidStrategy: 'Target CPA', ageRange: '18-65+', gender: 'All', locations: ['US', 'CA'], interests: ['Search'], createdAt: '2026-01-20', updatedAt: '2026-01-25' },
  { id: 'c7', name: 'PMax - Ecommerce', platform: 'Google', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 600, spend: 15200, impressions: 844000, clicks: 15192, ctr: 1.8, conversions: 380, cpa: 40, roas: 3.5, bidStrategy: 'Maximize Conversions', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-02-05', updatedAt: '2026-02-12' },
  { id: 'c8', name: 'Display - Remarketing', platform: 'Google', status: 'Active', objective: 'Awareness', budgetType: 'Daily', budget: 250, spend: 6400, impressions: 582000, clicks: 5824, ctr: 1.1, conversions: 145, cpa: 44, roas: 3.2, bidStrategy: 'Viewable CPM', ageRange: '25-54', gender: 'All', locations: ['US'], interests: ['Remarketing'], createdAt: '2026-01-08', updatedAt: '2026-01-15' },
  { id: 'c9', name: 'YouTube - Product Demo', platform: 'Google', status: 'Paused', objective: 'Awareness', budgetType: 'Daily', budget: 350, spend: 4800, impressions: 534000, clicks: 4806, ctr: 0.9, conversions: 67, cpa: 72, roas: 2.1, bidStrategy: 'Target CPM', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['Video'], createdAt: '2026-02-15', updatedAt: '2026-02-20' },
  { id: 'c10', name: 'Discovery - New Products', platform: 'Google', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 200, spend: 3200, impressions: 139000, clicks: 3198, ctr: 2.3, conversions: 128, cpa: 25, roas: 4.8, bidStrategy: 'Target CPA', ageRange: '25-44', gender: 'All', locations: ['US', 'CA'], interests: ['Discovery'], createdAt: '2026-03-05', updatedAt: '2026-03-10' },
  { id: 'c11', name: 'FYP - Viral Hook', platform: 'TikTok', status: 'Active', objective: 'Awareness', budgetType: 'Daily', budget: 300, spend: 7800, impressions: 487000, clicks: 7808, ctr: 1.6, conversions: 198, cpa: 39, roas: 3.1, bidStrategy: 'Lowest Cost', ageRange: '18-34', gender: 'All', locations: ['US'], interests: ['Viral'], createdAt: '2026-01-25', updatedAt: '2026-02-01' },
  { id: 'c12', name: 'Spark Ads - UGC', platform: 'TikTok', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 200, spend: 4200, impressions: 191000, clicks: 4202, ctr: 2.2, conversions: 156, cpa: 27, roas: 4.5, bidStrategy: 'Cost Cap', ageRange: '18-44', gender: 'All', locations: ['US', 'CA'], interests: ['UGC'], createdAt: '2026-02-10', updatedAt: '2026-02-15' },
  { id: 'c13', name: 'Collection Ads - Catalog', platform: 'TikTok', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 250, spend: 5100, impressions: 364000, clicks: 5096, ctr: 1.4, conversions: 112, cpa: 46, roas: 2.8, bidStrategy: 'Lowest Cost', ageRange: '18-54', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-03-01', updatedAt: '2026-03-05' },
  { id: 'c14', name: 'TopView - Launch', platform: 'TikTok', status: 'Ended', objective: 'Awareness', budgetType: 'Daily', budget: 500, spend: 0, impressions: 0, clicks: 0, ctr: null, conversions: null, cpa: null, roas: null, bidStrategy: 'Reach & Frequency', ageRange: '18-34', gender: 'All', locations: ['US'], interests: ['Launch'], createdAt: '2026-03-15', updatedAt: '2026-03-15' },
  { id: 'c15', name: 'In-Feed - Test', platform: 'TikTok', status: 'Draft', objective: 'Traffic', budgetType: 'Daily', budget: 150, spend: 0, impressions: 0, clicks: 0, ctr: null, conversions: null, cpa: null, roas: null, bidStrategy: 'Lowest Cost', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['Test'], createdAt: '2026-03-20', updatedAt: '2026-03-20' },
  { id: 'c16', name: 'Snap Ads - App Install', platform: 'Snap', status: 'Active', objective: 'App Installs', budgetType: 'Daily', budget: 200, spend: 3800, impressions: 317000, clicks: 3804, ctr: 1.2, conversions: 95, cpa: 40, roas: 2.9, bidStrategy: 'Cost Cap', ageRange: '18-34', gender: 'All', locations: ['US'], interests: ['App Installs'], createdAt: '2026-02-01', updatedAt: '2026-02-08' },
  { id: 'c17', name: 'Story Ads - Promo', platform: 'Snap', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 150, spend: 2400, impressions: 300000, clicks: 2400, ctr: 0.8, conversions: 48, cpa: 50, roas: 2.3, bidStrategy: 'Goal Based', ageRange: '18-44', gender: 'All', locations: ['US', 'CA'], interests: ['Promo'], createdAt: '2026-01-18', updatedAt: '2026-01-22' },
  { id: 'c18', name: 'AR Lens - Branded', platform: 'Snap', status: 'Paused', objective: 'Engagement', budgetType: 'Daily', budget: 400, spend: 1200, impressions: 240000, clicks: 1200, ctr: 0.5, conversions: 12, cpa: 100, roas: 1.4, bidStrategy: 'Lowest Cost', ageRange: '13-34', gender: 'All', locations: ['US'], interests: ['AR'], createdAt: '2026-02-20', updatedAt: '2026-02-25' },
  { id: 'c19', name: 'Collection - Products', platform: 'Snap', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 180, spend: 2800, impressions: 187000, clicks: 2805, ctr: 1.5, conversions: 73, cpa: 38, roas: 3.3, bidStrategy: 'Swipe Up', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-03-08', updatedAt: '2026-03-12' },
  { id: 'c20', name: 'Dynamic - Retargeting', platform: 'Snap', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 120, spend: 1600, impressions: 84000, clicks: 1596, ctr: 1.9, conversions: 58, cpa: 28, roas: 4.1, bidStrategy: 'Goal Based', ageRange: '18-54', gender: 'All', locations: ['US'], interests: ['Retargeting'], createdAt: '2026-03-12', updatedAt: '2026-03-15' },
];

/* ──────────────── Production-Ready campaignsApi ──────────────── */

export const campaignsApi = {
  /** GET /api/v1/campaigns — List campaigns with filters */
  async list(filters: CampaignFilters = {}): Promise<PaginatedResponse<Campaign>> {
    if (isDemoMode()) {
      await delay(400 + Math.random() * 300);
      return mockList(filters);
    }
    const params: Record<string, unknown> = {};
    if (filters.platform && filters.platform !== 'All') params.platform = filters.platform;
    if (filters.status && filters.status !== 'All') params.status = filters.status;
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.sortBy) {
      params.sortBy = filters.sortBy;
      params.sortDir = filters.sortDir || 'desc';
    }
    params.page = filters.page || 1;
    params.limit = filters.limit || 20;

    return apiList<Campaign>('/campaigns', { params });
  },

  /** GET /api/v1/campaigns/:id — Get a single campaign */
  async get(id: string): Promise<Campaign> {
    if (isDemoMode()) {
      await delay(300);
      const c = MOCK_CAMPAIGNS.find((c) => c.id === id);
      if (!c) throw new Error('Campaign not found');
      return { ...c };
    }
    return apiGet<Campaign>(`/campaigns/${id}`);
  },

  /** POST /api/v1/campaigns — Create a new campaign (creates draft) */
  async create(input: CreateCampaignInput): Promise<Campaign> {
    if (isDemoMode()) {
      await delay(600);
      const campaign: Campaign = {
        id: `c${Date.now()}`,
        ...input,
        status: 'Draft',
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: null,
        conversions: null,
        cpa: null,
        roas: null,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      MOCK_CAMPAIGNS.unshift(campaign);
      return campaign;
    }
    return apiPost<Campaign>('/campaigns', input);
  },

  /** PUT /api/v1/campaigns/:id — Update a campaign (creates draft) */
  async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    if (isDemoMode()) {
      await delay(400);
      const idx = MOCK_CAMPAIGNS.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Campaign not found');
      MOCK_CAMPAIGNS[idx] = { ...MOCK_CAMPAIGNS[idx], ...updates, updatedAt: new Date().toISOString().split('T')[0] };
      return MOCK_CAMPAIGNS[idx];
    }
    return apiPut<Campaign>(`/campaigns/${id}`, updates);
  },

  /** DELETE /api/v1/campaigns/:id — Delete a campaign */
  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_CAMPAIGNS = MOCK_CAMPAIGNS.filter((c) => c.id !== id);
      return;
    }
    await apiDelete<void>(`/campaigns/${id}`);
  },

  async duplicate(id: string): Promise<Campaign> {
    if (isDemoMode()) {
      await delay(400);
      const original = MOCK_CAMPAIGNS.find((c) => c.id === id);
      if (!original) throw new Error('Campaign not found');
      const copy: Campaign = {
        ...original,
        id: `c${Date.now()}`,
        name: `${original.name} (Copy)`,
        status: 'Draft',
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: null,
        conversions: null,
        cpa: null,
        roas: null,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      MOCK_CAMPAIGNS.unshift(copy);
      return copy;
    }
    return apiPost<Campaign>(`/campaigns/${id}/duplicate`);
  },

  async bulkPause(ids: string[]): Promise<void> {
    if (isDemoMode()) {
      await delay(500);
      for (const id of ids) {
        const idx = MOCK_CAMPAIGNS.findIndex((c) => c.id === id);
        if (idx !== -1) {
          MOCK_CAMPAIGNS[idx] = { ...MOCK_CAMPAIGNS[idx], status: 'Paused', updatedAt: new Date().toISOString().split('T')[0] };
        }
      }
      return;
    }
    await apiPost<void>('/campaigns/bulk-pause', { ids });
  },

  async bulkDuplicate(ids: string[]): Promise<void> {
    if (isDemoMode()) {
      await delay(500);
      const toCopy = MOCK_CAMPAIGNS.filter((c) => ids.includes(c.id));
      for (const original of toCopy) {
        const copy: Campaign = {
          ...original,
          id: `c${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${original.name} (Copy)`,
          status: 'Draft',
          spend: 0,
          impressions: 0,
          clicks: 0,
          ctr: null,
          conversions: null,
          cpa: null,
          roas: null,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        };
        MOCK_CAMPAIGNS.unshift(copy);
      }
      return;
    }
    await apiPost<void>('/campaigns/bulk-duplicate', { ids });
  },

  /** GET /api/v1/campaigns/summary — Get campaign analytics summary */
  async summary(): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    avgCtr: number;
    avgRoas: number;
    platformBreakdown: Record<string, { count: number; spend: number }>;
    statusBreakdown: Record<string, number>;
  }> {
    if (isDemoMode()) {
      await delay(300);
      const campaigns = MOCK_CAMPAIGNS;
      const active = campaigns.filter((c) => c.status === 'Active');
      return {
        totalCampaigns: campaigns.length,
        activeCampaigns: active.length,
        totalSpend: campaigns.reduce((sum, c) => sum + (c.spend || 0), 0),
        totalImpressions: campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0),
        totalClicks: campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0),
        totalConversions: campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0),
        avgCtr: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / campaigns.length : 0,
        avgRoas: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + (c.roas || 0), 0) / campaigns.length : 0,
        platformBreakdown: campaigns.reduce((acc, c) => {
          const p = c.platform;
          if (!acc[p]) acc[p] = { count: 0, spend: 0 };
          acc[p].count += 1;
          acc[p].spend += c.spend || 0;
          return acc;
        }, {} as Record<string, { count: number; spend: number }>),
        statusBreakdown: campaigns.reduce((acc, c) => {
          const s = c.status;
          if (!acc[s]) acc[s] = 0;
          acc[s] += 1;
          return acc;
        }, {} as Record<string, number>),
      };
    }
    return apiGet('/campaigns/summary');
  },

  async export(ids: string[]): Promise<string> {
    if (isDemoMode()) {
      await delay(300);
      const selected = MOCK_CAMPAIGNS.filter((c) => ids.includes(c.id));
      const headers = ['ID', 'Name', 'Platform', 'Status', 'Objective', 'Budget Type', 'Budget', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'CPA', 'ROAS'];
      const rows = selected.map((c) => [
        c.id, c.name, c.platform, c.status, c.objective, c.budgetType,
        c.budget, c.spend, c.impressions, c.clicks,
        c.ctr ?? '', c.conversions ?? '', c.cpa ?? '', c.roas ?? '',
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }
    const response = await api.post<{ csv: string }>('/campaigns/export', { ids });
    return response.data.csv;
  },
};

/** Demo mode detection */
function isDemoMode(): boolean {
  return !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';
}

/** Local mock list implementation */
function mockList(filters: CampaignFilters): PaginatedResponse<Campaign> {
  let data = [...MOCK_CAMPAIGNS];
  if (filters.platform && filters.platform !== 'All') {
    data = data.filter((c) => c.platform === filters.platform);
  }
  if (filters.status && filters.status !== 'All') {
    data = data.filter((c) => c.status === filters.status);
  }
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    data = data.filter((c) => c.name.toLowerCase().includes(q));
  }
  if (filters.sortBy) {
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    data.sort((a, b) => {
      const aVal = a[filters.sortBy as keyof Campaign];
      const bVal = b[filters.sortBy as keyof Campaign];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') return dir * aVal.localeCompare(bVal as string);
      if (typeof aVal === 'number') return dir * ((aVal as number) - (bVal as number));
      return 0;
    });
  }
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = data.slice(start, start + limit);
  return { data: paginated, total, page, limit, totalPages };
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  EXISTING STUBS + API MODULES                                       */
/* ═════════════════════════════════════════════════════════════════════ */

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused';
  isActive?: boolean;
  platform: string;
  platforms?: string[];
  condition: RuleCondition;
  conditions?: RuleCondition[];
  action: RuleAction;
  actions?: RuleAction[];
  conditionLogic?: 'and' | 'or';
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  lastAppliedAt?: string;
  triggerCount: number;
  appliedCount?: number;
}

export interface RuleCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  timeWindow?: string;
}

export interface RuleAction {
  type: string;
  params: Record<string, unknown>;
}

export interface OptimizationLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleDescription?: string;
  campaignId: string;
  campaignName: string;
  action: string;
  actionType?: string;
  details: string;
  beforeValue?: number;
  afterValue?: number;
  result?: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  createdAt: string;
}

export interface PendingDraft {
  id: string;
  title: string;
  ruleName?: string;
  changeSummary?: string;
  aiReasoning?: string;
  impactEstimate?: string;
  description: string;
  campaignId?: string;
  campaignName?: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  platform?: string;
  expiresAt?: string;
  severity?: string;
  metrics?: Record<string, unknown>;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AgentStatus {
  status?: 'active' | 'paused';
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
  recentLogs: OptimizationLogEntry[];
}

export interface AIRecommendation {
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

export interface CrossPlatformData {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
  roas: number;
  color: string;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  value?: number;
  platformBreakdown?: Record<string, number>;
}

export interface ReportCampaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
  roas: number;
  campaign?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type?: string;
  schedule?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'csv' | 'xlsx';
  includePlatforms: string[];
  lastSent?: string;
  lastRun?: string;
  nextSend: string;
  isActive: boolean;
  active?: boolean;
  createdAt: string;
}

export interface KpiSummary {
  totalSpend: number;
  totalSpendChange: number;
  totalSpendPrev?: number;
  impressions: number;
  impressionsChange: number;
  clicks: number;
  clicksChange: number;
  conversions: number;
  conversionsChange: number;
  totalConversions?: number;
  totalConversionsPrev?: number;
  ctr: number;
  ctrChange: number;
  avgCtr?: number;
  avgCtrPrev?: number;
  cpa: number;
  cpaChange: number;
  avgCpa?: number;
  avgCpaPrev?: number;
  roas: number;
  roasChange: number;
  avgRoas?: number;
  avgRoasPrev?: number;
}

/* ──────────────── Reports Mock Data ──────────────── */

let MOCK_SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 'sr_1', name: 'Weekly Performance Summary', frequency: 'weekly', recipients: ['john@company.com', 'jane@company.com'], format: 'pdf', includePlatforms: ['Meta', 'Google', 'TikTok', 'Snap'], lastSent: '2026-06-14T09:00:00Z', nextSend: '2026-06-21T09:00:00Z', isActive: true, createdAt: '2026-01-15T10:00:00Z' },
  { id: 'sr_2', name: 'Daily Spend Alert', frequency: 'daily', recipients: ['john@company.com'], format: 'csv', includePlatforms: ['Meta', 'Google'], lastSent: '2026-06-18T08:00:00Z', nextSend: '2026-06-19T08:00:00Z', isActive: true, createdAt: '2026-02-01T14:00:00Z' },
  { id: 'sr_3', name: 'Monthly ROAS Report', frequency: 'monthly', recipients: ['team@company.com', 'exec@company.com'], format: 'xlsx', includePlatforms: ['Meta', 'Google', 'TikTok', 'Snap'], lastSent: '2026-05-01T10:00:00Z', nextSend: '2026-07-01T10:00:00Z', isActive: true, createdAt: '2026-01-10T09:00:00Z' },
  { id: 'sr_4', name: 'Creative Fatigue Alert', frequency: 'weekly', recipients: ['creative@company.com'], format: 'pdf', includePlatforms: ['Meta', 'TikTok'], lastSent: '2026-06-10T11:00:00Z', nextSend: '2026-06-17T11:00:00Z', isActive: false, createdAt: '2026-03-05T16:00:00Z' },
  { id: 'sr_5', name: 'CPA Monitoring', frequency: 'daily', recipients: ['john@company.com', 'bob@company.com'], format: 'csv', includePlatforms: ['Google', 'Snap'], lastSent: '2026-06-18T07:30:00Z', nextSend: '2026-06-19T07:30:00Z', isActive: true, createdAt: '2026-04-12T10:30:00Z' },
];

const generateTrendData = (days: number): TrendPoint[] => {
  const data: TrendPoint[] = [];
  const now = new Date();
  let baseValue = 4500 + Math.random() * 1000;
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    baseValue = baseValue * (0.92 + Math.random() * 0.18);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(baseValue),
    });
  }
  return data;
};

export const reportsApi = {
  async getKpiSummary(_days?: number): Promise<KpiSummary> {
    await delay(300 + Math.random() * 200);
    return {
      totalSpend: 145820.50,
      totalSpendChange: 12.3,
      totalSpendPrev: 129845.20,
      impressions: 2345689,
      impressionsChange: 8.7,
      clicks: 67842,
      clicksChange: 15.2,
      conversions: 12488,
      conversionsChange: 24.6,
      totalConversions: 12488,
      totalConversionsPrev: 10020,
      ctr: 2.89,
      ctrChange: -0.3,
      avgCtr: 2.89,
      avgCtrPrev: 2.90,
      cpa: 11.68,
      cpaChange: -5.2,
      avgCpa: 11.68,
      avgCpaPrev: 12.32,
      roas: 3.42,
      roasChange: 8.1,
      avgRoas: 3.42,
      avgRoasPrev: 3.16,
    };
  },
  async getCrossPlatform(_days?: number): Promise<CrossPlatformData[]> {
    await delay(300 + Math.random() * 200);
    return [
      { platform: 'Meta', spend: 48500, impressions: 890000, clicks: 25620, conversions: 4520, ctr: 2.88, cpa: 10.73, roas: 3.8, color: '#1877F2' },
      { platform: 'Google', spend: 52300, impressions: 756000, clicks: 30240, conversions: 5840, ctr: 4.00, cpa: 8.95, roas: 4.2, color: '#EA4335' },
      { platform: 'TikTok', spend: 28400, impressions: 456000, clicks: 6384, conversions: 1520, ctr: 1.40, cpa: 18.68, roas: 2.5, color: '#00F2EA' },
      { platform: 'Snap', spend: 16620.50, impressions: 243689, clicks: 5598, conversions: 608, ctr: 2.30, cpa: 27.34, roas: 1.8, color: '#FFFC00' },
    ];
  },
  async getSpendTrend(_days?: number): Promise<TrendPoint[]> {
    await delay(300 + Math.random() * 200);
    return generateTrendData(_days || 30);
  },
  async getFunnelAnalysis(_days?: number): Promise<FunnelStage[]> {
    await delay(300 + Math.random() * 200);
    return [
      { stage: 'Impressions', count: 2345689, percentage: 100, value: 2345689, platformBreakdown: { Meta: 890000, Google: 756000, TikTok: 456000, Snap: 243689 } },
      { stage: 'Clicks', count: 67842, percentage: 2.89, value: 67842, platformBreakdown: { Meta: 25620, Google: 30240, TikTok: 6384, Snap: 5598 } },
      { stage: 'Landing Page', count: 54273, percentage: 80.0, value: 54273, platformBreakdown: { Meta: 20496, Google: 24192, TikTok: 5107, Snap: 4478 } },
      { stage: 'Add to Cart', count: 18732, percentage: 34.5, value: 18732, platformBreakdown: { Meta: 7684, Google: 8448, TikTok: 1536, Snap: 1064 } },
      { stage: 'Purchase', count: 12488, percentage: 66.7, value: 12488, platformBreakdown: { Meta: 4520, Google: 5840, TikTok: 1520, Snap: 608 } },
    ];
  },
  async getFunnel(_days?: number): Promise<FunnelStage[]> {
    return this.getFunnelAnalysis(_days);
  },
  async getTopCampaigns(_days?: number, _limit?: number): Promise<ReportCampaign[]> {
    await delay(300 + Math.random() * 200);
    return [
      { id: 'c1', name: 'Summer Sale 2026', platform: 'Meta', status: 'Active', spend: 12400, impressions: 445000, clicks: 12460, conversions: 340, ctr: 2.8, cpa: 36.5, roas: 4.2, campaign: 'Summer Sale 2026' },
      { id: 'c6', name: 'Search - Brand Terms', platform: 'Google', status: 'Active', spend: 10800, impressions: 257000, clicks: 10794, conversions: 520, ctr: 4.2, cpa: 20.8, roas: 6.1, campaign: 'Search - Brand Terms' },
      { id: 'c7', name: 'PMax - Ecommerce', platform: 'Google', status: 'Active', spend: 15200, impressions: 844000, clicks: 15192, conversions: 380, ctr: 1.8, cpa: 40.0, roas: 3.5, campaign: 'PMax - Ecommerce' },
      { id: 'c3', name: 'Retargeting - Cart Abandoners', platform: 'Meta', status: 'Active', spend: 8200, impressions: 165000, clicks: 5610, conversions: 210, ctr: 3.4, cpa: 39.0, roas: 5.8, campaign: 'Retargeting - Cart Abandoners' },
      { id: 'c12', name: 'Spark Ads - UGC', platform: 'TikTok', status: 'Active', spend: 7800, impressions: 487000, clicks: 7808, conversions: 198, ctr: 1.6, cpa: 39.4, roas: 3.1, campaign: 'Spark Ads - UGC' },
      { id: 'c11', name: 'FYP - Viral Hook', platform: 'TikTok', status: 'Active', spend: 4200, impressions: 191000, clicks: 4202, conversions: 156, ctr: 2.2, cpa: 26.9, roas: 4.5, campaign: 'FYP - Viral Hook' },
      { id: 'c2', name: 'Brand Awareness Q2', platform: 'Meta', status: 'Active', spend: 6830, impressions: 683000, clicks: 8196, conversions: 89, ctr: 1.2, cpa: 76.7, roas: 1.8, campaign: 'Brand Awareness Q2' },
      { id: 'c16', name: 'Snap Ads - App Install', platform: 'Snap', status: 'Active', spend: 3800, impressions: 317000, clicks: 3804, conversions: 95, ctr: 1.2, cpa: 40.0, roas: 2.9, campaign: 'Snap Ads - App Install' },
    ];
  },
  async getCampaignPerformance(_days?: number, _limit?: number): Promise<ReportCampaign[]> {
    return this.getTopCampaigns(_days, _limit);
  },
  async getScheduledReports(): Promise<ScheduledReport[]> {
    await delay(300 + Math.random() * 200);
    return [...MOCK_SCHEDULED_REPORTS];
  },
  async createScheduledReport(input: Partial<ScheduledReport>): Promise<ScheduledReport> {
    await delay(500);
    const report: ScheduledReport = {
      id: `sr_${Date.now()}`,
      name: input.name || 'Untitled Report',
      frequency: input.frequency || 'weekly',
      recipients: input.recipients || [],
      format: input.format || 'pdf',
      includePlatforms: input.includePlatforms || ['Meta', 'Google'],
      nextSend: input.nextSend || new Date(Date.now() + 86400000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    MOCK_SCHEDULED_REPORTS.push(report);
    return report;
  },
  async updateScheduledReport(id: string, input: Partial<ScheduledReport>): Promise<ScheduledReport> {
    await delay(400);
    const idx = MOCK_SCHEDULED_REPORTS.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Report not found');
    MOCK_SCHEDULED_REPORTS[idx] = { ...MOCK_SCHEDULED_REPORTS[idx], ...input };
    return MOCK_SCHEDULED_REPORTS[idx];
  },
  async deleteScheduledReport(id: string): Promise<void> {
    await delay(300);
    MOCK_SCHEDULED_REPORTS = MOCK_SCHEDULED_REPORTS.filter((r) => r.id !== id);
  },
  async sendReportNow(_id: string): Promise<void> {
    await delay(800);
  },
  async exportCampaignsToCsv(campaigns: ReportCampaign[]): Promise<string> {
    await delay(300);
    const headers = ['Campaign', 'Platform', 'Status', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'CPA', 'ROAS'];
    const rows = campaigns.map((c) => [
      c.name, c.platform, c.status, c.spend, c.impressions, c.clicks,
      c.ctr + '%', c.conversions, '$' + c.cpa, c.roas + 'x',
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};

/* ──────────────── Agent Mock Data ──────────────── */

let MOCK_AGENT_RULES: AutomationRule[] = [
  {
    id: 'rule_1', name: 'High CPA Auto-Pause', description: 'Pause campaigns when CPA exceeds threshold for 3+ days',
    status: 'active', platform: 'Meta', platforms: ['Meta'],
    condition: { metric: 'cpa', operator: 'gt', value: 50, timeWindow: '3d' },
    conditions: [{ metric: 'cpa', operator: 'gt', value: 50, timeWindow: '3d' }],
    action: { type: 'pause_campaign', params: { notify: true } },
    actions: [{ type: 'pause_campaign', params: { notify: true } }],
    conditionLogic: 'and',
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-06-18T14:00:00Z',
    lastTriggered: '2026-06-18T08:30:00Z', lastAppliedAt: '2026-06-18T08:30:00Z',
    triggerCount: 23, appliedCount: 23,
  },
  {
    id: 'rule_2', name: 'ROAS Scale Winner', description: 'Increase budget 20% when ROAS > 4x for 2 consecutive days',
    status: 'active', platform: 'All', platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    condition: { metric: 'roas', operator: 'gt', value: 4, timeWindow: '2d' },
    conditions: [{ metric: 'roas', operator: 'gt', value: 4, timeWindow: '2d' }],
    action: { type: 'increase_budget', params: { percentage: 20, cap: 1000 } },
    actions: [{ type: 'increase_budget', params: { percentage: 20, cap: 1000 } }],
    conditionLogic: 'and',
    createdAt: '2026-01-20T09:00:00Z', updatedAt: '2026-06-17T16:00:00Z',
    lastTriggered: '2026-06-17T10:15:00Z', lastAppliedAt: '2026-06-17T10:15:00Z',
    triggerCount: 45, appliedCount: 45,
  },
  {
    id: 'rule_3', name: 'Low CTR Creative Alert', description: 'Flag creatives with CTR below 0.5% after 10k impressions',
    status: 'active', platform: 'Meta', platforms: ['Meta'],
    condition: { metric: 'ctr', operator: 'lt', value: 0.5, timeWindow: '7d' },
    conditions: [{ metric: 'ctr', operator: 'lt', value: 0.5, timeWindow: '7d' }, { metric: 'impressions', operator: 'gt', value: 10000, timeWindow: '7d' }],
    action: { type: 'notify_team', params: { channel: 'slack', message: 'Creative fatigue detected' } },
    actions: [{ type: 'notify_team', params: { channel: 'slack', message: 'Creative fatigue detected' } }],
    conditionLogic: 'and',
    createdAt: '2026-02-01T11:00:00Z', updatedAt: '2026-06-15T10:00:00Z',
    lastTriggered: '2026-06-15T06:00:00Z', lastAppliedAt: '2026-06-15T06:00:00Z',
    triggerCount: 18, appliedCount: 18,
  },
  {
    id: 'rule_4', name: 'Weekend Budget Reduction', description: 'Reduce weekend spend by 30% for B2B campaigns',
    status: 'paused', platform: 'Google', platforms: ['Google'],
    condition: { metric: 'spend', operator: 'gt', value: 500, timeWindow: '1d' },
    conditions: [{ metric: 'spend', operator: 'gt', value: 500, timeWindow: '1d' }],
    action: { type: 'decrease_budget', params: { percentage: 30, schedule: 'weekend' } },
    actions: [{ type: 'decrease_budget', params: { percentage: 30, schedule: 'weekend' } }],
    conditionLogic: 'and',
    createdAt: '2026-03-01T08:00:00Z', updatedAt: '2026-05-20T12:00:00Z',
    lastTriggered: '2026-05-18T00:00:00Z', lastAppliedAt: '2026-05-18T00:00:00Z',
    triggerCount: 12, appliedCount: 8,
  },
  {
    id: 'rule_5', name: 'Frequency Cap Monitor', description: 'Alert when ad frequency exceeds 3x in 7 days',
    status: 'active', platform: 'Meta', platforms: ['Meta', 'Snap'],
    condition: { metric: 'frequency', operator: 'gt', value: 3, timeWindow: '7d' },
    conditions: [{ metric: 'frequency', operator: 'gt', value: 3, timeWindow: '7d' }],
    action: { type: 'create_alert', params: { severity: 'warning', notify: true } },
    actions: [{ type: 'create_alert', params: { severity: 'warning', notify: true } }],
    conditionLogic: 'and',
    createdAt: '2026-03-10T14:00:00Z', updatedAt: '2026-06-18T09:00:00Z',
    lastTriggered: '2026-06-18T03:00:00Z', lastAppliedAt: '2026-06-18T03:00:00Z',
    triggerCount: 31, appliedCount: 31,
  },
  {
    id: 'rule_6', name: 'Underperforming Pause', description: 'Auto-pause campaigns with 0 conversions after $200 spend',
    status: 'active', platform: 'All', platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    condition: { metric: 'conversions', operator: 'eq', value: 0, timeWindow: '7d' },
    conditions: [{ metric: 'conversions', operator: 'eq', value: 0, timeWindow: '7d' }, { metric: 'spend', operator: 'gt', value: 200, timeWindow: '7d' }],
    action: { type: 'pause_campaign', params: { createDraft: true } },
    actions: [{ type: 'pause_campaign', params: { createDraft: true } }],
    conditionLogic: 'and',
    createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-06-16T11:00:00Z',
    lastTriggered: '2026-06-16T08:00:00Z', lastAppliedAt: '2026-06-16T08:00:00Z',
    triggerCount: 9, appliedCount: 9,
  },
  {
    id: 'rule_7', name: 'TikTok Trending Scale', description: 'Scale TikTok campaigns when video completion rate > 45%',
    status: 'active', platform: 'TikTok', platforms: ['TikTok'],
    condition: { metric: 'roas', operator: 'gt', value: 3.5, timeWindow: '2d' },
    conditions: [{ metric: 'roas', operator: 'gt', value: 3.5, timeWindow: '2d' }],
    action: { type: 'increase_budget', params: { percentage: 25, cap: 500 } },
    actions: [{ type: 'increase_budget', params: { percentage: 25, cap: 500 } }],
    conditionLogic: 'and',
    createdAt: '2026-04-15T09:00:00Z', updatedAt: '2026-06-18T07:00:00Z',
    lastTriggered: '2026-06-18T05:00:00Z', lastAppliedAt: '2026-06-18T05:00:00Z',
    triggerCount: 16, appliedCount: 16,
  },
  {
    id: 'rule_8', name: 'Snap Budget Pacing', description: 'Adjust Snap bids when CPA trends above $40',
    status: 'paused', platform: 'Snap', platforms: ['Snap'],
    condition: { metric: 'cpa', operator: 'gt', value: 40, timeWindow: '2d' },
    conditions: [{ metric: 'cpa', operator: 'gt', value: 40, timeWindow: '2d' }],
    action: { type: 'adjust_bid', params: { adjustment: -15 } },
    actions: [{ type: 'adjust_bid', params: { adjustment: -15 } }],
    conditionLogic: 'and',
    createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-06-10T12:00:00Z',
    lastTriggered: '2026-06-10T04:00:00Z', lastAppliedAt: '2026-06-10T04:00:00Z',
    triggerCount: 7, appliedCount: 7,
  },
];

let MOCK_OPTIMIZATION_LOGS: OptimizationLogEntry[] = [
  { id: 'log_1', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c1', campaignName: 'Summer Sale 2026', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 4.2x exceeded threshold for 2 days. Budget: $400 -> $480', beforeValue: 400, afterValue: 480, result: 'success', status: 'success', createdAt: '2026-06-18T08:30:00Z' },
  { id: 'log_2', ruleId: 'rule_1', ruleName: 'High CPA Auto-Pause', campaignId: 'c9', campaignName: 'YouTube - Product Demo', action: 'Created pause draft', actionType: 'pause_campaign', details: 'CPA $72.3 exceeded $50 threshold for 3 days.', beforeValue: 72.3, afterValue: 0, result: 'pending_approval', status: 'warning', createdAt: '2026-06-18T07:15:00Z' },
  { id: 'log_3', ruleId: 'rule_5', ruleName: 'Frequency Cap Monitor', campaignId: 'c4', campaignName: 'Lookalike - Purchasers', action: 'Alert: Frequency at 3.2x', actionType: 'create_alert', details: 'Ad frequency reached 3.2x in 7 days. Consider creative refresh.', beforeValue: 2.8, afterValue: 3.2, result: 'alert_sent', status: 'success', createdAt: '2026-06-18T06:00:00Z' },
  { id: 'log_4', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c6', campaignName: 'Search - Brand Terms', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 6.1x exceeded threshold. Budget: $350 -> $420', beforeValue: 350, afterValue: 420, result: 'success', status: 'success', createdAt: '2026-06-18T05:45:00Z' },
  { id: 'log_5', ruleId: 'rule_7', ruleName: 'TikTok Trending Scale', campaignId: 'c11', campaignName: 'FYP - Viral Hook', action: 'Increased budget by 25%', actionType: 'increase_budget', details: 'ROAS 3.9x on TikTok. Budget: $280 -> $350', beforeValue: 280, afterValue: 350, result: 'success', status: 'success', createdAt: '2026-06-18T05:00:00Z' },
  { id: 'log_6', ruleId: 'rule_3', ruleName: 'Low CTR Creative Alert', campaignId: 'c2', campaignName: 'Brand Awareness Q2', action: 'Flagged 2 underperforming creatives', actionType: 'notify_team', details: 'Carousel ad CTR dropped to 0.4% after 45k impressions.', beforeValue: 1.8, afterValue: 0.4, result: 'alert_sent', status: 'warning', createdAt: '2026-06-18T04:20:00Z' },
  { id: 'log_7', ruleId: 'rule_6', ruleName: 'Underperforming Pause', campaignId: 'c14', campaignName: 'TopView - Launch', action: 'Created pause draft', actionType: 'pause_campaign', details: '0 conversions after $215 spend in 7 days.', beforeValue: 0, afterValue: 0, result: 'pending_approval', status: 'warning', createdAt: '2026-06-18T03:00:00Z' },
  { id: 'log_8', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c3', campaignName: 'Retargeting - Cart Abandoners', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 5.8x strong performance. Budget: $180 -> $216', beforeValue: 180, afterValue: 216, result: 'success', status: 'success', createdAt: '2026-06-17T22:00:00Z' },
  { id: 'log_9', ruleId: 'rule_1', ruleName: 'High CPA Auto-Pause', campaignId: 'c8', campaignName: 'Display - Remarketing', action: 'Decreased bid by 15%', actionType: 'adjust_bid', details: 'CPA $44.2 trending above $50. Taking preventive action.', beforeValue: 44.2, afterValue: 37.6, result: 'success', status: 'success', createdAt: '2026-06-17T18:30:00Z' },
  { id: 'log_10', ruleId: 'rule_5', ruleName: 'Frequency Cap Monitor', campaignId: 'c16', campaignName: 'Snap Ads - App Install', action: 'Alert: Frequency climbing', actionType: 'create_alert', details: 'Frequency at 2.8x, approaching 3x cap.', beforeValue: 2.1, afterValue: 2.8, result: 'alert_sent', status: 'success', createdAt: '2026-06-17T14:00:00Z' },
  { id: 'log_11', ruleId: 'rule_7', ruleName: 'TikTok Trending Scale', campaignId: 'c12', campaignName: 'Spark Ads - UGC', action: 'Increased budget by 25%', actionType: 'increase_budget', details: 'ROAS 4.5x on Spark Ads. Budget: $200 -> $250', beforeValue: 200, afterValue: 250, result: 'success', status: 'success', createdAt: '2026-06-17T10:15:00Z' },
  { id: 'log_12', ruleId: 'rule_3', ruleName: 'Low CTR Creative Alert', campaignId: 'c18', campaignName: 'AR Lens - Branded', action: 'Flagged creative fatigue', actionType: 'notify_team', details: 'AR Lens CTR at 0.3% with 78k impressions. Recommend refresh.', beforeValue: 0.8, afterValue: 0.3, result: 'alert_sent', status: 'warning', createdAt: '2026-06-17T08:00:00Z' },
  { id: 'log_13', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c19', campaignName: 'Collection - Products', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 3.3x exceeded threshold. Budget: $160 -> $192', beforeValue: 160, afterValue: 192, result: 'success', status: 'success', createdAt: '2026-06-17T06:30:00Z' },
  { id: 'log_14', ruleId: 'rule_6', ruleName: 'Underperforming Pause', campaignId: 'c5', campaignName: 'Holiday Preview', action: 'Skipped - Ended campaign', actionType: 'pause_campaign', details: 'Campaign already ended. No action needed.', beforeValue: 0, afterValue: 0, result: 'skipped', status: 'success', createdAt: '2026-06-17T04:00:00Z' },
  { id: 'log_15', ruleId: 'rule_1', ruleName: 'High CPA Auto-Pause', campaignId: 'c17', campaignName: 'Story Ads - Promo', action: 'Alert: CPA trending up', actionType: 'create_alert', details: 'Snap CPA at $46.5, approaching $50 threshold.', beforeValue: 38, afterValue: 46.5, result: 'alert_sent', status: 'warning', createdAt: '2026-06-17T02:00:00Z' },
  { id: 'log_16', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c20', campaignName: 'Dynamic - Retargeting', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 4.1x strong performance. Budget: $120 -> $144', beforeValue: 120, afterValue: 144, result: 'success', status: 'success', createdAt: '2026-06-16T20:00:00Z' },
  { id: 'log_17', ruleId: 'rule_5', ruleName: 'Frequency Cap Monitor', campaignId: 'c1', campaignName: 'Summer Sale 2026', action: 'Alert: High frequency', actionType: 'create_alert', details: 'Video ad frequency at 3.1x on Meta retargeting.', beforeValue: 1.4, afterValue: 3.1, result: 'alert_sent', status: 'warning', createdAt: '2026-06-16T16:00:00Z' },
  { id: 'log_18', ruleId: 'rule_3', ruleName: 'Low CTR Creative Alert', campaignId: 'c7', campaignName: 'PMax - Ecommerce', action: 'Creatives performing well', actionType: 'notify_team', details: 'All PMax creatives above 1.5% CTR. No action needed.', beforeValue: 1.8, afterValue: 1.8, result: 'no_action', status: 'success', createdAt: '2026-06-16T12:00:00Z' },
];

const MOCK_AI_RECOMMENDATIONS: AIRecommendation[] = [
  { id: 'rec_1', severity: 'Critical', type: 'warning', title: 'ROAS Dropped 15% on Meta Campaign X', description: 'ROAS has fallen from 4.2x to 3.57x over the past 48h on Meta Campaign "Summer Sale 2026". Recommend immediate budget reallocation of $320 from underperforming ad sets to top performers.', metric: 'ROAS 3.57x', campaign: 'Summer Sale 2026', platform: 'Meta', confidence: 91, impact: '-$1,240/wk', createdAt: '2026-06-18T08:15:00Z' },
  { id: 'rec_2', severity: 'Warning', type: 'risk', title: 'Creative Fatigue Detected on 3 TikTok Ads', description: 'CTR has declined 34% on 3 TikTok creatives after 50k+ impressions each. Frequency climbing to 2.8x. Recommend creative refresh within 24-48 hours to prevent CPA increase.', metric: 'CTR ↓ 34%', campaign: 'TikTok FYP - Viral', platform: 'TikTok', confidence: 88, impact: '+$890 if fixed', createdAt: '2026-06-18T06:30:00Z' },
  { id: 'rec_3', severity: 'Opportunity', type: 'opportunity', title: 'Google Campaign CPA 40% Below Target', description: 'Search - Brand Terms CPA is $12.40 vs target of $20. Room to scale budget by 60% while maintaining efficient CPA. Estimated additional 140 conversions/week at current trajectory.', metric: 'CPA $12.40', campaign: 'Search - Brand Terms', platform: 'Google', confidence: 94, impact: '+$6,200/wk', createdAt: '2026-06-18T05:00:00Z' },
];

let MOCK_AGENT_STATUS: AgentStatus = {
  isRunning: true,
  lastRun: '2026-06-18T08:30:00Z',
  nextScheduledRun: '2026-06-18T09:00:00Z',
  rulesActive: 6,
  rulesPaused: 2,
  optimizationsToday: 12,
  pendingDrafts: 3,
  draftsCreatedToday: 3,
  optimizationsApplied: 156,
  budgetSaved: 12840,
  creditsTotal: 500,
  creditsUsed: 347,
  recentLogs: MOCK_OPTIMIZATION_LOGS.slice(0, 5),
};

export const agentApi = {
  async getStatus(): Promise<AgentStatus> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      return { ...MOCK_AGENT_STATUS, recentLogs: MOCK_OPTIMIZATION_LOGS.slice(0, 5) };
    }
    return apiGet<AgentStatus>('/agent/status');
  },
  async pauseAgent(): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.isRunning = false;
      return;
    }
    await apiPost('/agent/pause');
  },
  async resumeAgent(): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.isRunning = true;
      return;
    }
    await apiPost('/agent/resume');
  },
  async toggleAgent(): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.isRunning = !MOCK_AGENT_STATUS.isRunning;
      return;
    }
    await apiPost('/agent/toggle');
  },
  async getRules(): Promise<AutomationRule[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      return [...MOCK_AGENT_RULES];
    }
    return apiGet<AutomationRule[]>('/agent/rules');
  },
  async createRule(input: Partial<AutomationRule>): Promise<AutomationRule> {
    if (isDemoMode()) {
      await delay(500);
      const rule: AutomationRule = {
        id: `rule_${Date.now()}`,
        name: input.name || 'New Rule',
        description: input.description || '',
        status: input.status || 'active',
        platform: input.platform || 'Meta',
        platforms: input.platforms || [input.platform || 'Meta'],
        condition: input.condition || { metric: 'cpa', operator: 'gt', value: 50 },
        conditions: input.conditions || [{ metric: 'cpa', operator: 'gt', value: 50 }],
        action: input.action || { type: 'notify_team', params: {} },
        actions: input.actions || [{ type: 'notify_team', params: {} }],
        conditionLogic: input.conditionLogic || 'and',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 0,
      };
      MOCK_AGENT_RULES.push(rule);
      return rule;
    }
    return apiPost<AutomationRule>('/agent/rules', input);
  },
  async updateRule(id: string, input: Partial<AutomationRule>): Promise<AutomationRule> {
    if (isDemoMode()) {
      await delay(400);
      const idx = MOCK_AGENT_RULES.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Rule not found');
      MOCK_AGENT_RULES[idx] = { ...MOCK_AGENT_RULES[idx], ...input, updatedAt: new Date().toISOString() };
      return MOCK_AGENT_RULES[idx];
    }
    return apiPut<AutomationRule>(`/agent/rules/${id}`, input);
  },
  async deleteRule(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(300);
      MOCK_AGENT_RULES = MOCK_AGENT_RULES.filter((r) => r.id !== id);
      return;
    }
    await apiDelete(`/agent/rules/${id}`);
  },
  async toggleRule(id: string): Promise<AutomationRule> {
    if (isDemoMode()) {
      await delay(300);
      const idx = MOCK_AGENT_RULES.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Rule not found');
      const newStatus = MOCK_AGENT_RULES[idx].status === 'active' ? 'paused' : 'active';
      MOCK_AGENT_RULES[idx] = { ...MOCK_AGENT_RULES[idx], status: newStatus, updatedAt: new Date().toISOString() };
      MOCK_AGENT_STATUS.rulesActive = MOCK_AGENT_RULES.filter((r) => r.status === 'active').length;
      MOCK_AGENT_STATUS.rulesPaused = MOCK_AGENT_RULES.filter((r) => r.status === 'paused').length;
      return MOCK_AGENT_RULES[idx];
    }
    return apiPost<AutomationRule>(`/agent/rules/${id}/toggle`);
  },
  async getOptimizationLogs(limit?: number): Promise<OptimizationLogEntry[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      const logs = [...MOCK_OPTIMIZATION_LOGS];
      return limit ? logs.slice(0, limit) : logs;
    }
    return apiGet<OptimizationLogEntry[]>(limit ? `/agent/logs?limit=${limit}` : '/agent/logs');
  },
  async getRecommendations(): Promise<AIRecommendation[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      return [...MOCK_AI_RECOMMENDATIONS];
    }
    return apiGet<AIRecommendation[]>('/agent/recommendations');
  },
  async executeRecommendation(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(500);
      const idx = MOCK_AI_RECOMMENDATIONS.findIndex((r) => r.id === id);
      if (idx !== -1) MOCK_AI_RECOMMENDATIONS.splice(idx, 1);
      return;
    }
    await apiPost(`/agent/recommendations/${id}/execute`);
  },
  async createDraftFromRecommendation(id: string, payload?: Record<string, unknown>): Promise<void> {
    if (isDemoMode()) {
      await delay(500);
      MOCK_AGENT_STATUS.pendingDrafts += 1;
      return;
    }
    await apiPost(`/agent/recommendations/${id}/draft`, payload);
  },
  async runNow(): Promise<{ rulesChecked: number; draftsCreated: number; actions: number }> {
    if (isDemoMode()) {
      await delay(1000 + Math.random() * 500);
      const rulesChecked = MOCK_AGENT_RULES.filter((r) => r.status === 'active').length;
      const draftsCreated = Math.floor(Math.random() * 3);
      MOCK_AGENT_STATUS.optimizationsToday += draftsCreated;
      MOCK_AGENT_STATUS.lastRun = new Date().toISOString();
      return { rulesChecked, draftsCreated, actions: rulesChecked };
    }
    return apiPost('/agent/run');
  },
  async approveDraft(id: string): Promise<PendingDraft> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.pendingDrafts = Math.max(0, MOCK_AGENT_STATUS.pendingDrafts - 1);
      return { id, title: 'Draft approved', description: '', type: 'approval', status: 'approved', createdBy: 'AI Agent', createdAt: new Date().toISOString() };
    }
    return apiPost<PendingDraft>(`/drafts/${id}/approve`);
  },
  async rejectDraft(id: string): Promise<PendingDraft> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.pendingDrafts = Math.max(0, MOCK_AGENT_STATUS.pendingDrafts - 1);
      return { id, title: 'Draft rejected', description: '', type: 'rejection', status: 'rejected', createdBy: 'AI Agent', createdAt: new Date().toISOString() };
    }
    return apiPost<PendingDraft>(`/drafts/${id}/reject`);
  },
};

/* ──────────────── Drafts Mock Data ──────────────── */

const MOCK_PENDING_DRAFTS: PendingDraft[] = [
  {
    id: 'draft_1', title: 'Pause YouTube - Product Demo', description: 'CPA $72.3 exceeded threshold for 3 consecutive days. Rule: High CPA Auto-Pause.',
    type: 'pause_campaign', status: 'pending', campaignId: 'c9', campaignName: 'YouTube - Product Demo',
    platform: 'Google', changeSummary: 'CPA: $72.3 -> Pause', createdBy: 'AI Agent (High CPA Auto-Pause)', createdAt: '2026-06-18T07:15:00Z',
    expiresAt: '2026-06-19T07:15:00Z', severity: 'high', metrics: { cpa: 72.3, spend: 1240, conversions: 17 },
  },
  {
    id: 'draft_2', title: 'Pause TopView - Launch', description: '0 conversions after $215 spend in 7 days. Rule: Underperforming Pause.',
    type: 'pause_campaign', status: 'pending', campaignId: 'c14', campaignName: 'TopView - Launch',
    platform: 'TikTok', changeSummary: '0 conv -> Pause', createdBy: 'AI Agent (Underperforming Pause)', createdAt: '2026-06-18T03:00:00Z',
    expiresAt: '2026-06-19T03:00:00Z', severity: 'high', metrics: { cpa: 0, spend: 215, conversions: 0 },
  },
  {
    id: 'draft_3', title: 'Pause Snap Story - Promo', description: 'Snap CPA at $46.5 approaching threshold. Preventive pause recommended.',
    type: 'pause_campaign', status: 'pending', campaignId: 'c17', campaignName: 'Story Ads - Promo',
    platform: 'Snap', changeSummary: 'CPA: $46.5 -> Pause', createdBy: 'AI Agent (High CPA Auto-Pause)', createdAt: '2026-06-17T02:00:00Z',
    expiresAt: '2026-06-18T02:00:00Z', severity: 'medium', metrics: { cpa: 46.5, spend: 580, conversions: 12 },
  },
  {
    id: 'draft_4', title: 'Creative Refresh - Brand Q2', description: 'Carousel CTR dropped to 0.4%. Recommend new creative assets.',
    type: 'creative_swap', status: 'pending', campaignId: 'c2', campaignName: 'Brand Awareness Q2',
    platform: 'Meta', changeSummary: 'CTR: 0.4% -> Refresh', createdBy: 'AI Agent (Low CTR Creative Alert)', createdAt: '2026-06-18T04:20:00Z',
    expiresAt: '2026-06-20T04:20:00Z', severity: 'medium', metrics: { ctr: 0.4, impressions: 45000 },
  },
  {
    id: 'draft_5', title: 'Frequency Alert - Lookalike', description: 'Frequency at 3.2x. Recommend audience refresh.',
    type: 'audience_expansion', status: 'pending', campaignId: 'c4', campaignName: 'Lookalike - Purchasers',
    platform: 'Meta', changeSummary: 'Freq: 3.2x -> Expand', createdBy: 'AI Agent (Frequency Cap Monitor)', createdAt: '2026-06-18T06:00:00Z',
    expiresAt: '2026-06-19T06:00:00Z', severity: 'medium', metrics: { frequency: 3.2, impressions: 78000 },
  },
];

const MOCK_RECENT_DRAFTS: PendingDraft[] = [
  ...MOCK_PENDING_DRAFTS,
  {
    id: 'draft_6', title: 'Scale Summer Sale 2026', description: 'ROAS 4.2x exceeded threshold for 2 days. Rule: ROAS Scale Winner applied.',
    type: 'budget_change', status: 'approved', campaignId: 'c1', campaignName: 'Summer Sale 2026',
    platform: 'Meta', changeSummary: 'Budget: $400 -> $480', createdBy: 'AI Agent (ROAS Scale Winner)', createdAt: '2026-06-18T08:30:00Z',
    resolvedAt: '2026-06-18T08:35:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 4.2, spend: 400, budget: 480 },
  },
  {
    id: 'draft_7', title: 'Scale Search - Brand Terms', description: 'ROAS 6.1x outstanding performance. Budget increased automatically.',
    type: 'budget_change', status: 'approved', campaignId: 'c6', campaignName: 'Search - Brand Terms',
    platform: 'Google', changeSummary: 'Budget: $350 -> $420', createdBy: 'AI Agent (ROAS Scale Winner)', createdAt: '2026-06-18T05:45:00Z',
    resolvedAt: '2026-06-18T05:50:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 6.1, spend: 350, budget: 420 },
  },
  {
    id: 'draft_8', title: 'Adjust Snap Bids', description: 'CPA trending at $44.2. Preventive bid reduction applied.',
    type: 'bid_adjustment', status: 'approved', campaignId: 'c8', campaignName: 'Display - Remarketing',
    platform: 'Google', changeSummary: 'Bid: -15%', createdBy: 'AI Agent (High CPA Auto-Pause)', createdAt: '2026-06-17T18:30:00Z',
    resolvedAt: '2026-06-17T18:40:00Z', resolvedBy: 'jane@company.com', severity: 'medium', metrics: { cpa: 44.2, bidChange: -15 },
  },
  {
    id: 'draft_9', title: 'Scale FYP - Viral Hook', description: 'ROAS 3.9x on TikTok. Budget increase applied.',
    type: 'budget_change', status: 'approved', campaignId: 'c11', campaignName: 'FYP - Viral Hook',
    platform: 'TikTok', changeSummary: 'Budget: $280 -> $350', createdBy: 'AI Agent (TikTok Trending Scale)', createdAt: '2026-06-18T05:00:00Z',
    resolvedAt: '2026-06-18T05:05:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 3.9, budget: 350 },
  },
  {
    id: 'draft_10', title: 'Scale Retargeting - Cart', description: 'ROAS 5.8x strong retargeting performance.',
    type: 'budget_change', status: 'approved', campaignId: 'c3', campaignName: 'Retargeting - Cart Abandoners',
    platform: 'Meta', changeSummary: 'Budget: $180 -> $216', createdBy: 'AI Agent (ROAS Scale Winner)', createdAt: '2026-06-17T22:00:00Z',
    resolvedAt: '2026-06-17T22:10:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 5.8, budget: 216 },
  },
  {
    id: 'draft_11', title: 'Scale Spark Ads - UGC', description: 'ROAS 4.5x on Spark Ads. Budget increase applied.',
    type: 'budget_change', status: 'approved', campaignId: 'c12', campaignName: 'Spark Ads - UGC',
    platform: 'TikTok', changeSummary: 'Budget: $200 -> $250', createdBy: 'AI Agent (TikTok Trending Scale)', createdAt: '2026-06-17T10:15:00Z',
    resolvedAt: '2026-06-17T10:20:00Z', resolvedBy: 'jane@company.com', severity: 'low', metrics: { roas: 4.5, budget: 250 },
  },
  {
    id: 'draft_12', title: 'Scale Dynamic Retargeting', description: 'ROAS 4.1x on Snap Dynamic Ads. Budget increase applied.',
    type: 'budget_change', status: 'approved', campaignId: 'c20', campaignName: 'Dynamic - Retargeting',
    platform: 'Snap', changeSummary: 'Budget: $120 -> $144', createdBy: 'AI Agent (ROAS Scale Winner)', createdAt: '2026-06-16T20:00:00Z',
    resolvedAt: '2026-06-16T20:10:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 4.1, budget: 144 },
  },
];

export const draftsApi = {
  /** GET /api/v1/drafts?status=pending — List pending drafts */
  async getPending(): Promise<PendingDraft[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      return [...MOCK_PENDING_DRAFTS];
    }
    return apiGet<PendingDraft[]>('/drafts', { params: { status: 'pending' } });
  },

  /** GET /api/v1/drafts — List drafts with filters */
  async getRecent(params?: { status?: string; limit?: number; page?: number }): Promise<PendingDraft[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      const sorted = [...MOCK_RECENT_DRAFTS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return params?.limit ? sorted.slice(0, params.limit) : sorted;
    }
    const response = await api.get<{ data: PendingDraft[]; total: number }>('/drafts', { params });
    return response.data.data;
  },

  /** GET /api/v1/drafts/:id — Get a single draft */
  async get(id: string): Promise<PendingDraft> {
    if (isDemoMode()) {
      await delay(300);
      const draft = MOCK_RECENT_DRAFTS.find((d) => d.id === id);
      if (!draft) throw new Error('Draft not found');
      return { ...draft };
    }
    return apiGet<PendingDraft>(`/drafts/${id}`);
  },

  /** POST /api/v1/drafts/:id/approve — Approve a draft */
  async approve(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      const d = MOCK_PENDING_DRAFTS.find((x) => x.id === id);
      if (d) { d.status = 'approved'; d.resolvedAt = new Date().toISOString(); }
      return;
    }
    await apiPost<void>(`/drafts/${id}/approve`);
  },

  /** POST /api/v1/drafts/:id/reject — Reject a draft with optional reason */
  async reject(id: string, reason?: string): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      const d = MOCK_PENDING_DRAFTS.find((x) => x.id === id);
      if (d) { d.status = 'rejected'; d.resolvedAt = new Date().toISOString(); }
      return;
    }
    await apiPost<void>(`/drafts/${id}/reject`, { reason });
  },

  /** POST /api/v1/drafts/:id/discard — Discard a draft */
  async discard(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(300);
      const idx = MOCK_PENDING_DRAFTS.findIndex((x) => x.id === id);
      if (idx !== -1) MOCK_PENDING_DRAFTS.splice(idx, 1);
      return;
    }
    await apiPost<void>(`/drafts/${id}/discard`);
  },

  /** GET /api/v1/drafts/stats — Get draft statistics */
  async getStats(): Promise<{ total: number; pending: number; approved: number; rejected: number; byType: Record<string, number> }> {
    if (isDemoMode()) {
      await delay(300);
      const pending = MOCK_RECENT_DRAFTS.filter((d) => d.status === 'pending').length;
      const approved = MOCK_RECENT_DRAFTS.filter((d) => d.status === 'approved').length;
      const rejected = MOCK_RECENT_DRAFTS.filter((d) => d.status === 'rejected').length;
      const byType: Record<string, number> = {};
      MOCK_RECENT_DRAFTS.forEach((d) => { byType[d.type] = (byType[d.type] || 0) + 1; });
      return { total: MOCK_RECENT_DRAFTS.length, pending, approved, rejected, byType };
    }
    return apiGet('/drafts/stats');
  },
};

/* ═════════════════════════════════════════════════════════════════════ */
/*  DASHBOARD EXTENSIONS                                               */
/* ═════════════════════════════════════════════════════════════════════ */

export interface CampaignSummary {
  totalSpend: number;
  totalSpendChange: number;
  roas: number;
  roasChange: number;
  conversions: number;
  conversionsChange: number;
  ctr: number;
  ctrChange: number;
  cpa: number;
  cpaChange: number;
  impressions: number;
  clicks: number;
}

export interface PlatformMetrics {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpa: number;
  color: string;
}

export interface DailySpend {
  date: string;
  meta: number;
  google: number;
  tiktok: number;
  snap: number;
}

export interface CampaignStatusBreakdown {
  active: number;
  paused: number;
  ended: number;
  draft: number;
}

export interface DraftItem {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  campaignName: string;
  createdAt: string;
}

export interface RuleTrigger {
  id: string;
  ruleName: string;
  campaignName: string;
  action: string;
  triggeredAt: string;
  status: 'executed' | 'pending' | 'failed';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  createdAt: string;
  read: boolean;
}

export interface AlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  campaignName?: string;
  createdAt: string;
  dismissed: boolean;
}

export interface DashboardData {
  summary: CampaignSummary;
  platformMetrics: PlatformMetrics[];
  dailySpend: DailySpend[];
  campaigns: Campaign[];
  statusBreakdown: CampaignStatusBreakdown;
  recentDrafts: DraftItem[];
  recentTriggers: RuleTrigger[];
  recentNotifications: NotificationItem[];
  alerts: AlertItem[];
}

export function generateFallbackDashboardData(_days: number): DashboardData {
  const now = new Date();
  const dailySpend: DailySpend[] = Array.from({ length: _days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (_days - 1 - i));
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      meta: Math.round(750 + Math.sin(i * 0.3) * 200 + Math.random() * 100),
      google: Math.round(480 + Math.cos(i * 0.25) * 150 + Math.random() * 80),
      tiktok: Math.round(260 + Math.sin(i * 0.4) * 100 + Math.random() * 60),
      snap: Math.round(160 + Math.cos(i * 0.35) * 60 + Math.random() * 40),
    };
  });

  const platforms: PlatformMetrics[] = [
    { platform: 'Meta', spend: 12400, impressions: 520000, clicks: 14560, conversions: 340, roas: 4.2, ctr: 2.8, cpa: 36.5, color: '#1877F2' },
    { platform: 'Google', spend: 10800, impressions: 380000, clicks: 15960, conversions: 520, roas: 6.1, ctr: 4.2, cpa: 20.8, color: '#EA4335' },
    { platform: 'TikTok', spend: 4200, impressions: 180000, clicks: 2880, conversions: 156, roas: 4.5, ctr: 1.6, cpa: 26.9, color: '#00F2EA' },
    { platform: 'Snap', spend: 2800, impressions: 95000, clicks: 760, conversions: 73, roas: 3.3, ctr: 0.8, cpa: 38.4, color: '#FFFC00' },
  ];

  const totalSpend = platforms.reduce((s, p) => s + p.spend, 0);
  const totalConversions = platforms.reduce((s, p) => s + p.conversions, 0);
  const totalClicks = platforms.reduce((s, p) => s + p.clicks, 0);
  const totalImpressions = platforms.reduce((s, p) => s + p.impressions, 0);

  return {
    summary: {
      totalSpend,
      totalSpendChange: 12.3,
      roas: 4.1,
      roasChange: 8.1,
      conversions: totalConversions,
      conversionsChange: 24.6,
      ctr: (totalClicks / totalImpressions) * 100,
      ctrChange: -0.3,
      cpa: totalSpend / totalConversions,
      cpaChange: -5.2,
      impressions: totalImpressions,
      clicks: totalClicks,
    },
    platformMetrics: platforms,
    dailySpend,
    campaigns: [
      { id: 'c1', name: 'Summer Sale 2026', platform: 'Meta', status: 'Active', spend: 12400, impressions: 520000, clicks: 14560, conversions: 340, ctr: 2.8, roas: 4.2, cpa: 36.5, budget: 15000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Lowest Cost', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-01-15', updatedAt: '2026-01-20' },
      { id: 'c6', name: 'Search - Brand Terms', platform: 'Google', status: 'Active', spend: 10800, impressions: 380000, clicks: 15960, conversions: 520, ctr: 4.2, roas: 6.1, cpa: 20.8, budget: 12000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Target CPA', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Search'], createdAt: '2026-01-10', updatedAt: '2026-01-20' },
      { id: 'c3', name: 'Retargeting - Cart Abandoners', platform: 'Meta', status: 'Active', spend: 8200, impressions: 280000, clicks: 9520, conversions: 210, ctr: 3.4, roas: 5.8, cpa: 39.0, budget: 10000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Cost Cap', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-01-20', updatedAt: '2026-01-20' },
      { id: 'c7', name: 'PMax - Ecommerce', platform: 'Google', status: 'Active', spend: 7200, impressions: 210000, clicks: 6300, conversions: 380, ctr: 3.0, roas: 3.5, cpa: 18.9, budget: 8000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Maximize Conversions', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-01-12', updatedAt: '2026-01-20' },
      { id: 'c12', name: 'Spark Ads - UGC', platform: 'TikTok', status: 'Active', spend: 4200, impressions: 180000, clicks: 2880, conversions: 156, ctr: 1.6, roas: 4.5, cpa: 26.9, budget: 6000, objective: 'Conversions', budgetType: 'Daily', bidStrategy: 'Cost Cap', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['UGC'], createdAt: '2026-01-18', updatedAt: '2026-01-20' },
    ],
    statusBreakdown: { active: 14, paused: 4, ended: 2, draft: 3 },
    recentDrafts: [
      { id: 'd1', title: 'Pause campaign "Display - Remarketing"', type: 'pause', status: 'pending', campaignName: 'Display - Remarketing', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
      { id: 'd2', title: 'Increase Meta budget by 20%', type: 'budget', status: 'pending', campaignName: 'Summer Sale 2026', createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
      { id: 'd3', title: 'Duplicate "Spark Ads - UGC" for new audience', type: 'duplicate', status: 'approved', campaignName: 'Spark Ads - UGC', createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    ],
    recentTriggers: [
      { id: 't1', ruleName: 'High CPA Alert', campaignName: 'Display - Remarketing', action: 'Create pause draft', triggeredAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), status: 'executed' },
      { id: 't2', ruleName: 'ROAS Scale Rule', campaignName: 'Summer Sale 2026', action: 'Increase budget 20%', triggeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'executed' },
      { id: 't3', ruleName: 'Creative Fatigue', campaignName: 'FYP - Viral Hook', action: 'Notify team', triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: 'pending' },
    ],
    recentNotifications: [
      { id: 'n1', title: 'AI Agent increased Meta budget', message: 'Budget raised by 15% due to strong ROAS performance', type: 'success', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), read: false },
      { id: 'n2', title: 'Creative fatigue detected', message: '2 ads in "FYP - Viral Hook" showing declining CTR', type: 'warning', createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), read: false },
      { id: 'n3', title: 'Weekly report generated', message: 'Your Google Ads performance report is ready', type: 'info', createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), read: true },
    ],
    alerts: [
      { id: 'a1', severity: 'critical', title: 'CPA Exceeded Threshold', message: 'Campaign "Display - Remarketing" CPA exceeded $50 -- draft created to pause', campaignName: 'Display - Remarketing', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), dismissed: false },
      { id: 'a2', severity: 'warning', title: 'Goal At Risk', message: 'Goal "Q1 ROAS Target" is at risk (current: 2.1x, target: 3.0x)', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), dismissed: false },
      { id: 'a3', severity: 'warning', title: 'Budget 80% Utilized', message: 'Campaign "PMax - Ecommerce" has used 80% of its monthly budget', campaignName: 'PMax - Ecommerce', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), dismissed: false },
    ],
  };
}

/* ═════════════════════════════════════════════════════════════════════ */
/*  SETTINGS API                                                       */
/* ═════════════════════════════════════════════════════════════════════ */

export interface ConnectedAccount {
  id: string;
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap';
  name: string;
  accountId: string;
  status: 'active' | 'disconnected' | 'error';
  lastSynced: string;
  brandColor: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Analyst' | 'Viewer';
  status: 'Active' | 'Pending';
  avatar?: string;
  initials: string;
  joinedAt: string;
  platforms: string[];
}

export interface NotificationPreferences {
  email: {
    draftApproved: boolean;
    draftRejected: boolean;
    ruleTriggered: boolean;
    goalAlert: boolean;
    budgetAlert: boolean;
    dailyDigest: boolean;
    weeklySummary: boolean;
  };
  inApp: {
    draftApproved: boolean;
    draftRejected: boolean;
    ruleTriggered: boolean;
    goalAlert: boolean;
    budgetAlert: boolean;
    dailyDigest: boolean;
    weeklySummary: boolean;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
  };
}

export interface Subscription {
  plan: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  nextBilling: string;
  paymentMethod: {
    type: string;
    last4: string;
    expiry: string;
  };
}

export interface CreditUsage {
  used: number;
  limit: number;
  resetDate: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed';
  pdfUrl?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  preview: string;
  permissions: string[];
  createdAt: string;
  lastUsed: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export interface IntegrationConfig {
  slack: {
    connected: boolean;
    workspace: string;
    channel: string;
  };
  webhook: {
    url: string;
    secret: string;
    events: string[];
  };
  crm: {
    enabled: boolean;
    url: string;
  };
  zapier: {
    connected: boolean;
  };
}

let MOCK_ACCOUNTS: ConnectedAccount[] = [
  { id: 'acc_1', platform: 'Meta', name: 'Acme Corp', accountId: 'act_123456789', status: 'active', lastSynced: new Date(Date.now() - 5 * 60 * 1000).toISOString(), brandColor: '#1877F2' },
  { id: 'acc_2', platform: 'Meta', name: 'Client B', accountId: 'act_987654321', status: 'active', lastSynced: new Date(Date.now() - 15 * 60 * 1000).toISOString(), brandColor: '#1877F2' },
  { id: 'acc_3', platform: 'Google', name: 'Main Account', accountId: '123-456-7890', status: 'active', lastSynced: new Date(Date.now() - 10 * 60 * 1000).toISOString(), brandColor: '#DB4437' },
  { id: 'acc_4', platform: 'Google', name: 'Client Account', accountId: '098-765-4321', status: 'error', lastSynced: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), brandColor: '#DB4437' },
  { id: 'acc_5', platform: 'TikTok', name: 'Brand Account', accountId: 'tiktok_12345', status: 'active', lastSynced: new Date(Date.now() - 30 * 60 * 1000).toISOString(), brandColor: '#00F2EA' },
];

let MOCK_TEAM: TeamMember[] = [
  { id: 'tm_1', name: 'John Doe', email: 'john@company.com', role: 'Owner', status: 'Active', initials: 'JD', joinedAt: '2026-01-15T10:00:00Z', platforms: ['All'] },
  { id: 'tm_2', name: 'Jane Smith', email: 'jane@company.com', role: 'Admin', status: 'Active', initials: 'JS', joinedAt: '2026-02-01T14:30:00Z', platforms: ['Meta', 'Google'] },
  { id: 'tm_3', name: 'Bob Wilson', email: 'bob@company.com', role: 'Analyst', status: 'Active', initials: 'BW', joinedAt: '2026-03-10T09:00:00Z', platforms: ['View only'] },
  { id: 'tm_4', name: 'Sarah Lee', email: 'sarah@company.com', role: 'Viewer', status: 'Pending', initials: 'SL', joinedAt: '2026-06-18T11:00:00Z', platforms: [] },
];

let MOCK_NOTIFICATION_PREFS: NotificationPreferences = {
  email: { draftApproved: true, draftRejected: true, ruleTriggered: true, goalAlert: true, budgetAlert: true, dailyDigest: true, weeklySummary: false },
  inApp: { draftApproved: true, draftRejected: false, ruleTriggered: true, goalAlert: true, budgetAlert: true, dailyDigest: false, weeklySummary: true },
  slack: { enabled: true, webhookUrl: 'https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN', channel: '#ad-alerts' },
};

let MOCK_SUBSCRIPTION: Subscription = {
  plan: 'Pro',
  price: 99,
  interval: 'monthly',
  features: ['Unlimited campaigns', '20 connected accounts', '500 AI executions/mo', 'Slack integration', 'Team collaboration (5 seats)', 'API access', 'MCP server'],
  nextBilling: '2026-07-20',
  paymentMethod: { type: 'Visa', last4: '4242', expiry: '12/27' },
};

let MOCK_CREDITS: CreditUsage = { used: 347, limit: 500, resetDate: '2026-07-01' };

let MOCK_INVOICES: Invoice[] = [
  { id: 'inv_1', date: '2026-06-15', amount: 99.00, status: 'Paid' },
  { id: 'inv_2', date: '2026-05-15', amount: 99.00, status: 'Paid' },
  { id: 'inv_3', date: '2026-04-15', amount: 99.00, status: 'Paid' },
  { id: 'inv_4', date: '2026-03-15', amount: 99.00, status: 'Paid' },
];

let MOCK_API_KEYS: ApiKey[] = [
  { id: 'key_1', name: 'Production', preview: 'adx_live_sk_••••••••a3f9', permissions: ['read', 'write'], createdAt: '2026-01-15T10:00:00Z', lastUsed: '2 hours ago' },
  { id: 'key_2', name: 'Staging', preview: 'adx_live_sk_••••••••b7e2', permissions: ['read'], createdAt: '2026-03-01T14:00:00Z', lastUsed: '3 days ago' },
  { id: 'key_3', name: 'Reporting', preview: 'adx_live_sk_••••••••c1d8', permissions: ['read'], createdAt: '2026-04-10T09:30:00Z', lastUsed: '1 week ago' },
];

let MOCK_SESSIONS: ActiveSession[] = [
  { id: 'sess_1', device: 'MacBook Pro', browser: 'Chrome 126', location: 'San Francisco, CA', ip: '192.168.1.1', lastActive: 'Current session', current: true },
  { id: 'sess_2', device: 'iPhone 15', browser: 'Safari iOS', location: 'San Francisco, CA', ip: '192.168.1.2', lastActive: '2 hours ago', current: false },
  { id: 'sess_3', device: 'Windows PC', browser: 'Firefox 127', location: 'New York, NY', ip: '192.168.1.3', lastActive: '3 days ago', current: false },
];

let MOCK_INTEGRATIONS: IntegrationConfig = {
  slack: { connected: true, workspace: 'adnexus-team', channel: '#ad-alerts' },
  webhook: { url: 'https://api.company.com/webhooks/adnexus', secret: 'whsec_••••••••••••••••', events: ['campaign.created', 'draft.approved', 'alert.triggered'] },
  crm: { enabled: true, url: 'https://company.hubspot.com' },
  zapier: { connected: false },
};

export const settingsApi = {
  async integrations(): Promise<ConnectedAccount[]> {
    const { data } = await api.get('/settings/accounts');
    return data;
  },
  async connectAccount(platform: string, workspaceId: string): Promise<{ redirectUrl: string } | ConnectedAccount> {
    const oauthPlatform = platform.toLowerCase();
    if (['meta', 'google', 'tiktok', 'snap'].includes(oauthPlatform)) {
      const { data } = await api.get(`/auth/${oauthPlatform}/connect`, {
        params: { workspace_id: workspaceId },
        headers: { Accept: 'application/json' },
      });
      const redirectUrl = data?.data?.redirectUrl;
      if (typeof redirectUrl !== 'string' || !redirectUrl) {
        throw new Error('OAuth provider URL was not returned');
      }
      return { redirectUrl };
    }
    const { data } = await api.post('/settings/accounts', { platform, workspace_id: workspaceId });
    return data;
  },
  async disconnectAccount(id: string, workspaceId: string): Promise<void> {
    await api.post(`/api/v1/auth/meta/disconnect`, { account_id: id, workspace_id: workspaceId });
  },
  async refreshAccount(id: string): Promise<ConnectedAccount> {
    const { data } = await api.post(`/settings/accounts/${id}/refresh`);
    return data;
  },
  async team(): Promise<TeamMember[]> {
    await delay(300 + Math.random() * 200);
    return [...MOCK_TEAM];
  },
  async invite(email: string, role: string): Promise<TeamMember> {
    await delay(500);
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const member: TeamMember = {
      id: `tm_${Date.now()}`,
      name,
      email,
      role: role as 'Owner' | 'Admin' | 'Analyst' | 'Viewer',
      status: 'Pending',
      initials,
      joinedAt: new Date().toISOString(),
      platforms: [],
    };
    MOCK_TEAM.push(member);
    return member;
  },
  async removeMember(id: string): Promise<void> {
    await delay(300);
    MOCK_TEAM = MOCK_TEAM.filter((m) => m.id !== id);
  },
  async updateRole(id: string, role: string): Promise<TeamMember> {
    await delay(300);
    const idx = MOCK_TEAM.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Member not found');
    MOCK_TEAM[idx] = { ...MOCK_TEAM[idx], role: role as 'Owner' | 'Admin' | 'Analyst' | 'Viewer' };
    return MOCK_TEAM[idx];
  },
};

export const notificationsApi = {
  async preferences(): Promise<NotificationPreferences> {
    await delay(300);
    return { ...MOCK_NOTIFICATION_PREFS };
  },
  async updatePreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
    await delay(400);
    MOCK_NOTIFICATION_PREFS = { ...prefs };
    return MOCK_NOTIFICATION_PREFS;
  },
  async testSlack(_webhookUrl: string): Promise<{ success: boolean }> {
    await delay(800);
    return { success: true };
  },
};

export const billingApi = {
  async subscription(): Promise<Subscription> {
    await delay(300);
    return { ...MOCK_SUBSCRIPTION };
  },
  async credits(): Promise<CreditUsage> {
    await delay(300);
    return { ...MOCK_CREDITS };
  },
  async invoices(): Promise<Invoice[]> {
    await delay(300);
    return [...MOCK_INVOICES];
  },
  async createPortalSession(): Promise<{ url: string }> {
    await delay(500);
    return { url: 'https://billing.stripe.com/session/test_' + Math.random().toString(36).slice(2, 10) };
  },
};

export const apiKeysApi = {
  async list(): Promise<ApiKey[]> {
    await delay(300);
    return [...MOCK_API_KEYS];
  },
  async create(name: string, permissions: string[]): Promise<ApiKey> {
    await delay(500);
    const key: ApiKey = {
      id: `key_${Date.now()}`,
      name,
      preview: `adx_live_sk_••••••••${Math.random().toString(36).slice(2, 6)}`,
      permissions,
      createdAt: new Date().toISOString(),
      lastUsed: 'Never',
    };
    MOCK_API_KEYS.push(key);
    return key;
  },
  async revoke(id: string): Promise<void> {
    await delay(300);
    MOCK_API_KEYS = MOCK_API_KEYS.filter((k) => k.id !== id);
  },
};

export const securityApi = {
  async sessions(): Promise<ActiveSession[]> {
    await delay(300);
    return [...MOCK_SESSIONS];
  },
  async revokeSession(id: string): Promise<void> {
    await delay(300);
    MOCK_SESSIONS = MOCK_SESSIONS.filter((s) => s.id !== id);
  },
  async revokeAllSessions(): Promise<void> {
    await delay(400);
    MOCK_SESSIONS = MOCK_SESSIONS.filter((s) => s.current);
  },
  async changePassword(currentPassword: string, _newPassword: string): Promise<void> {
    await delay(500);
    if (currentPassword.length < 1) throw new Error('Current password required');
  },
};

export const integrationsApi = {
  async config(): Promise<IntegrationConfig> {
    await delay(300);
    return { ...MOCK_INTEGRATIONS };
  },
  async updateConfig(config: IntegrationConfig): Promise<IntegrationConfig> {
    await delay(400);
    MOCK_INTEGRATIONS = { ...config };
    return MOCK_INTEGRATIONS;
  },
  async toggleSlack(connected: boolean): Promise<void> {
    await delay(400);
    MOCK_INTEGRATIONS.slack.connected = connected;
  },
  async toggleCrm(enabled: boolean): Promise<void> {
    await delay(300);
    MOCK_INTEGRATIONS.crm.enabled = enabled;
  },
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  CLIENTS API                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

export interface AgencyClient {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: 'active' | 'paused';
  plan: string;
  spend: number;
  roas: number;
  campaigns: number;
  drafts: number;
  teamMembers: number;
  platforms: ('meta' | 'google' | 'tiktok' | 'snap')[];
  sparkline: number[];
  createdAt: string;
}

export interface ClientActivity {
  id: string;
  action: string;
  target: string;
  time: string;
  type: 'ai' | 'budget' | 'draft' | 'alert' | 'success' | 'platform' | 'team';
}

let MOCK_AGENCY_CLIENTS: AgencyClient[] = [
  { id: '1', name: 'Acme Corp', initials: 'AC', color: '#2563EB', status: 'active', plan: 'growth', spend: 48293, roas: 3.8, campaigns: 8, drafts: 2, teamMembers: 4, platforms: ['meta', 'google', 'tiktok'], sparkline: [42, 45, 43, 48, 50, 47, 52], createdAt: '2026-01-15' },
  { id: '2', name: 'BrightShop', initials: 'BS', color: '#10B981', status: 'active', plan: 'starter', spend: 32100, roas: 4.1, campaigns: 6, drafts: 0, teamMembers: 2, platforms: ['meta', 'google'], sparkline: [38, 40, 39, 42, 41, 44, 43], createdAt: '2026-02-01' },
  { id: '3', name: 'TechStart', initials: 'TS', color: '#F59E0B', status: 'active', plan: 'scale', spend: 28500, roas: 2.1, campaigns: 5, drafts: 4, teamMembers: 6, platforms: ['meta', 'google', 'tiktok', 'snap'], sparkline: [35, 32, 30, 28, 29, 27, 26], createdAt: '2026-01-20' },
  { id: '4', name: 'GreenLife', initials: 'GL', color: '#059669', status: 'active', plan: 'starter', spend: 19800, roas: 3.5, campaigns: 4, drafts: 1, teamMembers: 2, platforms: ['meta', 'tiktok'], sparkline: [22, 24, 23, 25, 26, 25, 27], createdAt: '2026-03-01' },
  { id: '5', name: 'FitBrand', initials: 'FB', color: '#EF4444', status: 'paused', plan: 'growth', spend: 15200, roas: 1.4, campaigns: 6, drafts: 7, teamMembers: 3, platforms: ['google', 'snap'], sparkline: [20, 18, 16, 15, 14, 13, 12], createdAt: '2026-02-10' },
  { id: '6', name: 'LuxeGoods', initials: 'LG', color: '#8B5CF6', status: 'active', plan: 'enterprise', spend: 42000, roas: 5.2, campaigns: 7, drafts: 0, teamMembers: 5, platforms: ['meta', 'google', 'tiktok'], sparkline: [45, 48, 50, 52, 51, 54, 55], createdAt: '2026-01-08' },
  { id: '7', name: 'PlayGames', initials: 'PG', color: '#EC4899', status: 'active', plan: 'growth', spend: 35600, roas: 3.9, campaigns: 5, drafts: 1, teamMembers: 3, platforms: ['meta', 'google', 'snap'], sparkline: [40, 42, 41, 43, 44, 43, 45], createdAt: '2026-02-15' },
  { id: '8', name: 'EduPlus', initials: 'EP', color: '#06B6D4', status: 'active', plan: 'scale', spend: 62900, roas: 2.3, campaigns: 6, drafts: 3, teamMembers: 8, platforms: ['meta', 'google', 'tiktok', 'snap'], sparkline: [70, 68, 65, 63, 64, 62, 60], createdAt: '2026-01-25' },
];

const MOCK_ACTIVITIES: ClientActivity[] = [
  { id: '1', action: 'AI paused 3 underperforming ad sets in', target: 'FitBrand', time: '2 min ago', type: 'ai' },
  { id: '2', action: 'Budget increased by 25% for', target: 'LuxeGoods \u2014 Summer Sale', time: '15 min ago', type: 'budget' },
  { id: '3', action: 'New campaign draft created for', target: 'Acme Corp', time: '32 min ago', type: 'draft' },
  { id: '4', action: 'Creative fatigue alert:', target: 'TechStart \u2014 Hook Challenge', time: '1 hr ago', type: 'alert' },
  { id: '5', action: 'ROAS target exceeded for', target: 'BrightShop', time: '2 hr ago', type: 'success' },
  { id: '6', action: 'Platform connected:', target: 'Snap Ads \u2014 EduPlus', time: '3 hr ago', type: 'platform' },
  { id: '7', action: 'Team member added to', target: 'GreenLife', time: '4 hr ago', type: 'team' },
  { id: '8', action: 'AI auto-adjusted bids for', target: 'PlayGames', time: '5 hr ago', type: 'ai' },
];

export interface CreateClientInput {
  name: string;
  plan: string;
}

export const clientsApi = {
  async list(): Promise<AgencyClient[]> {
    await delay(400);
    return [...MOCK_AGENCY_CLIENTS];
  },
  async create(input: CreateClientInput): Promise<AgencyClient> {
    await delay(500);
    const words = input.name.split(/\s+/).filter(Boolean);
    const initials = words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : input.name.slice(0, 2);
    const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#059669'];
    const client: AgencyClient = {
      id: `c_${Date.now()}`,
      name: input.name,
      initials: initials.toUpperCase(),
      color: colors[Math.floor(Math.random() * colors.length)],
      status: 'active',
      plan: input.plan || 'starter',
      spend: 0,
      roas: 0,
      campaigns: 0,
      drafts: 0,
      teamMembers: 1,
      platforms: ['meta'],
      sparkline: [0, 0, 0, 0, 0, 0, 0],
      createdAt: new Date().toISOString(),
    };
    MOCK_AGENCY_CLIENTS.push(client);
    return client;
  },
  async delete(id: string): Promise<void> {
    await delay(300);
    MOCK_AGENCY_CLIENTS = MOCK_AGENCY_CLIENTS.filter((c) => c.id !== id);
  },
  async toggleStatus(id: string): Promise<AgencyClient> {
    await delay(300);
    const client = MOCK_AGENCY_CLIENTS.find((c) => c.id === id);
    if (!client) throw new Error('Client not found');
    client.status = client.status === 'active' ? 'paused' : 'active';
    return { ...client };
  },
  async activities(): Promise<ClientActivity[]> {
    await delay(300);
    return [...MOCK_ACTIVITIES];
  },
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  GOALS API                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

export type GoalType = 'ROAS' | 'CPA' | 'CTR' | 'Spend' | 'Conversions' | 'Custom';
export type GoalStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed';
export type GoalPlatform = 'Meta' | 'Google' | 'TikTok' | 'Snap' | 'All';

export interface PerformanceGoal {
  id: string;
  name: string;
  type: GoalType;
  platform: GoalPlatform;
  current: number;
  target: number;
  unit: string;
  status: GoalStatus;
  startDate: string;
  endDate: string;
  campaigns: string[];
  alertWhen: 'at-risk' | 'off-track' | 'never';
}

export interface CreateGoalInput {
  name: string;
  type: GoalType;
  target: number;
  unit: string;
  platform: GoalPlatform;
  campaigns: string[];
  startDate: string;
  endDate: string;
  alertWhen: 'at-risk' | 'off-track' | 'never';
}

let MOCK_GOALS: PerformanceGoal[] = [
  { id: '1', name: 'Q2 ROAS Target', type: 'ROAS', platform: 'All', current: 3.8, target: 4.0, unit: 'x', status: 'on-track', startDate: '2026-04-01', endDate: '2026-06-30', campaigns: ['All campaigns'], alertWhen: 'at-risk' },
  { id: '2', name: 'Meta CPA Reduction', type: 'CPA', platform: 'Meta', current: 36, target: 28, unit: '$', status: 'on-track', startDate: '2026-05-01', endDate: '2026-06-15', campaigns: ['Summer Sale', 'Retargeting'], alertWhen: 'at-risk' },
  { id: '3', name: 'Google CTR Improvement', type: 'CTR', platform: 'Google', current: 2.1, target: 2.8, unit: '%', status: 'at-risk', startDate: '2026-05-01', endDate: '2026-05-31', campaigns: ['Search Brand', 'PMax'], alertWhen: 'off-track' },
  { id: '4', name: 'Monthly Spend Cap', type: 'Spend', platform: 'All', current: 150, target: 180, unit: 'K', status: 'off-track', startDate: '2026-05-01', endDate: '2026-05-31', campaigns: ['All campaigns'], alertWhen: 'at-risk' },
  { id: '5', name: 'TikTok Video Completion', type: 'Custom', platform: 'TikTok', current: 35, target: 45, unit: '%', status: 'on-track', startDate: '2026-04-15', endDate: '2026-06-15', campaigns: ['FYP Viral', 'Spark Ads'], alertWhen: 'at-risk' },
  { id: '6', name: 'Snap App Install Volume', type: 'Conversions', platform: 'Snap', current: 95, target: 150, unit: '', status: 'on-track', startDate: '2026-05-01', endDate: '2026-06-30', campaigns: ['App Install', 'Dynamic'], alertWhen: 'at-risk' },
  { id: '7', name: 'Creative Refresh Frequency', type: 'Custom', platform: 'Meta', current: 2.5, target: 2.0, unit: 'wks', status: 'completed', startDate: '2026-01-01', endDate: '2026-12-31', campaigns: ['All campaigns'], alertWhen: 'never' },
  { id: '8', name: 'Cross-Platform ROAS', type: 'ROAS', platform: 'All', current: 3.0, target: 3.5, unit: 'x', status: 'at-risk', startDate: '2026-05-01', endDate: '2026-05-31', campaigns: ['All campaigns'], alertWhen: 'off-track' },
];

export const goalsApi = {
  async list(): Promise<PerformanceGoal[]> {
    await delay(400);
    return [...MOCK_GOALS];
  },
  async create(input: CreateGoalInput): Promise<PerformanceGoal> {
    await delay(500);
    const goal: PerformanceGoal = {
      id: `g_${Date.now()}`,
      ...input,
      current: 0,
      status: 'on-track',
    };
    MOCK_GOALS.push(goal);
    return goal;
  },
  async update(id: string, input: Partial<CreateGoalInput>): Promise<PerformanceGoal> {
    await delay(400);
    const idx = MOCK_GOALS.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error('Goal not found');
    MOCK_GOALS[idx] = { ...MOCK_GOALS[idx], ...input };
    return { ...MOCK_GOALS[idx] };
  },
  async delete(id: string): Promise<void> {
    await delay(300);
    MOCK_GOALS = MOCK_GOALS.filter((g) => g.id !== id);
  },
  async toggleStatus(id: string): Promise<PerformanceGoal> {
    await delay(300);
    const goal = MOCK_GOALS.find((g) => g.id === id);
    if (!goal) throw new Error('Goal not found');
    goal.status = goal.status === 'on-track' ? 'at-risk' : 'on-track';
    return { ...goal };
  },
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  SCOPES API                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

export type ScopeLevel = 'none' | 'read' | 'draft-only' | 'full';

export interface ApiEndpoint {
  key: string;
  name: string;
  category: string;
}

export interface ClientScope {
  clientId: string;
  clientName: string;
  scopes: Record<string, ScopeLevel>;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  { key: 'campaigns_read', name: 'Campaigns Read', category: 'Campaigns' },
  { key: 'campaigns_write', name: 'Campaigns Write', category: 'Campaigns' },
  { key: 'campaigns_delete', name: 'Campaigns Delete', category: 'Campaigns' },
  { key: 'drafts_read', name: 'Drafts Read', category: 'Drafts' },
  { key: 'drafts_write', name: 'Drafts Write', category: 'Drafts' },
  { key: 'drafts_approve', name: 'Drafts Approve', category: 'Drafts' },
  { key: 'audiences_read', name: 'Audiences Read', category: 'Audiences' },
  { key: 'audiences_write', name: 'Audiences Write', category: 'Audiences' },
  { key: 'creatives_read', name: 'Creatives Read', category: 'Creatives' },
  { key: 'creatives_write', name: 'Creatives Write', category: 'Creatives' },
  { key: 'reports_read', name: 'Reports Read', category: 'Reports' },
  { key: 'reports_export', name: 'Reports Export', category: 'Reports' },
  { key: 'billing_read', name: 'Billing Read', category: 'Billing' },
  { key: 'team_read', name: 'Team Read', category: 'Team' },
  { key: 'team_manage', name: 'Team Manage', category: 'Team' },
  { key: 'settings_read', name: 'Settings Read', category: 'Settings' },
  { key: 'settings_write', name: 'Settings Write', category: 'Settings' },
];

let MOCK_SCOPES: ClientScope[] = [
  { clientId: '1', clientName: 'Acme Corp', scopes: {
    campaigns_read: 'full', campaigns_write: 'full', campaigns_delete: 'draft-only',
    drafts_read: 'full', drafts_write: 'full', drafts_approve: 'full',
    audiences_read: 'full', audiences_write: 'full',
    creatives_read: 'full', creatives_write: 'full',
    reports_read: 'full', reports_export: 'full',
    billing_read: 'read', team_read: 'full', team_manage: 'draft-only',
    settings_read: 'read', settings_write: 'draft-only',
  }},
  { clientId: '2', clientName: 'BrightShop', scopes: {
    campaigns_read: 'full', campaigns_write: 'full', campaigns_delete: 'none',
    drafts_read: 'full', drafts_write: 'full', drafts_approve: 'read',
    audiences_read: 'full', audiences_write: 'draft-only',
    creatives_read: 'full', creatives_write: 'full',
    reports_read: 'full', reports_export: 'read',
    billing_read: 'read', team_read: 'read', team_manage: 'none',
    settings_read: 'read', settings_write: 'none',
  }},
  { clientId: '3', clientName: 'TechStart', scopes: {
    campaigns_read: 'full', campaigns_write: 'full', campaigns_delete: 'full',
    drafts_read: 'full', drafts_write: 'full', drafts_approve: 'full',
    audiences_read: 'full', audiences_write: 'full',
    creatives_read: 'full', creatives_write: 'full',
    reports_read: 'full', reports_export: 'full',
    billing_read: 'full', team_read: 'full', team_manage: 'full',
    settings_read: 'full', settings_write: 'full',
  }},
  { clientId: '4', clientName: 'GreenLife', scopes: {
    campaigns_read: 'full', campaigns_write: 'draft-only', campaigns_delete: 'none',
    drafts_read: 'full', drafts_write: 'draft-only', drafts_approve: 'none',
    audiences_read: 'read', audiences_write: 'none',
    creatives_read: 'full', creatives_write: 'draft-only',
    reports_read: 'read', reports_export: 'none',
    billing_read: 'read', team_read: 'read', team_manage: 'none',
    settings_read: 'read', settings_write: 'none',
  }},
  { clientId: '5', clientName: 'FitBrand', scopes: {
    campaigns_read: 'full', campaigns_write: 'full', campaigns_delete: 'draft-only',
    drafts_read: 'full', drafts_write: 'full', drafts_approve: 'draft-only',
    audiences_read: 'full', audiences_write: 'read',
    creatives_read: 'full', creatives_write: 'full',
    reports_read: 'full', reports_export: 'draft-only',
    billing_read: 'read', team_read: 'full', team_manage: 'none',
    settings_read: 'read', settings_write: 'draft-only',
  }},
];

export const scopesApi = {
  async endpoints(): Promise<ApiEndpoint[]> {
    await delay(200);
    return [...API_ENDPOINTS];
  },
  async list(): Promise<ClientScope[]> {
    await delay(400);
    return [...MOCK_SCOPES];
  },
  async update(clientId: string, scopes: Record<string, ScopeLevel>): Promise<ClientScope> {
    await delay(400);
    const idx = MOCK_SCOPES.findIndex((s) => s.clientId === clientId);
    if (idx === -1) {
      const client = MOCK_AGENCY_CLIENTS.find((c) => c.id === clientId);
      const newScope: ClientScope = { clientId, clientName: client?.name || 'Unknown', scopes };
      MOCK_SCOPES.push(newScope);
      return { ...newScope };
    }
    MOCK_SCOPES[idx] = { ...MOCK_SCOPES[idx], scopes };
    return { ...MOCK_SCOPES[idx] };
  },
  async applyTemplate(clientId: string, template: 'standard' | 'read-only' | 'full'): Promise<ClientScope> {
    await delay(400);
    const endpoints = API_ENDPOINTS.map((e) => e.key);
    let scopes: Record<string, ScopeLevel> = {};
    if (template === 'read-only') {
      endpoints.forEach((k) => { scopes[k] = 'read'; });
    } else if (template === 'full') {
      endpoints.forEach((k) => { scopes[k] = 'full'; });
    } else {
      endpoints.forEach((k) => {
        if (k.includes('_delete') || k.includes('_manage') || k.includes('_approve')) scopes[k] = 'draft-only';
        else if (k.includes('_write')) scopes[k] = 'full';
        else scopes[k] = 'full';
      });
    }
    return scopesApi.update(clientId, scopes);
  },
};
