// @ts-nocheck
/**
 * SessionExpiryModal.tsx
 * Displays a modal when the user's JWT/session has expired.
 * Auto-redirects to login with the current path preserved for post-login redirect.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface SessionExpiryModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Timestamp when the session originally expired */
  expiredAt?: number;
  /** Login page route path (default: '/login') */
  loginPath?: string;
  /** Current page path to redirect back after re-login */
  currentPath?: string;
  /** Optional callback before redirect */
  onBeforeRedirect?: () => void;
  /** Optional callback when modal is dismissed */
  onDismiss?: () => void;
  /** Grace period in seconds before forced redirect (default: 10) */
  gracePeriodSeconds?: number;
}

const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  expiredAt,
  loginPath = '/login',
  currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
  onBeforeRedirect,
  onDismiss,
  gracePeriodSeconds = 10,
}) => {
  const [countdown, setCountdown] = useState(gracePeriodSeconds);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const gracePeriodMs = gracePeriodSeconds * 1000;

  /** Build the login URL with redirect parameter */
  const buildRedirectUrl = useCallback(() => {
    const separator = loginPath.includes('?') ? '&' : '?';
    const encodedReturnUrl = encodeURIComponent(currentPath);
    return `${loginPath}${separator}redirect=${encodedReturnUrl}`;
  }, [loginPath, currentPath]);

  /** Perform the redirect to login */
  const performRedirect = useCallback(() => {
    setIsRedirecting(true);
    onBeforeRedirect?.();
    // Small delay so user sees the redirect state
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = buildRedirectUrl();
      }
    }, 800);
  }, [buildRedirectUrl, onBeforeRedirect]);

  /** Handle manual redirect now */
  const handleRedirectNow = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    performRedirect();
  }, [performRedirect]);

  /** Handle dismiss (only if not forcing redirect) */
  const handleDismiss = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(gracePeriodSeconds);
      setIsRedirecting(false);
      return;
    }

    // Start countdown
    setCountdown(gracePeriodSeconds);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          performRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, gracePeriodSeconds, performRedirect]);

  if (!isOpen) return null;

  const timeSinceExpiry = expiredAt ? Math.floor((Date.now() - expiredAt) / 1000) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.3s ease-out',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expiry-title"
    >
      <div
        style={{
          backgroundColor: '#1e1e2e',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '460px',
          width: '90%',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          border: '1px solid #ef444440',
          animation: 'slideUp 0.35s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#ef444420',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '36px',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            🔒
          </div>
          <h2
            id="session-expiry-title"
            style={{
              color: '#f8fafc',
              fontSize: '22px',
              fontWeight: 700,
              margin: '0 0 8px 0',
            }}
          >
            Session Expired
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            Your session has expired for security reasons.
            {timeSinceExpiry > 0 && (
              <span style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                Expired {timeSinceExpiry}s ago
              </span>
            )}
          </p>
        </div>

        {/* Redirect Countdown */}
        {!isRedirecting ? (
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '24px',
              border: '1px solid #334155',
            }}
          >
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Redirecting to login in
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {[...String(countdown).padStart(2, '0')].map((digit, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '40px',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: countdown <= 3 ? '#ef4444' : '#f8fafc',
                    fontFamily: 'monospace',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    minWidth: '36px',
                    animation: countdown <= 3 ? 'pulse 0.5s ease-in-out infinite' : 'none',
                  }}
                >
                  {digit}
                </span>
              ))}
            </div>
            <p style={{ color: '#475569', fontSize: '12px', margin: '12px 0 0 0' }}>
              You'll be returned to this page after logging back in
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '24px',
              border: '1px solid #22c55e40',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #334155',
                borderTopColor: '#22c55e',
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600, margin: 0 }}>
              Redirecting...
            </p>
          </div>
        )}

        {/* Current Path Preservation Notice */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>📍</span>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '0 0 2px 0' }}>Current page saved</p>
            <p
              style={{
                color: '#94a3b8',
                fontSize: '12px',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}
              title={currentPath}
            >
              {currentPath.length > 40 ? currentPath.slice(0, 37) + '...' : currentPath}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRedirectNow}
            disabled={isRedirecting}
            style={{
              flex: 2,
              padding: '12px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: isRedirecting ? 'not-allowed' : 'pointer',
              opacity: isRedirecting ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {isRedirecting ? 'Redirecting...' : '🔑 Login Now'}
          </button>
          {!isRedirecting && (
            <button
              onClick={handleDismiss}
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
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#475569';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              Stay Here
            </button>
          )}
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
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SessionExpiryModal;
