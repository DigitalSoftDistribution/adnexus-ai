/**
 * useOffline.ts — Offline detection hook
 *
 * Detects online/offline status via browser Network Information API
 * and online/offline events. Provides an action queue that captures
 * mutations while offline and replays them when connectivity returns.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface QueuedAction {
  id: string;
  timestamp: number;
  type: string;
  payload: Record<string, unknown>;
  retryCount: number;
  execute: () => Promise<unknown>;
}

interface UseOfflineReturn {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string;
  downlinkSpeed: number | null;
  queuedActions: QueuedAction[];
  queueAction: (action: Omit<QueuedAction, "id" | "timestamp" | "retryCount">) => void;
  removeQueuedAction: (id: string) => void;
  clearQueue: () => void;
  replayQueue: () => Promise<void>;
  lastReplayResult: { success: number; failed: number } | null;
}

const QUEUE_STORAGE_KEY = "offline_action_queue";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadPersistedQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistQueue(queue: QueuedAction[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage may be full — silently fail
  }
}

/**
 * Hook: useOffline
 *
 * Usage:
 *   const { isOnline, queueAction, replayQueue, queuedActions } = useOffline();
 *
 *   // In a mutation handler:
 *   if (!isOnline) {
 *     queueAction({ type: "CREATE_POST", payload: data, execute: apiCall });
 *   }
 */
export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>("unknown");
  const [downlinkSpeed, setDownlinkSpeed] = useState<number | null>(null);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>(() =>
    loadPersistedQueue()
  );
  const [lastReplayResult, setLastReplayResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const isReplayingRef = useRef(false);

  /* ── Network status listeners ────────────────────────────────────── */

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Network Information API (Chrome/Android)
    const conn = (navigator as any).connection;
    if (conn) {
      setConnectionType(conn.effectiveType || conn.type || "unknown");
      setDownlinkSpeed(conn.downlink || null);

      const handleConnectionChange = () => {
        setConnectionType(conn.effectiveType || conn.type || "unknown");
        setDownlinkSpeed(conn.downlink || null);
        setIsOnline(navigator.onLine);
      };
      conn.addEventListener("change", handleConnectionChange);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        conn.removeEventListener("change", handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* ── Persist queue to localStorage ───────────────────────────────── */

  useEffect(() => {
    persistQueue(queuedActions);
  }, [queuedActions]);

  /* ── Auto-replay when coming back online ─────────────────────────── */

  useEffect(() => {
    if (isOnline && queuedActions.length > 0 && !isReplayingRef.current) {
      const timer = setTimeout(() => {
        replayQueue();
      }, 1500); // brief delay so the user sees "Back online" first
      return () => clearTimeout(timer);
    }
     
  }, [isOnline]);

  /* ── Queue helpers ───────────────────────────────────────────────── */

  const queueAction = useCallback(
    (action: Omit<QueuedAction, "id" | "timestamp" | "retryCount">) => {
      const fullAction: QueuedAction = {
        ...action,
        id: generateId(),
        timestamp: Date.now(),
        retryCount: 0,
      };
      setQueuedActions((prev) => [...prev, fullAction]);
    },
    []
  );

  const removeQueuedAction = useCallback((id: string) => {
    setQueuedActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueuedActions([]);
    setLastReplayResult(null);
  }, []);

  /* ── Replay queue (FIFO) ─────────────────────────────────────────── */

  const replayQueue = useCallback(async () => {
    if (isReplayingRef.current) return;
    if (!navigator.onLine) return;
    if (queuedActions.length === 0) return;

    isReplayingRef.current = true;
    let success = 0;
    let failed = 0;

    const remaining: QueuedAction[] = [];

    for (const action of queuedActions) {
      try {
        await action.execute();
        success++;
      } catch (err) {
        failed++;
        remaining.push({
          ...action,
          retryCount: action.retryCount + 1,
        });
      }
    }

    setQueuedActions(remaining);
    setLastReplayResult({ success, failed });
    isReplayingRef.current = false;

    // Dispatch custom event so UI can show toast
    window.dispatchEvent(
      new CustomEvent("offline:replay-complete", {
        detail: { success, failed, timestamp: Date.now() },
      })
    );
  }, [queuedActions]);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType,
    downlinkSpeed,
    queuedActions,
    queueAction,
    removeQueuedAction,
    clearQueue,
    replayQueue,
    lastReplayResult,
  };
}
