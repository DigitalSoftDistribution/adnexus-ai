/**
 * AdNexus AI — Alert Rules
 * Prometheus alert rule definitions exported as YAML-compatible objects.
 * These are consumed by the Prometheus configuration and AlertManager.
 */

// ── Rule Group Type ────────────────────────────────────────

export interface AlertRule {
  alert: string;
  expr: string;
  for: string;
  labels: {
    severity: "critical" | "warning" | "info";
    team: string;
    service: string;
  };
  annotations: {
    summary: string;
    description: string;
    runbook_url: string;
    dashboard_url: string;
  };
}

export interface RuleGroup {
  name: string;
  interval: string;
  rules: AlertRule[];
}

export interface AlertRuleFile {
  groups: RuleGroup[];
}

// ── Constants ──────────────────────────────────────────────

const TEAM = "adnexus-platform";
const DASHBOARD_BASE_URL =
  process.env.GRAFANA_URL || "https://grafana.adnexus.io/d";
const RUNBOOK_BASE_URL =
  process.env.RUNBOOK_URL || "https://wiki.adnexus.io/runbooks";

// ── Severity Thresholds ────────────────────────────────────

const THRESHOLDS = {
  errorRatePercent: 5,
  errorRatePercentCritical: 10,
  p95ResponseTimeSec: 2,
  p99ResponseTimeSec: 5,
  dbPoolUtilizationPercent: 80,
  dbConnectionFailures: 3,
  rateLimitRemainingPercent: 10,
  aiFailureRatePercent: 15,
  draftBacklogSize: 100,
  draftApprovalLatencySec: 300,
  cpuUsagePercent: 80,
  memoryUsagePercent: 85,
  diskUsagePercent: 85,
} as const;

// ═══════════════════════════════════════════════════════════
// Alert Rule Definitions
// ═══════════════════════════════════════════════════════════

/**
 * HighErrorRate — fires when API error rate exceeds threshold.
 */
const alertHighErrorRate: AlertRule = {
  alert: "AdNexusHighErrorRate",
  expr: `sum(rate(adnexus_api_call_total{status=~"5.."}[5m])) / sum(rate(adnexus_api_call_total[5m])) * 100 > ${THRESHOLDS.errorRatePercent}`,
  for: "5m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "api-gateway",
  },
  annotations: {
    summary: "High API error rate detected",
    description:
      "API error rate is {{ $value }}% over the last 5 minutes, exceeding threshold of " +
      `${THRESHOLDS.errorRatePercent}%.`,
    runbook_url: `${RUNBOOK_BASE_URL}/high-error-rate`,
    dashboard_url: `${DASHBOARD_BASE_URL}/api-errors`,
  },
};

const alertCriticalErrorRate: AlertRule = {
  alert: "AdNexusCriticalErrorRate",
  expr: `sum(rate(adnexus_api_call_total{status=~"5.."}[5m])) / sum(rate(adnexus_api_call_total[5m])) * 100 > ${THRESHOLDS.errorRatePercentCritical}`,
  for: "2m",
  labels: {
    severity: "critical",
    team: TEAM,
    service: "api-gateway",
  },
  annotations: {
    summary: "CRITICAL: API error rate critically high",
    description:
      "API error rate is {{ $value }}% — services may be severely impacted.",
    runbook_url: `${RUNBOOK_BASE_URL}/critical-error-rate`,
    dashboard_url: `${DASHBOARD_BASE_URL}/api-errors`,
  },
};

/**
 * HighResponseTime — fires when p95 latency exceeds threshold.
 */
const alertHighResponseTime: AlertRule = {
  alert: "AdNexusHighResponseTime",
  expr: `histogram_quantile(0.95, rate(adnexus_api_http_request_duration_seconds_bucket[5m])) > ${THRESHOLDS.p95ResponseTimeSec}`,
  for: "5m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "api-gateway",
  },
  annotations: {
    summary: "API p95 response time is high",
    description:
      "API p95 response time is {{ $value }}s, exceeding threshold of " +
      `${THRESHOLDS.p95ResponseTimeSec}s.`,
    runbook_url: `${RUNBOOK_BASE_URL}/high-response-time`,
    dashboard_url: `${DASHBOARD_BASE_URL}/api-latency`,
  },
};

const alertCriticalResponseTime: AlertRule = {
  alert: "AdNexusCriticalResponseTime",
  expr: `histogram_quantile(0.99, rate(adnexus_api_http_request_duration_seconds_bucket[5m])) > ${THRESHOLDS.p99ResponseTimeSec}`,
  for: "3m",
  labels: {
    severity: "critical",
    team: TEAM,
    service: "api-gateway",
  },
  annotations: {
    summary: "CRITICAL: API p99 response time critically high",
    description:
      "API p99 response time is {{ $value }}s. User experience severely degraded.",
    runbook_url: `${RUNBOOK_BASE_URL}/critical-response-time`,
    dashboard_url: `${DASHBOARD_BASE_URL}/api-latency`,
  },
};

/**
 * DatabaseConnectionFailure — fires on DB connectivity issues.
 */
const alertDatabaseConnectionFailure: AlertRule = {
  alert: "AdNexusDatabaseConnectionFailure",
  expr: `increase(adnexus_db_connection_errors_total[5m]) > ${THRESHOLDS.dbConnectionFailures}`,
  for: "1m",
  labels: {
    severity: "critical",
    team: TEAM,
    service: "database",
  },
  annotations: {
    summary: "Database connection failures detected",
    description:
      "{{ $value }} database connection failures in the last 5 minutes. " +
      "Pool may be exhausted or DB unreachable.",
    runbook_url: `${RUNBOOK_BASE_URL}/db-connection-failure`,
    dashboard_url: `${DASHBOARD_BASE_URL}/db-health`,
  },
};

const alertDatabasePoolExhaustion: AlertRule = {
  alert: "AdNexusDatabasePoolExhaustion",
  expr: `(adnexus_db_connection_pool_size{role="primary"} - adnexus_db_connection_pool_available{role="primary"}) / adnexus_db_connection_pool_size{role="primary"} * 100 > ${THRESHOLDS.dbPoolUtilizationPercent}`,
  for: "5m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "database",
  },
  annotations: {
    summary: "Database connection pool nearly exhausted",
    description:
      "DB pool utilization is {{ $value }}%. New requests may be queued or fail.",
    runbook_url: `${RUNBOOK_BASE_URL}/db-pool-exhaustion`,
    dashboard_url: `${DASHBOARD_BASE_URL}/db-health`,
  },
};

const alertDatabaseSlowQueries: AlertRule = {
  alert: "AdNexusDatabaseSlowQueries",
  expr: `histogram_quantile(0.95, rate(adnexus_db_query_duration_seconds_bucket[5m])) > 1`,
  for: "10m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "database",
  },
  annotations: {
    summary: "Slow database queries detected",
    description:
      "DB p95 query time is {{ $value }}s. Review slow query log for optimization.",
    runbook_url: `${RUNBOOK_BASE_URL}/db-slow-queries`,
    dashboard_url: `${DASHBOARD_BASE_URL}/db-performance`,
  },
};

/**
 * PlatformApiRateLimit — fires when rate limit is nearly depleted.
 */
const alertPlatformRateLimitApproaching: AlertRule = {
  alert: "AdNexusPlatformRateLimitApproaching",
  expr: `adnexus_platform_rate_limit_remaining / 100 * 100 < ${THRESHOLDS.rateLimitRemainingPercent}`,
  for: "1m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "platform-integrations",
  },
  annotations: {
    summary: "Platform API rate limit nearly exhausted",
    description:
      "Platform {{ $labels.platform }} endpoint {{ $labels.endpoint }} has " +
      "{{ $value }}% of rate limit remaining.",
    runbook_url: `${RUNBOOK_BASE_URL}/platform-rate-limit`,
    dashboard_url: `${DASHBOARD_BASE_URL}/platform-api`,
  },
};

const alertPlatformApiErrors: AlertRule = {
  alert: "AdNexusPlatformApiErrors",
  expr: `sum(rate(adnexus_platform_api_errors_total[10m])) by (platform) > 5`,
  for: "5m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "platform-integrations",
  },
  annotations: {
    summary: "Platform API errors elevated",
    description:
      "Platform {{ $labels.platform }} has {{ $value }} errors/sec. " +
      "Integration may be degraded.",
    runbook_url: `${RUNBOOK_BASE_URL}/platform-api-errors`,
    dashboard_url: `${DASHBOARD_BASE_URL}/platform-api`,
  },
};

/**
 * AIAgentFailures — fires when AI action failure rate is high.
 */
const alertAiAgentFailures: AlertRule = {
  alert: "AdNexusAiAgentFailures",
  expr: `sum(rate(adnexus_ai_action_errors_total[10m])) by (action_type, platform) / sum(rate(adnexus_ai_action_duration_seconds_count[10m])) by (action_type, platform) * 100 > ${THRESHOLDS.aiFailureRatePercent}`,
  for: "5m",
  labels: {
    severity: "critical",
    team: TEAM,
    service: "ai-agent",
  },
  annotations: {
    summary: "AI agent failure rate is high",
    description:
      "AI action {{ $labels.action_type }} for {{ $labels.platform }} has a " +
      "{{ $value }}% failure rate.",
    runbook_url: `${RUNBOOK_BASE_URL}/ai-agent-failures`,
    dashboard_url: `${DASHBOARD_BASE_URL}/ai-agent`,
  },
};

const alertAiAgentHighLatency: AlertRule = {
  alert: "AdNexusAiAgentHighLatency",
  expr: `histogram_quantile(0.95, rate(adnexus_ai_action_duration_seconds_bucket[10m])) > 30`,
  for: "10m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "ai-agent",
  },
  annotations: {
    summary: "AI agent response time is high",
    description:
      "AI agent p95 latency is {{ $value }}s. Model or prompt may need optimization.",
    runbook_url: `${RUNBOOK_BASE_URL}/ai-agent-latency`,
    dashboard_url: `${DASHBOARD_BASE_URL}/ai-agent`,
  },
};

/**
 * DraftApprovalBacklog — fires when too many drafts are pending.
 */
const alertDraftApprovalBacklog: AlertRule = {
  alert: "AdNexusDraftApprovalBacklog",
  expr: `sum(adnexus_draft_backlog_size) by (platform) > ${THRESHOLDS.draftBacklogSize}`,
  for: "10m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "draft-approval",
  },
  annotations: {
    summary: "Draft approval backlog is growing",
    description:
      "{{ $value }} drafts pending approval for {{ $labels.platform }}. " +
      "Review approval workflow or staffing.",
    runbook_url: `${RUNBOOK_BASE_URL}/draft-backlog`,
    dashboard_url: `${DASHBOARD_BASE_URL}/draft-approval`,
  },
};

const alertDraftApprovalLatency: AlertRule = {
  alert: "AdNexusDraftApprovalLatency",
  expr: `histogram_quantile(0.95, rate(adnexus_draft_approval_latency_seconds_bucket[15m])) > ${THRESHOLDS.draftApprovalLatencySec}`,
  for: "15m",
  labels: {
    severity: "info",
    team: TEAM,
    service: "draft-approval",
  },
  annotations: {
    summary: "Draft approval latency is elevated",
    description:
      "p95 draft approval time is {{ $value }}s. May indicate workflow bottleneck.",
    runbook_url: `${RUNBOOK_BASE_URL}/draft-latency`,
    dashboard_url: `${DASHBOARD_BASE_URL}/draft-approval`,
  },
};

/**
 * Infrastructure alerts — node-level resource usage.
 */
const alertHighCPUUsage: AlertRule = {
  alert: "AdNexusHighCPUUsage",
  expr: `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > ${THRESHOLDS.cpuUsagePercent}`,
  for: "10m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "infrastructure",
  },
  annotations: {
    summary: "High CPU usage on {{ $labels.instance }}",
    description: "CPU usage is {{ $value }}% for more than 10 minutes.",
    runbook_url: `${RUNBOOK_BASE_URL}/high-cpu`,
    dashboard_url: `${DASHBOARD_BASE_URL}/node-metrics`,
  },
};

const alertHighMemoryUsage: AlertRule = {
  alert: "AdNexusHighMemoryUsage",
  expr: `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > ${THRESHOLDS.memoryUsagePercent}`,
  for: "10m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "infrastructure",
  },
  annotations: {
    summary: "High memory usage on {{ $labels.instance }}",
    description: "Memory usage is {{ $value }}% for more than 10 minutes.",
    runbook_url: `${RUNBOOK_BASE_URL}/high-memory`,
    dashboard_url: `${DASHBOARD_BASE_URL}/node-metrics`,
  },
};

const alertDiskSpaceLow: AlertRule = {
  alert: "AdNexusDiskSpaceLow",
  expr: `node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100 < 15`,
  for: "5m",
  labels: {
    severity: "critical",
    team: TEAM,
    service: "infrastructure",
  },
  annotations: {
    summary: "Low disk space on {{ $labels.instance }}",
    description:
      "Disk has {{ $value }}% free space remaining. Clean up logs or expand volume.",
    runbook_url: `${RUNBOOK_BASE_URL}/low-disk-space`,
    dashboard_url: `${DASHBOARD_BASE_URL}/node-metrics`,
  },
};

/**
 * Cache alerts — Redis health.
 */
const alertRedisCacheHitRatioLow: AlertRule = {
  alert: "AdNexusRedisCacheHitRatioLow",
  expr: `adnexus_cache_redis_hit_ratio < 0.5`,
  for: "15m",
  labels: {
    severity: "warning",
    team: TEAM,
    service: "cache",
  },
  annotations: {
    summary: "Redis cache hit ratio is low",
    description:
      "Cache hit ratio for {{ $labels.cache_namespace }} is {{ $value }}. " +
      "Review cache key patterns and TTLs.",
    runbook_url: `${RUNBOOK_BASE_URL}/low-cache-hit-ratio`,
    dashboard_url: `${DASHBOARD_BASE_URL}/cache-metrics`,
  },
};

const alertRedisDisconnected: AlertRule = {
  alert: "AdNexusRedisDisconnected",
  expr: `up{job="redis"} == 0`,
  for: "1m",
  labels: {
    severity: "critical",
    team: TEAM,
    service: "cache",
  },
  annotations: {
    summary: "Redis instance is down",
    description: "Redis at {{ $labels.instance }} is unreachable.",
    runbook_url: `${RUNBOOK_BASE_URL}/redis-down`,
    dashboard_url: `${DASHBOARD_BASE_URL}/cache-metrics`,
  },
};

// ═══════════════════════════════════════════════════════════
// Rule Groups
// ═══════════════════════════════════════════════════════════

export const apiGatewayRules: RuleGroup = {
  name: "adnexus_api_gateway",
  interval: "15s",
  rules: [
    alertHighErrorRate,
    alertCriticalErrorRate,
    alertHighResponseTime,
    alertCriticalResponseTime,
  ],
};

export const databaseRules: RuleGroup = {
  name: "adnexus_database",
  interval: "15s",
  rules: [
    alertDatabaseConnectionFailure,
    alertDatabasePoolExhaustion,
    alertDatabaseSlowQueries,
  ],
};

export const platformIntegrationRules: RuleGroup = {
  name: "adnexus_platform_integrations",
  interval: "30s",
  rules: [alertPlatformRateLimitApproaching, alertPlatformApiErrors],
};

export const aiAgentRules: RuleGroup = {
  name: "adnexus_ai_agent",
  interval: "30s",
  rules: [alertAiAgentFailures, alertAiAgentHighLatency],
};

export const draftApprovalRules: RuleGroup = {
  name: "adnexus_draft_approval",
  interval: "60s",
  rules: [alertDraftApprovalBacklog, alertDraftApprovalLatency],
};

export const infrastructureRules: RuleGroup = {
  name: "adnexus_infrastructure",
  interval: "15s",
  rules: [alertHighCPUUsage, alertHighMemoryUsage, alertDiskSpaceLow],
};

export const cacheRules: RuleGroup = {
  name: "adnexus_cache",
  interval: "30s",
  rules: [alertRedisCacheHitRatioLow, alertRedisDisconnected],
};

// ── Full rule file export ──────────────────────────────────

export const alertRuleFile: AlertRuleFile = {
  groups: [
    apiGatewayRules,
    databaseRules,
    platformIntegrationRules,
    aiAgentRules,
    draftApprovalRules,
    infrastructureRules,
    cacheRules,
  ],
};

// ── Helper: export as YAML string ──────────────────────────

export function toYaml(alertFile: AlertRuleFile = alertRuleFile): string {
  const lines: string[] = ["groups:"];

  for (const group of alertFile.groups) {
    lines.push(`- name: ${group.name}`);
    lines.push(`  interval: ${group.interval}`);
    lines.push(`  rules:`);

    for (const rule of group.rules) {
      lines.push(`  - alert: ${rule.alert}`);
      lines.push(`    expr: |`);
      lines.push(`      ${rule.expr}`);
      lines.push(`    for: ${rule.for}`);
      lines.push(`    labels:`);
      lines.push(`      severity: ${rule.labels.severity}`);
      lines.push(`      team: ${rule.labels.team}`);
      lines.push(`      service: ${rule.labels.service}`);
      lines.push(`    annotations:`);
      lines.push(`      summary: "${rule.annotations.summary}"`);
      lines.push(`      description: "${rule.annotations.description}"`);
      lines.push(`      runbook_url: "${rule.annotations.runbook_url}"`);
      lines.push(`      dashboard_url: "${rule.annotations.dashboard_url}"`);
    }
  }

  return lines.join("\n");
}

// ── Helper: export specific group ──────────────────────────

export function getGroup(name: string): RuleGroup | undefined {
  return alertRuleFile.groups.find((g) => g.name === name);
}

// ── Helper: list all alert names ───────────────────────────

export function listAlerts(): Array<{
  name: string;
  severity: string;
  service: string;
}> {
  return alertRuleFile.groups.flatMap((g) =>
    g.rules.map((r) => ({
      name: r.alert,
      severity: r.labels.severity,
      service: r.labels.service,
    }))
  );
}
