import pino from 'pino';
import { config, isProduction, isDevelopment } from '../config';

/**
 * Create the base pino logger instance.
 * - Production: JSON format ( optimised for log aggregation )
 * - Development: pretty-printed with colours
 */
const baseLogger = pino({
  level: config.logLevel,
  base: {
    pid: process.pid,
    env: config.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string): { level: string } {
      return { level: label };
    },
    bindings(bindings: Record<string, unknown>): Record<string, unknown> {
      // Omit hostname in production for cleaner logs
      if (isProduction) {
        return { pid: bindings.pid, env: config.nodeEnv };
      }
      return bindings;
    },
  },
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,env',
            messageFormat: '{correlationId} | {msg}',
          },
        },
      }
    : {}),
  ...(isProduction
    ? {
        // Redact sensitive fields in production
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
            'req.body.secret',
            'res.body.token',
            'res.body.jwt',
          ],
          censor: '[REDACTED]',
        },
      }
    : {}),
});

/**
 * Global logger instance.
 * Use this for general application logging without a correlation ID context.
 */
export const logger = baseLogger;

/**
 * Create a child logger bound to a correlation (request) ID.
 * Every log entry will include the correlationId field.
 */
export function getRequestLogger(correlationId: string, meta?: Record<string, unknown>): pino.Logger {
  return baseLogger.child({
    correlationId,
    ...meta,
  });
}

/**
 * Create a child logger for a specific module/component.
 * Use for service-level logging with a component tag.
 */
export function getModuleLogger(module: string): pino.Logger {
  return baseLogger.child({ component: module });
}

// ─── Convenience exports ─────────────────────────────────────

export type Logger = pino.Logger;
export default logger;
