/**
 * RateLimitModal.tsx
 * Displays a modal warning when the API rate limit is approached or exceeded.
 * Features a countdown timer showing when the rate limit resets.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface RateLimitModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Unix timestamp (ms) when the rate limit resets */
  resetTimestamp: number;
  /** Current number of requests made in the window */
  requestCount?: number;
  /** Maximum requests allowed in the window */
  requestLimit?: number;
  /** Callback fired when the modal is closed */
  onClose?: () => void;
  /** Callback fired when user clicks "Back off" */
  onBackoff?: () => void;
}

const RateLimitModal: React.FC<RateLimitModalProps> = ({
  isOpen,
  resetTimestamp,
  requestCount = 0,
  requestLimit = 100,
  onClose,
  onBackoff,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isShaking, setIsShaking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressPercent = Math.min(100, (requestCount / requestLimit) * 100);
  const isCritical = progressPercent >= 90;

  /** Calculate and update the countdown timer */
  const updateTimer = useCallback(() => {
    const now = Date.now();
    const diff = resetTimestamp - now;
    if (diff <= 0) {
      setTimeRemaining(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onClose?.();
      return;
    }
    setTimeRemaining(diff);
  }, [resetTimestamp, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(0);
      return;
    }
    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);
    // Shake animation trigger
    setIsShaking(true);
    const shakeTimer = setTimeout(() => setIsShaking(false), 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(shakeTimer);
    };
  }, [isOpen, updateTimer]);

  if (!isOpen) return null;

  const seconds = Math.floor((timeRemaining / 1000) % 60);
  const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const progressColor = isCritical
    ? '#ef4444'
    : progressPercent >= 70
    ? '#f59e0b'
    : '#3b82f6';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-limit-title"
    >
      <div
        style={{
          backgroundColor: '#1e1e2e',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '440px',
          width: '90%',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          border: `1px solid ${progressColor}40`,
          animation: isShaking ? 'shake 0.5s ease-in-out' : 'slideUp 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: `${progressColor}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '32px',
            }}
          >
            ⚠️
          </div>
          <h2
            id="rate-limit-title"
            style={{
              color: '#f8fafc',
              fontSize: '20px',
              fontWeight: 700,
              margin: '0 0 8px 0',
            }}
          >
            Rate Limit {isCritical ? 'Exceeded' : 'Approaching'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            {isCritical
              ? "You've hit the API rate limit. Please slow down."
              : "You're approaching the API rate limit. Slow down to avoid disruption."}
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#94a3b8',
            }}
          >
            <span>Requests Used</span>
            <span style={{ color: isCritical ? '#ef4444' : '#f8fafc', fontWeight: 600 }}>
              {requestCount} / {requestLimit}
            </span>
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: '#334155',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: progressColor,
                borderRadius: '4px',
                transition: 'width 0.3s ease, background-color 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Countdown Timer */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '20px',
            border: '1px solid #334155',
          }}
        >
          <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Resets In
          </p>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: timeRemaining > 0 ? '#f8fafc' : '#22c55e',
              fontFamily: 'monospace',
              letterSpacing: '2px',
            }}
          >
            {timeRemaining > 0 ? formattedTime : '00:00'}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onBackoff}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: progressColor,
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            🐢 Slow Down
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '10px',
              border: '1px solid #475569',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#94a3b8';
              e.currentTarget.style.color = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#475569';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            Dismiss
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};

export default RateLimitModal;
