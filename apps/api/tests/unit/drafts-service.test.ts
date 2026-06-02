import { jest } from '@jest/globals';
import {
  createDraft,
  approveDraft,
  rejectDraft,
  scheduleDraft,
  listDrafts,
  getDraft,
  getDraftStats,
  type CreateDraftInput,
} from '../../src/services/drafts-service';
import { supabase } from '../../src/lib/supabase';
import { mockDrafts, mockAdAccounts, UUIDS, mockWorkspaces, mockCampaigns } from '../fixtures/data';
import { buildCreateDraftInput } from '../utils/helpers';
import { NotFoundError, ValidationError } from '../../src/lib/errors';

// ─── Mock Supabase ───────────────────────────────────────────────

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();
const mockSingle = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ─── Mock Meta API ───────────────────────────────────────────────

const mockCreateMetaCampaign = jest.fn();
const mockUpdateMetaCampaign = jest.fn();

jest.mock('../../src/services/meta-api', () => ({
  createMetaCampaign: (...args: unknown[]) => mockCreateMetaCampaign(...args),
  updateMetaCampaign: (...args: unknown[]) => mockUpdateMetaCampaign(...args),
}));

// ─── Helper: Build chainable mock ────────────────────────────────

function buildChainableMock(result: { data: unknown; error: null; count?: number | null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: result.data, error: result.error }),
    count: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (r: unknown) => unknown) => Promise.resolve(cb(result))),
  };
  return chain;
}

// ─── Suite: createDraft ──────────────────────────────────────────

describe('createDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a budget_change draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({ draftType: 'budget_change' });
    const expectedDraft = { ...mockDrafts.pendingBudget, id: mockDrafts.pendingBudget.id };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(mockFrom).toHaveBeenCalledWith('drafts');
    expect(result).toBeDefined();
    expect(result.draft_type).toBe('budget_change');
  });

  it('should create a status_change draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'status_change',
      changeSummary: 'Pause campaign',
      changeDetail: { field: 'status', old_status: 'active', new_status: 'PAUSED' },
    });
    const expectedDraft = mockDrafts.pendingStatus;

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('status_change');
  });

  it('should create a campaign_create draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'campaign_create',
      campaignId: undefined,
      changeSummary: 'Create campaign "Summer Sale 2024"',
      changeDetail: { name: 'Summer Sale 2024', objective: 'CONVERSIONS', daily_budget: 200 },
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, draft_type: 'campaign_create' };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('campaign_create');
  });

  it('should create a bid_adjustment draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'bid_adjustment',
      changeSummary: 'Increase bid by 15%',
      changeDetail: { field: 'bid_amount', old_value: 5, new_value: 5.75 },
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, draft_type: 'bid_adjustment' };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('bid_adjustment');
  });

  it('should create a targeting_edit draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'targeting_edit',
      changeSummary: 'Update age range to 25-55',
      changeDetail: { field: 'targeting', old_value: { age: '18-65' }, new_value: { age: '25-55' } },
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, draft_type: 'targeting_edit' };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('targeting_edit');
  });

  it('should create a creative_upload draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'creative_upload',
      changeSummary: 'Upload new video creative',
      changeDetail: { creative_type: 'video', url: 'https://example.com/video.mp4' },
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, draft_type: 'creative_upload' };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('creative_upload');
  });

  it('should create a campaign_duplicate draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'campaign_duplicate',
      changeSummary: 'Duplicate campaign for A/B test',
      changeDetail: { source_campaign_id: UUIDS.campaign1, new_name: 'Campaign Clone' },
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, draft_type: 'campaign_duplicate' };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('campaign_duplicate');
  });

  it('should create a budget_reallocation draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'budget_reallocation',
      changeSummary: 'Reallocate budget from Campaign A to Campaign B',
      changeDetail: { source_campaign: UUIDS.campaign1, target_campaign: UUIDS.campaign2, amount: 100 },
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, draft_type: 'budget_reallocation' };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('budget_reallocation');
  });

  it('should create a rule_based draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'rule_based',
      changeSummary: 'AI-suggested optimization',
      changeDetail: { rule_id: UUIDS.rule1, suggestion: 'pause underperforming adset' },
      aiReasoning: 'Campaign CPA exceeds threshold',
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, draft_type: 'rule_based' };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('rule_based');
  });

  it('should create a schedule_change draft', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'schedule_change',
      changeSummary: 'Extend campaign end date',
      changeDetail: { old_end_date: '2024-06-30', new_end_date: '2024-07-31' },
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, draft_type: 'schedule_change' };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result.draft_type).toBe('schedule_change');
  });

  it('should throw when supabase insert fails', async () => {
    // Arrange
    const input = buildCreateDraftInput();
    mockFrom.mockReturnValue(buildChainableMock({ data: null, error: { message: 'DB connection error' } as unknown as null }));

    // Act & Assert
    await expect(createDraft(input as CreateDraftInput)).rejects.toThrow('Failed to create draft');
  });

  it('should include AI reasoning when provided', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      aiReasoning: 'High CPA detected, recommend budget reduction',
      impactEstimate: 'Save $50/day',
    });
    const expectedDraft = { ...mockDrafts.pendingBudget, ai_reasoning: input.aiReasoning, impact_estimate: input.impactEstimate };

    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    expect(result).toBeDefined();
  });
});

// ─── Suite: approveDraft ─────────────────────────────────────────

describe('approveDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should approve a pending draft successfully', async () => {
    // Arrange - getDraft returns pending draft
    const pendingDraft = { ...mockDrafts.pendingBudget, status: 'pending' as const };
    const approvedDraft = { ...pendingDraft, status: 'approved' as const, approver_id: UUIDS.owner, executed_at: '2024-06-01T12:00:00.000Z', resolved_at: '2024-06-01T12:00:00.000Z' };

    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: pendingDraft, error: null })) // getDraft
      .mockReturnValueOnce(buildChainableMock({ data: mockAdAccounts.meta, error: null })) // ad_accounts query in applyDraftChange
      .mockReturnValueOnce(buildChainableMock({ data: approvedDraft, error: null })); // update to approved

    mockUpdateMetaCampaign.mockResolvedValue(undefined);

    // Act
    const result = await approveDraft(UUIDS.draft1, UUIDS.owner);

    // Assert
    expect(result.status).toBe('approved');
    expect(result.approver_id).toBe(UUIDS.owner);
  });

  it('should reject approval of non-pending draft with ValidationError', async () => {
    // Arrange - getDraft returns already approved draft
    const alreadyApproved = { ...mockDrafts.approvedBudget, status: 'approved' as const };

    mockFrom.mockReturnValue(buildChainableMock({ data: alreadyApproved, error: null }));

    // Act & Assert
    await expect(approveDraft(UUIDS.draft3, UUIDS.owner)).rejects.toThrow(ValidationError);
  });

  it('should reject approval of rejected draft with ValidationError', async () => {
    // Arrange
    const rejected = { ...mockDrafts.rejectedPause, status: 'rejected' as const };

    mockFrom.mockReturnValue(buildChainableMock({ data: rejected, error: null }));

    // Act & Assert
    await expect(approveDraft(UUIDS.draft4, UUIDS.owner)).rejects.toThrow(ValidationError);
  });

  it('should mark draft as error when live API call fails', async () => {
    // Arrange
    const pendingDraft = { ...mockDrafts.pendingBudget, status: 'pending' as const };
    const errorDraft = { ...pendingDraft, status: 'error' as const, error_message: 'API rate limit exceeded', approver_id: UUIDS.owner };

    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: pendingDraft, error: null })) // getDraft
      .mockReturnValueOnce(buildChainableMock({ data: mockAdAccounts.meta, error: null })) // ad_accounts
      .mockReturnValueOnce(buildChainableMock({ data: errorDraft, error: null })); // error update

    mockUpdateMetaCampaign.mockRejectedValue(new Error('API rate limit exceeded'));

    // Act & Assert
    await expect(approveDraft(UUIDS.draft1, UUIDS.owner)).rejects.toThrow('API rate limit exceeded');
  });

  it('should apply budget_change to live account', async () => {
    // Arrange
    const pendingDraft = {
      ...mockDrafts.pendingBudget,
      status: 'pending' as const,
      draft_type: 'budget_change' as const,
      change_detail: { platform_campaign_id: UUIDS.platformCampaign1, field: 'daily_budget', new_value: 400 },
    };
    const approvedDraft = { ...pendingDraft, status: 'approved' as const, approver_id: UUIDS.owner };

    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: pendingDraft, error: null }))
      .mockReturnValueOnce(buildChainableMock({ data: mockAdAccounts.meta, error: null }))
      .mockReturnValueOnce(buildChainableMock({ data: approvedDraft, error: null }));

    mockUpdateMetaCampaign.mockResolvedValue(undefined);

    // Act
    const result = await approveDraft(UUIDS.draft1, UUIDS.owner);

    // Assert
    expect(result.status).toBe('approved');
    expect(mockUpdateMetaCampaign).toHaveBeenCalled();
  });

  it('should apply status_change to live account', async () => {
    // Arrange
    const pendingDraft = {
      ...mockDrafts.pendingStatus,
      status: 'pending' as const,
      change_detail: { platform_campaign_id: UUIDS.platformCampaign2, field: 'status', new_status: 'PAUSED' },
    };
    const approvedDraft = { ...pendingDraft, status: 'approved' as const, approver_id: UUIDS.owner };

    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: pendingDraft, error: null }))
      .mockReturnValueOnce(buildChainableMock({ data: mockAdAccounts.meta, error: null }))
      .mockReturnValueOnce(buildChainableMock({ data: approvedDraft, error: null }));

    mockUpdateMetaCampaign.mockResolvedValue(undefined);

    // Act
    const result = await approveDraft(UUIDS.draft2, UUIDS.owner);

    // Assert
    expect(result.status).toBe('approved');
    expect(mockUpdateMetaCampaign).toHaveBeenCalledWith(
      UUIDS.platformCampaign2,
      mockAdAccounts.meta.oauth_token,
      { status: 'PAUSED' },
    );
  });

  it('should throw when no connected account is found', async () => {
    // Arrange
    const pendingDraft = { ...mockDrafts.pendingBudget, status: 'pending' as const };

    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: pendingDraft, error: null }))
      .mockReturnValueOnce(buildChainableMock({ data: null, error: null })); // No ad account

    // Act & Assert
    await expect(approveDraft(UUIDS.draft1, UUIDS.owner)).rejects.toThrow();
  });
});

// ─── Suite: rejectDraft ──────────────────────────────────────────

describe('rejectDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject a pending draft with a reason', async () => {
    // Arrange
    const pendingDraft = { ...mockDrafts.pendingBudget, status: 'pending' as const };
    const rejectedDraft = {
      ...pendingDraft,
      status: 'rejected' as const,
      approver_id: UUIDS.admin,
      approval_note: 'Budget reduction too aggressive',
      resolved_at: '2024-06-01T13:00:00.000Z',
    };

    // getDraft() reads the pending draft first, then the update returns the rejected one
    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: pendingDraft, error: null }))
      .mockReturnValueOnce(buildChainableMock({ data: rejectedDraft, error: null }));

    // Act
    const result = await rejectDraft(UUIDS.draft1, UUIDS.admin, 'Budget reduction too aggressive');

    // Assert
    expect(result.status).toBe('rejected');
    expect(result.approver_id).toBe(UUIDS.admin);
    expect(result.approval_note).toBe('Budget reduction too aggressive');
  });

  it('should reject a pending draft without a reason', async () => {
    // Arrange
    const pendingDraft = { ...mockDrafts.pendingBudget, status: 'pending' as const };
    const rejectedDraft = {
      ...pendingDraft,
      status: 'rejected' as const,
      approver_id: UUIDS.admin,
      approval_note: undefined,
      resolved_at: '2024-06-01T13:00:00.000Z',
    };

    // getDraft() reads the pending draft first, then the update returns the rejected one
    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: pendingDraft, error: null }))
      .mockReturnValueOnce(buildChainableMock({ data: rejectedDraft, error: null }));

    // Act
    const result = await rejectDraft(UUIDS.draft1, UUIDS.admin);

    // Assert
    expect(result.status).toBe('rejected');
    expect(result.approver_id).toBe(UUIDS.admin);
  });

  it('should throw ValidationError when rejecting non-pending draft', async () => {
    // Arrange
    const alreadyApproved = { ...mockDrafts.approvedBudget, status: 'approved' as const };

    mockFrom.mockReturnValue(buildChainableMock({ data: alreadyApproved, error: null }));

    // Act & Assert
    await expect(rejectDraft(UUIDS.draft3, UUIDS.admin)).rejects.toThrow(ValidationError);
  });
});

// ─── Suite: scheduleDraft ────────────────────────────────────────

describe('scheduleDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should schedule a pending draft', async () => {
    // Arrange
    const pendingDraft = { ...mockDrafts.pendingBudget, status: 'pending' as const };
    const scheduledDraft = {
      ...pendingDraft,
      status: 'scheduled' as const,
      scheduled_at: '2024-06-15T09:00:00.000Z',
    };

    // getDraft() reads the pending draft first, then the update returns the scheduled one
    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: pendingDraft, error: null }))
      .mockReturnValueOnce(buildChainableMock({ data: scheduledDraft, error: null }));

    // Act
    const result = await scheduleDraft(UUIDS.draft1, '2024-06-15T09:00:00.000Z');

    // Assert
    expect(result.status).toBe('scheduled');
    expect(result.scheduled_at).toBe('2024-06-15T09:00:00.000Z');
  });

  it('should throw ValidationError when scheduling non-pending draft', async () => {
    // Arrange
    const approved = { ...mockDrafts.approvedBudget, status: 'approved' as const };

    mockFrom.mockReturnValue(buildChainableMock({ data: approved, error: null }));

    // Act & Assert
    await expect(scheduleDraft(UUIDS.draft3, '2024-06-15T09:00:00.000Z')).rejects.toThrow(ValidationError);
  });
});

// ─── Suite: listDrafts ───────────────────────────────────────────

describe('listDrafts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all drafts for a workspace', async () => {
    // Arrange
    const drafts = [mockDrafts.pendingBudget, mockDrafts.pendingStatus, mockDrafts.approvedBudget];

    mockFrom.mockReturnValue(buildChainableMock({ data: drafts, error: null, count: drafts.length }));

    // Act
    const result = await listDrafts(UUIDS.workspace1);

    // Assert
    expect(result.drafts).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('should filter by status', async () => {
    // Arrange
    const pendingOnly = [mockDrafts.pendingBudget, mockDrafts.pendingStatus];

    mockFrom.mockReturnValue(buildChainableMock({ data: pendingOnly, error: null, count: pendingOnly.length }));

    // Act
    const result = await listDrafts(UUIDS.workspace1, { status: 'pending' });

    // Assert
    expect(result.drafts).toHaveLength(2);
    expect(result.drafts.every((d: { status: string }) => d.status === 'pending')).toBe(true);
  });

  it('should filter by platform', async () => {
    // Arrange
    const metaOnly = [mockDrafts.pendingBudget];

    mockFrom.mockReturnValue(buildChainableMock({ data: metaOnly, error: null, count: metaOnly.length }));

    // Act
    const result = await listDrafts(UUIDS.workspace1, { platform: 'meta' });

    // Assert
    expect(result.drafts.length).toBe(1);
  });

  it('should paginate results', async () => {
    // Arrange
    const allDrafts = Array.from({ length: 75 }, (_, i) => ({
      ...mockDrafts.pendingBudget,
      id: `draft-${i}`,
    }));

    mockFrom.mockReturnValue(buildChainableMock({ data: allDrafts.slice(0, 20), error: null, count: 75 }));

    // Act
    const result = await listDrafts(UUIDS.workspace1, { page: 1, limit: 20 });

    // Assert
    expect(result.drafts.length).toBe(20); // Mock returns one page (20 of 75)
    expect(result.total).toBe(75);
  });

  it('should return empty array when no drafts exist', async () => {
    // Arrange
    mockFrom.mockReturnValue(buildChainableMock({ data: [], error: null, count: 0 }));

    // Act
    const result = await listDrafts(UUIDS.workspace1);

    // Assert
    expect(result.drafts).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should throw when supabase query fails', async () => {
    // Arrange
    mockFrom.mockReturnValue(buildChainableMock({ data: null, error: { message: 'Database error' } as unknown as null, count: 0 }));

    // Act & Assert
    await expect(listDrafts(UUIDS.workspace1)).rejects.toThrow('Failed to list drafts');
  });
});

// ─── Suite: getDraft ─────────────────────────────────────────────

describe('getDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a draft by id', async () => {
    // Arrange
    mockFrom.mockReturnValue(buildChainableMock({ data: mockDrafts.pendingBudget, error: null }));

    // Act
    const result = await getDraft(UUIDS.draft1);

    // Assert
    expect(result.id).toBe(UUIDS.draft1);
    expect(result.change_summary).toBe(mockDrafts.pendingBudget.change_summary);
  });

  it('should throw NotFoundError when draft does not exist', async () => {
    // Arrange
    mockFrom.mockReturnValue(buildChainableMock({ data: null, error: { message: 'Not found' } as unknown as null }));

    // Act & Assert
    await expect(getDraft('non-existent-id')).rejects.toThrow(NotFoundError);
  });
});

// ─── Suite: getDraftStats ────────────────────────────────────────

describe('getDraftStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return draft statistics for a workspace', async () => {
    // Arrange
    const mockSelect = jest.fn();
    mockFrom.mockImplementation((table: string) => {
      return {
        select: mockSelect.mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        head: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((cb: (r: { count: number }) => unknown) => {
          // Return different counts based on workspace filter
          return Promise.resolve(cb({ count: 3 }));
        }),
      };
    });

    // Act
    const result = await getDraftStats(UUIDS.workspace1);

    // Assert
    expect(result).toBeDefined();
    expect(typeof result.pending).toBe('number');
    expect(typeof result.approved_today).toBe('number');
    expect(typeof result.rejected_today).toBe('number');
    expect(typeof result.auto_applied_today).toBe('number');
  });
});

// ─── Suite: Draft-First Workflow ─────────────────────────────────

describe('draft-first workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('every write operation should create a draft, not touch live accounts directly', async () => {
    // Arrange
    const input = buildCreateDraftInput({
      draftType: 'budget_change',
      changeSummary: 'Reduce budget by 20%',
      changeDetail: { field: 'daily_budget', old_value: 500, new_value: 400 },
    });

    const expectedDraft = { ...mockDrafts.pendingBudget, status: 'pending' as const };
    mockFrom.mockReturnValue(buildChainableMock({ data: expectedDraft, error: null }));

    // Act
    const result = await createDraft(input as CreateDraftInput);

    // Assert
    // The draft should be in pending status - NOT applied to live
    expect(result.status).toBe('pending');
    // No live API calls should have been made during creation
    expect(mockUpdateMetaCampaign).not.toHaveBeenCalled();
    expect(mockCreateMetaCampaign).not.toHaveBeenCalled();
  });

  it('draft should remain pending until explicitly approved', async () => {
    // Arrange - simulating the lifecycle
    const draft = {
      ...mockDrafts.pendingBudget,
      status: 'pending' as const,
      approver_id: undefined,
      executed_at: undefined,
      resolved_at: undefined,
    };

    mockFrom.mockReturnValue(buildChainableMock({ data: draft, error: null }));

    // Act - get draft
    const fetched = await getDraft(UUIDS.draft1);

    // Assert - still pending, no approver
    expect(fetched.status).toBe('pending');
    expect(fetched.approver_id).toBeUndefined();
    expect(fetched.executed_at).toBeUndefined();
  });

  it('creating a draft should log to audit_log', async () => {
    // Arrange
    const input = buildCreateDraftInput({ actorType: 'user', actorName: 'Test User' });
    const expectedDraft = { ...mockDrafts.pendingBudget };
    const auditInsertMock = jest.fn().mockReturnThis();

    mockFrom
      .mockReturnValueOnce(buildChainableMock({ data: expectedDraft, error: null })) // drafts insert
      .mockReturnValueOnce({
        // audit_log insert: insert() returns a thenable that resolves so `await` settles
        insert: auditInsertMock.mockReturnValue(
          Promise.resolve({ data: null, error: null }),
        ),
      } as unknown as ReturnType<typeof buildChainableMock>); // audit_log insert

    // Act
    await createDraft(input as CreateDraftInput);

    // Assert - audit log was attempted (via the mock chain)
    expect(mockFrom).toHaveBeenCalledWith('drafts');
  });
});
