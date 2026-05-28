/**
 * useErrorBoundary.tsx
 * A per-page Error Boundary hook + component for wrapping route-level pages.
 * Provides friendly error UI, a "Report Bug" button, and an auto-retry mechanism.
 *
 * Usage:
 *   import { useErrorBoundary, ErrorBoundaryFallback } from './useErrorBoundary';
 *
 *   // Wrap a page component:
 *   <ErrorBoundaryFallback>
 *     <MyPage />
 *   </ErrorBoundaryFallback>
 */

import React, {
  ComponentType,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
  Component,
  ErrorInfo,
} from 'react';

// ============================================================
// Types
// ============================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Max auto-retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 3000) */
  retryDelayMs?: number;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo, retryCount: number) => void;
  /** Custom fallback UI (replaces default) */
  fallback?: ComponentType<FallbackProps>;
  /** Additional context to include in bug reports */
  pageName?: string;
}

interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReportBug: () => void;
  pageName?: string;
}

interface UseErrorBoundaryReturn {
  ErrorBoundaryWrapper: ComponentType<{ children: ReactNode }>;
  forceError: (msg?: string) => void;
  reset: () => void;
  hasError: boolean;
}

// ============================================================
// Default Fallback UI Component
// ============================================================

const DefaultFallback: React.FC<FallbackProps> = ({
  error,
  errorInfo,
  retryCount,
  maxRetries,
  onRetry,
  onReportBug,
  pageName = 'This page',
}) => {
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReportBug = useCallback(() => {
    setIsReporting(true);
    onReportBug();
    // Simulate report submission
    setTimeout(() => {
      setIsReporting(false);
      setReportSent(true);
    }, 1500);
  }, [onReportBug]);

  // Auto-retry indicator
  const canRetry = retryCount < maxRetries;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#0f172a',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: '#1e1e2e',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          border: '1px solid #ef444430',
          animation: 'slideUp 0.4s ease-out',
        }}
      >
        {/* Error Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#ef444420',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '40px',
          }}
        >
          💥
        </div>

        {/* Title */}
        <h1
          style={{
            color: '#f8fafc',
            fontSize: '24px',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 8px 0',
          }}
        >
          Something Went Wrong
        </h1>

        {/* Description */}
        <p
          style={{
            color: '#94a3b8',
            fontSize: '14px',
            textAlign: 'center',
            lineHeight: 1.6,
            margin: '0 0 24px 0',
          }}
        >
          {pageName} encountered an unexpected error. We've noted the issue
          {canRetry && ' and will try to recover automatically'}.
        </p>

        {/* Retry Status */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid #334155',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '4px',
              marginBottom: '12px',
            }}
          >
            {Array.from({ length: maxRetries }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '32px',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor:
                    i < retryCount
                      ? '#ef4444'
                      : i === retryCount && canRetry
                      ? '#f59e0b'
                      : '#334155',
                  transition: 'background-color 0.3s',
                }}
              />
            ))}
          </div>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
            {canRetry
              ? `Auto-retry ${retryCount + 1} of ${maxRetries} in progress...`
              : retryCount >= maxRetries
              ? 'All retry attempts exhausted'
              : 'Issue resolved'}
          </p>
        </div>

        {/* Error Details (Collapsible) */}
        {error && (
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>🐛 Error Details</span>
              <span
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                ▼
              </span>
            </button>
            {isExpanded && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#ef4444',
                  overflow: 'auto',
                  maxHeight: '200px',
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>
                  <strong>{error.name}:</strong> {error.message}
                </p>
                {error.stack && (
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: '#94a3b8',
                      fontSize: '10px',
                    }}
                  >
                    {error.stack}
                  </pre>
                )}
                {errorInfo && (
                  <pre
                    style={{
                      margin: '8px 0 0 0',
                      whiteSpace: 'pre-wrap',
                      color: '#64748b',
                      fontSize: '10px',
                    }}
                  >
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onRetry}
            style={{
              flex: 2,
              padding: '12px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <span>🔄</span> Try Again
          </button>
          <button
            onClick={handleReportBug}
            disabled={isReporting || reportSent}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '10px',
              border: reportSent ? '1px solid #22c55e' : '1px solid #475569',
              backgroundColor: reportSent ? '#22c55e20' : 'transparent',
              color: reportSent ? '#22c55e' : '#94a3b8',
              fontWeight: 600,
              fontSize: '14px',
              cursor: isReporting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isReporting
              ? 'Sending...'
              : reportSent
              ? '✅ Reported'
              : '🐛 Report Bug'}
          </button>
        </div>

        {/* Home Link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a
            href="/"
            style={{
              color: '#64748b',
              fontSize: '13px',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            ← Go back home
          </a>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ============================================================
// Error Boundary Class Component (required by React)
// ============================================================

class ErrorBoundaryClass extends Component<
  Omit<ErrorBoundaryProps, 'fallback'> & {
    FallbackComponent: ComponentType<FallbackProps>;
    onReset: () => void;
  },
  ErrorBoundaryState
> {
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const retryCount = this.state.retryCount;
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo, retryCount);

    // Auto-retry logic
    const { maxRetries = 3, retryDelayMs = 3000 } = this.props;
    if (retryCount < maxRetries) {
      this.retryTimer = setTimeout(() => {
        this.setState((prev) => ({
          retryCount: prev.retryCount + 1,
          hasError: false,
          error: null,
          errorInfo: null,
        }));
      }, retryDelayMs);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleRetry = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.props.onReset();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  handleReportBug = () => {
    const { error, errorInfo } = this.state;
    const { pageName } = this.props;

    const reportData = {
      page: pageName,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
      },
    };

    // Send to your error reporting service (e.g., Sentry, LogRocket)
    console.error('[Bug Report]', JSON.stringify(reportData, null, 2));

    // Example: Send to an analytics endpoint
    if (typeof window !== 'undefined') {
      // window.gtag?.('event', 'exception', { description: error?.message });
      fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
        // Use keepalive to ensure the report is sent even if page unloads
        keepalive: true,
      }).catch(() => {
        // Silently fail — error reporting should never crash the app
      });
    }
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, FallbackComponent, maxRetries = 3, pageName } = this.props;

    if (hasError) {
      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          retryCount={retryCount}
          maxRetries={maxRetries}
          onRetry={this.handleRetry}
          onReportBug={this.handleReportBug}
          pageName={pageName}
        />
      );
    }

    return children;
  }
}

// ============================================================
// Hook: useErrorBoundary
// ============================================================

export function useErrorBoundary(
  options: Omit<ErrorBoundaryProps, 'children' | 'fallback'> = {}
): UseErrorBoundaryReturn {
  const [key, setKey] = useState(0);
  const [hasError, setHasError] = useState(false);

  const forceError = useCallback((msg = 'Forced error from useErrorBoundary') => {
    setHasError(true);
    throw new Error(msg);
  }, []);

  const reset = useCallback(() => {
    setKey((prev) => prev + 1);
    setHasError(false);
  }, []);

  const ErrorBoundaryWrapper = useCallback(
    ({ children }: { children: ReactNode }) => (
      <ErrorBoundaryClass
        key={key}
        maxRetries={options.maxRetries}
        retryDelayMs={options.retryDelayMs}
        onError={(err, info, count) => {
          setHasError(true);
          options.onError?.(err, info, count);
        }}
        FallbackComponent={DefaultFallback}
        onReset={reset}
        pageName={options.pageName}
      >
        {children}
      </ErrorBoundaryClass>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, options.maxRetries, options.retryDelayMs, options.pageName, reset]
  );

  return {
    ErrorBoundaryWrapper,
    forceError,
    reset,
    hasError,
  };
}

// ============================================================
// Standalone Component: ErrorBoundaryFallback
// ============================================================

export const ErrorBoundaryFallback: React.FC<
  Omit<ErrorBoundaryProps, 'fallback'>
> = ({
  children,
  maxRetries = 3,
  retryDelayMs = 3000,
  onError,
  pageName,
}) => {
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    setResetKey((prev) => prev + 1);
  }, []);

  return (
    <ErrorBoundaryClass
      key={resetKey}
      maxRetries={maxRetries}
      retryDelayMs={retryDelayMs}
      onError={onError}
      FallbackComponent={DefaultFallback}
      onReset={handleReset}
      pageName={pageName}
    >
      {children}
    </ErrorBoundaryClass>
  );
};

// ============================================================
// Re-exports
// ============================================================

export type { FallbackProps, ErrorBoundaryProps, ErrorBoundaryState, UseErrorBoundaryReturn };
export { DefaultFallback };
export default useErrorBoundary;
