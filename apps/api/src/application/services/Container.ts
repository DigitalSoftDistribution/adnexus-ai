/**
 * Dependency Injection Container
 *
 * Simple manual DI container for wiring together Clean Architecture layers.
 * No reflection, no decorators — just explicit constructor injection.
 */

import type { ICampaignRepository } from '../../domain/repositories/ICampaignRepository';
import type { IDraftRepository } from '../../domain/repositories/IDraftRepository';
import type { IWorkspaceRepository } from '../../domain/repositories/IWorkspaceRepository';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IEventBus } from '../../domain/events/EventBus';
import type { IAuditLogger } from '../ports/IAuditLogger';
import type { INotificationService } from '../ports/INotificationService';

import { CreateCampaignUseCase } from '../use-cases/campaign/CreateCampaignUseCase';
import { ListCampaignsUseCase } from '../use-cases/campaign/ListCampaignsUseCase';
import { GetCampaignSummaryUseCase } from '../use-cases/campaign/GetCampaignSummaryUseCase';
import { CreateDraftUseCase } from '../use-cases/draft/CreateDraftUseCase';
import { ApproveDraftUseCase } from '../use-cases/draft/ApproveDraftUseCase';
import { GetWorkspaceUseCase } from '../use-cases/workspace/GetWorkspaceUseCase';
import { InviteMemberUseCase } from '../use-cases/workspace/InviteMemberUseCase';

export interface ContainerConfig {
  campaignRepository: ICampaignRepository;
  draftRepository: IDraftRepository;
  workspaceRepository: IWorkspaceRepository;
  userRepository: IUserRepository;
  eventBus: IEventBus;
  auditLogger: IAuditLogger;
  notificationService: INotificationService;
}

export class Container {
  // Use cases
  readonly createCampaign: CreateCampaignUseCase;
  readonly listCampaigns: ListCampaignsUseCase;
  readonly getCampaignSummary: GetCampaignSummaryUseCase;
  readonly createDraft: CreateDraftUseCase;
  readonly approveDraft: ApproveDraftUseCase;
  readonly getWorkspace: GetWorkspaceUseCase;
  readonly inviteMember: InviteMemberUseCase;

  constructor(config: ContainerConfig) {
    this.createCampaign = new CreateCampaignUseCase(
      config.campaignRepository,
      config.workspaceRepository,
      config.eventBus,
      config.auditLogger,
    );

    this.listCampaigns = new ListCampaignsUseCase(config.campaignRepository);

    this.getCampaignSummary = new GetCampaignSummaryUseCase(config.campaignRepository);

    this.createDraft = new CreateDraftUseCase(
      config.draftRepository,
      config.eventBus,
      config.auditLogger,
    );

    this.approveDraft = new ApproveDraftUseCase(
      config.draftRepository,
      config.eventBus,
      config.auditLogger,
    );

    this.getWorkspace = new GetWorkspaceUseCase(config.workspaceRepository);

    this.inviteMember = new InviteMemberUseCase(
      config.workspaceRepository,
      config.userRepository,
      config.eventBus,
      config.auditLogger,
    );
  }
}
