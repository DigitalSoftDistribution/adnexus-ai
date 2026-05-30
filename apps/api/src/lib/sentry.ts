/**
 * Sentry Error Monitoring Integration
 *
 * Captures errors and performance data for the AdNexus API.
 * Initialize early in the application lifecycle.
 */

import { config, isProduction } from '../config';

// Lazy-load Sentry to avoid type errors when package is missing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/node');
} catch {
  // Sentry not installed
}

export function initSentry(): void {
  if (!Sentry || !config.sentryDsn) {
    console.log('Sentry not configured — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    release: config.version,

    // Performance monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    profilesSampleRate: isProduction ? 0.05 : 1.0,

    // Error filtering
    beforeSend(event: any) {
      // Filter out known non-actionable errors
      const ignoreErrors = [
        'ETIMEDOUT',
        'ECONNRESET',
        'EPIPE',
        'Request aborted',
        'Supabase request failed',
      ];

      const errorMessage = event.exception?.values?.[0]?.value ?? '';
      if (ignoreErrors.some((e: string) => errorMessage.includes(e))) {
        return null;
      }

      // Redact sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers['x-api-key'];
        }
      }

      return event;
    },

    integrations: [
      Sentry.httpIntegration({
        breadcrumbs: true,
      }),
    ],
  });
}

export { Sentry };
