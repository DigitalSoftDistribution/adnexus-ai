/**
 * Custom error classes for the Draft Execution Engine.
 * Each error type maps to a specific failure mode and carries
 * the context needed for recovery decisions.
 */

import type { Draft, ExecutionError, PlatformError, Snapshot } from './types';
import { DraftStatus, ExecutionStatus, NotificationSeverity } from './types';

// ────────────────────────────────────────────────
// Base Error
// ────────────────────────────────────────────────

export class DraftEngineError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;
  public readonly severity: NotificationSeverity;
  public readonly context: Record<string, unknown>;

  constructor(options: {
    code: string;
    message: string;
    recoverable?: boolean;
    severity?: NotificationSeverity;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.recoverable = options.recoverable ?? false;
    this.severity = options.severity ?? NotificationSeverity.ERROR;
    this.context = options.context ?? {};
    if (options.cause) {
      this.cause = options.cause;
    }
    Error.captureStackTrace(this, this.constructor);
  }

  toExecutionError(): ExecutionError {
    return {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      stackTrace: this.stack,
    };
  }
}

// ────────────────────────────────────────────────
// Validation Errors
// ────────────────────────────────────────────────

export class ValidationError extends DraftEngineError {
  public readonly draftId: string;
  public readonly validationErrors: Array<{ code: string; message: string; field?: string }>;

  constructor(options: {
    draftId: string;
    message: string;
    validationErrors: Array<{ code: string; message: string; field?: string }>;
    cause?: Error;
  }) {
    super({
      code: 'VALIDATION_FAILED',
      message: options.message,
      recoverable: true,
      severity: NotificationSeverity.WARNING,
      context: { draftId: options.draftId, errors: options.validationErrors },
      cause: options.cause,
    });
    this.draftId = options.draftId;
    this.validationErrors = options.validationErrors;
  }
}

export class CampaignNotFoundError extends DraftEngineError {
  public readonly campaignId: string;

  constructor(options: { campaignId: string; draftId: string }) {
    super({
      code: 'CAMPAIGN_NOT_FOUND',
      message: `Campaign ${options.campaignId} not found or no longer accessible`,
      recoverable: false,
      severity: NotificationSeverity.ERROR,
      context: { campaignId: options.campaignId, draftId: options.draftId },
    });
    this.campaignId = options.campaignId;
  }
}

export class StateMismatchError extends DraftEngineError {
  constructor(options: { draftId: string; campaignId: string }) {
    super({
      code: 'STATE_MISMATCH',
      message: `Campaign state has changed since draft was created. Re-approval required.`,
      recoverable: true,
      severity: NotificationSeverity.WARNING,
      context: { draftId: options.draftId, campaignId: options.campaignId },
    });
  }
}

export class PolicyViolationError extends DraftEngineError {
  public readonly violations: Array<{ policyId: string; details: string }>;

  constructor(options: {
    draftId: string;
    violations: Array<{ policyId: string; details: string }>;
  }) {
    super({
      code: 'POLICY_VIOLATION',
      message: `Draft violates ${options.violations.length} platform policies`,
      recoverable: false,
      severity: NotificationSeverity.ERROR,
      context: { draftId: options.draftId, violations: options.violations },
    });
    this.violations = options.violations;
  }
}

// ────────────────────────────────────────────────
// Execution Errors
// ────────────────────────────────────────────────

export class ExecutionError extends DraftEngineError {
  public readonly draftId: string;
  public readonly executionStatus: ExecutionStatus;

  constructor(options: {
    draftId: string;
    message: string;
    code: string;
    recoverable?: boolean;
    severity?: NotificationSeverity;
    platformError?: PlatformError;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      code: options.code,
      message: options.message,
      recoverable: options.recoverable ?? false,
      severity: options.severity ?? NotificationSeverity.ERROR,
      context: {
        draftId: options.draftId,
        ...options.context,
      },
      cause: options.cause,
    });
    this.draftId = options.draftId;
    this.executionStatus = ExecutionStatus.FAILURE;
  }
}

export class PlatformTimeoutError extends DraftEngineError {
  public readonly platform: string;
  public readonly attempts: number;

  constructor(options: { platform: string; attempts: number; draftId: string; cause?: Error }) {
    super({
      code: 'PLATFORM_TIMEOUT',
      message: `Platform API ${options.platform} timed out after ${options.attempts} attempts`,
      recoverable: true,
      severity: NotificationSeverity.ERROR,
      context: { platform: options.platform, attempts: options.attempts, draftId: options.draftId },
      cause: options.cause,
    });
    this.platform = options.platform;
    this.attempts = options.attempts;
  }
}

export class PlatformApiError extends DraftEngineError {
  public readonly platform: string;
  public readonly apiResponse?: unknown;
  public readonly statusCode?: number;

  constructor(options: {
    platform: string;
    message: string;
    draftId: string;
    apiResponse?: unknown;
    statusCode?: number;
    cause?: Error;
  }) {
    const retryable = options.statusCode
      ? [408, 429, 500, 502, 503, 504].includes(options.statusCode)
      : false;

    super({
      code: 'PLATFORM_API_ERROR',
      message: `Platform ${options.platform} API error: ${options.message}`,
      recoverable: retryable,
      severity: retryable ? NotificationSeverity.WARNING : NotificationSeverity.ERROR,
      context: {
        platform: options.platform,
        draftId: options.draftId,
        statusCode: options.statusCode,
      },
      cause: options.cause,
    });
    this.platform = options.platform;
    this.apiResponse = options.apiResponse;
    this.statusCode = options.statusCode;
  }
}

export class PartialApplicationError extends DraftEngineError {
  public readonly appliedFields: string[];

  constructor(options: {
    draftId: string;
    appliedFields: string[];
    failedField: string;
    cause?: Error;
  }) {
    super({
      code: 'PARTIAL_APPLICATION',
      message: `Change was partially applied. Successful fields: ${options.appliedFields.join(', ')}`,
      recoverable: true,
      severity: NotificationSeverity.ERROR,
      context: {
        draftId: options.draftId,
        appliedFields: options.appliedFields,
        failedField: options.failedField,
      },
      cause: options.cause,
    });
    this.appliedFields = options.appliedFields;
  }
}

// ────────────────────────────────────────────────
// Rollback Errors
// ────────────────────────────────────────────────

export class RollbackError extends DraftEngineError {
  public readonly snapshotId: string;

  constructor(options: {
    snapshotId: string;
    draftId: string;
    message: string;
    cause?: Error;
  }) {
    super({
      code: 'ROLLBACK_FAILED',
      message: `CRITICAL: Rollback failed for draft ${options.draftId}: ${options.message}`,
      recoverable: false,
      severity: NotificationSeverity.CRITICAL,
      context: { snapshotId: options.snapshotId, draftId: options.draftId },
      cause: options.cause,
    });
    this.snapshotId = options.snapshotId;
  }
}

export class RollbackVerificationError extends DraftEngineError {
  constructor(options: { snapshotId: string; draftId: string }) {
    super({
      code: 'ROLLBACK_VERIFICATION_FAILED',
      message: `Rollback verification failed: state does not match expected snapshot`,
      recoverable: false,
      severity: NotificationSeverity.CRITICAL,
      context: { snapshotId: options.snapshotId, draftId: options.draftId },
    });
  }
}

// ────────────────────────────────────────────────
// Notification Error
// ────────────────────────────────────────────────

export class NotificationDispatchError extends DraftEngineError {
  constructor(options: { draftId: string; channels: string[]; cause?: Error }) {
    super({
      code: 'NOTIFICATION_FAILED',
      message: `Failed to dispatch notifications to channels: ${options.channels.join(', ')}`,
      recoverable: true,
      severity: NotificationSeverity.WARNING,
      context: { draftId: options.draftId, channels: options.channels },
      cause: options.cause,
    });
  }
}

// ────────────────────────────────────────────────
// Utility error classifier
// ────────────────────────────────────────────────

export function classifyError(error: unknown): {
  type: string;
  recoverable: boolean;
  shouldRollback: boolean;
  shouldEscalate: boolean;
} {
  if (error instanceof RollbackError || error instanceof RollbackVerificationError) {
    return { type: 'rollback_failure', recoverable: false, shouldRollback: false, shouldEscalate: true };
  }
  if (error instanceof PlatformTimeoutError) {
    return { type: 'platform_timeout', recoverable: true, shouldRollback: true, shouldEscalate: false };
  }
  if (error instanceof PlatformApiError) {
    return {
      type: 'platform_api_error',
      recoverable: error.recoverable,
      shouldRollback: !error.recoverable,
      shouldEscalate: false,
    };
  }
  if (error instanceof ValidationError || error instanceof StateMismatchError) {
    return { type: 'validation_failure', recoverable: true, shouldRollback: false, shouldEscalate: false };
  }
  if (error instanceof PolicyViolationError) {
    return { type: 'policy_violation', recoverable: false, shouldRollback: false, shouldEscalate: false };
  }
  if (error instanceof PartialApplicationError) {
    return { type: 'partial_application', recoverable: true, shouldRollback: true, shouldEscalate: false };
  }
  return { type: 'unknown', recoverable: false, shouldRollback: true, shouldEscalate: true };
}
