/**
 * DraftValidator – Validates drafts before execution.
 *
 * Checks:
 *   1. Campaign still exists and is accessible
 *   2. Current state matches the snapshot (no concurrent modifications)
 *   3. Change doesn't violate platform policies
 *   4. Risk score is within acceptable bounds
 */

import crypto from 'crypto';
import type {
  Draft,
  ValidationResult,
  PolicyCheck,
  Campaign,
} from './types';
import {
  AdPlatform,
  ChangeType,
  DraftStatus,
  RiskLevel,
  CampaignStatus,
} from './types';
import {
  ValidationError,
  CampaignNotFoundError,
  StateMismatchError,
  PolicyViolationError,
} from './errors';

// ────────────────────────────────────────────────
// Platform policy rule definitions
// ────────────────────────────────────────────────

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  platforms: AdPlatform[];
  check: (draft: Draft) => { compliant: boolean; violationDetails?: string };
}

const PLATFORM_POLICIES: PolicyRule[] = [
  {
    id: 'POL-001',
    name: 'Budget Decrease Limit',
    description: 'Daily budget cannot decrease by more than 50% in a single change',
    platforms: [AdPlatform.META, AdPlatform.GOOGLE, AdPlatform.TIKTOK, AdPlatform.SNAP],
    check: (draft: Draft) => {
      if (draft.changeType !== ChangeType.BUDGET || !draft.proposedChanges.budget?.dailyBudget) {
        return { compliant: true };
      }
      const currentDaily = draft.snapshot.fullState.budget.dailyBudget;
      const newDaily = draft.proposedChanges.budget.dailyBudget!;
      if (newDaily < currentDaily * 0.5) {
        return {
          compliant: false,
          violationDetails: `Budget decrease of ${((1 - newDaily / currentDaily) * 100).toFixed(1)}% exceeds 50% limit`,
        };
      }
      return { compliant: true };
    },
  },
  {
    id: 'POL-002',
    name: 'Budget Increase Ceiling',
    description: 'Daily budget cannot increase by more than 100% in a single change',
    platforms: [AdPlatform.META, AdPlatform.GOOGLE, AdPlatform.TIKTOK, AdPlatform.SNAP],
    check: (draft: Draft) => {
      if (draft.changeType !== ChangeType.BUDGET || !draft.proposedChanges.budget?.dailyBudget) {
        return { compliant: true };
      }
      const currentDaily = draft.snapshot.fullState.budget.dailyBudget;
      const newDaily = draft.proposedChanges.budget.dailyBudget!;
      if (newDaily > currentDaily * 2) {
        return {
          compliant: false,
          violationDetails: `Budget increase of ${((newDaily / currentDaily - 1) * 100).toFixed(1)}% exceeds 100% limit`,
        };
      }
      return { compliant: true };
    },
  },
  {
    id: 'POL-003',
    name: 'Minimum Budget Threshold',
    description: 'Daily budget must be at least $1 USD equivalent',
    platforms: [AdPlatform.META, AdPlatform.GOOGLE, AdPlatform.TIKTOK, AdPlatform.SNAP],
    check: (draft: Draft) => {
      if (draft.changeType !== ChangeType.BUDGET || !draft.proposedChanges.budget?.dailyBudget) {
        return { compliant: true };
      }
      const newDaily = draft.proposedChanges.budget.dailyBudget!;
      if (newDaily < 1) {
        return { compliant: false, violationDetails: `Daily budget $${newDaily} is below minimum $1` };
      }
      return { compliant: true };
    },
  },
  {
    id: 'POL-004',
    name: 'Bid Cap Reasonableness',
    description: 'Bid amount should not exceed 10x the current bid',
    platforms: [AdPlatform.META, AdPlatform.GOOGLE, AdPlatform.TIKTOK, AdPlatform.SNAP],
    check: (draft: Draft) => {
      if (draft.changeType !== ChangeType.BID || !draft.proposedChanges.bidStrategy?.amount) {
        return { compliant: true };
      }
      const currentBid = draft.snapshot.fullState.bidStrategy.amount ?? 1;
      const newBid = draft.proposedChanges.bidStrategy.amount!;
      if (newBid > currentBid * 10) {
        return {
          compliant: false,
          violationDetails: `Bid increase from $${currentBid} to $${newBid} exceeds 10x limit`,
        };
      }
      return { compliant: true };
    },
  },
  {
    id: 'POL-005',
    name: 'Deleted Campaign Protection',
    description: 'Cannot apply changes to deleted or archived campaigns',
    platforms: [AdPlatform.META, AdPlatform.GOOGLE, AdPlatform.TIKTOK, AdPlatform.SNAP],
    check: (draft: Draft) => {
      const currentStatus = draft.snapshot.fullState.status;
      if (currentStatus === CampaignStatus.DELETED || currentStatus === CampaignStatus.ARCHIVED) {
        return {
          compliant: false,
          violationDetails: `Campaign is ${currentStatus}; changes not allowed`,
        };
      }
      return { compliant: true };
    },
  },
  {
    id: 'POL-006',
    name: 'Status Transition Validity',
    description: 'Only valid status transitions are allowed',
    platforms: [AdPlatform.META, AdPlatform.GOOGLE, AdPlatform.TIKTOK, AdPlatform.SNAP],
    check: (draft: Draft) => {
      if (draft.changeType !== ChangeType.STATUS || !draft.proposedChanges.status) {
        return { compliant: true };
      }
      const current = draft.snapshot.fullState.status;
      const next = draft.proposedChanges.status;
      const validTransitions: Record<string, CampaignStatus[]> = {
        [CampaignStatus.DRAFT]: [CampaignStatus.ACTIVE, CampaignStatus.PAUSED],
        [CampaignStatus.ACTIVE]: [CampaignStatus.PAUSED, CampaignStatus.ARCHIVED],
        [CampaignStatus.PAUSED]: [CampaignStatus.ACTIVE, CampaignStatus.ARCHIVED],
        [CampaignStatus.ARCHIVED]: [CampaignStatus.ACTIVE, CampaignStatus.PAUSED],
        [CampaignStatus.DELETED]: [],
      };
      const allowed = validTransitions[current] || [];
      if (!allowed.includes(next)) {
        return {
          compliant: false,
          violationDetails: `Invalid status transition from ${current} to ${next}`,
        };
      }
      return { compliant: true };
    },
  },
  {
    id: 'POL-007',
    name: 'TikTok Budget Minimum',
    description: 'TikTok requires minimum $20 daily budget',
    platforms: [AdPlatform.TIKTOK],
    check: (draft: Draft) => {
      if (draft.platform !== AdPlatform.TIKTOK || draft.changeType !== ChangeType.BUDGET) {
        return { compliant: true };
      }
      const newDaily = draft.proposedChanges.budget?.dailyBudget;
      if (newDaily !== undefined && newDaily < 20) {
        return { compliant: false, violationDetails: `TikTok daily budget must be >= $20` };
      }
      return { compliant: true };
    },
  },
  {
    id: 'POL-008',
    name: 'Snap Budget Minimum',
    description: 'Snap requires minimum $5 daily budget',
    platforms: [AdPlatform.SNAP],
    check: (draft: Draft) => {
      if (draft.platform !== AdPlatform.SNAP || draft.changeType !== ChangeType.BUDGET) {
        return { compliant: true };
      }
      const newDaily = draft.proposedChanges.budget?.dailyBudget;
      if (newDaily !== undefined && newDaily < 5) {
        return { compliant: false, violationDetails: `Snap daily budget must be >= $5` };
      }
      return { compliant: true };
    },
  },
];

// ────────────────────────────────────────────────
// Risk scoring weights
// ────────────────────────────────────────────────

interface RiskFactor {
  name: string;
  weight: number;
  evaluate: (draft: Draft) => number; // returns 0-1
}

const RISK_FACTORS: RiskFactor[] = [
  {
    name: 'budget_change_magnitude',
    weight: 0.25,
    evaluate: (draft) => {
      if (draft.changeType !== ChangeType.BUDGET || !draft.proposedChanges.budget?.dailyBudget) return 0;
      const current = draft.snapshot.fullState.budget.dailyBudget;
      const proposed = draft.proposedChanges.budget.dailyBudget!;
      const ratio = Math.abs(proposed - current) / current;
      return Math.min(ratio, 1);
    },
  },
  {
    name: 'bid_change_magnitude',
    weight: 0.20,
    evaluate: (draft) => {
      if (draft.changeType !== ChangeType.BID || !draft.proposedChanges.bidStrategy?.amount) return 0;
      const current = draft.snapshot.fullState.bidStrategy.amount ?? 1;
      const proposed = draft.proposedChanges.bidStrategy.amount!;
      const ratio = Math.abs(proposed - current) / current;
      return Math.min(ratio, 1);
    },
  },
  {
    name: 'status_transition_risk',
    weight: 0.30,
    evaluate: (draft) => {
      if (draft.changeType !== ChangeType.STATUS) return 0;
      const current = draft.snapshot.fullState.status;
      const next = draft.proposedChanges.status;
      if (current === CampaignStatus.ACTIVE && next === CampaignStatus.PAUSED) return 0.7;
      if (current === CampaignStatus.PAUSED && next === CampaignStatus.ACTIVE) return 0.3;
      if (next === CampaignStatus.ARCHIVED || next === CampaignStatus.DELETED) return 1.0;
      return 0.1;
    },
  },
  {
    name: 'targeting_change_scope',
    weight: 0.15,
    evaluate: (draft) => {
      if (draft.changeType !== ChangeType.TARGETING) return 0;
      const changes = Object.keys(draft.proposedChanges.targeting ?? {}).length;
      return Math.min(changes / 5, 1);
    },
  },
  {
    name: 'creative_change_scope',
    weight: 0.10,
    evaluate: (draft) => {
      if (draft.changeType !== ChangeType.CREATIVE) return 0;
      const changes = (draft.proposedChanges.creatives ?? []).length;
      return Math.min(changes / 3, 1);
    },
  },
];

// ────────────────────────────────────────────────
// DraftValidator
// ────────────────────────────────────────────────

export interface CampaignStore {
  getCampaign(id: string): Promise<Campaign | null>;
  getCampaignByExternalId(externalId: string, platform: AdPlatform): Promise<Campaign | null>;
}

export class DraftValidator {
  constructor(private readonly campaignStore: CampaignStore) {}

  /**
   * Main validation entry point. Runs all checks and returns
   * a composite ValidationResult.
   */
  async validate(draft: Draft): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // 1. Check campaign exists
    const campaignExists = await this.checkCampaignExists(draft);
    if (!campaignExists) {
      errors.push({
        code: 'CAMPAIGN_NOT_FOUND',
        message: `Campaign ${draft.campaignId} does not exist or is not accessible`,
        severity: 'error',
      });
    }

    // 2. Verify current state matches snapshot
    const stateMatch = await this.verifyCurrentState(draft);
    if (!stateMatch) {
      warnings.push({
        code: 'STATE_MISMATCH',
        message: 'Campaign state has drifted from snapshot. Review recommended.',
        severity: 'warning',
      });
    }

    // 3. Policy compliance
    const policyChecks = await this.checkPolicyCompliance(draft);
    const policyViolations = policyChecks.filter((p) => !p.compliant && p.severity === 'error');
    const policyWarnings = policyChecks.filter((p) => !p.compliant && p.severity === 'warning');

    policyViolations.forEach((p) =>
      errors.push({
        code: `POLICY_${p.policyId}`,
        message: `${p.policyName}: ${p.violationDetails}`,
        severity: 'error',
      })
    );

    policyWarnings.forEach((p) =>
      warnings.push({
        code: `POLICY_${p.policyId}`,
        message: `${p.policyName}: ${p.violationDetails}`,
        severity: 'warning',
      })
    );

    // 4. Risk score
    const riskScore = await this.calculateRiskScore(draft);
    const riskLevel = this.scoreToLevel(riskScore);

    // Draft has been approved but risk level is now high due to state drift
    if (stateMatch && riskLevel === RiskLevel.HIGH) {
      warnings.push({
        code: 'HIGH_RISK_CHANGE',
        message: `Risk score ${riskScore} is HIGH. Proceed with caution.`,
        severity: 'warning',
      });
    }

    const isValid = errors.length === 0 && campaignExists;

    return {
      isValid,
      errors,
      warnings,
      riskScore,
      riskLevel,
      checks: {
        campaignExists,
        stateMatch,
        policyCompliant: policyViolations.length === 0,
      },
    };
  }

  /**
   * Check if the campaign still exists and is accessible on the platform.
   */
  async checkCampaignExists(draft: Draft): Promise<boolean> {
    try {
      const campaign = await this.campaignStore.getCampaign(draft.campaignId);
      if (!campaign) return false;
      if (campaign.status === CampaignStatus.DELETED) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify the current campaign state matches the snapshot taken
   * when the draft was created. Uses SHA-256 hash comparison.
   */
  async verifyCurrentState(draft: Draft): Promise<boolean> {
    try {
      const currentCampaign = await this.campaignStore.getCampaign(draft.campaignId);
      if (!currentCampaign) return false;

      const currentHash = this.computeStateHash(currentCampaign);
      return currentHash === draft.snapshot.hash;
    } catch {
      return false;
    }
  }

  /**
   * Check all applicable platform policies against the draft.
   */
  async checkPolicyCompliance(draft: Draft): Promise<PolicyCheck[]> {
    const applicablePolicies = PLATFORM_POLICIES.filter(
      (p) => p.platforms.includes(draft.platform)
    );

    return applicablePolicies.map((policy) => {
      const result = policy.check(draft);
      return {
        policyId: policy.id,
        policyName: policy.name,
        compliant: result.compliant,
        violationDetails: result.violationDetails,
        severity: result.compliant ? ('warning' as const) : ('error' as const),
      };
    });
  }

  /**
   * Calculate a composite risk score (0-100) based on weighted risk factors.
   */
  async calculateRiskScore(draft: Draft): Promise<number> {
    let totalWeight = 0;
    let weightedScore = 0;

    for (const factor of RISK_FACTORS) {
      const score = factor.evaluate(draft);
      totalWeight += factor.weight;
      weightedScore += score * factor.weight;
    }

    if (totalWeight === 0) return 0;

    // Normalize to 0-100
    const normalizedScore = Math.round((weightedScore / totalWeight) * 100);
    return Math.min(100, Math.max(0, normalizedScore));
  }

  // ───────────── helpers ─────────────

  private scoreToLevel(score: number): RiskLevel {
    if (score <= 33) return RiskLevel.LOW;
    if (score <= 66) return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  }

  private computeStateHash(campaign: Campaign): string {
    const canonical = JSON.stringify(campaign, Object.keys(campaign).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}
