import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────

export interface PWAState {
  /** True if the app can be installed (install prompt available) */
  canInstall: boolean;
  /** True if the app is already installed (standalone/display-mode) */
  isInstalled: boolean;
  /** True when a new service worker is waiting to activate */
  updateAvailable: boolean;
  /** True while the service worker is updating */
  isUpdating: boolean;
  /** True if the device is currently offline */
  isOffline: boolean;
  /** The service worker registration (if supported) */
  registration: ServiceWorkerRegistration | null;
  /** Push subscription (if granted) */
  pushSubscription: PushSubscription | null;
  /** True if push notifications are granted */
  pushEnabled: boolean;
  /** True while prompting for push permission */
  pushPrompting: boolean;
}

export interface PWAActions {
  /** Trigger the native PWA install prompt */
  install: () => Promise<boolean>;
  /** Skip waiting and activate the new service worker immediately */
  applyUpdate: () => Promise<void>;
  /** Check for service worker updates manually */
  checkForUpdates: () => Promise<void>;
  /** Request push notification permission and subscribe */
  subscribePush: () => Promise<PushSubscription | null>;
  /** Unsubscribe from push notifications */
  unsubscribePush: () => Promise<boolean>;
  /** Request a background sync for draft approvals */
  syncApprovals: () => Promise<boolean>;
  /** Request a periodic sync registration */
  registerPeriodicSync: (tag: string, minInterval?: number) => Promise<boolean>;
  /** Clear all app caches */
  clearCaches: () => Promise<boolean>;
}

export interface UsePWAResult extends PWAState {
  actions: PWAActions;
}

// ─── Constants ───────────────────────────────────────────────────────

const SYNC_TAG_APPROVALS = "sync-draft-approvals";


// ─── Helper: Detect if running as installed PWA ──────────────────────

function getIsInstalled(): boolean {
  if (typeof window === "undefined") return false;

  // iOS standalone mode
  if ((window.navigator as any).standalone === true) return true;

  // Standard display-mode detection
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: window-controls-overlay)").matches)
    return true;

  return false;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function usePWA(): UsePWAResult {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(getIsInstalled);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [pushSubscription, setPushSubscription] =
    useState<PushSubscription | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPrompting, setPushPrompting] = useState(false);

  // Use a ref for the deferred install prompt so it's always fresh
  const deferredPromptRef =
    useRef<BeforeInstallPromptEvent | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  // ── Listen for beforeinstallprompt ─────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also check if already installed via display-mode changes
    const mq = window.matchMedia("(display-mode: standalone)");
    const mqHandler = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (e.matches) {
        setCanInstall(false);
      }
    };
    mq.addEventListener("change", mqHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mq.removeEventListener("change", mqHandler);
    };
  }, []);

  // ── Listen for appinstalled ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
      console.log("[PWA] App installed");
    };

    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  // ── Service Worker registration & update detection ─────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;

    let updateFoundHandler: (() => void) | null = null;
    let stateChangeHandler: (() => void) | null = null;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "imports",
        });

        setRegistration(reg);
        console.log("[PWA] Service Worker registered:", reg.scope);

        // Check for existing waiting worker
        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting;
          setUpdateAvailable(true);
        }

        // Listen for new updates
        updateFoundHandler = () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          stateChangeHandler = () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New worker is waiting
              waitingWorkerRef.current = newWorker;
              setUpdateAvailable(true);
            }
          };

          newWorker.addEventListener("statechange", stateChangeHandler);
        };

        reg.addEventListener("updatefound", updateFoundHandler);

        // Listen for messages from SW
        navigator.serviceWorker.addEventListener("message", (event) => {
          const { type, ...data } = event.data || {};

          switch (type) {
            case "SYNC_COMPLETE":
              console.log("[PWA] Background sync complete:", data);
              break;
            case "NOTIFICATION_CLICKED":
              console.log("[PWA] Notification clicked:", data);
              break;
            case "NOTIFICATION_CLOSED":
              console.log("[PWA] Notification closed");
              break;
            case "CACHE_SIZE":
              console.log("[PWA] Cache sizes:", data.sizes);
              break;
            case "CACHES_CLEARED":
              console.log("[PWA] Caches cleared");
              break;
            default:
              break;
          }
        });

        // Check push subscription status
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          setPushSubscription(subscription);
          setPushEnabled(Notification.permission === "granted");
        }
      } catch (err) {
        console.error("[PWA] Service Worker registration failed:", err);
      }
    };

    registerSW();

    return () => {
      if (registration && updateFoundHandler) {
        registration.removeEventListener("updatefound", updateFoundHandler);
      }
    };
  }, []);

  // ── Online / Offline detection ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onlineHandler = () => setIsOffline(false);
    const offlineHandler = () => setIsOffline(true);

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────

  /**
   * Trigger the native PWA install prompt.
   * Returns `true` if the user accepted the install.
   */
  const install = useCallback(async (): Promise<boolean> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return false;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPromptRef.current = null;
    setCanInstall(false);

    return outcome === "accepted";
  }, []);

  /**
   * Skip waiting and activate the new service worker immediately.
   * The page will reload after the new SW activates.
   */
  const applyUpdate = useCallback(async (): Promise<void> => {
    if (!waitingWorkerRef.current) return;

    setIsUpdating(true);

    return new Promise((resolve) => {
      // Listen for controller change (new SW activated)
      const controllerChangeHandler = () => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          controllerChangeHandler
        );
        setIsUpdating(false);
        setUpdateAvailable(false);
        window.location.reload();
        resolve();
      };

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        controllerChangeHandler
      );

      // Tell the waiting worker to skip waiting
      waitingWorkerRef.current?.postMessage({ type: "SKIP_WAITING" });
    });
  }, []);

  /**
   * Manually check for service worker updates.
   */
  const checkForUpdates = useCallback(async (): Promise<void> => {
    if (!registration) return;
    try {
      await registration.update();
      console.log("[PWA] Update check completed");
    } catch (err) {
      console.error("[PWA] Update check failed:", err);
    }
  }, [registration]);

  /**
   * Request push notification permission and subscribe.
   */
  const subscribePush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!registration || !("PushManager" in window)) return null;

    setPushPrompting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushPrompting(false);
        return null;
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const applicationServerKey: BufferSource | undefined = vapidPublicKey
        ? (urlBase64ToUint8Array(vapidPublicKey) as BufferSource)
        : undefined;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      setPushSubscription(subscription);
      setPushEnabled(true);

      // Send subscription to server
      await sendSubscriptionToServer(subscription);

      return subscription;
    } catch (err) {
      console.error("[PWA] Push subscription failed:", err);
      return null;
    } finally {
      setPushPrompting(false);
    }
  }, [registration]);

  /**
   * Unsubscribe from push notifications.
   */
  const unsubscribePush = useCallback(async (): Promise<boolean> => {
    if (!pushSubscription) return false;

    try {
      const success = await pushSubscription.unsubscribe();
      if (success) {
        setPushSubscription(null);
        setPushEnabled(false);
        // Notify server to remove subscription
        await removeSubscriptionFromServer(pushSubscription);
      }
      return success;
    } catch (err) {
      console.error("[PWA] Push unsubscribe failed:", err);
      return false;
    }
  }, [pushSubscription]);

  /**
   * Request a background sync for draft approvals.
   */
  const syncApprovals = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !registration?.sync) return false;

    try {
      await registration.sync.register(SYNC_TAG_APPROVALS);
      return true;
    } catch (err) {
      console.error("[PWA] Background sync registration failed:", err);
      return false;
    }
  }, [registration]);

  /**
   * Register a periodic background sync (for dashboard data freshness).
   */
  const registerPeriodicSync = useCallback(
    async (tag: string, minInterval?: number): Promise<boolean> => {
      if (
        !("serviceWorker" in navigator) ||
        !registration?.periodicSync
      )
        return false;

      try {
        const options = minInterval ? { minInterval } : undefined;
        await registration.periodicSync.register(tag, options);
        return true;
      } catch (err) {
        console.error("[PWA] Periodic sync registration failed:", err);
        return false;
      }
    },
    [registration]
  );

  /**
   * Clear all app caches via the service worker.
   */
  const clearCaches = useCallback(async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator)) return false;

    try {
      const reg = registration || (await navigator.serviceWorker.ready);
      reg.active?.postMessage({ type: "CLEAR_CACHES" });
      return true;
    } catch (err) {
      console.error("[PWA] Clear caches failed:", err);
      return false;
    }
  }, [registration]);

  return {
    canInstall,
    isInstalled,
    updateAvailable,
    isUpdating,
    isOffline,
    registration,
    pushSubscription,
    pushEnabled,
    pushPrompting,
    actions: {
      install,
      applyUpdate,
      checkForUpdates,
      subscribePush,
      unsubscribePush,
      syncApprovals,
      registerPeriodicSync,
      clearCaches,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Convert a URL-safe base64 string to Uint8Array for VAPID key.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Send the push subscription to the backend server.
 */
async function sendSubscriptionToServer(
  subscription: PushSubscription
): Promise<void> {
  try {
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
  } catch (err) {
    console.error("[PWA] Failed to send subscription to server:", err);
  }
}

/**
 * Notify the server to remove a push subscription.
 */
async function removeSubscriptionFromServer(
  subscription: PushSubscription
): Promise<void> {
  try {
    await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (err) {
    console.error("[PWA] Failed to remove subscription from server:", err);
  }
}

// ─── Type Augmentations ──────────────────────────────────────────────

/**
 * The `BeforeInstallPromptEvent` is fired at the `Window` before a user is
 * prompted to "install" a web site to a mobile device's home screen.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }

  interface ServiceWorkerRegistration {
    readonly periodicSync?: {
      register(tag: string, options?: { minInterval?: number }): Promise<void>;
      unregister(tag: string): Promise<void>;
      getTags(): Promise<string[]>;
    };
    readonly sync: {
      register(tag: string): Promise<void>;
      getTags(): Promise<string[]>;
    };
  }

  interface Window {
    workbox?: any;
  }
}
