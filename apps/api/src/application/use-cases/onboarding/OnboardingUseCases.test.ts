import { describe, expect, it, vi } from 'vitest';
import {
  CompleteOnboardingUseCase,
  GetOnboardingStatusUseCase,
} from './OnboardingUseCases';
import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { ICampaignRepository, CampaignSummary } from '../../../domain/repositories/ICampaignRepository';

const campaignSummary = (overrides: Partial<CampaignSummary> = {}): CampaignSummary => ({
  totalCampaigns: 0,
  activeCount: 0,
  pausedCount: 0,
  totalSpend: 0,
  totalImpressions: 0,
  totalClicks: 0,
  totalConversions: 0,
  avgCtr: 0,
  avgCpa: 0,
  avgRoas: 0,
  platformBreakdown: {},
  statusBreakdown: {},
  spendSeries: [],
  ...overrides,
});

function makeWorkspaceRepo(overrides: Partial<IWorkspaceRepository> = {}): IWorkspaceRepository {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByOwnerId: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getMembers: vi.fn().mockResolvedValue([{ id: 'member-1' }]),
    getMember: vi.fn(),
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    getLimits: vi.fn(),
    checkLimit: vi.fn(),
    getOnboarding: vi.fn().mockResolvedValue(null),
    setOnboardingStep: vi.fn(),
    completeOnboarding: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as IWorkspaceRepository;
}

function makeSettingsRepo(overrides: Partial<ISettingsRepository> = {}): ISettingsRepository {
  return {
    getWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getTeamMembers: vi.fn(),
    addTeamMember: vi.fn(),
    updateTeamMemberRole: vi.fn(),
    removeTeamMember: vi.fn(),
    getIntegrations: vi.fn().mockResolvedValue([]),
    getIntegration: vi.fn(),
    disconnectIntegration: vi.fn(),
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    getApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    ...overrides,
  } as ISettingsRepository;
}

function makeCampaignRepo(overrides: Partial<ICampaignRepository> = {}): ICampaignRepository {
  return {
    findById: vi.fn(),
    findByIdAndWorkspace: vi.fn(),
    findByPlatformCampaignId: vi.fn(),
    list: vi.fn(),
    getSummary: vi.fn().mockResolvedValue(campaignSummary()),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countByWorkspace: vi.fn(),
    countByAdAccount: vi.fn(),
    ...overrides,
  } as ICampaignRepository;
}

describe('OnboardingUseCases', () => {
  it('reports first-value steps from connected integrations and synced campaigns', async () => {
    const useCase = new GetOnboardingStatusUseCase(
      makeWorkspaceRepo({ getMembers: vi.fn().mockResolvedValue([{ id: 'owner' }, { id: 'member' }]) }),
      makeSettingsRepo({
        getIntegrations: vi.fn().mockResolvedValue([
          { id: 'int-1', platform: 'meta', status: 'connected' },
        ]),
      }),
      makeCampaignRepo({ getSummary: vi.fn().mockResolvedValue(campaignSummary({ totalCampaigns: 3 })) }),
    );

    const result = await useCase.execute({ workspaceId: 'ws-1', userRole: 'owner' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps).toEqual({
        connectPlatform: true,
        inviteTeam: true,
        firstCampaign: true,
      });
    }
  });

  it('blocks onboarding completion before connect and sync proof exists', async () => {
    const workspaceRepo = makeWorkspaceRepo();
    const useCase = new CompleteOnboardingUseCase(
      workspaceRepo,
      makeSettingsRepo({ getIntegrations: vi.fn().mockResolvedValue([]) }),
      makeCampaignRepo({ getSummary: vi.fn().mockResolvedValue(campaignSummary({ totalCampaigns: 0 })) }),
    );

    const result = await useCase.execute({ workspaceId: 'ws-1', userRole: 'owner' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/connecting an ad account/i);
    }
    expect(workspaceRepo.completeOnboarding).not.toHaveBeenCalled();
  });

  it('persists completion after a connected account and synced campaign exist', async () => {
    const workspaceRepo = makeWorkspaceRepo();
    const useCase = new CompleteOnboardingUseCase(
      workspaceRepo,
      makeSettingsRepo({
        getIntegrations: vi.fn().mockResolvedValue([
          { id: 'int-1', platform: 'meta', status: 'active' },
        ]),
      }),
      makeCampaignRepo({ getSummary: vi.fn().mockResolvedValue(campaignSummary({ totalCampaigns: 1 })) }),
    );

    const result = await useCase.execute({ workspaceId: 'ws-1', userRole: 'owner' });

    expect(result.success).toBe(true);
    expect(workspaceRepo.completeOnboarding).toHaveBeenCalledWith('ws-1');
  });
});
