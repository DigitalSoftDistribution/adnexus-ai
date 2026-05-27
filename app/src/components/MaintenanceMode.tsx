// @ts-nocheck
/**
 * MaintenanceMode.tsx
 * Displays a full-page maintenance overlay when the backend returns 503 Service Unavailable.
 * Features automatic retry with countdown, read-only mode indicator, and status polling.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface MaintenanceModeProps {
  /** Whether maintenance mode is active */
  isActive: boolean;
  /** Estimated duration of maintenance in minutes (optional) */
  estimatedDurationMinutes?: number;
  /** Maintenance message from backend */
  message?: string;
  /** Polling interval in seconds (default: 30) */
  pollIntervalSeconds?: number;
  /** Callback to check if backend is back */
  onCheckStatus?: () => Promise<boolean>;
  /** Callback when maintenance mode ends */
  onMaintenanceEnd?: () => void;
  /** Whether to show read-only banner instead of full overlay */
  showAsBanner?: boolean;
  /** Timestamp when maintenance started (optional) */
  startedAt?: number;
}

const MaintenanceMode: React.FC<MaintenanceModeProps> = ({
  isActive,
  estimatedDurationMinutes,
  message = 'We are performing scheduled maintenance to improve your experience.',
  pollIntervalSeconds = 30,
  onCheckStatus,
  onMaintenanceEnd,
  showAsBanner = false,
  startedAt,
}) => {
  const [retryCountdown, setRetryCountdown] = useState(pollIntervalSeconds);
  const [isChecking, setIsChecking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(pollIntervalSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef<NodeJS.Timeout | null>(null);

  /** Format seconds into mm:ss */
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /** Check backend status */
  const checkStatus = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const isBack = await onCheckStatus?.();
      if (isBack) {
        onMaintenanceEnd?.();
      }
    } catch {
      // Still in maintenance
    } finally {
      setIsChecking(false);
      setRetryCountdown(pollIntervalSeconds);
    }
  }, [isChecking, onCheckStatus, onMaintenanceEnd, pollIntervalSeconds]);

  /** Manual retry */
  const handleManualRetry = useCallback(() => {
    setRetryCountdown(0);
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (!isActive) {
      setRetryCountdown(pollIntervalSeconds);
      setElapsedTime(0);
      return;
    }

    // Countdown timer for next retry
    setRetryCountdown(pollIntervalSeconds);
    intervalRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          checkStatus();
          return pollIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    // Elapsed time counter
    elapsedRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [isActive, pollIntervalSeconds, checkStatus]);

  // Banner mode - compact top banner
  if (isActive && showAsBanner) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9998,
          backgroundColor: '#f59e0b',
          color: '#1e1e2e',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'slideDown 0.3s ease-out',
        }}
      >
        <span>🔧</span>
        <span>Maintenance in progress — read-only mode</span>
        <span style={{ opacity: 0.8, fontWeight: 400 }}>
          (Retry in {retryCountdown}s)
        </span>
        <button
          onClick={handleManualRetry}
          disabled={isChecking}
          style={{
            marginLeft: '8px',
            padding: '4px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(0,0,0,0.2)',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#1e1e2e',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isChecking ? '...' : 'Retry'}
        </button>
        <style>{`
          @keyframes slideDown {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // Full overlay mode
  if (!isActive) return null;

  const progressPercent = estimatedDurationMinutes
    ? Math.min(100, (elapsedTime / 60 / estimatedDurationMinutes) * 100)
    : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        animation: 'fadeIn 0.4s ease-out',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '480px',
          width: '90%',
          padding: '40px',
        }}
      >
        {/* Animated Gear Icon */}
        <div
          style={{
            fontSize: '72px',
            marginBottom: '24px',
            display: 'inline-block',
            animation: 'spin 4s linear infinite',
          }}
        >
          ⚙️
        </div>

        {/* Title */}
        <h1
          style={{
            color: '#f8fafc',
            fontSize: '28px',
            fontWeight: 700,
            margin: '0 0 12px 0',
          }}
        >
          Under Maintenance
        </h1>

        {/* Message */}
        <p
          style={{
            color: '#94a3b8',
            fontSize: '15px',
            lineHeight: 1.6,
            margin: '0 0 32px 0',
          }}
        >
          {message}
        </p>

        {/* Progress Bar (if estimated duration known) */}
        {progressPercent !== null && (
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#64748b' }}>Progress</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{Math.round(progressPercent)}%</span>
            </div>
            <div
              style={{
                height: '6px',
                backgroundColor: '#1e293b',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: '#f59e0b',
                  borderRadius: '3px',
                  transition: 'width 1s linear',
                }}
              />
            </div>
          </div>
        )}

        {/* Elapsed Time */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            marginBottom: '28px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#f8fafc',
                fontFamily: 'monospace',
              }}
            >
              {formatTime(elapsedTime)}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase' }}>
              Elapsed
            </div>
          </div>
          {estimatedDurationMinutes && (
            <div style={{ width: '1px', backgroundColor: '#334155' }} />
          )}
          {estimatedDurationMinutes && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#f59e0b',
                  fontFamily: 'monospace',
                }}
              >
                ~{estimatedDurationMinutes}m
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase' }}>
                Estimated
              </div>
            </div>
          )}
        </div>

        {/* Retry Section */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              Auto-retry in
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#f8fafc',
                fontFamily: 'monospace',
                minWidth: '40px',
              }}
            >
              {isChecking ? '...' : `${retryCountdown}s`}
            </span>
            <button
              onClick={handleManualRetry}
              disabled={isChecking}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: isChecking ? '#1e293b' : '#334155',
                color: '#f8fafc',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isChecking ? 'not-allowed' : 'pointer',
                opacity: isChecking ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {isChecking ? 'Checking...' : 'Retry Now'}
            </button>
          </div>
        </div>

        {/* Read-Only Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: '#f59e0b20',
            border: '1px solid #f59e0b40',
            color: '#f59e0b',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          Read-Only Mode
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default MaintenanceMode;
