// @ts-nocheck
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/* ───────────────────────── types ───────────────────────── */

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  operator: string;
  threshold: number;
  timeWindow: string;
  platforms: string[];
  channels: string[];
  severity: "info" | "warning" | "critical";
  status: "active" | "paused";
  lastTriggered: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface AlertHistoryItem {
  id: string;
  alertId: string;
  triggeredAt: string;
  resolvedAt: string | null;
  metricValue: number;
  threshold: number;
  operator: string;
  message: string;
  status: "triggered" | "resolved";
  notificationsSent: {
    channel: string;
    status: "sent" | "failed";
    error?: string;
  }[];
}

interface AlertTestResult {
  alertId: string;
  wouldTrigger: boolean;
  simulatedValue: number;
  threshold: number;
  operator: string;
  message: string;
  timestamp: string;
}

/* ───────────────────────── in-mem store (replace with DB) ───────────────────────── */

const alertRules: Map<string, AlertRule> = new Map();
const alertHistory: Map<string, AlertHistoryItem[]> = new Map();

/* seed sample data */
function seedData() {
  const now = new Date().toISOString();

  const seedAlerts: AlertRule[] = [
    {
      id: "alert-1",
      name: "ROAS Below 2.0",
      description: "Alert when ROAS drops below 2.0 across any platform",
      metric: "ROAS",
      operator: "<",
      threshold: 2.0,
      timeWindow: "today",
      platforms: ["all"],
      channels: ["email", "in-app"],
      severity: "warning",
      status: "active",
      lastTriggered: new Date(Date.now() - 3600000).toISOString(),
      triggerCount: 12,
      createdAt: new Date(Date.now() - 1209600000).toISOString(),
      updatedAt: now,
      createdBy: "system",
    },
    {
      id: "alert-2",
      name: "CPA Spike",
      description: "Alert when CPA increases by more than 25%",
      metric: "CPA",
      operator: "changed by %",
      threshold: 25,
      timeWindow: "last hour",
      platforms: ["facebook", "google"],
      channels: ["slack", "email"],
      severity: "critical",
      status: "active",
      lastTriggered: new Date(Date.now() - 1800000).toISOString(),
      triggerCount: 5,
      createdAt: new Date(Date.now() - 864000000).toISOString(),
      updatedAt: now,
      createdBy: "system",
    },
    {
      id: "alert-3",
      name: "Low CTR Alert",
      description: "Alert when CTR drops below 1.5%",
      metric: "CTR",
      operator: "<",
      threshold: 1.5,
      timeWindow: "last 7 days",
      platforms: ["all"],
      channels: ["in-app"],
      severity: "info",
      status: "paused",
      lastTriggered: null,
      triggerCount: 0,
      createdAt: new Date(Date.now() - 432000000).toISOString(),
      updatedAt: now,
      createdBy: "system",
    },
    {
      id: "alert-4",
      name: "High CPM Warning",
      description: "Alert when CPM exceeds $15",
      metric: "CPM",
      operator: ">",
      threshold: 15,
      timeWindow: "today",
      platforms: ["tiktok", "snapchat"],
      channels: ["slack"],
      severity: "warning",
      status: "active",
      lastTriggered: new Date(Date.now() - 7200000).toISOString(),
      triggerCount: 3,
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      updatedAt: now,
      createdBy: "system",
    },
    {
      id: "alert-5",
      name: "Spend Budget Threshold",
      description: "Alert when daily spend exceeds $5,000",
      metric: "Spend",
      operator: ">",
      threshold: 5000,
      timeWindow: "today",
      platforms: ["all"],
      channels: ["email", "slack", "in-app"],
      severity: "critical",
      status: "active",
      lastTriggered: null,
      triggerCount: 0,
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: now,
      createdBy: "system",
    },
  ];

  for (const a of seedAlerts) {
    alertRules.set(a.id, a);
  }

  /* seed history */
  alertHistory.set("alert-1", [
    {
      id: "hist-1",
      alertId: "alert-1",
      triggeredAt: new Date(Date.now() - 3600000).toISOString(),
      resolvedAt: null,
      metricValue: 1.82,
      threshold: 2.0,
      operator: "<",
      message: "ROAS dropped to 1.82 (threshold: 2.0)",
      status: "triggered",
      notificationsSent: [
        { channel: "email", status: "sent" },
        { channel: "in-app", status: "sent" },
      ],
    },
    {
      id: "hist-2",
      alertId: "alert-1",
      triggeredAt: new Date(Date.now() - 86400000).toISOString(),
      resolvedAt: new Date(Date.now() - 82800000).toISOString(),
      metricValue: 1.95,
      threshold: 2.0,
      operator: "<",
      message: "ROAS dropped to 1.95 (threshold: 2.0) — resolved",
      status: "resolved",
      notificationsSent: [
        { channel: "email", status: "sent" },
        { channel: "in-app", status: "sent" },
      ],
    },
    {
      id: "hist-3",
      alertId: "alert-1",
      triggeredAt: new Date(Date.now() - 172800000).toISOString(),
      resolvedAt: new Date(Date.now() - 169200000).toISOString(),
      metricValue: 1.78,
      threshold: 2.0,
      operator: "<",
      message: "ROAS dropped to 1.78 (threshold: 2.0) — resolved",
      status: "resolved",
      notificationsSent: [
        { channel: "email", status: "sent" },
      ],
    },
  ]);

  alertHistory.set("alert-2", [
    {
      id: "hist-4",
      alertId: "alert-2",
      triggeredAt: new Date(Date.now() - 1800000).toISOString(),
      resolvedAt: null,
      metricValue: 32.5,
      threshold: 25,
      operator: "changed by %",
      message: "CPA increased by 32.5% (threshold: 25%)",
      status: "triggered",
      notificationsSent: [
        { channel: "slack", status: "sent" },
        { channel: "email", status: "sent" },
      ],
    },
    {
      id: "hist-5",
      alertId: "alert-2",
      triggeredAt: new Date(Date.now() - 90000000).toISOString(),
      resolvedAt: new Date(Date.now() - 86400000).toISOString(),
      metricValue: 28.0,
      threshold: 25,
      operator: "changed by %",
      message: "CPA increased by 28.0% (threshold: 25%) — resolved",
      status: "resolved",
      notificationsSent: [
        { channel: "slack", status: "sent" },
        { channel: "email", status: "failed", error: "SMTP timeout" },
      ],
    },
  ]);

  alertHistory.set("alert-4", [
    {
      id: "hist-6",
      alertId: "alert-4",
      triggeredAt: new Date(Date.now() - 7200000).toISOString(),
      resolvedAt: null,
      metricValue: 18.5,
      threshold: 15,
      operator: ">",
      message: "CPM reached $18.50 (threshold: $15)",
      status: "triggered",
      notificationsSent: [
        { channel: "slack", status: "sent" },
      ],
    },
  ]);
}

seedData();

/* ───────────────────────── middleware ───────────────────────── */

function validateAlertBody(req, res, next) {
  const errors: string[] = [];

  if (!req.body.name || typeof req.body.name !== "string" || req.body.name.trim().length === 0) {
    errors.push("name is required and must be a non-empty string");
  }
  if (!req.body.metric || typeof req.body.metric !== "string") {
    errors.push("metric is required");
  }
  if (!req.body.operator || typeof req.body.operator !== "string") {
    errors.push("operator is required");
  }
  if (req.body.threshold === undefined || typeof req.body.threshold !== "number") {
    errors.push("threshold is required and must be a number");
  }
  if (!req.body.timeWindow || typeof req.body.timeWindow !== "string") {
    errors.push("timeWindow is required");
  }
  if (!Array.isArray(req.body.platforms) || req.body.platforms.length === 0) {
    errors.push("platforms must be a non-empty array");
  }
  if (!Array.isArray(req.body.channels) || req.body.channels.length === 0) {
    errors.push("channels must be a non-empty array");
  }
  if (!req.body.severity || !["info", "warning", "critical"].includes(req.body.severity)) {
    errors.push("severity must be one of: info, warning, critical");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors,
    });
  }
  next();
}

/* ───────────────────────── routes ───────────────────────── */

/**
 * GET /alerts
 * List all alert rules with optional filtering
 */
router.get("/", (req, res) => {
  const {
    status,
    severity,
    metric,
    platform,
    search,
    sortBy = "createdAt",
    order = "desc",
    page = "1",
    limit = "50",
  } = req.query;

  let results = Array.from(alertRules.values());

  /* filters */
  if (status) {
    results = results.filter((a) => a.status === status);
  }
  if (severity) {
    results = results.filter((a) => a.severity === severity);
  }
  if (metric) {
    results = results.filter((a) => a.metric === metric);
  }
  if (platform) {
    const p = platform as string;
    results = results.filter(
      (a) => a.platforms.includes("all") || a.platforms.includes(p)
    );
  }
  if (search) {
    const q = (search as string).toLowerCase();
    results = results.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.metric.toLowerCase().includes(q)
    );
  }

  /* sorting */
  results.sort((a, b) => {
    const aVal = a[sortBy as keyof AlertRule];
    const bVal = b[sortBy as keyof AlertRule];
    if (aVal === null || aVal === undefined) return order === "asc" ? -1 : 1;
    if (bVal === null || bVal === undefined) return order === "asc" ? 1 : -1;
    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });

  /* pagination */
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
  const total = results.length;
  const totalPages = Math.ceil(total / limitNum);
  const offset = (pageNum - 1) * limitNum;
  const paginated = results.slice(offset, offset + limitNum);

  res.json({
    success: true,
    data: paginated,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      filters: { status, severity, metric, platform, search },
      sort: { sortBy, order },
    },
  });
});

/**
 * POST /alerts
 * Create a new alert rule
 */
router.post("/", validateAlertBody, (req, res) => {
  const now = new Date().toISOString();

  const newAlert: AlertRule = {
    id: `alert-${uuidv4()}`,
    name: req.body.name.trim(),
    description: req.body.description?.trim() || "",
    metric: req.body.metric,
    operator: req.body.operator,
    threshold: req.body.threshold,
    timeWindow: req.body.timeWindow,
    platforms: req.body.platforms,
    channels: req.body.channels,
    severity: req.body.severity,
    status: req.body.status === "paused" ? "paused" : "active",
    lastTriggered: null,
    triggerCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: req.user?.id || req.body.createdBy || "anonymous",
  };

  alertRules.set(newAlert.id, newAlert);
  alertHistory.set(newAlert.id, []);

  res.status(201).json({
    success: true,
    data: newAlert,
    message: "Alert rule created successfully",
  });
});

/**
 * GET /alerts/:id
 * Get a single alert rule
 */
router.get("/:id", (req, res) => {
  const alert = alertRules.get(req.params.id);
  if (!alert) {
    return res.status(404).json({
      success: false,
      error: "Alert rule not found",
    });
  }
  res.json({ success: true, data: alert });
});

/**
 * PUT /alerts/:id
 * Update an alert rule
 */
router.put("/:id", (req, res) => {
  const alert = alertRules.get(req.params.id);
  if (!alert) {
    return res.status(404).json({
      success: false,
      error: "Alert rule not found",
    });
  }

  const allowedFields = [
    "name",
    "description",
    "metric",
    "operator",
    "threshold",
    "timeWindow",
    "platforms",
    "channels",
    "severity",
    "status",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (alert as any)[field] = req.body[field];
    }
  }

  alert.updatedAt = new Date().toISOString();
  alertRules.set(alert.id, alert);

  res.json({
    success: true,
    data: alert,
    message: "Alert rule updated successfully",
  });
});

/**
 * DELETE /alerts/:id
 * Delete an alert rule
 */
router.delete("/:id", (req, res) => {
  const alert = alertRules.get(req.params.id);
  if (!alert) {
    return res.status(404).json({
      success: false,
      error: "Alert rule not found",
    });
  }

  alertRules.delete(req.params.id);
  alertHistory.delete(req.params.id);

  res.json({
    success: true,
    message: "Alert rule deleted successfully",
    deletedId: req.params.id,
  });
});

/**
 * POST /alerts/:id/toggle
 * Toggle alert status (active / paused)
 */
router.post("/:id/toggle", (req, res) => {
  const alert = alertRules.get(req.params.id);
  if (!alert) {
    return res.status(404).json({
      success: false,
      error: "Alert rule not found",
    });
  }

  alert.status = alert.status === "active" ? "paused" : "active";
  alert.updatedAt = new Date().toISOString();
  alertRules.set(alert.id, alert);

  res.json({
    success: true,
    data: alert,
    message: `Alert ${alert.status === "active" ? "activated" : "paused"} successfully`,
  });
});

/**
 * GET /alerts/:id/history
 * Get trigger history for an alert
 */
router.get("/:id/history", (req, res) => {
  const alert = alertRules.get(req.params.id);
  if (!alert) {
    return res.status(404).json({
      success: false,
      error: "Alert rule not found",
    });
  }

  const history = alertHistory.get(req.params.id) || [];

  /* query params */
  const { status, limit = "50", page = "1" } = req.query;
  let results = [...history];

  if (status) {
    results = results.filter((h) => h.status === status);
  }

  /* sort by triggeredAt desc */
  results.sort(
    (a, b) =>
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
  );

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
  const total = results.length;
  const offset = (pageNum - 1) * limitNum;
  const paginated = results.slice(offset, offset + limitNum);

  res.json({
    success: true,
    data: paginated,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      alertId: req.params.id,
    },
  });
});

/**
 * POST /alerts/:id/test
 * Test an alert — simulates the condition and sends test notifications
 */
router.post("/:id/test", async (req, res) => {
  const alert = alertRules.get(req.params.id);
  if (!alert) {
    return res.status(404).json({
      success: false,
      error: "Alert rule not found",
    });
  }

  /* simulate a metric value */
  const simulatedValue = simulateMetricValue(alert);
  const wouldTrigger = checkCondition(
    simulatedValue,
    alert.threshold,
    alert.operator
  );

  /* send test notifications (non-blocking) */
  const notificationResults: { channel: string; status: string; error?: string }[] = [];

  for (const channel of alert.channels) {
    try {
      await sendTestNotification(channel, alert, simulatedValue, wouldTrigger);
      notificationResults.push({ channel, status: "sent" });
    } catch (err: any) {
      notificationResults.push({
        channel,
        status: "failed",
        error: err.message,
      });
    }
  }

  /* record in history (marked as test) */
  const testHistory: AlertHistoryItem = {
    id: `hist-test-${uuidv4()}`,
    alertId: alert.id,
    triggeredAt: new Date().toISOString(),
    resolvedAt: wouldTrigger ? null : new Date().toISOString(),
    metricValue: parseFloat(simulatedValue.toFixed(2)),
    threshold: alert.threshold,
    operator: alert.operator,
    message: `[TEST] ${alert.name}: ${formatTestMessage(alert, simulatedValue, wouldTrigger)}`,
    status: wouldTrigger ? "triggered" : "resolved",
    notificationsSent: notificationResults.map((n) => ({
      channel: n.channel,
      status: n.status as "sent" | "failed",
      error: n.error,
    })),
  };

  const existing = alertHistory.get(alert.id) || [];
  alertHistory.set(alert.id, [testHistory, ...existing]);

  const result: AlertTestResult = {
    alertId: alert.id,
    wouldTrigger,
    simulatedValue: parseFloat(simulatedValue.toFixed(2)),
    threshold: alert.threshold,
    operator: alert.operator,
    message: formatTestMessage(alert, simulatedValue, wouldTrigger),
    timestamp: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: result,
    notifications: notificationResults,
    message: wouldTrigger
      ? `Test: ${alert.name} would TRIGGER with value ${simulatedValue.toFixed(2)}`
      : `Test: ${alert.name} would NOT trigger (value: ${simulatedValue.toFixed(2)})`,
  });
});

/**
 * GET /alerts/:id/stats
 * Get alert statistics (trigger count, avg metric value, etc.)
 */
router.get("/:id/stats", (req, res) => {
  const alert = alertRules.get(req.params.id);
  if (!alert) {
    return res.status(404).json({
      success: false,
      error: "Alert rule not found",
    });
  }

  const history = alertHistory.get(req.params.id) || [];
  const triggered = history.filter((h) => h.status === "triggered");
  const resolved = history.filter((h) => h.status === "resolved");

  const avgMetricValue =
    history.length > 0
      ? history.reduce((sum, h) => sum + h.metricValue, 0) / history.length
      : 0;

  /* time buckets (last 7 days) */
  const now = Date.now();
  const dailyTriggers: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().split("T")[0];
    dailyTriggers[key] = 0;
  }
  for (const h of history) {
    const key = h.triggeredAt.split("T")[0];
    if (dailyTriggers[key] !== undefined) {
      dailyTriggers[key]++;
    }
  }

  res.json({
    success: true,
    data: {
      alertId: alert.id,
      alertName: alert.name,
      totalTriggers: history.length,
      currentlyTriggered: triggered.length - resolved.length,
      triggerCount: alert.triggerCount,
      avgMetricValue: parseFloat(avgMetricValue.toFixed(2)),
      lastTriggered: alert.lastTriggered,
      dailyTriggers,
      notificationStats: {
        totalSent: history.reduce(
          (sum, h) => sum + h.notificationsSent.filter((n) => n.status === "sent").length,
          0
        ),
        totalFailed: history.reduce(
          (sum, h) => sum + h.notificationsSent.filter((n) => n.status === "failed").length,
          0
        ),
      },
    },
  });
});

/* ───────────────────────── helpers ───────────────────────── */

function simulateMetricValue(alert: AlertRule): number {
  const base = alert.threshold;
  const variance = base * 0.4; /* +/- 40% variance */

  switch (alert.operator) {
    case ">":
      /* 60% chance to trigger (value > threshold) */
      return Math.random() < 0.6
        ? base + Math.random() * variance
        : base - Math.random() * variance * 0.8;

    case "<":
      /* 60% chance to trigger (value < threshold) */
      return Math.random() < 0.6
        ? base - Math.random() * variance * 0.8
        : base + Math.random() * variance;

    case "=":
      /* rarely exactly equal, add small variance */
      return base + (Math.random() - 0.5) * base * 0.1;

    case "changed by %":
      /* simulate percentage change */
      return Math.random() * 50; /* 0-50% change */

    default:
      return base + (Math.random() - 0.5) * variance;
  }
}

function checkCondition(
  value: number,
  threshold: number,
  operator: string
): boolean {
  switch (operator) {
    case ">":
      return value > threshold;
    case "<":
      return value < threshold;
    case "=":
      return Math.abs(value - threshold) < 0.0001;
    case "changed by %":
      return value >= threshold;
    default:
      return false;
  }
}

function formatTestMessage(
  alert: AlertRule,
  value: number,
  triggered: boolean
): string {
  const valueStr = value.toFixed(2);
  const thresholdStr =
    alert.operator === "changed by %"
      ? `${alert.threshold}%`
      : alert.threshold.toString();

  if (triggered) {
    return `${alert.metric} ${alert.operator} ${thresholdStr} — value is ${valueStr}`;
  }
  return `${alert.metric} at ${valueStr}, condition ${alert.operator} ${thresholdStr} not met`;
}

async function sendTestNotification(
  channel: string,
  alert: AlertRule,
  value: number,
  triggered: boolean
): Promise<void> {
  const message = `[TEST] ${alert.name}: ${alert.metric} ${alert.operator} ${alert.threshold} — simulated value: ${value.toFixed(2)}`;

  switch (channel) {
    case "email":
      /* placeholder — integrate with email service */
      console.log(`[EMAIL TEST] to: admin@adnexus.com — ${message}`);
      /* await sendEmail({ to: "admin@adnexus.com", subject: `[TEST] ${alert.name}`, body: message }); */
      break;

    case "slack":
      /* placeholder — integrate with Slack webhook */
      console.log(`[SLACK TEST] webhook — ${message}`);
      /* await sendSlackWebhook({ text: message }); */
      break;

    case "in-app":
      /* placeholder — store in-app notification */
      console.log(`[IN-APP TEST] user notification — ${message}`);
      /* await createNotification({ userId: "*", message, severity: alert.severity }); */
      break;

    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
}

export default router;
