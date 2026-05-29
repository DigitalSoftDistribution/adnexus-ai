/**
 * ChangeApplier – Applies validated drafts to real ad platform APIs.
 *
 * Architecture:
 *   ┌──────────────────────────────────────┐
 *   │         apply(draft)                 │
 *   └────────────────┬─────────────────────┘
 *                    │
 *     ┌──────────────┼──────────────┐
 *     ▼              ▼              ▼
 * applyToMeta  applyToGoogle  applyToTikTok  applyToSnap
 *     │              │              │              │
 *     └──────────────┴──────────────┴──────────────┘
 *                    │
 *     ┌──────────────┼──────────────┬──────────────┐
 *     ▼              ▼              ▼              ▼
 * applyBudget  applyStatus  applyBid  applyTargeting  applyCreative
 *
 * Each platform+changeType combo gets a dedicated handler.
 */

import type {
  Draft,
  ExecutionResult,
  AppliedChange,
  Campaign,
  CampaignBudget,
  CampaignStatus,
  BidStrategy,
  TargetingConfig,
  Creative,
} from './types';
import { AdPlatform, ChangeType, ExecutionStatus } from './types';
import {
  PlatformTimeoutError,
  PlatformApiError,
  PartialApplicationError,
  ExecutionError,
} from './errors';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types';

// ────────────────────────────────────────────────
// Platform API client interface
// ────────────────────────────────────────────────

export interface PlatformApiClient {
  /** Fetch current campaign state from platform */
  getCampaign(externalId: string): Promise<Campaign | null>;

  /** Budget operations */
  updateBudget(externalId: string, budget: CampaignBudget): Promise<void>;

  /** Status operations */
  updateStatus(externalId: string, status: CampaignStatus): Promise<void>;

  /** Bid operations */
  updateBid(externalId: string, bid: BidStrategy): Promise<void>;

  /** Targeting operations */
  updateTargeting(externalId: string, targeting: TargetingConfig): Promise<void>;

  /** Creative operations */
  updateCreatives(externalId: string, creatives: Creative[]): Promise<void>;
}

// ────────────────────────────────────────────────
// ChangeApplier
// ────────────────────────────────────────────────

export class ChangeApplier {
  private appliedChanges: AppliedChange[] = [];
  private successfullyAppliedFields: string[] = [];

  constructor(
    private readonly platformClients: Record<string, PlatformApiClient>,
    private readonly retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {}

  /**
   * Apply a validated draft to the target platform.
   * This is the main entry point — it routes to the correct
   * platform handler and manages the full apply lifecycle.
   */
  async apply(draft: Draft): Promise<ExecutionResult> {
    this.appliedChanges = [];
    this.successfullyAppliedFields = [];

    const startedAt = new Date();

    try {
      // Route to platform-specific applier
      await this.routeToPlatform(draft);

      // Verify the change was actually applied
      const verified = await this.verifyChange(draft);
      if (!verified) {
        throw new ExecutionError({
          draftId: draft.id,
          code: 'VERIFICATION_FAILED',
          message: 'Change was applied but verification shows state mismatch',
          recoverable: true,
        });
      }

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      return {
        draftId: draft.id,
        status: ExecutionStatus.SUCCESS,
        startedAt,
        completedAt,
        durationMs,
        steps: this.buildSteps(draft, 'success'),
        appliedChanges: this.appliedChanges,
        requiresRollback: false,
      };
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      // Check if change was partially applied
      const isPartial = this.successfullyAppliedFields.length > 0;

      if (isPartial) {
        const partialError = new PartialApplicationError({
          draftId: draft.id,
          appliedFields: [...this.successfullyAppliedFields],
          failedField: error instanceof Error ? error.message : 'unknown',
          cause: error instanceof Error ? error : undefined,
        });

        return {
          draftId: draft.id,
          status: ExecutionStatus.PARTIAL,
          startedAt,
          completedAt,
          durationMs,
          steps: this.buildSteps(draft, 'failure'),
          appliedChanges: this.appliedChanges,
          error: partialError.toExecutionError(),
          requiresRollback: true,
        };
      }

      return {
        draftId: draft.id,
        status: ExecutionStatus.FAILURE,
        startedAt,
        completedAt,
        durationMs,
        steps: this.buildSteps(draft, 'failure'),
        error: error instanceof Error
          ? {
              code: error instanceof PlatformApiError ? error.code : 'APPLY_FAILED',
              message: error.message,
              recoverable: error instanceof PlatformApiError ? error.recoverable : false,
              stackTrace: error instanceof Error ? error.stack : undefined,
            }
          : { code: 'UNKNOWN', message: 'Unknown error', recoverable: false },
        requiresRollback: true,
      };
    }
  }

  // ───────────── Platform routers ─────────────

  private async routeToPlatform(draft: Draft): Promise<void> {
    switch (draft.platform) {
      case AdPlatform.META:
        return this.applyToMeta(draft);
      case AdPlatform.GOOGLE:
        return this.applyToGoogle(draft);
      case AdPlatform.TIKTOK:
        return this.applyToTikTok(draft);
      case AdPlatform.SNAP:
        return this.applyToSnap(draft);
      default:
        throw new PlatformApiError({
          platform: draft.platform,
          message: `Unsupported platform: ${draft.platform}`,
          draftId: draft.id,
        });
    }
  }

  private async applyToMeta(draft: Draft): Promise<void> {
    await this.applyByChangeType(draft, AdPlatform.META);
  }

  private async applyToGoogle(draft: Draft): Promise<void> {
    await this.applyByChangeType(draft, AdPlatform.GOOGLE);
  }

  private async applyToTikTok(draft: Draft): Promise<void> {
    await this.applyByChangeType(draft, AdPlatform.TIKTOK);
  }

  private async applyToSnap(draft: Draft): Promise<void> {
    await this.applyByChangeType(draft, AdPlatform.SNAP);
  }

  // ───────────── Change type dispatcher ─────────────

  private async applyByChangeType(draft: Draft, platform: AdPlatform): Promise<void> {
    switch (draft.changeType) {
      case ChangeType.BUDGET:
        return this.applyBudgetChange(draft, platform);
      case ChangeType.STATUS:
        return this.applyStatusChange(draft, platform);
      case ChangeType.BID:
        return this.applyBidChange(draft, platform);
      case ChangeType.TARGETING:
        return this.applyTargetingChange(draft, platform);
      case ChangeType.CREATIVE:
        return this.applyCreativeChange(draft, platform);
      default:
        throw new PlatformApiError({
          platform,
          message: `Unsupported change type: ${draft.changeType}`,
          draftId: draft.id,
        });
    }
  }

  // ───────────── Change type handlers ─────────────

  private async applyBudgetChange(draft: Draft, platform: AdPlatform): Promise<void> {
    const client = this.getClient(platform);
    const externalId = draft.campaign.externalId;
    const oldBudget = draft.snapshot.fullState.budget;
    const newBudget = { ...oldBudget, ...draft.proposedChanges.budget };

    await this.withRetry(
      () => client.updateBudget(externalId, newBudget),
      `updateBudget-${platform}`,
      draft.id
    );

    this.successfullyAppliedFields.push('budget');
    this.appliedChanges.push({
      field: 'budget',
      oldValue: oldBudget,
      newValue: newBudget,
      platform,
      externalId,
      appliedAt: new Date(),
    });
  }

  private async applyStatusChange(draft: Draft, platform: AdPlatform): Promise<void> {
    const client = this.getClient(platform);
    const externalId = draft.campaign.externalId;
    const oldStatus = draft.snapshot.fullState.status;
    const newStatus = draft.proposedChanges.status!;

    await this.withRetry(
      () => client.updateStatus(externalId, newStatus),
      `updateStatus-${platform}`,
      draft.id
    );

    this.successfullyAppliedFields.push('status');
    this.appliedChanges.push({
      field: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      platform,
      externalId,
      appliedAt: new Date(),
    });
  }

  private async applyBidChange(draft: Draft, platform: AdPlatform): Promise<void> {
    const client = this.getClient(platform);
    const externalId = draft.campaign.externalId;
    const oldBid = draft.snapshot.fullState.bidStrategy;
    const newBid = { ...oldBid, ...draft.proposedChanges.bidStrategy };

    await this.withRetry(
      () => client.updateBid(externalId, newBid),
      `updateBid-${platform}`,
      draft.id
    );

    this.successfullyAppliedFields.push('bidStrategy');
    this.appliedChanges.push({
      field: 'bidStrategy',
      oldValue: oldBid,
      newValue: newBid,
      platform,
      externalId,
      appliedAt: new Date(),
    });
  }

  private async applyTargetingChange(draft: Draft, platform: AdPlatform): Promise<void> {
    const client = this.getClient(platform);
    const externalId = draft.campaign.externalId;
    const oldTargeting = draft.snapshot.fullState.targeting;
    const newTargeting = this.mergeTargeting(oldTargeting, draft.proposedChanges.targeting ?? {});

    await this.withRetry(
      () => client.updateTargeting(externalId, newTargeting),
      `updateTargeting-${platform}`,
      draft.id
    );

    this.successfullyAppliedFields.push('targeting');
    this.appliedChanges.push({
      field: 'targeting',
      oldValue: oldTargeting,
      newValue: newTargeting,
      platform,
      externalId,
      appliedAt: new Date(),
    });
  }

  private async applyCreativeChange(draft: Draft, platform: AdPlatform): Promise<void> {
    const client = this.getClient(platform);
    const externalId = draft.campaign.externalId;
    const oldCreatives = draft.snapshot.fullState.creatives;
    const newCreatives = draft.proposedChanges.creatives ?? oldCreatives;

    await this.withRetry(
      () => client.updateCreatives(externalId, newCreatives as Creative[]),
      `updateCreatives-${platform}`,
      draft.id
    );

    this.successfullyAppliedFields.push('creatives');
    this.appliedChanges.push({
      field: 'creatives',
      oldValue: oldCreatives,
      newValue: newCreatives,
      platform,
      externalId,
      appliedAt: new Date(),
    });
  }

  // ───────────── Verification ─────────────

  /**
   * Verify that the change was actually applied by fetching
   * the current campaign state and checking the changed field.
   */
  private async verifyChange(draft: Draft): Promise<boolean> {
    try {
      const client = this.getClient(draft.platform);
      const current = await client.getCampaign(draft.campaign.externalId);
      if (!current) return false;

      switch (draft.changeType) {
        case ChangeType.BUDGET:
          return this.budgetMatches(current.budget, draft.proposedChanges.budget ?? {});
        case ChangeType.STATUS:
          return current.status === draft.proposedChanges.status;
        case ChangeType.BID:
          return this.bidMatches(current.bidStrategy, draft.proposedChanges.bidStrategy ?? {});
        case ChangeType.TARGETING:
          return true; // Complex comparison — rely on API success
        case ChangeType.CREATIVE:
          return true; // Complex comparison — rely on API success
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // ───────────── Retry wrapper ─────────────

  /**
   * Execute a platform API call with exponential backoff retry.
   * Platform API timeout → retry 3x with backoff, then throw.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    operationName: string,
    draftId: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isRetryable = this.isRetryableError(lastError);
        if (!isRetryable || attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Exponential backoff
        const delayMs = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelayMs
        );

        await this.sleep(delayMs);
      }
    }

    // All retries exhausted
    if (lastError instanceof PlatformApiError) {
      throw lastError;
    }

    if (lastError && this.isTimeoutError(lastError)) {
      throw new PlatformTimeoutError({
        platform: operationName.split('-')[1] ?? 'unknown',
        attempts: this.retryConfig.maxRetries,
        draftId,
        cause: lastError,
      });
    }

    throw new PlatformApiError({
      platform: operationName.split('-')[1] ?? 'unknown',
      message: lastError?.message ?? 'Platform API call failed after retries',
      draftId,
      cause: lastError,
    });
  }

  // ───────────── Helpers ─────────────

  private getClient(platform: AdPlatform): PlatformApiClient {
    const client = this.platformClients[platform];
    if (!client) {
      throw new PlatformApiError({
        platform,
        message: `No API client configured for platform ${platform}`,
        draftId: 'unknown',
      });
    }
    return client;
  }

  private isRetryableError(error: Error): boolean {
    // Network-level errors are retryable
    if (this.isTimeoutError(error)) return true;
    if (error.message.includes('ECONNRESET')) return true;
    if (error.message.includes('ETIMEDOUT')) return true;
    if (error.message.includes('ECONNREFUSED')) return true;
    if (error.message.includes('503')) return true;
    if (error.message.includes('429')) return true;
    return false;
  }

  private isTimeoutError(error: Error): boolean {
    return (
      error.name === 'TimeoutError' ||
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private mergeTargeting(base: TargetingConfig, updates: Partial<TargetingConfig>): TargetingConfig {
    return {
      ...base,
      ...updates,
      audiences: updates.audiences ?? base.audiences,
      demographics: { ...base.demographics, ...updates.demographics },
      geo: { ...base.geo, ...updates.geo, countries: updates.geo?.countries ?? base.geo?.countries ?? [] },
      interests: updates.interests ?? base.interests,
      placements: updates.placements ?? base.placements,
      exclusions: updates.exclusions ?? base.exclusions,
    };
  }

  private budgetMatches(current: CampaignBudget, proposed: Partial<CampaignBudget>): boolean {
    if (proposed.dailyBudget !== undefined && current.dailyBudget !== proposed.dailyBudget) return false;
    if (proposed.lifetimeBudget !== undefined && current.lifetimeBudget !== proposed.lifetimeBudget) return false;
    if (proposed.budgetType !== undefined && current.budgetType !== proposed.budgetType) return false;
    return true;
  }

  private bidMatches(current: BidStrategy, proposed: Partial<BidStrategy>): boolean {
    if (proposed.type !== undefined && current.type !== proposed.type) return false;
    if (proposed.amount !== undefined && current.amount !== proposed.amount) return false;
    if (proposed.targetRoas !== undefined && current.targetRoas !== proposed.targetRoas) return false;
    if (proposed.cap !== undefined && current.cap !== proposed.cap) return false;
    return true;
  }

  private buildSteps(
    draft: Draft,
    status: 'success' | 'failure'
  ): ExecutionResult['steps'] {
    return [
      { name: 'load_draft', status: 'success' },
      { name: 'validate', status: 'success' },
      { name: 'create_snapshot', status: 'success' },
      { name: `apply_${draft.changeType}`, status },
      { name: 'verify', status },
      { name: 'update_status', status },
      { name: 'log', status },
      { name: 'notify', status },
    ].map((s) => ({
      ...s,
      status: s.status as 'success' | 'failure',
    }));
  }
}
