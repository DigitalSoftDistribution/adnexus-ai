/**
 * AdNexus AI Service Worker
 * - Cache-first for static assets (JS, CSS, fonts, icons)
 * - Network-first for API calls
 * - Dashboard data caching for offline viewing
 * - Background sync for draft approvals
 * - Push notification support
 */

const CACHE_NAME = "adnexus-v1";
const STATIC_CACHE = "adnexus-static-v1";
const DASHBOARD_CACHE = "adnexus-dashboard-v1";
const API_CACHE = "adnexus-api-v1";

// Static assets to pre-cache
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192x192.svg",
  "/icon-512x512.svg",
  "/icon-192x192-maskable.svg",
  "/icon-512x512-maskable.svg",
];

// Google Fonts CDN URLs to cache
const FONT_URLS = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;600;700&display=swap",
];

// Install: Pre-cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      console.log("[SW] Pre-caching static assets");
      await cache.addAll(STATIC_ASSETS);
      // Cache font URLs
      try {
        await Promise.all(
          FONT_URLS.map((url) =>
            fetch(url, { mode: "no-cors" })
              .then((res) => cache.put(url, res))
              .catch(() => console.log(`[SW] Font fetch skipped: ${url}`))
          )
        );
      } catch {
        // Fonts are non-critical
      }
      return cache;
    })
  );
});

// Activate: Clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![STATIC_CACHE, DASHBOARD_CACHE, API_CACHE].includes(key)) {
              console.log("[SW] Deleting old cache:", key);
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Helper: Check if URL is an API call
function isApiRequest(url) {
  const apiPatterns = [
    /\/api\//,
    /\/graphql/,
    /\/rest\//,
    /\/supabase/,
    /\/functions/,
    /\.json\?/,
    /\/campaigns\//,
    /\/analytics\//,
    /\/reports\//,
    /\/creatives\//,
    /\/billing\//,
  ];
  return apiPatterns.some((pattern) => pattern.test(url.pathname));
}

// Helper: Check if URL is a dashboard data endpoint
function isDashboardRequest(url) {
  const dashboardPatterns = [
    /\/dashboard/,
    /\/summary/,
    /\/metrics/,
    /\/kpi/,
    /\/overview/,
    /\/stats/,
  ];
  return dashboardPatterns.some((pattern) => pattern.test(url.pathname));
}

// Helper: Check if request is for static asset (JS, CSS, fonts, images)
function isStaticAsset(url) {
  const extensions = [".js", ".css", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
  return extensions.some((ext) => url.pathname.endsWith(ext));
}

// Fetch: Route requests to appropriate strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests except for fonts
  if (url.origin !== self.location.origin && !url.hostname.includes("fonts.googleapis.com")) {
    return;
  }

  // Strategy 1: Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Network-first for API calls
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Strategy 3: Stale-while-revalidate for dashboard data
  if (isDashboardRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, DASHBOARD_CACHE));
    return;
  }

  // Strategy 4: Network with cache fallback for navigation (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Default: Cache-first for same-origin assets
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// --- Caching Strategies ---

// Cache First: Serve from cache, fall back to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.log("[SW] Cache-first fetch failed:", request.url, err.message);
    return new Response("Network error", { status: 503, statusText: "Service Unavailable" });
  }
}

// Network First: Try network, fall back to cache
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      console.log("[SW] Serving API from cache (offline):", request.url);
      return cached;
    }
    return new Response(
      JSON.stringify({ error: "Offline", message: "No cached data available" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Stale While Revalidate: Serve from cache, refresh in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      console.log("[SW] Dashboard revalidate failed (offline):", request.url);
    });

  return cached || (await networkFetch);
}

// --- Background Sync ---

const SYNC_TAG_APPROVAL = "sync-draft-approvals";
const SYNC_TAG_ANALYTICS = "sync-analytics";

self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === SYNC_TAG_APPROVAL) {
    event.waitUntil(syncDraftApprovals());
  }

  if (event.tag === SYNC_TAG_ANALYTICS) {
    event.waitUntil(syncPendingAnalytics());
  }
});

// Process queued draft approvals from IndexedDB
async function syncDraftApprovals() {
  try {
    const approvals = await getQueuedApprovals();
    const results = await Promise.allSettled(
      approvals.map((approval) =>
        fetch("/api/campaigns/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(approval),
        }).then((res) => {
          if (res.ok) {
            return removeQueuedApproval(approval.id);
          }
          throw new Error(`Approval ${approval.id} failed: ${res.status}`);
        })
      )
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;
    console.log(`[SW] Synced ${successCount} approvals, ${failCount} failed`);

    // Notify clients about sync results
    const clients = await self.clients.matchAll();
    clients.forEach((client) =>
      client.postMessage({
        type: "SYNC_COMPLETE",
        tag: SYNC_TAG_APPROVAL,
        successCount,
        failCount,
      })
    );
  } catch (err) {
    console.error("[SW] Background sync failed:", err);
  }
}

// Process pending analytics events
async function syncPendingAnalytics() {
  try {
    const events = await getPendingAnalytics();
    await Promise.allSettled(
      events.map((event) =>
        fetch("/api/analytics/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        })
      )
    );
  } catch {
    // Silently fail analytics sync
  }
}

// IndexedDB helpers (using simple keyval approach)
const DB_NAME = "adnexus-sw-db";
const DB_VERSION = 1;

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("approvals")) {
        db.createObjectStore("approvals", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("analytics")) {
        db.createObjectStore("analytics", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

async function getQueuedApprovals() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("approvals", "readonly");
      const store = tx.objectStore("approvals");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

async function removeQueuedApproval(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("approvals", "readwrite");
      const store = tx.objectStore("approvals");
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Silently handle
  }
}

async function getPendingAnalytics() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("analytics", "readonly");
      const store = tx.objectStore("analytics");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

// --- Push Notifications ---

self.addEventListener("push", (event) => {
  console.log("[SW] Push event received");

  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = {
      title: "AdNexus AI",
      body: event.data?.text() || "New notification",
    };
  }

  const title = payload.title || "AdNexus AI";
  const options = {
    body: payload.body || "You have a new notification",
    icon: "/icon-192x192.svg",
    badge: "/icon-192x192-maskable.svg",
    tag: payload.tag || `notification-${Date.now()}`,
    requireInteraction: payload.requireInteraction || false,
    silent: payload.silent || false,
    data: payload.data || {},
    actions: payload.actions || [],
    renotify: payload.renotify || false,
    timestamp: payload.timestamp || Date.now(),
  };

  // Default actions if none provided
  if (!options.actions || options.actions.length === 0) {
    options.actions = [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);
  event.notification.close();

  const { action, notification } = event;

  if (action === "dismiss") {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const url = notification.data?.url || "/";

        // Focus existing client if open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.postMessage({
              type: "NOTIFICATION_CLICKED",
              action,
              data: notification.data,
            });
            return client.navigate(url).then(() => client.focus());
          }
        }

        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Notification close handler
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed");
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      clients.forEach((client) =>
        client.postMessage({
          type: "NOTIFICATION_CLOSED",
          tag: event.notification.tag,
        })
      );
    })
  );
});

// --- Periodic Background Sync (for dashboard data freshness) ---

self.addEventListener("periodicsync", (event) => {
  console.log("[SW] Periodic sync:", event.tag);

  if (event.tag === "refresh-dashboard") {
    event.waitUntil(refreshDashboardCache());
  }

  if (event.tag === "refresh-campaigns") {
    event.waitUntil(refreshCampaignsCache());
  }
});

async function refreshDashboardCache() {
  try {
    const endpoints = ["/api/dashboard/summary", "/api/dashboard/metrics", "/api/dashboard/kpi"];
    const cache = await caches.open(DASHBOARD_CACHE);
    await Promise.all(
      endpoints.map((url) =>
        fetch(url)
          .then((res) => {
            if (res.ok) cache.put(url, res);
          })
          .catch(() => {})
      )
    );
    console.log("[SW] Dashboard cache refreshed");
  } catch (err) {
    console.log("[SW] Dashboard refresh failed:", err);
  }
}

async function refreshCampaignsCache() {
  try {
    const res = await fetch("/api/campaigns");
    if (res.ok) {
      const cache = await caches.open(DASHBOARD_CACHE);
      cache.put("/api/campaigns", res);
    }
  } catch {
    // Silently fail
  }
}

// --- Message Handling (from main thread) ---

self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CACHE_DASHBOARD":
      if (payload?.url && payload?.data) {
        caches.open(DASHBOARD_CACHE).then((cache) => {
          cache.put(
            payload.url,
            new Response(JSON.stringify(payload.data), {
              headers: { "Content-Type": "application/json" },
            })
          );
        });
      }
      break;

    case "QUEUE_APPROVAL":
      if (payload) {
        queueApproval(payload);
      }
      break;

    case "CLEAR_CACHES":
      event.waitUntil(
        Promise.all([
          caches.delete(DASHBOARD_CACHE),
          caches.delete(API_CACHE),
        ]).then(() => {
          event.source?.postMessage({ type: "CACHES_CLEARED" });
        })
      );
      break;

    case "GET_CACHE_SIZE":
      event.waitUntil(
        caches.keys().then(async (keys) => {
          const sizes = {};
          for (const key of keys) {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            sizes[key] = requests.length;
          }
          event.source?.postMessage({ type: "CACHE_SIZE", sizes });
        })
      );
      break;

    default:
      break;
  }
});

async function queueApproval(approval) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("approvals", "readwrite");
      const store = tx.objectStore("approvals");
      const request = store.put({
        ...approval,
        queuedAt: Date.now(),
        attempts: 0,
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("[SW] Failed to queue approval:", err);
  }
}

console.log("[SW] AdNexus AI Service Worker loaded");
