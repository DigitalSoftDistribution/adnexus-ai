/**
 * ExecutionLogger – Logs every execution attempt with full audit trail.
 *
 * All logs are structured, timestamped, and immutable. They form the
 * complete history of every decision and action taken by the engine.
 */

import type { ExecutionLogEntry, ExecutionLogFilter, ExecutionResult, ExecutionStep, Draft } from './types';
import { ExecutionStatus } from './types';
import crypto from 'crypto';

// ────────────────────────────────────────────────
// Log store interface
// ────────────────────────────────────────────────

export interface LogStore {
  insert(entry: ExecutionLogEntry): Promise<void>;
  find(filter: ExecutionLogFilter): Promise<ExecutionLogEntry[]>;
  findByDraftId(draftId: string): Promise<ExecutionLogEntry[]>;
  findLatest(draftId: string): Promise<ExecutionLogEntry | null>;
}

// ────────────────────────────────────────────────
// ExecutionLogger
// ────────────────────────────────────────────────

export class ExecutionLogger {
  constructor(private readonly logStore: LogStore) {}

  /**
   * Log the start of a draft execution.
   */
  async logExecutionStart(draft: Draft): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId: draft.id,
      level: 'info',
      message: `Execution started for draft ${draft.id} (campaign: ${draft.campaign.name}, platform: ${draft.platform})`,
      step: 'execution_start',
      metadata: {
        campaignId: draft.campaignId,
        platform: draft.platform,
        changeType: draft.changeType,
        proposedChanges: draft.proposedChanges,
        requestedBy: draft.requestedBy.id,
      },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log a specific execution step beginning.
   */
  async logStepStart(draftId: string, stepName: string, metadata?: Record<string, unknown>): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'debug',
      message: `Step '${stepName}' started`,
      step: stepName,
      metadata: { status: 'running', ...metadata },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log successful completion of a step.
   */
  async logStepSuccess(draftId: string, stepName: string, metadata?: Record<string, unknown>): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'debug',
      message: `Step '${stepName}' completed successfully`,
      step: stepName,
      metadata: { status: 'success', ...metadata },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log failure of a step.
   */
  async logStepFailure(
    draftId: string,
    stepName: string,
    error: Error,
    metadata?: Record<string, unknown>
  ): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'error',
      message: `Step '${stepName}' failed: ${error.message}`,
      step: stepName,
      metadata: { status: 'failure', ...metadata },
      error: {
        code: error.name,
        message: error.message,
        recoverable: false,
      },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log validation results.
   */
  async logValidation(
    draftId: string,
    isValid: boolean,
    riskScore: number,
    errors: Array<{ code: string; message: string }>,
    warnings: Array<{ code: string; message: string }>
  ): Promise<ExecutionLogEntry> {
    const level = isValid ? (warnings.length > 0 ? 'warn' : 'info') : 'error';
    const entry = this.createEntry({
      draftId,
      level,
      message: `Validation ${isValid ? 'passed' : 'failed'} (risk: ${riskScore}). Errors: ${errors.length}, Warnings: ${warnings.length}`,
      step: 'validation',
      metadata: {
        isValid,
        riskScore,
        errors,
        warnings,
      },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log snapshot creation.
   */
  async logSnapshotCreated(draftId: string, snapshotId: string): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'info',
      message: `Rollback snapshot created: ${snapshotId}`,
      step: 'snapshot_creation',
      metadata: { snapshotId },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log change application (platform API call).
   */
  async logChangeApplied(
    draftId: string,
    platform: string,
    changeType: string,
    metadata?: Record<string, unknown>
  ): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'info',
      message: `Change applied to ${platform}: ${changeType}`,
      step: 'apply_change',
      metadata: { platform, changeType, ...metadata },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log a retry attempt.
   */
  async logRetry(
    draftId: string,
    stepName: string,
    attempt: number,
    maxRetries: number,
    delayMs: number,
    error?: Error
  ): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'warn',
      message: `Retry ${attempt}/${maxRetries} for step '${stepName}' after ${delayMs}ms`,
      step: stepName,
      metadata: { attempt, maxRetries, delayMs },
      error: error
        ? {
            code: error.name,
            message: error.message,
            recoverable: true,
          }
        : undefined,
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log rollback initiation.
   */
  async logRollbackStart(draftId: string, reason: string, snapshotId: string): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'warn',
      message: `Rollback initiated. Reason: ${reason}`,
      step: 'rollback_start',
      metadata: { reason, snapshotId },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log rollback completion.
   */
  async logRollbackComplete(draftId: string, success: boolean, snapshotId: string): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: success ? 'info' : 'critical',
      message: `Rollback ${success ? 'completed successfully' : 'FAILED'}`,
      step: 'rollback_complete',
      metadata: { success, snapshotId },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log successful execution completion.
   */
  async logExecutionSuccess(result: ExecutionResult): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId: result.draftId,
      level: 'info',
      message: `Execution completed successfully in ${result.durationMs}ms. Applied ${result.appliedChanges?.length ?? 0} change(s).`,
      step: 'execution_complete',
      metadata: {
        status: result.status,
        durationMs: result.durationMs,
        appliedChanges: result.appliedChanges?.map((c) => c.field),
      },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log execution failure.
   */
  async logExecutionFailure(result: ExecutionResult): Promise<ExecutionLogEntry> {
    const isCritical = result.rollbackResult && !result.rollbackResult.success;
    const entry = this.createEntry({
      draftId: result.draftId,
      level: isCritical ? 'critical' : 'error',
      message: `Execution FAILED after ${result.durationMs}ms. Error: ${result.error?.message ?? 'Unknown error'}`,
      step: 'execution_complete',
      metadata: {
        status: result.status,
        durationMs: result.durationMs,
        errorCode: result.error?.code,
        requiresRollback: result.requiresRollback,
        rollbackSuccess: result.rollbackResult?.success ?? false,
      },
      error: result.error,
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log critical alert (rollback failure — needs human intervention).
   */
  async logCriticalAlert(draftId: string, message: string, metadata?: Record<string, unknown>): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'critical',
      message: `🚨 CRITICAL: ${message}`,
      step: 'critical_alert',
      metadata,
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Log escalation to human operator.
   */
  async logEscalation(draftId: string, reason: string, error: Error): Promise<ExecutionLogEntry> {
    const entry = this.createEntry({
      draftId,
      level: 'critical',
      message: `Escalated to human operator: ${reason}`,
      step: 'escalation',
      metadata: { escalationReason: reason },
      error: {
        code: error.name,
        message: error.message,
        recoverable: false,
      },
    });

    await this.logStore.insert(entry);
    return entry;
  }

  /**
   * Retrieve execution history for a draft.
   */
  async getExecutionHistory(draftId: string): Promise<ExecutionLogEntry[]> {
    return this.logStore.findByDraftId(draftId);
  }

  /**
   * Search logs with filter criteria.
   */
  async searchLogs(filter: ExecutionLogFilter): Promise<ExecutionLogEntry[]> {
    return this.logStore.find(filter);
  }

  // ───────────── private helpers ─────────────

  private createEntry(params: {
    draftId: string;
    level: ExecutionLogEntry['level'];
    message: string;
    step: string;
    metadata?: Record<string, unknown>;
    error?: ExecutionLogEntry['error'];
  }): ExecutionLogEntry {
    return {
      id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      draftId: params.draftId,
      timestamp: new Date(),
      level: params.level,
      message: params.message,
      step: params.step,
      metadata: params.metadata,
      error: params.error,
    };
  }
}
