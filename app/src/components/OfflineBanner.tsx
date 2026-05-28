/**
 * OfflineBanner.tsx — Offline indicator
 *
 * Displays a sticky banner when the browser loses network connectivity.
 * Shows the count of queued actions and a dismiss button.
 */

import React, { useEffect, useState } from "react";
import { useOffline } from "../hooks/useOffline";

interface OfflineBannerProps {
  /** Custom className for styling overrides */
  className?: string;
  /** Position on screen: "top" or "bottom" */
  position?: "top" | "bottom";
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Optional custom message */
  message?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  className = "",
  position = "top",
  dismissible = true,
  message,
}) => {
  const { isOffline, queuedActions, isOnline } = useOffline();
  const [dismissed, setDismissed] = useState(false);
  const [justCameBack, setJustCameBack] = useState(false);

  const queueCount = queuedActions.length;

  /* ── Auto-show when going offline, reset dismiss when back online ── */

  useEffect(() => {
    if (isOffline) {
      setDismissed(false);
      setJustCameBack(false);
    } else {
      setJustCameBack(true);
      const timer = setTimeout(() => setJustCameBack(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  /* ── Don't render if dismissed or online without "just came back" ── */

  if (!isOffline && !justCameBack) return null;
  if (dismissed && isOffline) return null;

  /* ── Styles ──────────────────────────────────────────────────────── */

  const positionStyle: React.CSSProperties =
    position === "top"
      ? { top: 0, left: 0, right: 0 }
      : { bottom: 0, left: 0, right: 0 };

  const bannerStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    ...positionStyle,
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    fontSize: "14px",
    fontWeight: 500,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: "all 0.3s ease",
    ...(
      isOffline
        ? {
            backgroundColor: "#FFF3CD",
            color: "#856404",
            borderBottom:
              position === "top" ? "1px solid #FFEAA7" : undefined,
            borderTop:
              position === "bottom" ? "1px solid #FFEAA7" : undefined,
          }
        : {
            backgroundColor: "#D4EDDA",
            color: "#155724",
            borderBottom:
              position === "top" ? "1px solid #C3E6CB" : undefined,
            borderTop:
              position === "bottom" ? "1px solid #C3E6CB" : undefined,
          }
    ),
  };

  const pulseStyle: React.CSSProperties = {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: isOffline ? "#E74C3C" : "#27AE60",
    animation: isOffline ? "pulse-red 2s infinite" : undefined,
  };

  const countBadgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "22px",
    height: "22px",
    padding: "0 6px",
    borderRadius: "11px",
    backgroundColor: isOffline ? "#E74C3C" : "#27AE60",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
  };

  /* ── Render ──────────────────────────────────────────────────────── */

  const displayMessage =
    message ||
    (isOffline
      ? "You are working offline. Changes will sync when you reconnect."
      : "Back online! Syncing changes...");

  return (
    <>
      <style>{`
        @keyframes pulse-red {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        className={className}
        style={bannerStyle}
      >
        <span style={pulseStyle} aria-hidden="true" />

        <span>{displayMessage}</span>

        {isOffline && queueCount > 0 && (
          <span style={countBadgeStyle} aria-label={`${queueCount} queued actions`}>
            {queueCount}
          </span>
        )}

        {isOffline && dismissible && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss offline banner"
            style={{
              marginLeft: "8px",
              padding: "4px 10px",
              border: "1px solid currentColor",
              borderRadius: "4px",
              background: "transparent",
              cursor: "pointer",
              fontSize: "12px",
              color: "inherit",
              opacity: 0.8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
          >
            Dismiss
          </button>
        )}
      </div>
    </>
  );
};

export default OfflineBanner;
