import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IWorkspaceRepository } from '../../../domain/repositories/IWorkspaceRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import { CampaignCreatedEvent } from '../../../domain/events/DomainEvent';
import { Campaign, type CampaignStatus, type Platform, type CampaignObjective, type BudgetType } from '../../../domain/entities/Campaign';
import { Result, ok, err, ValidationError, ForbiddenError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface CreateCampaignInput {
  workspaceId: string;
  adAccountId: string;
  platform: Platform;
  name: string;
  status: CampaignStatus;
  objective?: CampaignObjective;
  budgetType?: BudgetType;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startDate?: string;
  endDate?: string;
  userId: string;
  userRole: string;
}

export class CreateCampaignUseCase {
  constructor(
    private campaignRepo: ICampaignRepository,
    private workspaceRepo: IWorkspaceRepository,
    private eventBus: IEventBus,
    private auditLogger: IAuditLogger,
  ) {}

  async execute(input: CreateCampaignInput): Promise<Result<Campaign>> {
    // Authorization check
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners, admins, and editors can create campaigns'));
    }

    // Validate workspace limit
    const withinLimit = await this.workspaceRepo.checkLimit(input.workspaceId, 'maxCampaigns');
    if (!withinLimit) {
      return err(new ValidationError('Campaign limit reached for this workspace'));
    }

    // Validate name
    if (!input.name || input.name.trim().length < 2) {
      return err(new ValidationError('Campaign name must be at least 2 characters'));
    }

    const campaign = await this.campaignRepo.create({
      workspaceId: input.workspaceId,
      adAccountId: input.adAccountId,
      platform: input.platform,
      platformCampaignId: null,
      name: input.name.trim(),
      status: input.status,
      objective: input.objective ?? null,
      budget: null,
      budgetType: input.budgetType ?? null,
      dailyBudget: input.dailyBudget ?? null,
      lifetimeBudget: input.lifetimeBudget ?? null,
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
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      platformData: null,
      leadFormId: null,
    });

    // Publish event
    await this.eventBus.publish(
      new CampaignCreatedEvent(campaign.id, campaign.workspaceId, campaign.platform, campaign.name),
    );

    // Audit log
    await this.auditLogger.log({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: `Campaign created: ${campaign.name}`,
      actionCategory: 'campaign_created',
      platform: campaign.platform,
      campaignId: campaign.id,
      entityType: 'campaign',
      entityId: campaign.id,
      metadata: { platform: campaign.platform, objective: campaign.objective },
      source: 'dashboard',
    });

    return ok(campaign);
  }
}
