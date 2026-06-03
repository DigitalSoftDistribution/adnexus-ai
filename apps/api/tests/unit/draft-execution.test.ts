/**
 * @fileoverview Draft Execution Engine — Unit Tests
 * Tests the full draft execution pipeline: validation → snapshot → apply → verify.
 * Mocks all external platform APIs and uses realistic draft data fixtures.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

// ───────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ───────────────────────────────────────────────────────────────────────────────

interface Draft {
  id: string;
  campaignId: string;
  platform: "meta" | "google" | "tiktok";
  changeType: "budget" | "status" | "bid" | "delete" | "schedule" | "targeting";
  payload: Record<string, unknown>;
  originalState: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "executing" | "completed" | "failed" | "rolled_back";
  requestedBy: string;
  requestedAt: string; // ISO date string
  expiresAt: string;   // ISO date string
  riskScore: number;   // 0-100
  approvedBy?: string;
  approvedAt?: string;
}

interface Campaign {
  id: string;
  platform: "meta" | "google" | "tiktok";
  name: string;
  status: "active" | "paused" | "archived" | "deleted";
  budget: number;
  bid: number;
  spend: number;
  externalId: string;
  lastSyncedAt: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  riskScore: number;
}

interface Snapshot {
  id: string;
  draftId: string;
  campaignId: string;
  capturedAt: string;
  originalState: Record<string, unknown>;
  changeLog: string[];
}

interface ApplyResult {
  success: boolean;
  platformRequestId?: string;
  retries?: number;
  error?: string;
  rolledBack?: boolean;
}

interface RollbackResult {
  success: boolean;
  restored: boolean;
  alertSent: boolean;
  error?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// Mocked Modules (simulated internal services)
// ───────────────────────────────────────────────────────────────────────────────

const mockMetaApi = {
  updateCampaignBudget: jest.fn(),
  updateCampaignStatus: jest.fn(),
  updateAdSetBid: jest.fn(),
  deleteCampaign: jest.fn(),
  getCampaign: jest.fn(),
};

const mockGoogleApi = {
  mutateCampaignBudget: jest.fn(),
  mutateCampaignStatus: jest.fn(),
  mutateAdGroupBid: jest.fn(),
  removeCampaign: jest.fn(),
  getCampaign: jest.fn(),
};

const mockTikTokApi = {
  updateAdGroupBudget: jest.fn(),
  updateAdGroupStatus: jest.fn(),
  updateAdGroupBid: jest.fn(),
  deleteAdGroup: jest.fn(),
  getAdGroup: jest.fn(),
};

const mockCampaignRepo = {
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAlertService = {
  sendCriticalAlert: jest.fn(),
  sendWarning: jest.fn(),
  notifySuccess: jest.fn(),
};

const mockSnapshotStore = {
  create: jest.fn(),
  findByDraftId: jest.fn(),
  update: jest.fn(),
};

// ───────────────────────────────────────────────────────────────────────────────
// Fixtures — Realistic Draft Data
// ───────────────────────────────────────────────────────────────────────────────

const NOW = new Date("2025-01-15T10:00:00.000Z");
const FUTURE = new Date("2025-01-20T10:00:00.000Z");
const PAST = new Date("2025-01-10T10:00:00.000Z");

const campaigns: Record<string, Campaign> = {
  meta_1: {
    id: "camp_meta_001",
    platform: "meta",
    name: "Meta Q1 Prospecting",
    status: "active",
    budget: 5000,
    bid: 2.5,
    spend: 3200,
    externalId: "act_123/camp_456",
    lastSyncedAt: "2025-01-14T18:00:00.000Z",
  },
  google_1: {
    id: "camp_google_001",
    platform: "google",
    name: "Google Search Brand",
    status: "active",
    budget: 8000,
    bid: 5.0,
    spend: 6700,
    externalId: "customers/123/campaigns/789",
    lastSyncedAt: "2025-01-14T20:00:00.000Z",
  },
  tiktok_1: {
    id: "camp_tiktok_001",
    platform: "tiktok",
    name: "TikTok Spark Ads",
    status: "paused",
    budget: 3000,
    bid: 3.0,
    spend: 900,
    externalId: "adgroup_555",
    lastSyncedAt: "2025-01-14T22:00:00.000Z",
  },
};

const createDraft = (overrides: Partial<Draft> = {}): Draft => ({
  id: `draft_${Date.now()}`,
  campaignId: "camp_meta_001",
  platform: "meta",
  changeType: "budget",
  payload: { budget: 7500 },
  originalState: { budget: 5000, status: "active" },
  status: "approved",
  requestedBy: "user_001",
  requestedAt: NOW.toISOString(),
  expiresAt: FUTURE.toISOString(),
  riskScore: 0,
  ...overrides,
});

// ───────────────────────────────────────────────────────────────────────────────
// System Under Test — DraftValidator
// ───────────────────────────────────────────────────────────────────────────────

class DraftValidator {
  constructor(private campaignRepo: typeof mockCampaignRepo) {}

  async validate(draft: Draft): Promise<ValidationResult> {
    const errors: string[] = [];
    const now = new Date();

    // 1. Check expiry
    if (new Date(draft.expiresAt) < now) {
      errors.push(`Draft expired at ${draft.expiresAt}`);
    }

    // 2. Check campaign exists
    const campaign = await this.campaignRepo.findById(draft.campaignId);
    if (!campaign) {
      errors.push(`Campaign ${draft.campaignId} not found`);
    }

    // 3. Check state mismatch (campaign changed since draft was created)
    if (campaign) {
      const campaignModified = new Date(campaign.lastSyncedAt);
      const draftCreated = new Date(draft.requestedAt);
      if (campaignModified > draftCreated) {
        // Deep check: compare originalState with current campaign state
        const mismatches = this.findMismatches(draft.originalState, campaign);
        if (mismatches.length > 0) {
          errors.push(`State mismatch: ${mismatches.join("; ")}`);
        }
      }
    }

    // 4. Validate payload
    if (!draft.payload || Object.keys(draft.payload).length === 0) {
      errors.push("Empty payload");
    }

    // 5. Calculate risk score
    const riskScore = this.calculateRiskScore(draft);

    return {
      valid: errors.length === 0,
      errors,
      riskScore,
    };
  }

  private findMismatches(
    original: Record<string, unknown>,
    current: Campaign
  ): string[] {
    const mismatches: string[] = [];
    for (const [key, origVal] of Object.entries(original)) {
      if (key in current && current[key as keyof Campaign] !== origVal) {
        mismatches.push(
          `${key} changed from ${origVal} to ${current[key as keyof Campaign]}`
        );
      }
    }
    return mismatches;
  }

  calculateRiskScore(draft: Draft): number {
    let score = 0;

    switch (draft.changeType) {
      case "delete":
        score = 85; // High risk — destructive
        break;
      case "budget": {
        const currentBudget = (draft.originalState.budget as number) || 1;
        const newBudget = (draft.payload.budget as number) || currentBudget;
        const pctChange = Math.abs(newBudget - currentBudget) / currentBudget;
        score = pctChange > 0.5 ? 40 : pctChange > 0.2 ? 25 : 10;
        break;
      }
      case "status":
        score = 30;
        break;
      case "bid": {
        const currentBid = (draft.originalState.bid as number) || 1;
        const newBid = (draft.payload.bid as number) || currentBid;
        const pctChange = Math.abs(newBid - currentBid) / currentBid;
        score = pctChange > 0.5 ? 45 : 20;
        break;
      }
      case "targeting":
        score = 60;
        break;
      case "schedule":
        score = 15;
        break;
      default:
        score = 50;
    }

    // Platform risk modifier
    if (draft.platform === "google") score += 5;

    // Scale to 0-100
    return Math.min(100, Math.max(0, score));
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// System Under Test — ChangeApplier
// ───────────────────────────────────────────────────────────────────────────────

class ChangeApplier {
  private maxRetries = 3;
  private retryDelayMs = 500;

  constructor(
    private metaApi: typeof mockMetaApi,
    private googleApi: typeof mockGoogleApi,
    private tiktokApi: typeof mockTikTokApi
  ) {}

  async apply(draft: Draft): Promise<ApplyResult> {
    let retries = 0;

    while (retries <= this.maxRetries) {
      try {
        const result = await this.executeApply(draft);
        return { ...result, retries };
      } catch (error: any) {
        if (error.code === "TIMEOUT" && retries < this.maxRetries) {
          retries++;
          await this.delay(this.retryDelayMs * retries);
          continue;
        }
        return {
          success: false,
          error: error.message || "Unknown API error",
          retries,
          rolledBack: false,
        };
      }
    }

    return {
      success: false,
      error: `Failed after ${this.maxRetries} retries`,
      retries,
    };
  }

  private async executeApply(draft: Draft): Promise<ApplyResult> {
    const externalId = this.getExternalId(draft.campaignId);

    switch (draft.platform) {
      case "meta":
        return this.applyMetaChange(draft, externalId);
      case "google":
        return this.applyGoogleChange(draft, externalId);
      case "tiktok":
        return this.applyTikTokChange(draft, externalId);
      default:
        throw new Error(`Unsupported platform: ${draft.platform}`);
    }
  }

  private async applyMetaChange(
    draft: Draft,
    externalId: string
  ): Promise<ApplyResult> {
    switch (draft.changeType) {
      case "budget": {
        const resp = await this.metaApi.updateCampaignBudget(
          externalId,
          draft.payload.budget
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      case "status": {
        const resp = await this.metaApi.updateCampaignStatus(
          externalId,
          draft.payload.status
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      case "bid": {
        const resp = await this.metaApi.updateAdSetBid(
          externalId,
          draft.payload.bid
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      case "delete": {
        const resp = await this.metaApi.deleteCampaign(externalId);
        return { success: true, platformRequestId: resp.requestId };
      }
      default:
        throw new Error(`Unsupported change type: ${draft.changeType}`);
    }
  }

  private async applyGoogleChange(
    draft: Draft,
    externalId: string
  ): Promise<ApplyResult> {
    switch (draft.changeType) {
      case "budget": {
        const resp = await this.googleApi.mutateCampaignBudget(
          externalId,
          draft.payload.budget
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      case "status": {
        const resp = await this.googleApi.mutateCampaignStatus(
          externalId,
          draft.payload.status
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      case "bid": {
        const resp = await this.googleApi.mutateAdGroupBid(
          externalId,
          draft.payload.bid
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      default:
        throw new Error(`Unsupported change type: ${draft.changeType}`);
    }
  }

  private async applyTikTokChange(
    draft: Draft,
    externalId: string
  ): Promise<ApplyResult> {
    switch (draft.changeType) {
      case "budget": {
        const resp = await this.tiktokApi.updateAdGroupBudget(
          externalId,
          draft.payload.budget
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      case "status": {
        const resp = await this.tiktokApi.updateAdGroupStatus(
          externalId,
          draft.payload.status
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      case "bid": {
        const resp = await this.tiktokApi.updateAdGroupBid(
          externalId,
          draft.payload.bid
        );
        return { success: true, platformRequestId: resp.requestId };
      }
      default:
        throw new Error(`Unsupported change type: ${draft.changeType}`);
    }
  }

  private getExternalId(campaignId: string): string {
    const campaign = campaigns[campaignId];
    return campaign?.externalId || campaignId;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// System Under Test — RollbackManager
// ───────────────────────────────────────────────────────────────────────────────

class RollbackManager {
  constructor(
    private metaApi: typeof mockMetaApi,
    private googleApi: typeof mockGoogleApi,
    private tiktokApi: typeof mockTikTokApi,
    private snapshotStore: typeof mockSnapshotStore,
    private alertService: typeof mockAlertService,
    private campaignRepo: typeof mockCampaignRepo
  ) {}

  async createSnapshot(draft: Draft): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: `snap_${Date.now()}`,
      draftId: draft.id,
      campaignId: draft.campaignId,
      capturedAt: new Date().toISOString(),
      originalState: { ...draft.originalState },
      changeLog: [`Captured before ${draft.changeType} change`],
    };
    await this.snapshotStore.create(snapshot);
    return snapshot;
  }

  async rollback(draft: Draft): Promise<RollbackResult> {
    try {
      const snapshot = await this.snapshotStore.findByDraftId(draft.id);
      if (!snapshot) {
        throw new Error(`No snapshot found for draft ${draft.id}`);
      }

      const externalId = this.getExternalId(draft.campaignId);

      // Restore original state to platform
      await this.restoreToPlatform(draft, externalId, snapshot.originalState);

      // Verify restoration
      const verified = await this.verifyRollback(draft, snapshot.originalState);

      if (!verified) {
        await this.alertService.sendCriticalAlert(
          `Rollback verification failed for draft ${draft.id}`
        );
        return {
          success: false,
          restored: true,
          alertSent: true,
          error: "Rollback verification failed",
        };
      }

      return { success: true, restored: true, alertSent: false };
    } catch (error: any) {
      await this.alertService.sendCriticalAlert(
        `Rollback failed critically for draft ${draft.id}: ${error.message}`
      );
      return {
        success: false,
        restored: false,
        alertSent: true,
        error: error.message,
      };
    }
  }

  private async restoreToPlatform(
    draft: Draft,
    externalId: string,
    originalState: Record<string, unknown>
  ): Promise<void> {
    switch (draft.platform) {
      case "meta": {
        if (originalState.budget !== undefined) {
          await this.metaApi.updateCampaignBudget(externalId, originalState.budget);
        }
        if (originalState.status !== undefined) {
          await this.metaApi.updateCampaignStatus(externalId, originalState.status);
        }
        break;
      }
      case "google": {
        if (originalState.budget !== undefined) {
          await this.googleApi.mutateCampaignBudget(externalId, originalState.budget);
        }
        if (originalState.status !== undefined) {
          await this.googleApi.mutateCampaignStatus(externalId, originalState.status);
        }
        break;
      }
      case "tiktok": {
        if (originalState.budget !== undefined) {
          await this.tiktokApi.updateAdGroupBudget(externalId, originalState.budget);
        }
        if (originalState.status !== undefined) {
          await this.tiktokApi.updateAdGroupStatus(externalId, originalState.status);
        }
        break;
      }
    }
  }

  private async verifyRollback(
    draft: Draft,
    expectedState: Record<string, unknown>
  ): Promise<boolean> {
    const campaign = await this.campaignRepo.findById(draft.campaignId);
    if (!campaign) return false;

    for (const [key, val] of Object.entries(expectedState)) {
      if (campaign[key as keyof Campaign] !== val) return false;
    }
    return true;
  }

  private getExternalId(campaignId: string): string {
    const campaign = campaigns[campaignId];
    return campaign?.externalId || campaignId;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// System Under Test — ExecutionEngine (orchestrates the full flow)
// ───────────────────────────────────────────────────────────────────────────────

class ExecutionEngine {
  constructor(
    private validator: DraftValidator,
    private changeApplier: ChangeApplier,
    private rollbackManager: RollbackManager,
    private snapshotStore: typeof mockSnapshotStore,
    private campaignRepo: typeof mockCampaignRepo
  ) {}

  async execute(draft: Draft): Promise<{
    success: boolean;
    stage: string;
    applyResult?: ApplyResult;
    rollbackResult?: RollbackResult;
    error?: string;
  }> {
    // Stage 1: Validate
    const validation = await this.validator.validate(draft);
    if (!validation.valid) {
      return {
        success: false,
        stage: "validation",
        error: validation.errors.join("; "),
      };
    }

    // Stage 2: Snapshot
    const snapshot = await this.rollbackManager.createSnapshot(draft);

    // Stage 3: Apply
    const applyResult = await this.changeApplier.apply(draft);

    if (!applyResult.success) {
      // Stage 3b: Rollback on failure
      const rollbackResult = await this.rollbackManager.rollback(draft);
      return {
        success: false,
        stage: "rollback",
        applyResult,
        rollbackResult,
        error: applyResult.error,
      };
    }

    // Stage 4: Verify & Update local state
    await this.campaignRepo.update(draft.campaignId, draft.payload);

    return {
      success: true,
      stage: "completed",
      applyResult,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Draft Execution Engine", () => {
  let validator: DraftValidator;
  let changeApplier: ChangeApplier;
  let rollbackManager: RollbackManager;
  let executionEngine: ExecutionEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    // Wire up SUTs
    validator = new DraftValidator(mockCampaignRepo);
    changeApplier = new ChangeApplier(mockMetaApi, mockGoogleApi, mockTikTokApi);
    rollbackManager = new RollbackManager(
      mockMetaApi,
      mockGoogleApi,
      mockTikTokApi,
      mockSnapshotStore,
      mockAlertService,
      mockCampaignRepo
    );
    executionEngine = new ExecutionEngine(
      validator,
      changeApplier,
      rollbackManager,
      mockSnapshotStore,
      mockCampaignRepo
    );

    // Default mock implementations.
    // Fixtures are keyed by short alias (meta_1, …) while the campaign's real id
    // is camp_meta_001, …. Tests reference both forms, so resolve either.
    mockCampaignRepo.findById.mockImplementation((id: string) => {
      return (
        campaigns[id] ||
        Object.values(campaigns).find((c) => c.id === id) ||
        null
      );
    });

    mockMetaApi.updateCampaignBudget.mockResolvedValue({ requestId: "meta_req_001" });
    mockMetaApi.updateCampaignStatus.mockResolvedValue({ requestId: "meta_req_002" });
    mockMetaApi.updateAdSetBid.mockResolvedValue({ requestId: "meta_req_003" });
    mockMetaApi.deleteCampaign.mockResolvedValue({ requestId: "meta_req_004" });

    mockGoogleApi.mutateCampaignBudget.mockResolvedValue({ requestId: "ggl_req_001" });
    mockGoogleApi.mutateCampaignStatus.mockResolvedValue({ requestId: "ggl_req_002" });
    mockGoogleApi.mutateAdGroupBid.mockResolvedValue({ requestId: "ggl_req_003" });

    mockTikTokApi.updateAdGroupBudget.mockResolvedValue({ requestId: "tt_req_001" });
    mockTikTokApi.updateAdGroupStatus.mockResolvedValue({ requestId: "tt_req_002" });
    mockTikTokApi.updateAdGroupBid.mockResolvedValue({ requestId: "tt_req_003" });

    mockSnapshotStore.create.mockImplementation((snap: Snapshot) =>
      Promise.resolve(snap)
    );
    mockSnapshotStore.findByDraftId.mockImplementation((draftId: string) =>
      Promise.resolve({
        id: `snap_${draftId}`,
        draftId,
        campaignId: "camp_meta_001",
        capturedAt: NOW.toISOString(),
        originalState: { budget: 5000, status: "active" },
        changeLog: ["Captured before budget change"],
      } as Snapshot)
    );

    mockAlertService.sendCriticalAlert.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DraftValidator Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe("DraftValidator", () => {
    // ── 1.1 Validate valid draft ──
    it("passes validation for a valid draft", async () => {
      const draft = createDraft();

      const result = await validator.validate(draft);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.riskScore).toBeLessThanOrEqual(33); // Low budget change = low risk
    });

    // ── 1.2 Validate expired draft ──
    it("fails validation when draft has expired", async () => {
      const draft = createDraft({ expiresAt: PAST.toISOString() });

      const result = await validator.validate(draft);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("expired")
      );
    });

    // ── 1.3 Validate campaign that doesn't exist ──
    it("fails validation when campaign does not exist", async () => {
      const draft = createDraft({ campaignId: "camp_nonexistent_999" });
      mockCampaignRepo.findById.mockResolvedValueOnce(null);

      const result = await validator.validate(draft);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("not found")
      );
    });

    // ── 1.4 Validate state mismatch ──
    it("fails validation when campaign state has drifted since draft creation", async () => {
      const draft = createDraft({
        originalState: { budget: 5000, status: "active" },
        requestedAt: "2025-01-12T10:00:00.000Z", // Before lastSyncedAt
      });
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.meta_1,
        budget: 6500, // Changed since draft was created
        lastSyncedAt: "2025-01-14T18:00:00.000Z",
      });

      const result = await validator.validate(draft);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("State mismatch")
      );
    });

    // ── 1.5 Calculate risk score — low budget change = low risk ──
    it("calculates low risk score for small budget increase", async () => {
      const draft = createDraft({
        changeType: "budget",
        payload: { budget: 5500 }, // 10% increase
        originalState: { budget: 5000, status: "active" },
      });

      const result = await validator.validate(draft);

      expect(result.riskScore).toBeLessThanOrEqual(33);
    });

    it("calculates low risk score for minor bid adjustment", async () => {
      const draft = createDraft({
        changeType: "bid",
        payload: { bid: 2.75 }, // 10% increase
        originalState: { bid: 2.5, status: "active" },
      });

      const result = await validator.validate(draft);

      expect(result.riskScore).toBeLessThanOrEqual(33);
    });

    // ── 1.6 Calculate risk score — campaign delete = high risk ──
    it("calculates high risk score for campaign deletion", async () => {
      const draft = createDraft({
        changeType: "delete",
        payload: { confirmDelete: true },
        originalState: { budget: 5000, status: "active" },
      });

      const result = await validator.validate(draft);

      expect(result.riskScore).toBeGreaterThan(66); // Deletion = high risk
    });

    it("calculates medium-high risk score for large budget increase", async () => {
      const draft = createDraft({
        changeType: "budget",
        payload: { budget: 10000 }, // 100% increase
        originalState: { budget: 5000, status: "active" },
      });

      const result = await validator.validate(draft);

      expect(result.riskScore).toBeGreaterThan(10); // Large budget increase = elevated
    });

    it("calculates risk score for Google platform with modifier", async () => {
      const draft = createDraft({
        platform: "google",
        campaignId: "google_1",
        changeType: "status",
        payload: { status: "paused" },
        originalState: { budget: 8000, status: "active" },
      });

      const result = await validator.validate(draft);

      expect(result.riskScore).toBeGreaterThan(0); // Google status change carries risk
    });

    it("calculates elevated risk for large bid increase on TikTok", async () => {
      const draft = createDraft({
        platform: "tiktok",
        campaignId: "tiktok_1",
        changeType: "bid",
        payload: { bid: 6.0 }, // 100% increase
        originalState: { bid: 3.0, status: "paused" },
      });

      const result = await validator.validate(draft);

      expect(result.riskScore).toBeGreaterThan(10); // Large bid increase = elevated
    });

    it("rejects empty payload drafts", async () => {
      const draft = createDraft({ payload: {} });

      const result = await validator.validate(draft);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Empty payload");
    });

    it("passes validation when campaign synced before draft was requested", async () => {
      const draft = createDraft({
        requestedAt: "2025-01-15T12:00:00.000Z", // After lastSyncedAt
      });

      const result = await validator.validate(draft);

      expect(result.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ChangeApplier Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe("ChangeApplier", () => {
    // ── 2.1 Apply budget change to Meta ──
    it("applies budget change to Meta via API call", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
        changeType: "budget",
        payload: { budget: 7500 },
      });

      const result = await changeApplier.apply(draft);

      expect(result.success).toBe(true);
      expect(result.platformRequestId).toBe("meta_req_001");
      expect(mockMetaApi.updateCampaignBudget).toHaveBeenCalledTimes(1);
      expect(mockMetaApi.updateCampaignBudget).toHaveBeenCalledWith(
        "act_123/camp_456",
        7500
      );
    });

    // ── 2.2 Apply status change to Google ──
    it("applies status change to Google via API call", async () => {
      const draft = createDraft({
        platform: "google",
        campaignId: "google_1",
        changeType: "status",
        payload: { status: "paused" },
      });

      const result = await changeApplier.apply(draft);

      expect(result.success).toBe(true);
      expect(result.platformRequestId).toBe("ggl_req_002");
      expect(mockGoogleApi.mutateCampaignStatus).toHaveBeenCalledTimes(1);
      expect(mockGoogleApi.mutateCampaignStatus).toHaveBeenCalledWith(
        "customers/123/campaigns/789",
        "paused"
      );
    });

    // ── 2.3 Apply bid change to TikTok ──
    it("applies bid change to TikTok via API call", async () => {
      const draft = createDraft({
        platform: "tiktok",
        campaignId: "tiktok_1",
        changeType: "bid",
        payload: { bid: 4.5 },
      });

      const result = await changeApplier.apply(draft);

      expect(result.success).toBe(true);
      expect(result.platformRequestId).toBe("tt_req_003");
      expect(mockTikTokApi.updateAdGroupBid).toHaveBeenCalledTimes(1);
      expect(mockTikTokApi.updateAdGroupBid).toHaveBeenCalledWith(
        "adgroup_555",
        4.5
      );
    });

    // ── 2.4 Handle API timeout → retry → success ──
    it("retries on API timeout and succeeds on second attempt", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
        changeType: "budget",
        payload: { budget: 7500 },
      });

      mockMetaApi.updateCampaignBudget
        .mockRejectedValueOnce({ code: "TIMEOUT", message: "Request timed out" })
        .mockResolvedValueOnce({ requestId: "meta_req_retry_001" });

      const resultPromise = changeApplier.apply(draft);
      // Fast-forward past retry delay
      await jest.advanceTimersByTimeAsync(600);
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.retries).toBe(1);
      expect(result.platformRequestId).toBe("meta_req_retry_001");
      expect(mockMetaApi.updateCampaignBudget).toHaveBeenCalledTimes(2);
    });

    it("retries up to 3 times on repeated timeouts then fails", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
        changeType: "budget",
        payload: { budget: 7500 },
      });

      mockMetaApi.updateCampaignBudget.mockRejectedValue({
        code: "TIMEOUT",
        message: "Request timed out",
      });

      const resultPromise = changeApplier.apply(draft);
      // Fast-forward past all retry delays (500 + 1000 + 1500 = 3000ms)
      await jest.advanceTimersByTimeAsync(4000);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.retries).toBe(3);
      expect(mockMetaApi.updateCampaignBudget).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    // ── 2.5 Handle API error → no retry, returns failure ──
    it("fails immediately on non-timeout API error without retry", async () => {
      const draft = createDraft({
        platform: "google",
        campaignId: "google_1",
        changeType: "budget",
        payload: { budget: 12000 },
      });

      mockGoogleApi.mutateCampaignBudget.mockRejectedValue(
        new Error("Invalid budget amount: exceeds account limit")
      );

      const result = await changeApplier.apply(draft);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid budget amount");
      expect(result.retries).toBe(0);
      expect(mockGoogleApi.mutateCampaignBudget).toHaveBeenCalledTimes(1);
    });

    it("applies Meta campaign deletion correctly", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
        changeType: "delete",
        payload: { confirmDelete: true },
      });

      const result = await changeApplier.apply(draft);

      expect(result.success).toBe(true);
      expect(mockMetaApi.deleteCampaign).toHaveBeenCalledTimes(1);
      expect(mockMetaApi.deleteCampaign).toHaveBeenCalledWith("act_123/camp_456");
    });

    it("applies Google bid change correctly", async () => {
      const draft = createDraft({
        platform: "google",
        campaignId: "google_1",
        changeType: "bid",
        payload: { bid: 7.5 },
      });

      const result = await changeApplier.apply(draft);

      expect(result.success).toBe(true);
      expect(result.platformRequestId).toBe("ggl_req_003");
      expect(mockGoogleApi.mutateAdGroupBid).toHaveBeenCalledWith(
        "customers/123/campaigns/789",
        7.5
      );
    });

    it("applies TikTok budget change correctly", async () => {
      const draft = createDraft({
        platform: "tiktok",
        campaignId: "tiktok_1",
        changeType: "budget",
        payload: { budget: 5000 },
      });

      const result = await changeApplier.apply(draft);

      expect(result.success).toBe(true);
      expect(mockTikTokApi.updateAdGroupBudget).toHaveBeenCalledWith(
        "adgroup_555",
        5000
      );
    });

    it("applies TikTok status change correctly", async () => {
      const draft = createDraft({
        platform: "tiktok",
        campaignId: "tiktok_1",
        changeType: "status",
        payload: { status: "active" },
      });

      const result = await changeApplier.apply(draft);

      expect(result.success).toBe(true);
      expect(mockTikTokApi.updateAdGroupStatus).toHaveBeenCalledWith(
        "adgroup_555",
        "active"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. RollbackManager Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe("RollbackManager", () => {
    // ── 3.1 Create snapshot before change ──
    it("creates a snapshot capturing the original campaign state", async () => {
      const draft = createDraft({
        originalState: { budget: 5000, status: "active", bid: 2.5 },
      });

      const snapshot = await rollbackManager.createSnapshot(draft);

      expect(snapshot.draftId).toBe(draft.id);
      expect(snapshot.campaignId).toBe(draft.campaignId);
      expect(snapshot.originalState).toEqual({
        budget: 5000,
        status: "active",
        bid: 2.5,
      });
      expect(snapshot.changeLog).toContainEqual(
        expect.stringContaining("Captured before")
      );
      expect(mockSnapshotStore.create).toHaveBeenCalledTimes(1);
    });

    // ── 3.2 Rollback successful — restore original state ──
    it("successfully rolls back by restoring original budget and status", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
      });
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.meta_1,
        budget: 5000,
        status: "active",
      });

      const result = await rollbackManager.rollback(draft);

      expect(result.success).toBe(true);
      expect(result.restored).toBe(true);
      expect(result.alertSent).toBe(false);
      expect(mockMetaApi.updateCampaignBudget).toHaveBeenCalledWith(
        "act_123/camp_456",
        5000
      );
      expect(mockMetaApi.updateCampaignStatus).toHaveBeenCalledWith(
        "act_123/camp_456",
        "active"
      );
    });

    // ── 3.3 Rollback failure → critical alert ──
    it("sends critical alert when rollback fails", async () => {
      const draft = createDraft();
      mockSnapshotStore.findByDraftId.mockRejectedValueOnce(
        new Error("Database connection lost")
      );

      const result = await rollbackManager.rollback(draft);

      expect(result.success).toBe(false);
      expect(result.restored).toBe(false);
      expect(result.alertSent).toBe(true);
      expect(mockAlertService.sendCriticalAlert).toHaveBeenCalledTimes(1);
      expect(mockAlertService.sendCriticalAlert).toHaveBeenCalledWith(
        expect.stringContaining("Rollback failed critically")
      );
    });

    // ── 3.4 Verify rollback was successful ──
    it("verifies rollback by checking current campaign state matches snapshot", async () => {
      const draft = createDraft({
        platform: "google",
        campaignId: "google_1",
      });
      mockSnapshotStore.findByDraftId.mockResolvedValueOnce({
        id: `snap_${draft.id}`,
        draftId: draft.id,
        campaignId: "google_1",
        capturedAt: NOW.toISOString(),
        originalState: { budget: 8000, status: "active" },
        changeLog: ["Captured before budget change"],
      } as Snapshot);
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.google_1,
        budget: 8000,
        status: "active",
      });

      const result = await rollbackManager.rollback(draft);

      expect(result.success).toBe(true);
      expect(mockGoogleApi.mutateCampaignBudget).toHaveBeenCalled();
      expect(mockGoogleApi.mutateCampaignStatus).toHaveBeenCalled();
    });

    it("detects failed verification and sends alert", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
      });
      // Campaign state does NOT match expected after rollback
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.meta_1,
        budget: 9999, // Mismatch!
        status: "active",
      });

      const result = await rollbackManager.rollback(draft);

      expect(result.success).toBe(false);
      expect(result.restored).toBe(true); // API calls were made
      expect(result.alertSent).toBe(true);
      expect(mockAlertService.sendCriticalAlert).toHaveBeenCalledWith(
        expect.stringContaining("Rollback verification failed")
      );
    });

    it("rolls back Google campaign changes correctly", async () => {
      const draft = createDraft({
        platform: "google",
        campaignId: "google_1",
        originalState: { budget: 8000, status: "paused" },
      });
      mockSnapshotStore.findByDraftId.mockResolvedValueOnce({
        id: `snap_${draft.id}`,
        draftId: draft.id,
        campaignId: "google_1",
        capturedAt: NOW.toISOString(),
        originalState: { budget: 8000, status: "paused" },
        changeLog: ["Captured before budget change"],
      } as Snapshot);
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.google_1,
        budget: 8000,
        status: "paused",
      });

      const result = await rollbackManager.rollback(draft);

      expect(result.success).toBe(true);
      expect(mockGoogleApi.mutateCampaignBudget).toHaveBeenCalledWith(
        "customers/123/campaigns/789",
        8000
      );
      expect(mockGoogleApi.mutateCampaignStatus).toHaveBeenCalledWith(
        "customers/123/campaigns/789",
        "paused"
      );
    });

    it("rolls back TikTok campaign changes correctly", async () => {
      const draft = createDraft({
        platform: "tiktok",
        campaignId: "tiktok_1",
        originalState: { budget: 3000, status: "paused" },
      });
      mockSnapshotStore.findByDraftId.mockResolvedValueOnce({
        id: `snap_${draft.id}`,
        draftId: draft.id,
        campaignId: "tiktok_1",
        capturedAt: NOW.toISOString(),
        originalState: { budget: 3000, status: "paused" },
        changeLog: ["Captured before budget change"],
      } as Snapshot);
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.tiktok_1,
        budget: 3000,
        status: "paused",
      });

      const result = await rollbackManager.rollback(draft);

      expect(result.success).toBe(true);
      expect(mockTikTokApi.updateAdGroupBudget).toHaveBeenCalledWith(
        "adgroup_555",
        3000
      );
      expect(mockTikTokApi.updateAdGroupStatus).toHaveBeenCalledWith(
        "adgroup_555",
        "paused"
      );
    });

    it("handles missing snapshot during rollback", async () => {
      const draft = createDraft();
      mockSnapshotStore.findByDraftId.mockResolvedValueOnce(null);

      const result = await rollbackManager.rollback(draft);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No snapshot found");
      expect(result.alertSent).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Execution Flow Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe("ExecutionEngine", () => {
    // ── 4.1 Full happy path ──
    it("executes full happy path: validate → snapshot → apply → verify → success", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
        changeType: "budget",
        payload: { budget: 6000 },
      });

      const result = await executionEngine.execute(draft);

      expect(result.success).toBe(true);
      expect(result.stage).toBe("completed");
      expect(result.applyResult?.success).toBe(true);
      expect(result.applyResult?.platformRequestId).toBe("meta_req_001");
      expect(mockSnapshotStore.create).toHaveBeenCalledTimes(1);
      expect(mockCampaignRepo.update).toHaveBeenCalledWith("meta_1", {
        budget: 6000,
      });
    });

    // ── 4.2 Validation failure: stops before applying ──
    it("stops execution when validation fails, before any changes applied", async () => {
      const draft = createDraft({
        expiresAt: PAST.toISOString(), // Expired draft
      });

      const result = await executionEngine.execute(draft);

      expect(result.success).toBe(false);
      expect(result.stage).toBe("validation");
      expect(result.error).toContain("expired");
      expect(mockSnapshotStore.create).not.toHaveBeenCalled();
      expect(mockMetaApi.updateCampaignBudget).not.toHaveBeenCalled();
    });

    it("stops execution when campaign not found", async () => {
      const draft = createDraft({ campaignId: "camp_missing" });
      mockCampaignRepo.findById.mockResolvedValueOnce(null);

      const result = await executionEngine.execute(draft);

      expect(result.success).toBe(false);
      expect(result.stage).toBe("validation");
      expect(mockSnapshotStore.create).not.toHaveBeenCalled();
    });

    // ── 4.3 Apply failure: triggers rollback ──
    it("triggers rollback when API apply fails", async () => {
      const draft = createDraft({
        platform: "google",
        campaignId: "google_1",
        changeType: "budget",
        payload: { budget: 999999 }, // Invalid — exceeds limit
      });
      mockGoogleApi.mutateCampaignBudget.mockRejectedValueOnce(
        new Error("Budget exceeds account limit")
      );
      // Rollback verification
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.google_1,
        budget: 8000,
        status: "active",
      });

      const result = await executionEngine.execute(draft);

      expect(result.success).toBe(false);
      expect(result.stage).toBe("rollback");
      expect(result.applyResult?.success).toBe(false);
      expect(result.applyResult?.error).toContain("Budget exceeds account limit");
      expect(result.rollbackResult).toBeDefined();
      expect(result.rollbackResult?.restored).toBe(true);
      expect(mockGoogleApi.mutateCampaignBudget).toHaveBeenCalledTimes(2); // apply + rollback
    });

    // ── 4.4 Rollback failure: escalates ──
    it("escalates when both apply and rollback fail", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
        changeType: "status",
        payload: { status: "archived" },
      });
      // Apply fails
      mockMetaApi.updateCampaignStatus.mockRejectedValueOnce(
        new Error("Permission denied")
      );
      // Rollback also fails (snapshot DB error)
      mockSnapshotStore.findByDraftId.mockRejectedValueOnce(
        new Error("DB connection timeout")
      );

      const result = await executionEngine.execute(draft);

      expect(result.success).toBe(false);
      expect(result.stage).toBe("rollback");
      expect(result.applyResult?.success).toBe(false);
      expect(result.rollbackResult?.success).toBe(false);
      expect(result.rollbackResult?.alertSent).toBe(true);
      expect(mockAlertService.sendCriticalAlert).toHaveBeenCalled();
    });

    // ── Additional happy path variants ──
    it("executes happy path for Google status change", async () => {
      const draft = createDraft({
        platform: "google",
        campaignId: "google_1",
        changeType: "status",
        payload: { status: "paused" },
      });

      const result = await executionEngine.execute(draft);

      expect(result.success).toBe(true);
      expect(result.stage).toBe("completed");
      expect(mockGoogleApi.mutateCampaignStatus).toHaveBeenCalledTimes(1);
      expect(mockCampaignRepo.update).toHaveBeenCalledWith("google_1", {
        status: "paused",
      });
    });

    it("executes happy path for TikTok bid change", async () => {
      const draft = createDraft({
        platform: "tiktok",
        campaignId: "tiktok_1",
        changeType: "bid",
        payload: { bid: 5.0 },
      });

      const result = await executionEngine.execute(draft);

      expect(result.success).toBe(true);
      expect(result.applyResult?.platformRequestId).toBe("tt_req_003");
      expect(mockCampaignRepo.update).toHaveBeenCalledWith("tiktok_1", {
        bid: 5.0,
      });
    });

    it("triggers rollback on Meta timeout after all retries exhausted", async () => {
      const draft = createDraft({
        platform: "meta",
        campaignId: "meta_1",
        changeType: "budget",
        payload: { budget: 10000 },
      });
      // All apply attempts (initial + 3 retries) time out, then the rollback
      // restore call on the same mock succeeds.
      mockMetaApi.updateCampaignBudget
        .mockRejectedValueOnce({ code: "TIMEOUT", message: "Network timeout" })
        .mockRejectedValueOnce({ code: "TIMEOUT", message: "Network timeout" })
        .mockRejectedValueOnce({ code: "TIMEOUT", message: "Network timeout" })
        .mockRejectedValueOnce({ code: "TIMEOUT", message: "Network timeout" })
        .mockResolvedValue({ requestId: "meta_req_rollback_001" });
      // Rollback succeeds — restored state matches the snapshot's originalState
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.meta_1,
        budget: 5000,
        status: "active",
      });

      const resultPromise = executionEngine.execute(draft);
      await jest.advanceTimersByTimeAsync(4000);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.stage).toBe("rollback");
      expect(result.applyResult?.retries).toBe(3);
      expect(result.rollbackResult?.restored).toBe(true);
    });

    it("fails validation on state mismatch and never reaches snapshot", async () => {
      const draft = createDraft({
        originalState: { budget: 5000, status: "active" },
        requestedAt: "2025-01-12T10:00:00.000Z",
      });
      // Campaign has been modified since draft
      mockCampaignRepo.findById.mockResolvedValueOnce({
        ...campaigns.meta_1,
        budget: 7500, // Changed from original 5000
        lastSyncedAt: "2025-01-14T18:00:00.000Z",
      });

      const result = await executionEngine.execute(draft);

      expect(result.success).toBe(false);
      expect(result.stage).toBe("validation");
      expect(result.error).toContain("State mismatch");
      expect(result.error).toContain("budget changed from 5000 to 7500");
      expect(mockSnapshotStore.create).not.toHaveBeenCalled();
    });
  });
});
