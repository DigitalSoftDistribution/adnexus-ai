/**
 * PWA Registration Module
 *
 * Manually registers the Service Worker to give the app full control
 * over the registration lifecycle. This file is imported by main.tsx.
 */

/**
 * Register the service worker with configurable options.
 * Called once during app bootstrap.
 */
export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    console.log("[PWA] Service Workers not supported");
    return;
  }

  // Defer registration until after the page loads
  if (document.readyState === "loading") {
    window.addEventListener("load", () => doRegistration());
  } else {
    doRegistration();
  }
}

/**
 * Perform the actual SW registration.
 */
async function doRegistration(): Promise<void> {
  try {
    // Use a small delay to let the app render first
    await new Promise((r) => setTimeout(r, 100));

    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "imports",
    });

    console.log("[PWA] Service Worker registered:", reg.scope);

    // Listen for updates
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          console.log("[PWA] New service worker available");
          // Dispatch a custom event that usePWA hook can listen to
          window.dispatchEvent(
            new CustomEvent("sw-update-available", {
              detail: { registration: reg },
            })
          );
        }
      });
    });

    // Check for updates periodically (every 60 minutes)
    setInterval(
      () => {
        reg.update().catch(() => {
          // Silently fail periodic update checks
        });
      },
      60 * 60 * 1000
    );
  } catch (err) {
    console.error("[PWA] Service Worker registration failed:", err);
  }
}

/**
 * Unregister the service worker (useful for debugging).
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const success = await reg.unregister();
    return success;
  } catch {
    return false;
  }
}
