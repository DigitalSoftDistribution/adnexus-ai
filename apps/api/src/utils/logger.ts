/**
 * Compatibility shim: some modules import the logger from `utils/logger`.
 * Re-export the real pino logger from `lib/logger` so those call sites get
 * structured, redacted logging instead of the historical no-op stub.
 */
export { logger, getRequestLogger, getModuleLogger } from '../lib/logger';
export type { Logger } from '../lib/logger';
export { default } from '../lib/logger';
