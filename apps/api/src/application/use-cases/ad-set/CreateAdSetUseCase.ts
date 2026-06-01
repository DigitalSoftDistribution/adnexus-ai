import type { IAdSetRepository } from '../../../domain/repositories/IAdSetRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import type { AdSet } from '../../../domain/entities/AdSet';
import { Result, ok, err } from '../../../domain/value-objects/Result';
import { ForbiddenError } from '../../../domain/value-objects/Result';

interface CreateAdSetInput {
  campaignId: string;
  name: string;
  status?: string;
  budget?: number;
  budgetType?: string;
  bidStrategy?: string;
  bidAmount?: number;
  targeting?: Record<string, unknown>;
  userId: string;
  userRole: string;
}

export class CreateAdSetUseCase {
  constructor(
    private readonly adSetRepository: IAdSetRepository,
    private readonly eventBus: IEventBus,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(input: CreateAdSetInput): Promise<Result<AdSet>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const adSet = await this.adSetRepository.create({
      campaignId: input.campaignId,
      platformAdSetId: null,
      name: input.name,
      status: (input.status as AdSet['status']) ?? 'draft',
      budget: input.budget ?? null,
      budgetType: (input.budgetType as AdSet['budgetType']) ?? null,
      bidStrategy: (input.bidStrategy as AdSet['bidStrategy']) ?? null,
      bidAmount: input.bidAmount ?? null,
      targeting: input.targeting ?? null,
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: null,
      conversions: 0,
      cpa: null,
      roas: null,
      cpm: null,
      cpc: null,
      frequency: null,
    });

    await this.auditLogger.log({
      workspaceId: null,
      userId: input.userId,
      action: `Ad set created: ${adSet.name}`,
      actionCategory: 'ad_set_created',
      campaignId: input.campaignId,
      entityType: 'ad_set',
      entityId: adSet.id,
      metadata: { campaignId: input.campaignId, name: input.name },
      source: 'dashboard',
    });

    return ok(adSet);
  }
}
