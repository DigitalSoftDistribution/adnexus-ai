/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║          ADNEXUS — Draft Execution Engine                        ║
 * ║                                                                  ║
 * ║  Applies approved optimization drafts to real ad platform APIs.  ║
 * ║  Handles validation, execution, rollback, logging, and alerts.   ║
 * ║                                                                  ║
 * ║  Architecture:                                                   ║
 * ║    DraftExecutionEngine (orchestrator)                           ║
 * ║    ├── DraftValidator    (pre-execution validation)              ║
 * ║    ├── ChangeApplier     (platform API integration)              ║
 * ║    ├── RollbackManager   (failure recovery)                      ║
 * ║    ├── ExecutionLogger   (audit trail)                           ║
 * ║    └── NotificationDispatcher (alerts & notifications)           ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * @module draft-engine
 */

// ────────────────────────────────────────────────
// Core Types
// ────────────────────────────────────────────────

export {
  // Enums
  AdPlatform,
  ChangeType,
  DraftStatus,
  CampaignStatus,
  ExecutionStatus,
  RiskLevel,
  NotificationChannel,
  NotificationSeverity,
  // Constants
  DEFAULT_RETRY_CONFIG,
  DEFAULT_ENGINE_CONFIG,
} from './types';

export type {
  // Models
  Campaign,
  CampaignBudget,
  BidStrategy,
  TargetingConfig,
  DemographicTargeting,
  GeoTargeting,
  Creative,
  Draft,
  ProposedChanges,
  CampaignSnapshot,
  User,
  NotificationPreference,
  // Validation
  ValidationResult,
  ValidationError,
  ValidationWarning,
  PolicyCheck,
  // Execution
  ExecutionResult,
  ExecutionStep,
  AppliedChange,
  ExecutionError,
  PlatformError,
  // Snapshot & Rollback
  Snapshot,
  RollbackResult,
  RollbackStep,
  // Logging
  ExecutionLogEntry,
  ExecutionLogFilter,
  // Notification
  Notification,
  // Platform API
  PlatformApiConfig,
  PlatformCredentials,
  PlatformApiResponse,
  // Retry
  RetryConfig,
  EngineConfig,
} from './types';

// ────────────────────────────────────────────────
// Errors
// ────────────────────────────────────────────────

export {
  DraftEngineError,
  ValidationError,
  CampaignNotFoundError,
  StateMismatchError,
  PolicyViolationError,
  ExecutionError,
  PlatformTimeoutError,
  PlatformApiError,
  PartialApplicationError,
  RollbackError,
  RollbackVerificationError,
  NotificationDispatchError,
  classifyError,
} from './errors';

// ────────────────────────────────────────────────
// DraftValidator
// ────────────────────────────────────────────────

export { DraftValidator } from './draft-validator';
export type { CampaignStore } from './draft-validator';

// ────────────────────────────────────────────────
// ChangeApplier
// ────────────────────────────────────────────────

export { ChangeApplier } from './change-applier';
export type { PlatformApiClient } from './change-applier';

// ────────────────────────────────────────────────
// RollbackManager
// ────────────────────────────────────────────────

export { RollbackManager } from './rollback-manager';
export type { SnapshotStore, PlatformApiClient as RollbackPlatformClient } from './rollback-manager';

// ────────────────────────────────────────────────
// ExecutionLogger
// ────────────────────────────────────────────────

export { ExecutionLogger } from './execution-logger';
export type { LogStore } from './execution-logger';

// ────────────────────────────────────────────────
// NotificationDispatcher
// ────────────────────────────────────────────────

export { NotificationDispatcher } from './notification-dispatcher';
export type {
  ChannelRegistry,
  EmailSender,
  SlackSender,
  InAppSender,
  WebhookSender,
} from './notification-dispatcher';

// ────────────────────────────────────────────────
// DraftExecutionEngine (main orchestrator)
// ────────────────────────────────────────────────

export { DraftExecutionEngine } from './draft-execution-engine';
export type {
  DraftStore,
  EngineOptions,
} from './draft-execution-engine';
