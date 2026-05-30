/**
 * RetryQueue.tsx — Retry mechanism UI
 *
 * Tracks failed API calls, offers auto-retry with exponential backoff,
 * a manual "Retry All" button, and toast notifications for replayed
 * actions.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useOffline, QueuedAction } from "../hooks/useOffline";

/* ── Types ─────────────────────────────────────────────────────────── */

interface FailedRequest {
  id: string;
  url: string;
  method: string;
  timestamp: number;
  errorMessage: string;
  retryCount: number;
  status: "pending" | "retrying" | "failed" | "success";
  nextRetryAt: number | null;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  createdAt: number;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates the next retry delay using exponential backoff with jitter.
 *   retry #1 → 1s   (+/- 20% jitter)
 *   retry #2 → 2s
 *   retry #3 → 4s
 *   retry #4 → 8s
 *   retry #5 → 16s  (max)
 */
function getBackoffDelayMs(retryCount: number): number {
  const base = Math.min(1000 * Math.pow(2, retryCount), 16000);
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.max(1000, Math.round(base + jitter));
}

/* ── Component ─────────────────────────────────────────────────────── */

export const RetryQueue: React.FC = () => {
  const {
    isOnline,
    queuedActions,
    replayQueue,
    lastReplayResult,
    removeQueuedAction,
  } = useOffline();

  const [failedRequests, setFailedRequests] = useState<FailedRequest[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const autoRetryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const mountedRef = useRef(true);

  /* ── Sync queuedActions → failedRequests ─────────────────────────── */

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setFailedRequests((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const newRequests: FailedRequest[] = queuedActions
        .filter((a) => !existingIds.has(a.id))
        .map((action) => ({
          id: action.id,
          url: action.type,
          method: "MUTATION",
          timestamp: action.timestamp,
          errorMessage: `Queued while offline — ${action.type}`,
          retryCount: action.retryCount,
          status: "pending" as const,
          nextRetryAt: null,
        }));

      // Remove requests that are no longer in queue (replay succeeded)
      const queuedIds = new Set(queuedActions.map((a) => a.id));
      const cleaned = prev.filter((r) => queuedIds.has(r.id));

      // Update retry counts from queue
      const updated = cleaned.map((r) => {
        const match = queuedActions.find((a) => a.id === r.id);
        return match ? { ...r, retryCount: match.retryCount } : r;
      });

      return [...updated, ...newRequests];
    });
  }, [queuedActions]);

  /* ── Listen for replay-complete events ───────────────────────────── */

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { success, failed } = e.detail;
      addToast(
        `Synced ${success} action${success !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`,
        failed > 0 ? "error" : "success"
      );
    };
    window.addEventListener(
      "offline:replay-complete" as any,
      handler as any
    );
    return () =>
      window.removeEventListener(
        "offline:replay-complete" as any,
        handler as any
      );
  }, []);

  /* ── Auto-retry with exponential backoff ─────────────────────────── */

  const scheduleAutoRetry = useCallback(
    (requestId: string) => {
      // Clear existing timer for this request
      const existing = autoRetryTimersRef.current.get(requestId);
      if (existing) clearTimeout(existing);

      if (!isOnline) return;

      setFailedRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: "pending" as const } : r
        )
      );

      const backoffMs = getBackoffDelayMs(
        failedRequests.find((r) => r.id === requestId)?.retryCount || 0
      );

      const nextRetryAt = Date.now() + backoffMs;
      setFailedRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, nextRetryAt } : r
        )
      );

      const timer = setTimeout(async () => {
        if (!mountedRef.current) return;

        const req = failedRequests.find((r) => r.id === requestId);
        if (!req) return;

        setFailedRequests((prev) =>
          prev.map((r) =>
            r.id === requestId ? { ...r, status: "retrying" as const } : r
          )
        );

        try {
          const action = queuedActions.find((a) => a.id === requestId);
          if (action) {
            await action.execute();
            // Success — remove from queue
            removeQueuedAction(requestId);
            addToast(`Action replayed: ${req.url}`, "success");
          }
        } catch {
          setFailedRequests((prev) =>
            prev.map((r) =>
              r.id === requestId
                ? {
                    ...r,
                    status: "failed" as const,
                    retryCount: r.retryCount + 1,
                    errorMessage: `Retry #${r.retryCount + 1} failed`,
                    nextRetryAt: null,
                  }
                : r
            )
          );
          // Schedule next retry
          scheduleAutoRetry(requestId);
        }
      }, backoffMs);

      autoRetryTimersRef.current.set(requestId, timer);
    },
    [isOnline, failedRequests, queuedActions, removeQueuedAction]
  );

  /* ── Kick off auto-retry when coming online ──────────────────────── */

  useEffect(() => {
    if (isOnline) {
      failedRequests
        .filter((r) => r.status === "pending" || r.status === "failed")
        .forEach((r) => scheduleAutoRetry(r.id));
    }
    // Cleanup timers on unmount
    return () => {
      autoRetryTimersRef.current.forEach((t) => clearTimeout(t));
      autoRetryTimersRef.current.clear();
    };
     
  }, [isOnline]);

  /* ── Toast helpers ───────────────────────────────────────────────── */

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const toast: Toast = { id: generateId(), message, type, createdAt: Date.now() };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  }, []);

  /* ── Manual retry all ────────────────────────────────────────────── */

  const handleRetryAll = useCallback(async () => {
    if (!isOnline || isRetryingAll) return;
    setIsRetryingAll(true);

    addToast("Retrying all queued actions...", "info");

    try {
      await replayQueue();
    } catch {
      addToast("Some actions failed to retry", "error");
    } finally {
      setIsRetryingAll(false);
    }
  }, [isOnline, isRetryingAll, replayQueue, addToast]);

  /* ── Manual retry single ─────────────────────────────────────────── */

  const handleRetryOne = useCallback(
    async (requestId: string) => {
      if (!isOnline) {
        addToast("Cannot retry while offline", "error");
        return;
      }

      setFailedRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: "retrying" as const } : r
        )
      );

      try {
        const action = queuedActions.find((a) => a.id === requestId);
        if (action) {
          await action.execute();
          removeQueuedAction(requestId);
          addToast("Action replayed successfully", "success");
        }
      } catch {
        addToast("Retry failed — will try again automatically", "error");
        scheduleAutoRetry(requestId);
      }
    },
    [isOnline, queuedActions, removeQueuedAction, addToast, scheduleAutoRetry]
  );

  /* ── Remove a single failed request from the queue ───────────────── */

  const handleRemove = useCallback(
    (requestId: string) => {
      const timer = autoRetryTimersRef.current.get(requestId);
      if (timer) clearTimeout(timer);
      autoRetryTimersRef.current.delete(requestId);
      removeQueuedAction(requestId);
    },
    [removeQueuedAction]
  );

  /* ── Render ──────────────────────────────────────────────────────── */

  if (failedRequests.length === 0 && toasts.length === 0) return null;

  return (
    <>
      {/* ── Toast Notifications ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "360px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              animation: "toast-in 0.3s ease-out",
              ...(toast.type === "success"
                ? { backgroundColor: "#D4EDDA", color: "#155724" }
                : toast.type === "error"
                  ? { backgroundColor: "#F8D7DA", color: "#721C24" }
                  : { backgroundColor: "#D1ECF1", color: "#0C5460" }),
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* ── Retry Queue Panel ── */}
      {failedRequests.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            zIndex: 10000,
            width: "380px",
            maxHeight: "400px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#F9FAFB",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: isOnline ? "#F59E0B" : "#EF4444",
                }}
              />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                Pending Actions
              </span>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "10px",
                  backgroundColor: "#E5E7EB",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                {failedRequests.length}
              </span>
            </div>
            <button
              onClick={handleRetryAll}
              disabled={!isOnline || isRetryingAll}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: isOnline ? "#2563EB" : "#9CA3AF",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: isOnline && !isRetryingAll ? "pointer" : "not-allowed",
                opacity: isOnline && !isRetryingAll ? 1 : 0.6,
                transition: "all 0.2s",
              }}
            >
              {isRetryingAll ? "Retrying..." : "Retry All"}
            </button>
          </div>

          {/* List */}
          <div
            style={{
              overflowY: "auto",
              flex: 1,
              maxHeight: "320px",
            }}
          >
            {failedRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid #F3F4F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  opacity: req.status === "retrying" ? 0.6 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#111827",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {req.url}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6B7280",
                      marginTop: "2px",
                    }}
                  >
                    {formatTime(req.timestamp)} ·{" "}
                    {req.status === "retrying"
                      ? "Retrying..."
                      : req.nextRetryAt
                        ? `Retry in ${Math.max(0, Math.ceil((req.nextRetryAt - Date.now()) / 1000))}s`
                        : `Retry #${req.retryCount} failed`}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={() => handleRetryOne(req.id)}
                    disabled={!isOnline || req.status === "retrying"}
                    title="Retry now"
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      border: "1px solid #D1D5DB",
                      backgroundColor: "#fff",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "#374151",
                      cursor:
                        isOnline && req.status !== "retrying"
                          ? "pointer"
                          : "not-allowed",
                      opacity:
                        isOnline && req.status !== "retrying" ? 1 : 0.4,
                    }}
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => handleRemove(req.id)}
                    title="Discard"
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #FCA5A5",
                      backgroundColor: "#FEF2F2",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "#DC2626",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default RetryQueue;
