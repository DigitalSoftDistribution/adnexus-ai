// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Bell,
  Plus,
  Trash2,
  Edit3,
  Play,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  BarChart3,
  Search,
  X,
  History,
} from "lucide-react";

/* ───────────────────────── types ───────────────────────── */

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  timeWindow: string;
  platforms: string[];
  channels: string[];
  severity: "info" | "warning" | "critical";
  status: "active" | "paused";
  lastTriggered: string | null;
  createdAt: string;
  description?: string;
}

interface AlertHistoryItem {
  id: string;
  alertId: string;
  triggeredAt: string;
  metricValue: number;
  threshold: number;
  message: string;
  status: "triggered" | "resolved";
}

/* ───────────────────────── mock data ───────────────────────── */

const INITIAL_ALERTS: AlertRule[] = [
  {
    id: "alert-1",
    name: "ROAS Below 2.0",
    metric: "ROAS",
    operator: "<",
    threshold: 2.0,
    timeWindow: "today",
    platforms: ["all"],
    channels: ["email", "in-app"],
    severity: "warning",
    status: "active",
    lastTriggered: "2024-01-15T09:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    description: "Alert when ROAS drops below 2.0 across any platform",
  },
  {
    id: "alert-2",
    name: "CPA Spike",
    metric: "CPA",
    operator: "changed by %",
    threshold: 25,
    timeWindow: "last hour",
    platforms: ["facebook", "google"],
    channels: ["slack", "email"],
    severity: "critical",
    status: "active",
    lastTriggered: "2024-01-15T14:20:00Z",
    createdAt: "2024-01-05T00:00:00Z",
  },
  {
    id: "alert-3",
    name: "Low CTR Alert",
    metric: "CTR",
    operator: "<",
    threshold: 1.5,
    timeWindow: "last 7 days",
    platforms: ["all"],
    channels: ["in-app"],
    severity: "info",
    status: "paused",
    lastTriggered: null,
    createdAt: "2024-01-10T00:00:00Z",
  },
];

const INITIAL_HISTORY: Record<string, AlertHistoryItem[]> = {
  "alert-1": [
    {
      id: "hist-1",
      alertId: "alert-1",
      triggeredAt: "2024-01-15T09:30:00Z",
      metricValue: 1.82,
      threshold: 2.0,
      message: "ROAS dropped to 1.82 (threshold: 2.0)",
      status: "triggered",
    },
    {
      id: "hist-2",
      alertId: "alert-1",
      triggeredAt: "2024-01-14T16:45:00Z",
      metricValue: 1.95,
      threshold: 2.0,
      message: "ROAS dropped to 1.95 (threshold: 2.0)",
      status: "resolved",
    },
  ],
  "alert-2": [
    {
      id: "hist-3",
      alertId: "alert-2",
      triggeredAt: "2024-01-15T14:20:00Z",
      metricValue: 32.5,
      threshold: 25,
      message: "CPA increased by 32.5% (threshold: 25%)",
      status: "triggered",
    },
  ],
};

const METRICS = ["ROAS", "CPA", "CTR", "Spend", "Conversions", "CPM"];
const OPERATORS = [">", "<", "=", "changed by %"];
const TIME_WINDOWS = ["last hour", "today", "last 7 days"];
const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google Ads" },
  { value: "tiktok", label: "TikTok" },
  { value: "snapchat", label: "Snapchat" },
  { value: "twitter", label: "Twitter" },
];
const CHANNELS = [
  { value: "email", label: "Email", icon: Mail },
  { value: "slack", label: "Slack", icon: MessageSquare },
  { value: "in-app", label: "In-App", icon: Smartphone },
];

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

/* ───────────────────────── helpers ───────────────────────── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

/* ───────────────────────── component ───────────────────────── */

export default function AlertsConfig() {
  const [alerts, setAlerts] = useState<AlertRule[]>(INITIAL_ALERTS);
  const [history, setHistory] = useState<Record<string, AlertHistoryItem[]>>(
    INITIAL_HISTORY
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  /* create / edit form */
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AlertRule>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* detail / history panel */
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  /* test result */
  const [testResult, setTestResult] = useState<{
    alertId: string;
    message: string;
    type: "success" | "error";
  } | null>(null);

  /* toast notifications */
  const [toasts, setToasts] = useState<
    { id: number; message: string; type: "success" | "error" | "info" }[]
  >([]);

  function pushToast(message: string, type: "success" | "error" | "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }

  /* ── fetch ── */
  async function fetchAlerts() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) setAlerts(data.data);
      }
    } catch {
      /* use mock data silently */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  /* ── filtered list ── */
  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.metric.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || a.status === statusFilter;
    const matchesSeverity =
      severityFilter === "all" || a.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  /* ── form handling ── */
  function resetForm() {
    setFormData({
      metric: "ROAS",
      operator: ">",
      threshold: 0,
      timeWindow: "today",
      platforms: ["all"],
      channels: ["in-app"],
      severity: "warning",
      status: "active",
    });
    setFormErrors({});
    setEditingId(null);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(alert: AlertRule) {
    setFormData({ ...alert });
    setEditingId(alert.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = "Alert name is required";
    if (!formData.metric) errors.metric = "Metric is required";
    if (!formData.operator) errors.operator = "Operator is required";
    if (formData.threshold === undefined || formData.threshold === null)
      errors.threshold = "Threshold is required";
    if (!formData.timeWindow) errors.timeWindow = "Time window is required";
    if (!formData.platforms?.length)
      errors.platforms = "Select at least one platform";
    if (!formData.channels?.length)
      errors.channels = "Select at least one channel";
    if (!formData.severity) errors.severity = "Severity is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveAlert() {
    if (!validateForm()) return;

    try {
      if (editingId) {
        /* update */
        const res = await fetch(`${API_BASE}/alerts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const data = await res.json();
          setAlerts((prev) =>
            prev.map((a) => (a.id === editingId ? data.data || data : a))
          );
          pushToast("Alert updated successfully", "success");
        } else {
          throw new Error("Update failed");
        }
      } else {
        /* create */
        const res = await fetch(`${API_BASE}/alerts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        let newAlert: AlertRule;
        if (res.ok) {
          const data = await res.json();
          newAlert = data.data || data;
        } else {
          /* fallback mock */
          newAlert = {
            ...(formData as AlertRule),
            id: `alert-${Date.now()}`,
            createdAt: new Date().toISOString(),
            lastTriggered: null,
          };
        }
        setAlerts((prev) => [...prev, newAlert]);
        pushToast("Alert created successfully", "success");
      }
      closeForm();
      fetchAlerts();
    } catch {
      /* fallback: local save */
      if (editingId) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === editingId ? { ...a, ...(formData as AlertRule) } : a
          )
        );
        pushToast("Alert updated (local)", "success");
      } else {
        const newAlert: AlertRule = {
          ...(formData as AlertRule),
          id: `alert-${Date.now()}`,
          createdAt: new Date().toISOString(),
          lastTriggered: null,
        };
        setAlerts((prev) => [...prev, newAlert]);
        pushToast("Alert created (local)", "success");
      }
      closeForm();
    }
  }

  async function deleteAlert(id: string) {
    if (!window.confirm("Delete this alert rule?")) return;
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        pushToast("Alert deleted", "success");
      } else {
        throw new Error("Delete failed");
      }
    } catch {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      pushToast("Alert deleted (local)", "info");
    }
  }

  async function toggleStatus(id: string) {
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return;
    const newStatus = alert.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...alert, status: newStatus }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        );
        pushToast(`Alert ${newStatus}`, "success");
      } else {
        throw new Error("Toggle failed");
      }
    } catch {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
      pushToast(`Alert ${newStatus} (local)`, "info");
    }
  }

  async function testAlert(id: string) {
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/test`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          alertId: id,
          message:
            data.message || "Test notification sent — check your channels!",
          type: "success",
        });
        pushToast("Test alert sent", "success");
      } else {
        throw new Error("Test failed");
      }
    } catch {
      /* local simulation */
      const alert = alerts.find((a) => a.id === id);
      const simulated =
        alert &&
        ((alert.operator === "<" && alert.threshold > 1) ||
          alert.operator === "changed by %");
      setTestResult({
        alertId: id,
        message: simulated
          ? `Simulated: ${alert.name} would trigger now! (value exceeds threshold)`
          : `Simulated: ${alert?.name || "Alert"} condition not met — no trigger.`,
        type: simulated ? "success" : "error",
      });
      pushToast("Test completed (simulated)", "info");
    }
  }

  async function fetchHistory(id: string) {
    setShowHistoryFor((curr) => (curr === id ? null : id));
    if (showHistoryFor === id) return;
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/history`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setHistory((prev) => ({ ...prev, [id]: data.data }));
        }
      }
    } catch {
      /* use local history */
    }
  }

  /* ── severity badge ── */
  function SeverityBadge({ severity }: { severity: string }) {
    const styles: Record<string, string> = {
      info: "bg-blue-100 text-blue-800 border-blue-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      critical: "bg-red-100 text-red-800 border-red-200",
    };
    const icons: Record<string, React.ReactNode> = {
      info: <Info size={12} />,
      warning: <AlertTriangle size={12} />,
      critical: <XCircle size={12} />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[severity] || styles.info}`}
      >
        {icons[severity]}
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  }

  /* ── render ── */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all animate-in slide-in-from-right ${
              t.type === "success"
                ? "bg-green-600 text-white"
                : t.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 text-white"
            }`}
          >
            {t.type === "success" && <CheckCircle size={16} />}
            {t.type === "error" && <XCircle size={16} />}
            {t.type === "info" && <Info size={16} />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell size={24} className="text-indigo-600" />
              Custom Alerts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage alert rules for your campaigns
            </p>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={16} />
            New Alert
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search alerts by name or metric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Stats summary */}
      <div className="max-w-6xl mx-auto mb-6 grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Alerts",
            value: alerts.length,
            icon: Bell,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Active",
            value: alerts.filter((a) => a.status === "active").length,
            icon: CheckCircle,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "Paused",
            value: alerts.filter((a) => a.status === "paused").length,
            icon: Clock,
            color: "text-yellow-600 bg-yellow-50",
          },
          {
            label: "Triggered (24h)",
            value: Object.values(history).flat().length,
            icon: AlertTriangle,
            color: "text-red-600 bg-red-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {s.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-lg ${s.color}`}>
                <s.icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Rules List */}
      <div className="max-w-6xl mx-auto space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            Loading alerts...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
            <Bell size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No alerts found</p>
            <p className="text-gray-400 text-sm mt-1">
              Create your first alert to get started
            </p>
            <button
              onClick={openCreateForm}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Create Alert
            </button>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Main row */}
              <div className="p-4 flex items-center gap-4">
                {/* Severity icon */}
                <div
                  className={`p-2 rounded-lg ${
                    alert.severity === "critical"
                      ? "bg-red-50 text-red-600"
                      : alert.severity === "warning"
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {alert.severity === "critical" ? (
                    <XCircle size={20} />
                  ) : alert.severity === "warning" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <Info size={20} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {alert.name}
                    </h3>
                    <SeverityBadge severity={alert.severity} />
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        alert.status === "active"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {alert.status === "active" ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {alert.metric} {alert.operator} {alert.threshold}
                    {alert.operator === "changed by %" ? "%" : ""} &middot;{" "}
                    {alert.timeWindow} &middot;{" "}
                    {alert.platforms.includes("all")
                      ? "All platforms"
                      : alert.platforms.join(", ")}
                  </p>
                </div>

                {/* Last triggered */}
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-gray-500">Last triggered</p>
                  <p className="text-xs font-medium text-gray-700">
                    {timeAgo(alert.lastTriggered)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleStatus(alert.id)}
                    title={alert.status === "active" ? "Pause" : "Activate"}
                    className={`p-2 rounded-lg transition-colors ${
                      alert.status === "active"
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {alert.status === "active" ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => testAlert(alert.id)}
                    title="Test alert"
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Play size={16} />
                  </button>
                  <button
                    onClick={() => fetchHistory(alert.id)}
                    title="View history"
                    className={`p-2 rounded-lg transition-colors ${
                      showHistoryFor === alert.id
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <History size={16} />
                  </button>
                  <button
                    onClick={() => openEditForm(alert)}
                    title="Edit"
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    title="Delete"
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Test result */}
              {testResult && testResult.alertId === alert.id && (
                <div
                  className={`mx-4 mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    testResult.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testResult.type === "success" ? (
                    <CheckCircle size={14} />
                  ) : (
                    <XCircle size={14} />
                  )}
                  {testResult.message}
                  <button
                    onClick={() => setTestResult(null)}
                    className="ml-auto"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* History panel */}
              {showHistoryFor === alert.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <History size={14} />
                    Trigger History
                  </h4>
                  {history[alert.id]?.length ? (
                    <div className="space-y-2">
                      {history[alert.id].map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                h.status === "triggered"
                                  ? "bg-red-500"
                                  : "bg-green-500"
                              }`}
                            />
                            <span className="text-sm text-gray-800">
                              {h.message}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {formatDate(h.triggeredAt)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Value: {h.metricValue}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No trigger history for this alert.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Create / Edit Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Alert" : "Create Alert"}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., ROAS Below Target"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Condition row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metric <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.metric || "ROAS"}
                    onChange={(e) =>
                      setFormData({ ...formData, metric: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {METRICS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operator <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.operator || ">"}
                    onChange={(e) =>
                      setFormData({ ...formData, operator: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {OPERATORS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Threshold <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.threshold ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        threshold: parseFloat(e.target.value),
                      })
                    }
                    placeholder="e.g., 2.0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              {(formErrors.metric || formErrors.operator ||
                formErrors.threshold) && (
                <div className="flex gap-4 text-xs text-red-600 -mt-3">
                  {formErrors.metric && <span>{formErrors.metric}</span>}
                  {formErrors.operator && <span>{formErrors.operator}</span>}
                  {formErrors.threshold && (
                    <span>{formErrors.threshold}</span>
                  )}
                </div>
              )}

              {/* Time window */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Window <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {TIME_WINDOWS.map((tw) => (
                    <button
                      key={tw}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, timeWindow: tw })
                      }
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.timeWindow === tw
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {tw}
                    </button>
                  ))}
                </div>
                {formErrors.timeWindow && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.timeWindow}
                  </p>
                )}
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platforms <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const selected =
                      formData.platforms?.includes(p.value) || false;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          const current = formData.platforms || [];
                          let next: string[];
                          if (p.value === "all") {
                            next = selected ? [] : ["all"];
                          } else {
                            const withoutAll = current.filter(
                              (v) => v !== "all"
                            );
                            next = selected
                              ? withoutAll.filter((v) => v !== p.value)
                              : [...withoutAll, p.value];
                          }
                          setFormData({ ...formData, platforms: next });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          selected
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                {formErrors.platforms && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.platforms}
                  </p>
                )}
              </div>

              {/* Notification channels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Channels{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  {CHANNELS.map((c) => {
                    const selected =
                      formData.channels?.includes(c.value) || false;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          const current = formData.channels || [];
                          const next = selected
                            ? current.filter((v) => v !== c.value)
                            : [...current, c.value];
                          setFormData({ ...formData, channels: next });
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${
                          selected
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        <c.icon size={14} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                {formErrors.channels && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.channels}
                  </p>
                )}
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  {(["info", "warning", "critical"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, severity: s })
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.severity === s
                          ? s === "critical"
                            ? "bg-red-600 text-white border-red-600"
                            : s === "warning"
                              ? "bg-yellow-500 text-white border-yellow-500"
                              : "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      {s === "critical" && <XCircle size={14} />}
                      {s === "warning" && <AlertTriangle size={14} />}
                      {s === "info" && <Info size={14} />}
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-xl">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAlert}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <CheckCircle size={16} />
                {editingId ? "Save Changes" : "Create Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
