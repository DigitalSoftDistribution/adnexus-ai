/**
 * Onboarding use-cases.
 *
 * Drives the in-app onboarding wizard: a status aggregate (connect platform,
 * invite team, create first campaign + the persisted completion flag) plus
 * step persistence and explicit completion.
 */

import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';
import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';

export interface OnboardingStatus {
  completed: boolean;
  completedAt: string | null;
  currentStep: string | null;
  steps: {
    connectPlatform: boolean;
    inviteTeam: boolean;
    firstCampaign: boolean;
  };
}

const READ_ROLES = ['owner', 'admin', 'editor', 'viewer'];
const WRITE_ROLES = ['owner', 'admin'];

export class GetOnboardingStatusUseCase {
  constructor(
    private workspaceRepo: IWorkspaceRepository,
    private settingsRepo: ISettingsRepository,
    private campaignRepo: ICampaignRepository,
  ) {}

  async execute(input: { workspaceId: string; userRole: string }): Promise<Result<OnboardingStatus>> {
    if (!READ_ROLES.includes(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));

    const [onboarding, integrations, members, summary] = await Promise.all([
      this.workspaceRepo.getOnboarding(input.workspaceId),
      this.settingsRepo.getIntegrations(input.workspaceId),
      this.workspaceRepo.getMembers(input.workspaceId),
      this.campaignRepo.getSummary(input.workspaceId),
    ]);

    return ok({
      completed: onboarding?.completed ?? false,
      completedAt: onboarding?.completedAt ?? null,
      currentStep: onboarding?.step ?? null,
      steps: {
        connectPlatform: integrations.some((i) => i.status === 'connected'),
        inviteTeam: members.length > 1,
        firstCampaign: summary.totalCampaigns > 0,
      },
    });
  }
}

export class SetOnboardingStepUseCase {
  constructor(private workspaceRepo: IWorkspaceRepository) {}
  async execute(input: {
    workspaceId: string;
    userRole: string;
    step: string;
  }): Promise<Result<{ step: string }>> {
    if (!WRITE_ROLES.includes(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    await this.workspaceRepo.setOnboardingStep(input.workspaceId, input.step);
    return ok({ step: input.step });
  }
}

export class CompleteOnboardingUseCase {
  constructor(private workspaceRepo: IWorkspaceRepository) {}
  async execute(input: { workspaceId: string; userRole: string }): Promise<Result<{ completed: true }>> {
    if (!WRITE_ROLES.includes(input.userRole)) return err(new ForbiddenError('Insufficient permissions'));
    await this.workspaceRepo.completeOnboarding(input.workspaceId);
    return ok({ completed: true });
  }
}
