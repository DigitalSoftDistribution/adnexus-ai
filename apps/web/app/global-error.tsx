'use client';

import { useEffect } from 'react';

// Global error boundary: replaces the root layout when it errors, so it must
// render its own <html>/<body>. Styles are inlined because globals.css from
// the root layout is not available here, and strings are hardcoded English
// because the next-intl provider may not have mounted.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', maxWidth: '420px' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
