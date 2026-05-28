/**
 * cache.ts — Client-side cache layer
 *
 * Wraps API calls with a time-based (TTL) cache, persists critical
 * data to localStorage, and invalidates entries via Server-Sent Events.
 */

/* ── Types ─────────────────────────────────────────────────────────── */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  key: string;
}

interface CacheOptions {
  ttlMs?: number; // default 5 min
  persist?: boolean; // write to localStorage
  tags?: string[]; // invalidation tags
}

type Fetcher<T> = () => Promise<T>;

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CRITICAL_STORAGE_KEY = "api_cache_critical";
const MAX_MEMORY_ENTRIES = 200;

/* ── In-memory store ───────────────────────────────────────────────── */

const memoryCache = new Map<string, CacheEntry<unknown>>();
let stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };
let sseInitialized = false;

/* ── Core helpers ──────────────────────────────────────────────────── */

function isExpired<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.cachedAt > entry.ttlMs;
}

function persistCritical(): void {
  try {
    const critical: Record<string, CacheEntry<unknown>> = {};
    memoryCache.forEach((entry, key) => {
      if (entry.ttlMs > DEFAULT_TTL_MS) {
        critical[key] = entry;
      }
    });
    localStorage.setItem(CRITICAL_STORAGE_KEY, JSON.stringify(critical));
  } catch {
    // localStorage quota exceeded — drop
  }
}

function loadCritical(): void {
  try {
    const raw = localStorage.getItem(CRITICAL_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([key, entry]) => {
      if (!memoryCache.has(key) && !isExpired(entry as CacheEntry<unknown>)) {
        memoryCache.set(key, entry as CacheEntry<unknown>);
      }
    });
  } catch {
    // corrupted cache — ignore
  }
}

function evictLRU(): void {
  if (memoryCache.size < MAX_MEMORY_ENTRIES) return;
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  memoryCache.forEach((entry, key) => {
    if (entry.cachedAt < oldestTime) {
      oldestTime = entry.cachedAt;
      oldestKey = key;
    }
  });
  if (oldestKey) {
    memoryCache.delete(oldestKey);
    stats.evictions++;
  }
}

/* ── SSE invalidation ──────────────────────────────────────────────── */

/**
 * Connects to an SSE endpoint that broadcasts cache-invalidation events.
 * Expected message format (JSON):
 *   { "tags": ["posts", "users"], "keys": ["/api/posts"] }
 */
export function initCacheInvalidation(sseUrl: string): () => void {
  if (sseInitialized) return () => {};
  sseInitialized = true;

  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    eventSource = new EventSource(sseUrl);

    eventSource.addEventListener("cache-invalidate", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        invalidateTags(payload.tags || []);
        invalidateKeys(payload.keys || []);
      } catch {
        // malformed payload — skip
      }
    });

    eventSource.addEventListener("error", () => {
      eventSource?.close();
      reconnectTimer = setTimeout(connect, 10000); // reconnect after 10s
    });
  };

  connect();
  loadCritical();

  return () => {
    sseInitialized = false;
    eventSource?.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Fetches data through the cache layer.
 *
 * @param key   — unique cache key (e.g. URL or "posts:user:42")
 * @param fetcher — async function that returns fresh data
 * @param opts  — caching options
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: Fetcher<T>,
  opts: CacheOptions = {}
): Promise<T> {
  const { ttlMs = DEFAULT_TTL_MS, persist = false } = opts;

  const existing = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (existing && !isExpired(existing)) {
    stats.hits++;
    return existing.data as T;
  }

  // Miss — fetch fresh
  stats.misses++;
  const data = await fetcher();

  evictLRU();
  memoryCache.set(key, { data, cachedAt: Date.now(), ttlMs, key });

  if (persist) {
    persistCritical();
  }

  return data;
}

/**
 * Wraps an async API function with automatic caching.
 *
 * @param fn    — the API call
 * @param keyFn — derives a cache key from the function arguments
 * @param opts  — cache options
 *
 * Usage:
 *   const getUser = wrapWithCache(
 *     (id: string) => api.get(`/users/${id}`),
 *     (id) => `user:${id}`,
 *     { ttlMs: 60000 }
 *   );
 */
export function wrapWithCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyFn: (...args: TArgs) => string,
  opts: CacheOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const key = keyFn(...args);
    return cachedFetch(key, () => fn(...args), opts);
  };
}

/**
 * Returns cached data immediately if available (even if stale).
 * Useful for SSR hydration or offline-first reads.
 */
export function getStaleWhileRevalidate<T>(key: string): T | undefined {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  return entry?.data as T | undefined;
}

/**
 * Explicitly invalidates one or more cache entries by exact key.
 */
export function invalidateKeys(keys: string[]): void {
  keys.forEach((k) => memoryCache.delete(k));
}

/**
 * Invalidates all entries whose key contains any of the given tags.
 */
export function invalidateTags(tags: string[]): void {
  if (tags.length === 0) return;
  const keysToDelete: string[] = [];
  memoryCache.forEach((entry) => {
    if (tags.some((tag) => entry.key.includes(tag))) {
      keysToDelete.push(entry.key);
    }
  });
  keysToDelete.forEach((k) => memoryCache.delete(k));
}

/**
 * Clears the entire in-memory cache and optional localStorage persistence.
 */
export function clearCache(clearPersistent = false): void {
  memoryCache.clear();
  if (clearPersistent) {
    try {
      localStorage.removeItem(CRITICAL_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
}

/**
 * Returns a snapshot of cache statistics.
 */
export function getCacheStats(): CacheStats {
  return { ...stats, size: memoryCache.size };
}

/**
 * Pre-warms the cache with data (useful for SSR or optimistic updates).
 */
export function prewarmCache<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  evictLRU();
  memoryCache.set(key, { data, cachedAt: Date.now(), ttlMs, key });
}
