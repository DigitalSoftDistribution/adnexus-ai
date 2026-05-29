import prometheus from 'prom-client';

// ─── Registry ───
export const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

// ─── Custom Metrics ───

// HTTP request duration histogram
export const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(httpRequestDuration);

// HTTP request counter
export const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestTotal);

// Active WebSocket/SSE connections gauge
export const activeConnections = new prometheus.Gauge({
  name: 'active_sse_connections',
  help: 'Number of active SSE connections',
  labelNames: ['workspace_id'],
});
register.registerMetric(activeConnections);

// Draft processing counter
export const draftCounter = new prometheus.Counter({
  name: 'drafts_processed_total',
  help: 'Total number of drafts processed',
  labelNames: ['status', 'draft_type'],
});
register.registerMetric(draftCounter);

// AI API calls counter
export const aiApiCalls = new prometheus.Counter({
  name: 'ai_api_calls_total',
  help: 'Total number of AI API calls',
  labelNames: ['model', 'status', 'feature'],
});
register.registerMetric(aiApiCalls);

// Cache hit/miss counters
export const cacheHits = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_type'],
});
export const cacheMisses = new prometheus.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_type'],
});
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);

// Background job metrics
export const jobDuration = new prometheus.Histogram({
  name: 'background_job_duration_seconds',
  help: 'Duration of background jobs',
  labelNames: ['job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
});
register.registerMetric(jobDuration);

// ─── Export Metrics ──────────────────────────────────────────

export async function getMetrics(): Promise<string> {
  return register.metrics();
}
