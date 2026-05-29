/**
 * Sentry Error Monitoring Integration
 *
 * Captures errors and performance data for the AdNexus API.
 * Initialize early in the application lifecycle.
 */

import * as Sentry from '@sentry/node';
import { config } from '../config';

export function initSentry(): void {
  if (!config.sentryDsn) {
    console.log('Sentry DSN not configured — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    release: config.version,

    // Performance monitoring
    tracesSampleRate: config.isProduction ? 0.1 : 1.0,
    profilesSampleRate: config.isProduction ? 0.05 : 1.0,

    // Error filtering
    beforeSend(event) {
      // Filter out known non-actionable errors
      const ignoreErrors = [
        'ETIMEDOUT',
        'ECONNRESET',
        'EPIPE',
        'Request aborted',
        'Supabase request failed',
      ];

      const errorMessage = event.exception?.values?.[0]?.value ?? '';
      if (ignoreErrors.some((e) => errorMessage.includes(e))) {
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
