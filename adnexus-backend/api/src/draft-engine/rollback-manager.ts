/**
 * RollbackManager – Handles failure recovery by creating snapshots
 * before changes and restoring state if execution fails.
 *
 * Rollback is the critical safety net. If rollback itself fails,
 * we escalate to human intervention immediately.
 */

import type { Draft, Snapshot, RollbackResult, RollbackStep, Campaign, CampaignSnapshot } from './types';
import { ChangeType, ExecutionStatus } from './types';
import { RollbackError, RollbackVerificationError } from './errors';
import crypto from 'crypto';

// ────────────────────────────────────────────────
// Snapshot store interface
// ────────────────────────────────────────────────

export interface SnapshotStore {
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  getSnapshot(id: string): Promise<Snapshot | null>;
  getSnapshotByDraftId(draftId: string): Promise<Snapshot | null>;
}

// ────────────────────────────────────────────────
// Platform API interface for rollback
// ────────────────────────────────────────────────

export interface PlatformApiClient {
  getCampaign(externalId: string): Promise<Campaign | null>;
  updateBudget(externalId: string, budget: Campaign['budget']): Promise<void>;
  updateStatus(externalId: string, status: Campaign['status']): Promise<void>;
  updateBid(externalId: string, bidStrategy: Campaign['bidStrategy']): Promise<void>;
  updateTargeting(externalId: string, targeting: Campaign['targeting']): Promise<void>;
  updateCreative(externalId: string, creatives: Campaign['creatives']): Promise<void>;
}

// ────────────────────────────────────────────────
// RollbackManager
// ────────────────────────────────────────────────

export class RollbackManager {
  constructor(
    private readonly snapshotStore: SnapshotStore,
    private readonly platformClients: Record<string, PlatformApiClient>
  ) {}

  /**
   * Create a rollback snapshot before applying changes.
   * This captures the full campaign state so we can restore it later.
   */
  async createSnapshot(draft: Draft): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: this.generateId(),
      draftId: draft.id,
      campaignId: draft.campaignId,
      createdAt: new Date(),
      fullState: this.deepClone(draft.snapshot.fullState),
      stateHash: draft.snapshot.hash,
      changeType: draft.changeType,
    };

    await this.snapshotStore.saveSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Rollback changes by restoring the campaign to its snapshot state.
   * This is called when execution fails. We restore field-by-field
   * and track which fields were successfully restored.
   */
  async rollback(draft: Draft, snapshot: Snapshot): Promise<RollbackResult> {
    const startedAt = new Date();
    const stepsRestored: RollbackStep[] = [];
    const failedSteps: RollbackStep[] = [];

    try {
      const client = this.platformClients[draft.platform];
      if (!client) {
        throw new RollbackError({
          snapshotId: snapshot.id,
          draftId: draft.id,
          message: `No API client configured for platform ${draft.platform}`,
        });
      }

      const previousState = snapshot.fullState;
      const externalId = draft.campaign.externalId;

      // Rollback depends on what type of change was attempted
      switch (draft.changeType) {
        case ChangeType.BUDGET:
          await this.rollbackBudget(externalId, previousState.budget, client, stepsRestored, failedSteps);
          break;

        case ChangeType.STATUS:
          await this.rollbackStatus(externalId, previousState.status, client, stepsRestored, failedSteps);
          break;

        case ChangeType.BID:
          await this.rollbackBid(externalId, previousState.bidStrategy, client, stepsRestored, failedSteps);
          break;

        case ChangeType.TARGETING:
          await this.rollbackTargeting(externalId, previousState.targeting, client, stepsRestored, failedSteps);
          break;

        case ChangeType.CREATIVE:
          await this.rollbackCreatives(externalId, previousState.creatives, client, stepsRestored, failedSteps);
          break;

        default:
          // Unknown change type — attempt full state restoration
          await this.rollbackFullState(externalId, previousState, client, stepsRestored, failedSteps);
      }

      const completedAt = new Date();

      // Verify the rollback was successful
      const verified = await this.verifyRollback(draft, snapshot);

      const result: RollbackResult = {
        success: failedSteps.length === 0,
        snapshotId: snapshot.id,
        startedAt,
        completedAt,
        stepsRestored,
        failedSteps,
        verified,
      };

      // If verification failed but no steps reported failure, that's still a problem
      if (!verified && failedSteps.length === 0) {
        throw new RollbackVerificationError({
          snapshotId: snapshot.id,
          draftId: draft.id,
        });
      }

      // If any steps failed, throw so the caller knows rollback was incomplete
      if (failedSteps.length > 0) {
        throw new RollbackError({
          snapshotId: snapshot.id,
          draftId: draft.id,
          message: `Rollback partially completed. ${failedSteps.length} field(s) failed to restore.`,
        });
      }

      return result;
    } catch (error) {
      // Re-throw RollbackErrors as-is
      if (error instanceof RollbackError || error instanceof RollbackVerificationError) {
        throw error;
      }

      // Wrap unexpected errors
      throw new RollbackError({
        snapshotId: snapshot.id,
        draftId: draft.id,
        message: error instanceof Error ? error.message : 'Unknown error during rollback',
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Verify rollback was successful by fetching current campaign state
   * and comparing against the snapshot.
   */
  async verifyRollback(draft: Draft, snapshot: Snapshot): Promise<boolean> {
    try {
      const client = this.platformClients[draft.platform];
      if (!client) return false;

      const currentCampaign = await client.getCampaign(draft.campaign.externalId);
      if (!currentCampaign) return false;

      const currentHash = this.computeStateHash(currentCampaign);
      return currentHash === snapshot.stateHash;
    } catch {
      return false;
    }
  }

  // ───────────── Rollback helpers ─────────────

  private async rollbackBudget(
    externalId: string,
    previousBudget: Campaign['budget'],
    client: PlatformApiClient,
    stepsRestored: RollbackStep[],
    failedSteps: RollbackStep[]
  ): Promise<void> {
    try {
      await client.updateBudget(externalId, previousBudget);
      stepsRestored.push({
        field: 'budget',
        previousValue: previousBudget,
        currentValue: previousBudget,
        restored: true,
      });
    } catch (error) {
      failedSteps.push({
        field: 'budget',
        previousValue: previousBudget,
        currentValue: null,
        restored: false,
        error: error instanceof Error ? error.message : 'Budget rollback failed',
      });
    }
  }

  private async rollbackStatus(
    externalId: string,
    previousStatus: Campaign['status'],
    client: PlatformApiClient,
    stepsRestored: RollbackStep[],
    failedSteps: RollbackStep[]
  ): Promise<void> {
    try {
      await client.updateStatus(externalId, previousStatus);
      stepsRestored.push({
        field: 'status',
        previousValue: previousStatus,
        currentValue: previousStatus,
        restored: true,
      });
    } catch (error) {
      failedSteps.push({
        field: 'status',
        previousValue: previousStatus,
        currentValue: null,
        restored: false,
        error: error instanceof Error ? error.message : 'Status rollback failed',
      });
    }
  }

  private async rollbackBid(
    externalId: string,
    previousBid: Campaign['bidStrategy'],
    client: PlatformApiClient,
    stepsRestored: RollbackStep[],
    failedSteps: RollbackStep[]
  ): Promise<void> {
    try {
      await client.updateBid(externalId, previousBid);
      stepsRestored.push({
        field: 'bidStrategy',
        previousValue: previousBid,
        currentValue: previousBid,
        restored: true,
      });
    } catch (error) {
      failedSteps.push({
        field: 'bidStrategy',
        previousValue: previousBid,
        currentValue: null,
        restored: false,
        error: error instanceof Error ? error.message : 'Bid rollback failed',
      });
    }
  }

  private async rollbackTargeting(
    externalId: string,
    previousTargeting: Campaign['targeting'],
    client: PlatformApiClient,
    stepsRestored: RollbackStep[],
    failedSteps: RollbackStep[]
  ): Promise<void> {
    try {
      await client.updateTargeting(externalId, previousTargeting);
      stepsRestored.push({
        field: 'targeting',
        previousValue: previousTargeting,
        currentValue: previousTargeting,
        restored: true,
      });
    } catch (error) {
      failedSteps.push({
        field: 'targeting',
        previousValue: previousTargeting,
        currentValue: null,
        restored: false,
        error: error instanceof Error ? error.message : 'Targeting rollback failed',
      });
    }
  }

  private async rollbackCreatives(
    externalId: string,
    previousCreatives: Campaign['creatives'],
    client: PlatformApiClient,
    stepsRestored: RollbackStep[],
    failedSteps: RollbackStep[]
  ): Promise<void> {
    try {
      await client.updateCreative(externalId, previousCreatives);
      stepsRestored.push({
        field: 'creatives',
        previousValue: previousCreatives,
        currentValue: previousCreatives,
        restored: true,
      });
    } catch (error) {
      failedSteps.push({
        field: 'creatives',
        previousValue: previousCreatives,
        currentValue: null,
        restored: false,
        error: error instanceof Error ? error.message : 'Creative rollback failed',
      });
    }
  }

  private async rollbackFullState(
    externalId: string,
    previousState: Campaign,
    client: PlatformApiClient,
    stepsRestored: RollbackStep[],
    failedSteps: RollbackStep[]
  ): Promise<void> {
    // Attempt to restore each field independently
    await this.rollbackBudget(externalId, previousState.budget, client, stepsRestored, failedSteps);
    await this.rollbackStatus(externalId, previousState.status, client, stepsRestored, failedSteps);
    await this.rollbackBid(externalId, previousState.bidStrategy, client, stepsRestored, failedSteps);
    await this.rollbackTargeting(externalId, previousState.targeting, client, stepsRestored, failedSteps);
    await this.rollbackCreatives(externalId, previousState.creatives, client, stepsRestored, failedSteps);
  }

  // ───────────── Utility ─────────────

  private generateId(): string {
    return `snap_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private computeStateHash(campaign: Campaign): string {
    const canonical = JSON.stringify(campaign, Object.keys(campaign).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}
