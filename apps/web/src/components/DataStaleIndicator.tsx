/**
 * DataStaleIndicator.tsx
 * Shows the last-updated timestamp for data, a refresh button,
 * and a visual warning when cached data is older than a configurable threshold.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface DataStaleIndicatorProps {
  /** ISO timestamp or Date object of last data update */
  lastUpdated: string | Date | number;
  /** Staleness threshold in minutes (default: 5) */
  staleThresholdMinutes?: number;
  /** Callback to refresh data */
  onRefresh: () => Promise<void> | void;
  /** Optional label for what data this represents */
  dataLabel?: string;
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean;
  /** Position: 'inline' | 'floating' | 'banner' */
  variant?: 'inline' | 'floating' | 'banner';
  /** Custom className for styling overrides */
  className?: string;
}

const DataStaleIndicator: React.FC<DataStaleIndicatorProps> = ({
  lastUpdated,
  staleThresholdMinutes = 5,
  onRefresh,
  dataLabel = 'Data',
  isRefreshing: externalRefreshing,
  variant = 'inline',
  className = '',
}) => {
  const [now, setNow] = useState(Date.now());
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isRefreshing = externalRefreshing ?? internalRefreshing;

  /** Parse lastUpdated to timestamp */
  const lastUpdatedTs = (() => {
    if (typeof lastUpdated === 'number') return lastUpdated;
    return new Date(lastUpdated).getTime();
  })();

  const ageMs = now - lastUpdatedTs;
  const ageSeconds = Math.floor(ageMs / 1000);
  const ageMinutes = Math.floor(ageMs / (1000 * 60));
  const thresholdMs = staleThresholdMinutes * 60 * 1000;
  const isStale = ageMs > thresholdMs;
  const isCritical = ageMs > thresholdMs * 3; // > 3x threshold = critical

  /** Format age into human-readable string */
  const formatAge = () => {
    if (ageSeconds < 10) return 'Just now';
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    const hours = Math.floor(ageMinutes / 60);
    if (hours < 24) return `${hours}h ${ageMinutes % 60}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h ago`;
  };

  /** Format absolute timestamp */
  const formatTimestamp = () => {
    const d = new Date(lastUpdatedTs);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  /** Handle refresh click */
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setInternalRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // Refresh failed, indicator will show stale
    } finally {
      setInternalRefreshing(false);
      setNow(Date.now());
    }
  }, [onRefresh, isRefreshing]);

  // Tick the clock every second
  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Variant: Banner (full-width top banner)
  if (variant === 'banner' && isStale) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '10px 16px',
          backgroundColor: isCritical ? '#ef444415' : '#f59e0b15',
          borderBottom: `1px solid ${isCritical ? '#ef444440' : '#f59e0b40'}`,
          color: isCritical ? '#ef4444' : '#f59e0b',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'slideDown 0.3s ease-out',
        }}
      >
        <span style={{ animation: 'pulse 2s infinite' }}>⚠️</span>
        <span>
          {dataLabel} is stale — last updated {formatAge()} ({formatTimestamp()})
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            padding: '4px 14px',
            borderRadius: '6px',
            border: `1px solid ${isCritical ? '#ef444460' : '#f59e0b60'}`,
            backgroundColor: isCritical ? '#ef444420' : '#f59e0b20',
            color: isCritical ? '#ef4444' : '#f59e0b',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            opacity: isRefreshing ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isRefreshing ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
              Refreshing...
            </>
          ) : (
            <>🔄 Refresh</>
          )}
        </button>
        <style>{`
          @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Variant: Floating (bottom-right corner badge)
  if (variant === 'floating') {
    return (
      <div
        className={className}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9990,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          borderRadius: '12px',
          backgroundColor: isStale ? (isCritical ? '#ef444420' : '#f59e0b20') : '#22c55e20',
          border: `1px solid ${isStale ? (isCritical ? '#ef444440' : '#f59e0b40') : '#22c55e40'}`,
          backdropFilter: 'blur(8px)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Status Dot */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isStale ? (isCritical ? '#ef4444' : '#f59e0b') : '#22c55e',
            animation: isStale ? 'pulse 2s infinite' : 'none',
          }}
        />

        {/* Timestamp */}
        <span
          style={{
            fontSize: '12px',
            color: isStale ? (isCritical ? '#ef4444' : '#f59e0b') : '#22c55e',
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          {formatTimestamp()}
          <span style={{ marginLeft: '6px', opacity: 0.7, fontWeight: 400 }}>
            ({formatAge()})
          </span>
        </span>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            padding: '5px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isStale ? (isCritical ? '#ef4444' : '#f59e0b') : '#22c55e',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            opacity: isRefreshing ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {isRefreshing ? '...' : '🔄'}
        </button>

        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  // Variant: Inline (compact, inline with content)
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '8px',
        backgroundColor: isStale ? (isCritical ? '#ef444415' : '#f59e0b12') : '#22c55e10',
        border: `1px solid ${isStale ? (isCritical ? '#ef444430' : '#f59e0b25') : '#22c55e25'}`,
        fontSize: '12px',
      }}
    >
      {/* Status Dot */}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isStale ? (isCritical ? '#ef4444' : '#f59e0b') : '#22c55e',
          animation: isStale ? 'pulse 2s infinite' : 'none',
        }}
      />

      {/* Label */}
      <span style={{ color: '#64748b', fontWeight: 500 }}>
        {dataLabel}:
      </span>

      {/* Timestamp + Age */}
      <span
        style={{
          color: isStale ? (isCritical ? '#ef4444' : '#f59e0b') : '#22c55e',
          fontWeight: 600,
          fontFamily: 'monospace',
        }}
      >
        {formatTimestamp()}
      </span>
      <span style={{ color: '#64748b' }}>
        ({formatAge()})
      </span>

      {isStale && (
        <span
          style={{
            marginLeft: '4px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: isCritical ? '#ef444420' : '#f59e0b20',
            color: isCritical ? '#ef4444' : '#f59e0b',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {isCritical ? 'Critical' : 'Stale'}
        </span>
      )}

      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        style={{
          marginLeft: '4px',
          padding: '3px 8px',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: '#334155',
          color: '#94a3b8',
          fontSize: '11px',
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          opacity: isRefreshing ? 0.5 : 1,
        }}
        title="Refresh data"
      >
        {isRefreshing ? '⏳' : '🔄'}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default DataStaleIndicator;
