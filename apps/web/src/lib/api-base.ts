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
      expiresAt: data.session?.expires_at ? data.session.expires_at * 1000 : null,
    };
  } catch {
    // Fallback: try localStorage (same key as authFetch.ts and AuthProvider.tsx)
    try {
      const token = localStorage.getItem('adnexus_token');
      cachedTokens = {
        accessToken: token,
        expiresAt: null,
      };
    } catch {
      cachedTokens = { accessToken: null, expiresAt: null };
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

    // 2. Add workspace ID from localStorage (only if auth is active)
    try {
      if (localStorage.getItem('adnexus_token')) {
        const workspaceId = localStorage.getItem('workspace_id');
        if (workspaceId) {
          config.headers['X-Workspace-Id'] = workspaceId;
        }
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
