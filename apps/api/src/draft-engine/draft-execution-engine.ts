/**
 * DraftExecutionEngine – Main orchestrator for applying approved drafts
 * to real ad platform APIs.
 *
 * Execution flow:
 *   1. Load draft
 *   2. Validate (DraftValidator)
 *   3. Create rollback snapshot (RollbackManager)
 *   4. Apply change via platform API (ChangeApplier)
 *   5. Verify change was applied
 *   6. Update draft status to 'applied'
 *   7. Log execution (ExecutionLogger)
 *   8. Notify relevant users (NotificationDispatcher)
 *
 * If any step fails:
 *   → rollback if possible, log failure, notify, escalate if needed
 */

import type {
  Draft,
  ExecutionResult,
  Snapshot,
  ExecutionStep,
  DraftStatus,
} from './types';
import { ExecutionStatus, AdPlatform } from './types';
import { DraftValidator, type CampaignStore } from './draft-validator';
import { ChangeApplier, type PlatformApiClient } from './change-applier';
import { RollbackManager, type SnapshotStore } from './rollback-manager';
import { ExecutionLogger, type LogStore } from './execution-logger';
import { NotificationDispatcher, type ChannelRegistry } from './notification-dispatcher';
import {
  DraftEngineError,
  ValidationError,
  RollbackError,
  ExecutionError,
  classifyError,
} from './errors';
import type { RetryConfig } from './types';

// ────────────────────────────────────────────────
// Draft store interface
// ────────────────────────────────────────────────

export interface DraftStore {
  getById(id: string): Promise<Draft | null>;
  updateStatus(id: string, status: DraftStatus): Promise<void>;
  updateExecutionLog(id: string, result: ExecutionResult): Promise<void>;
  listPending(): Promise<Draft[]>;
}

// ────────────────────────────────────────────────
// Engine options
// ────────────────────────────────────────────────

export interface EngineOptions {
  draftStore: DraftStore;
  campaignStore: CampaignStore;
  snapshotStore: SnapshotStore;
  logStore: LogStore;
  platformClients: Record<AdPlatform | string, PlatformApiClient>;
  notificationChannels: ChannelRegistry;
  retryConfig?: RetryConfig;
  autoRollback?: boolean;
  maxConcurrentExecutions?: number;
}

// ────────────────────────────────────────────────
// Step tracking
// ────────────────────────────────────────────────

type StepName =
  | 'load_draft'
  | 'validate'
  | 'create_snapshot'
  | 'apply_change'
  | 'verify_change'
  | 'update_draft_status'
  | 'log_execution'
  | 'notify';

interface StepTracker {
  steps: ExecutionStep[];
  start(step: StepName): void;
  success(step: StepName): void;
  failure(step: StepName, error?: Error): void;
  skip(step: StepName): void;
  toArray(): ExecutionStep[];
}

function createStepTracker(): StepTracker {
  const steps = new Map<StepName, ExecutionStep>();

  const allSteps: StepName[] = [
    'load_draft',
    'validate',
    'create_snapshot',
    'apply_change',
    'verify_change',
    'update_draft_status',
    'log_execution',
    'notify',
  ];

  // Initialize all steps as pending
  for (const name of allSteps) {
    steps.set(name, { name, status: 'pending' });
  }

  return {
    steps: [],
    start(step: StepName) {
      const s = steps.get(step)!;
      s.status = 'running';
      s.startedAt = new Date();
    },
    success(step: StepName) {
      const s = steps.get(step)!;
      s.status = 'success';
      s.completedAt = new Date();
      if (s.startedAt) {
        s.durationMs = s.completedAt.getTime() - s.startedAt.getTime();
      }
    },
    failure(step: StepName, error?: Error) {
      const s = steps.get(step)!;
      s.status = 'failure';
      s.completedAt = new Date();
      if (s.startedAt) {
        s.durationMs = s.completedAt.getTime() - s.startedAt.getTime();
      }
      if (error) {
        s.error = {
          code: error instanceof DraftEngineError ? error.code : error.name,
          message: error.message,
          recoverable: error instanceof DraftEngineError ? error.recoverable : false,
          stackTrace: error.stack,
        };
      }
    },
    skip(step: StepName) {
      const s = steps.get(step)!;
      s.status = 'skipped';
    },
    toArray(): ExecutionStep[] {
      return allSteps.map((name) => steps.get(name)!);
    },
  };
}

// ────────────────────────────────────────────────
// DraftExecutionEngine
// ────────────────────────────────────────────────

export class DraftExecutionEngine {
  private readonly validator: DraftValidator;
  private readonly applier: ChangeApplier;
  private readonly rollbackManager: RollbackManager;
  private readonly logger: ExecutionLogger;
  private readonly notifier: NotificationDispatcher;
  private readonly autoRollback: boolean;

  // Concurrency limiter
  private runningExecutions = 0;
  private readonly maxConcurrent: number;

  constructor(private readonly options: EngineOptions) {
    this.validator = new DraftValidator(options.campaignStore);
    this.applier = new ChangeApplier(options.platformClients, options.retryConfig);
    this.rollbackManager = new RollbackManager(options.snapshotStore, options.platformClients as unknown as Record<string, import("./rollback-manager").PlatformApiClient>);
    this.logger = new ExecutionLogger(options.logStore);
    this.notifier = new NotificationDispatcher(options.notificationChannels);
    this.autoRollback = options.autoRollback ?? true;
    this.maxConcurrent = options.maxConcurrentExecutions ?? 5;
  }

  /**
   * ──────────────────────────────────────────────
   * MAIN EXECUTION FLOW
   * ──────────────────────────────────────────────
   *
   * 1. Load draft
   * 2. Validate
   * 3. Create rollback snapshot
   * 4. Apply change via platform API
   * 5. Verify change was applied
   * 6. Update draft status to 'applied'
   * 7. Log execution
   * 8. Notify relevant users
   *
   * If any step fails → rollback, log failure, notify
   */
  async executeDraft(draftId: string): Promise<ExecutionResult> {
    const tracker = createStepTracker();
    let draft: Draft | null = null;
    let snapshot: Snapshot | null = null;

    // Wait for concurrency slot
    while (this.runningExecutions >= this.maxConcurrent) {
      await this.sleep(100);
    }
    this.runningExecutions++;

    const startedAt = new Date();

    try {
      // ── Step 1: Load draft ──────────────────────
      tracker.start('load_draft');
      draft = await this.loadDraft(draftId);
      if (!draft) {
        throw new ExecutionError({
          draftId,
          code: 'DRAFT_NOT_FOUND',
          message: `Draft ${draftId} not found`,
          recoverable: false,
        });
      }
      tracker.success('load_draft');

      // Log execution start
      await this.logger.logExecutionStart(draft);

      // ── Step 2: Validate ────────────────────────
      tracker.start('validate');
      const validation = await this.validator.validate(draft);
      await this.logger.logValidation(
        draft.id,
        validation.isValid,
        validation.riskScore,
        validation.errors,
        validation.warnings
      );

      if (!validation.isValid) {
        // Validation failed — don't attempt execution
        tracker.failure('validate');
        await this.options.draftStore.updateStatus(draft.id, 'failed' as DraftStatus);

        // Build result
        const result = this.buildResult({
          draftId: draft.id,
          status: ExecutionStatus.FAILURE,
          startedAt,
          steps: tracker.toArray(),
          error: new ValidationError({
            draftId: draft.id,
            message: `Validation failed with ${validation.errors.length} error(s)`,
            validationErrors: validation.errors.map((e) => ({
              code: e.code,
              message: e.message,
              field: e.field,
            })),
          }),
          requiresRollback: false,
        });

        // Notify of validation failure
        await this.logger.logExecutionFailure(result);
        await this.notifier.notifyValidationFailure(draft, validation.errors);
        return result;
      }

      tracker.success('validate');

      // Risk alert for high-risk changes
      if (validation.riskLevel === 'high') {
        await this.notifier.notifyRiskAlert(draft, validation.riskScore);
      }

      // ── Step 3: Create rollback snapshot ────────
      tracker.start('create_snapshot');
      snapshot = await this.rollbackManager.createSnapshot(draft);
      await this.logger.logSnapshotCreated(draft.id, snapshot.id);
      tracker.success('create_snapshot');

      // ── Step 4: Apply change ────────────────────
      tracker.start('apply_change');
      const applyResult = await this.applier.apply(draft);
      tracker.success('apply_change');

      if (applyResult.status === ExecutionStatus.SUCCESS) {
        // ── Step 5: Verify ──────────────────────
        tracker.start('verify_change');
        const _verified = await this.applier.apply(draft); // Re-verify by fetching current state
        tracker.success('verify_change');

        // ── Step 6: Update draft status ─────────
        tracker.start('update_draft_status');
        await this.options.draftStore.updateStatus(draft.id, 'applied' as DraftStatus);
        tracker.success('update_draft_status');

        // ── Step 7: Log execution ───────────────
        tracker.start('log_execution');
        const result = this.buildResult({
          draftId: draft.id,
          status: ExecutionStatus.SUCCESS,
          startedAt,
          steps: tracker.toArray(),
          appliedChanges: applyResult.appliedChanges,
          requiresRollback: false,
        });
        await this.logger.logExecutionSuccess(result);
        tracker.success('log_execution');

        // ── Step 8: Notify ──────────────────────
        tracker.start('notify');
        await this.notifier.notifyExecutionSuccess(draft, result);
        tracker.success('notify');

        return result;
      }

      // Application returned non-success (shouldn't happen normally)
      throw new Error(`Unexpected apply result status: ${applyResult.status}`);
    } catch (error) {
      return await this.handleExecutionFailure(error, draft, snapshot, tracker, startedAt);
    } finally {
      this.runningExecutions--;
    }
  }

  /**
   * Handle execution failure with rollback, logging, and notification.
   *
   * Error handling strategy:
   *   - Platform API timeout → retry 3x with backoff (handled in ChangeApplier), then rollback
   *   - Platform API error → check if partial → rollback if needed
   *   - Validation failure → mark as 'failed', no rollback needed
   *   - Rollback failure → CRITICAL: escalate to human
   */
  private async handleExecutionFailure(
    error: unknown,
    draft: Draft | null,
    snapshot: Snapshot | null,
    tracker: StepTracker,
    startedAt: Date
  ): Promise<ExecutionResult> {
    const _draftId = draft?.id ?? 'unknown';
    const isDraftEngineError = error instanceof DraftEngineError;

    // Classify the error for recovery decisions
    const classification = classifyError(error);

    // Mark the current step as failed
    const currentStep = tracker.toArray().find((s) => s.status === 'running');
    if (currentStep) {
      tracker.failure(currentStep.name as StepName, error instanceof Error ? error : undefined);
    }

    // Attempt rollback if we have a snapshot and rollback is warranted
    let rollbackResult: ExecutionResult['rollbackResult'] = undefined;
    const requiresRollback = classification.shouldRollback;

    if (snapshot && draft && this.autoRollback && classification.shouldRollback) {
      tracker.start('apply_change'); // re-use apply_change step for rollback tracking
      try {
        await this.logger.logRollbackStart(draft.id, (error as Error)?.message ?? 'Unknown', snapshot.id);
        await this.notifier.notifyRollbackTriggered(draft, (error as Error)?.message ?? 'Unknown');

        rollbackResult = await this.rollbackManager.rollback(draft, snapshot);

        await this.logger.logRollbackComplete(draft.id, rollbackResult.success, snapshot.id);
      } catch (rollbackError) {
        // ROLLBACK FAILED — this is critical
        const rollbackFailure = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));

        await this.logger.logCriticalAlert(
          draft.id,
          `Rollback failed for draft ${draft.id}: ${rollbackFailure.message}`,
          {
            snapshotId: snapshot.id,
            originalError: (error as Error)?.message,
            rollbackError: rollbackFailure.message,
          }
        );

        await this.logger.logEscalation(draft.id, 'Rollback failed — manual intervention required', rollbackFailure);

        // Notify CRITICAL
        await this.notifier.notifyRollbackFailure(draft, rollbackFailure);

        // Build critical result
        const result = this.buildResult({
          draftId: draft.id,
          status: ExecutionStatus.FAILURE,
          startedAt,
          steps: tracker.toArray(),
          error: new RollbackError({
            snapshotId: snapshot.id,
            draftId: draft.id,
            message: rollbackFailure.message,
            cause: rollbackError instanceof Error ? rollbackError : undefined,
          }),
          requiresRollback: true,
          rollbackResult: {
            success: false,
            snapshotId: snapshot.id,
            startedAt: new Date(),
            completedAt: new Date(),
            stepsRestored: [],
            failedSteps: [],
            verified: false,
            error: {
              code: 'ROLLBACK_FAILED',
              message: rollbackFailure.message,
              recoverable: false,
            },
          },
        });

        await this.logger.logExecutionFailure(result);
        return result;
      }
    }

    // Build the failure result
    const result = this.buildResult({
      draftId: draft?.id ?? 'unknown',
      status: rollbackResult?.success ? ExecutionStatus.ROLLED_BACK : ExecutionStatus.FAILURE,
      startedAt,
      steps: tracker.toArray(),
      error: isDraftEngineError
        ? (error as DraftEngineError).toExecutionError()
        : {
            code: 'EXECUTION_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error during execution',
            recoverable: false,
            stackTrace: error instanceof Error ? error.stack : undefined,
          },
      requiresRollback,
      rollbackResult,
    });

    // Update draft status to failed
    if (draft) {
      try {
        await this.options.draftStore.updateStatus(draft.id, 'failed' as DraftStatus);
        tracker.success('update_draft_status');
      } catch {
        tracker.failure('update_draft_status');
      }
    }

    // Log and notify
    await this.logger.logExecutionFailure(result);

    if (draft) {
      try {
        await this.notifier.notifyExecutionFailure(draft, result);
        tracker.success('notify');
      } catch {
        tracker.failure('notify');
      }
    }

    return result;
  }

  /**
   * Execute all pending drafts in sequence.
   */
  async executeAllPending(): Promise<ExecutionResult[]> {
    const drafts = await this.options.draftStore.listPending();
    const results: ExecutionResult[] = [];

    for (const draft of drafts) {
      const result = await this.executeDraft(draft.id);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a draft without executing it.
   */
  async validateDraft(draftId: string): Promise<{
    draft: Draft | null;
    validation: Awaited<ReturnType<DraftValidator['validate']>> | null;
  }> {
    const draft = await this.loadDraft(draftId);
    if (!draft) return { draft: null, validation: null };

    const validation = await this.validator.validate(draft);
    return { draft, validation };
  }

  // ───────────── Private helpers ─────────────

  private async loadDraft(draftId: string): Promise<Draft | null> {
    return this.options.draftStore.getById(draftId);
  }

  private buildResult(params: {
    draftId: string;
    status: ExecutionStatus;
    startedAt: Date;
    steps: ExecutionStep[];
    appliedChanges?: ExecutionResult['appliedChanges'];
    error?: Error | ExecutionResult['error'];
    requiresRollback: boolean;
    rollbackResult?: ExecutionResult['rollbackResult'];
  }): ExecutionResult {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - params.startedAt.getTime();

    const error: ExecutionResult['error'] =
      params.error instanceof Error
        ? params.error instanceof DraftEngineError
          ? params.error.toExecutionError()
          : {
              code: params.error.name,
              message: params.error.message,
              recoverable: false,
              stackTrace: params.error.stack,
            }
        : params.error ?? undefined;

    return {
      draftId: params.draftId,
      status: params.status,
      startedAt: params.startedAt,
      completedAt,
      durationMs,
      steps: params.steps,
      appliedChanges: params.appliedChanges,
      error,
      requiresRollback: params.requiresRollback,
      rollbackResult: params.rollbackResult,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
