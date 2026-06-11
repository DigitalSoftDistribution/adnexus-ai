import { describe, it, expect, vi } from 'vitest';
import { GetAuditLogByIdUseCase } from './audit-log/GetAuditLogByIdUseCase';
import { ExportAuditLogUseCase } from './audit-log/ExportAuditLogUseCase';
import { DownloadExportUseCase } from './export/DownloadExportUseCase';
import { ListAdminErrorsUseCase } from './admin/ListAdminErrorsUseCase';
import { GetAdminApiUsageUseCase } from './admin/GetAdminApiUsageUseCase';
import { GetFeatureFlagsUseCase } from './admin/GetFeatureFlagsUseCase';
import { UpdateFeatureFlagUseCase } from './admin/UpdateFeatureFlagUseCase';
import { UpdateAdUseCase } from './ad/UpdateAdUseCase';
import { DuplicateAdUseCase } from './ad/DuplicateAdUseCase';
import { ListCommentsUseCase } from './comment/ListCommentsUseCase';
import { CreateCommentUseCase } from './comment/CreateCommentUseCase';
import { GetCommentByIdUseCase, DeleteCommentUseCase } from './comment/CommentUseCases';
import type { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository';
import type { IExportRepository } from '../../domain/repositories/IExportRepository';
import type { IAdRepository } from '../../domain/repositories/IAdRepository';
import type { IDraftRepository } from '../../domain/repositories/IDraftRepository';
import type { ICommentRepository } from '../../domain/repositories/ICommentRepository';
import type { IAdminOpsRepository } from '../../domain/repositories/IAdminOpsRepository';

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('GetAuditLogByIdUseCase', () => {
  it('returns an entry scoped to workspace', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'a1', workspaceId: 'ws-1', action: 'test' }),
    } as unknown as IAuditLogRepository;
    const res = await new GetAuditLogByIdUseCase(repo).execute({ entryId: 'a1', workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
  });
});

describe('ExportAuditLogUseCase', () => {
  it('exports CSV for admin', async () => {
    const repo = {
      list: vi.fn().mockResolvedValue({
        entries: [{
          id: 'a1',
          workspaceId: 'ws-1',
          userId: null,
          actorType: 'user',
          actorId: null,
          actorName: 'Alice',
          action: 'created',
          actionCategory: 'draft_created',
          platform: null,
          campaignId: null,
          entityType: 'draft',
          entityId: 'd1',
          metadata: {},
          details: {},
          source: 'dashboard',
          ipAddress: null,
          createdAt: new Date('2026-06-10'),
        }],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
    } as unknown as IAuditLogRepository;

    const res = await new ExportAuditLogUseCase(repo).execute({
      workspaceId: 'ws-1',
      userRole: 'admin',
      format: 'csv',
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.data).toContain('Alice');
  });
});

describe('DownloadExportUseCase', () => {
  it('returns download payload for export', async () => {
    const repo = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue({
        id: 'ex-1',
        name: 'Campaign Export',
        format: 'csv',
        status: 'completed',
      }),
    } as unknown as IExportRepository;

    const res = await new DownloadExportUseCase(repo).execute({ exportId: 'ex-1', workspaceId: 'ws-1' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.filename).toContain('Campaign Export');
  });
});

describe('Admin batch2 use cases', () => {
  const adminOpsRepo = {
    getErrors: vi.fn().mockResolvedValue({ errors: [], total: 0, page: 1, totalPages: 0 }),
    getApiUsage: vi.fn().mockResolvedValue({
      totalRequests: 0,
      byEndpoint: [],
      period: { from: '2026-06-01', to: '2026-06-10' },
    }),
    getFeatureFlags: vi.fn().mockResolvedValue([]),
    updateFeatureFlag: vi.fn().mockResolvedValue({ key: 'beta', value: false, description: '', updatedAt: '2026-06-10' }),
  } as unknown as IAdminOpsRepository;

  it('returns admin errors stub', async () => {
    const res = await new ListAdminErrorsUseCase(adminOpsRepo).execute({ userRole: 'admin' });
    expect(res.success).toBe(true);
  });

  it('returns api usage stub', async () => {
    const res = await new GetAdminApiUsageUseCase(adminOpsRepo).execute({ userRole: 'admin' });
    expect(res.success).toBe(true);
  });

  it('updates feature flags stub', async () => {
    const res = await new UpdateFeatureFlagUseCase(adminOpsRepo).execute({ userRole: 'admin', key: 'beta', value: false });
    expect(res.success).toBe(true);
  });

  it('lists feature flags stub', async () => {
    const res = await new GetFeatureFlagsUseCase(adminOpsRepo).execute({ userRole: 'admin' });
    expect(res.success).toBe(true);
  });
});

describe('Ad update/duplicate use cases', () => {
  const ad = {
    id: 'ad-1',
    workspaceId: 'ws-1',
    campaignId: 'c-1',
    adsetId: 'as-1',
    platformAdId: 'p-1',
    name: 'Hero Ad',
    status: 'active',
    creativeType: 'image',
    headline: 'Buy now',
    body: null,
    callToAction: null,
    landingPageUrl: null,
    creativeUrl: null,
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: null,
    conversions: 0,
    cpa: null,
    roas: null,
    frequency: null,
    cpm: null,
    cpc: null,
    fatigueScore: null,
    fatigueStatus: 'healthy',
    platformData: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('updates an ad', async () => {
    const adRepo = {
      findByIdAndWorkspace: vi.fn().mockResolvedValue(ad),
      update: vi.fn().mockResolvedValue({ ...ad, name: 'New Name' }),
    } as unknown as IAdRepository;
    const res = await new UpdateAdUseCase(adRepo).execute({
      adId: 'ad-1',
      workspaceId: 'ws-1',
      userRole: 'editor',
      updates: { name: 'New Name' },
    });
    expect(res.success).toBe(true);
  });

  it('duplicates an ad', async () => {
    const adRepo = { findByIdAndWorkspace: vi.fn().mockResolvedValue(ad) } as unknown as IAdRepository;
    const res = await new DuplicateAdUseCase(adRepo).execute({
      adId: 'ad-1',
      workspaceId: 'ws-1',
      userRole: 'editor',
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.name).toContain('(Copy)');
  });
});

describe('Comment use cases', () => {
  const draftRepo = {
    findById: vi.fn().mockResolvedValue({ id: 'd-1', workspaceId: 'ws-1' }),
    findByIdAndWorkspace: vi.fn().mockResolvedValue({ id: 'd-1', workspaceId: 'ws-1' }),
  } as unknown as IDraftRepository;

  const commentRepo = {
    list: vi.fn().mockResolvedValue({ comments: [{ id: 'c-1' }], total: 1, page: 1, totalPages: 1 }),
    create: vi.fn().mockResolvedValue({ id: 'c-1', draftId: 'd-1', text: 'hello' }),
    findById: vi.fn().mockResolvedValue({ id: 'c-1', draftId: 'd-1', userId: 'u-1' }),
    delete: vi.fn().mockResolvedValue(true),
    findByDraft: vi.fn().mockResolvedValue([{ id: 'parent-1', draftId: 'd-1' }]),
  } as unknown as ICommentRepository;

  it('lists comments for a draft', async () => {
    const res = await new ListCommentsUseCase(commentRepo, draftRepo).execute({
      workspaceId: 'ws-1',
      draftId: 'd-1',
    });
    expect(res.success).toBe(true);
  });

  it('creates a comment', async () => {
    const res = await new CreateCommentUseCase(commentRepo, draftRepo).execute({
      workspaceId: 'ws-1',
      draftId: 'd-1',
      userId: 'u-1',
      text: 'Looks good',
    });
    expect(res.success).toBe(true);
  });

  it('gets a comment by id', async () => {
    const res = await new GetCommentByIdUseCase(commentRepo, draftRepo).execute({
      commentId: 'c-1',
      workspaceId: 'ws-1',
    });
    expect(res.success).toBe(true);
  });

  it('deletes a comment for author', async () => {
    const res = await new DeleteCommentUseCase(commentRepo, draftRepo).execute({
      commentId: 'c-1',
      workspaceId: 'ws-1',
      userId: 'u-1',
      userRole: 'viewer',
    });
    expect(res.success).toBe(true);
  });
});
