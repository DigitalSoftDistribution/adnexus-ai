import { describe, it, expect, vi } from 'vitest';
import { CreateCampaignUseCase } from './CreateCampaignUseCase';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IAuditLogger } from '../../../application/ports/IAuditLogger';
import type { Campaign } from '../../../domain/entities/Campaign';

describe('CreateCampaignUseCase', () => {
  const createMockRepo = (): ICampaignRepository => ({
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn(),
    findByPlatformCampaignId: vi.fn(),
    list: vi.fn(),
    getSummary: vi.fn(),
    create: vi.fn().mockImplementation((data) => Promise.resolve({
      id: 'camp-1',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Campaign)),
    update: vi.fn(),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    countByAdAccount: vi.fn(),
  });

  const createMockWorkspaceRepo = (): IWorkspaceRepository => ({
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByOwnerId: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getMembers: vi.fn(),
    getMember: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    getLimits: vi.fn(),
    checkLimit: vi.fn().mockResolvedValue(true),
  });

  const createMockEventBus = (): IEventBus => ({
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  });

  const createMockAuditLogger = (): IAuditLogger => ({
    log: vi.fn().mockResolvedValue(undefined),
    logBatch: vi.fn().mockResolvedValue(undefined),
  });

  it('creates campaign successfully for owner', async () => {
    const useCase = new CreateCampaignUseCase(
      createMockRepo(),
      createMockWorkspaceRepo(),
      createMockEventBus(),
      createMockAuditLogger(),
    );

    const result = await useCase.execute({
      workspaceId: 'ws-1',
      adAccountId: 'acc-1',
      platform: 'meta',
      name: 'Test Campaign',
      status: 'draft',
      userId: 'user-1',
      userRole: 'owner',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test Campaign');
      expect(result.data.platform).toBe('meta');
    }
  });

  it('rejects for viewer role', async () => {
    const useCase = new CreateCampaignUseCase(
      createMockRepo(),
      createMockWorkspaceRepo(),
      createMockEventBus(),
      createMockAuditLogger(),
    );

    const result = await useCase.execute({
      workspaceId: 'ws-1',
      adAccountId: 'acc-1',
      platform: 'meta',
      name: 'Test Campaign',
      status: 'draft',
      userId: 'user-1',
      userRole: 'viewer',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as any).statusCode).toBe(403);
    }
  });

  it('rejects when workspace limit reached', async () => {
    const workspaceRepo = createMockWorkspaceRepo();
    workspaceRepo.checkLimit = vi.fn().mockResolvedValue(false);

    const useCase = new CreateCampaignUseCase(
      createMockRepo(),
      workspaceRepo,
      createMockEventBus(),
      createMockAuditLogger(),
    );

    const result = await useCase.execute({
      workspaceId: 'ws-1',
      adAccountId: 'acc-1',
      platform: 'meta',
      name: 'Test Campaign',
      status: 'draft',
      userId: 'user-1',
      userRole: 'owner',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as any).code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects short campaign name', async () => {
    const useCase = new CreateCampaignUseCase(
      createMockRepo(),
      createMockWorkspaceRepo(),
      createMockEventBus(),
      createMockAuditLogger(),
    );

    const result = await useCase.execute({
      workspaceId: 'ws-1',
      adAccountId: 'acc-1',
      platform: 'meta',
      name: 'A',
      status: 'draft',
      userId: 'user-1',
      userRole: 'owner',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect((result.error as any).code).toBe('VALIDATION_ERROR');
    }
  });

  it('publishes event and logs audit on success', async () => {
    const eventBus = createMockEventBus();
    const auditLogger = createMockAuditLogger();

    const useCase = new CreateCampaignUseCase(
      createMockRepo(),
      createMockWorkspaceRepo(),
      eventBus,
      auditLogger,
    );

    await useCase.execute({
      workspaceId: 'ws-1',
      adAccountId: 'acc-1',
      platform: 'meta',
      name: 'Test Campaign',
      status: 'draft',
      userId: 'user-1',
      userRole: 'owner',
    });

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
  });
});
