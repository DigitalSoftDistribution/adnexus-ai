import type { IDraftRepository } from '../../../domain/repositories/IDraftRepository';
import type { IEventBus } from '../../../domain/events/EventBus';
import { DraftCreatedEvent } from '../../../domain/events/DomainEvent';
import type { Draft, DraftType, ActorType } from '../../../domain/entities/Draft';
import type { Platform } from '../../../domain/entities/Campaign';
import { Result, ok, err, ValidationError, ForbiddenError } from '../../../domain/value-objects/Result';
import type { IAuditLogger } from '../../ports/IAuditLogger';

export interface CreateDraftInput {
  workspaceId: string;
  platform: Platform | 'all';
  campaignId?: string;
  adsetId?: string;
  adId?: string;
  draftType: DraftType;
  changeSummary: string;
  changeDetail: Record<string, unknown>;
  aiReasoning?: string;
  impactEstimate?: string;
  actorType: ActorType;
  actorId?: string;
  actorName?: string;
  ruleId?: string;
  userRole: string;
}

export class CreateDraftUseCase {
  constructor(
    private draftRepo: IDraftRepository,
    private eventBus: IEventBus,
    private auditLogger: IAuditLogger,
  ) {}

  async execute(input: CreateDraftInput): Promise<Result<Draft>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Only owners, admins, and editors can create drafts'));
    }

    if (!input.changeSummary || input.changeSummary.trim().length < 5) {
      return err(new ValidationError('Change summary must be at least 5 characters'));
    }

    const draft = await this.draftRepo.create({
      workspaceId: input.workspaceId,
      platform: input.platform,
      campaignId: input.campaignId ?? null,
      adsetId: input.adsetId ?? null,
      adId: input.adId ?? null,
      draftType: input.draftType,
      changeSummary: input.changeSummary.trim(),
      changeDetail: input.changeDetail,
      aiReasoning: input.aiReasoning ?? null,
      impactEstimate: input.impactEstimate ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      ruleId: input.ruleId ?? null,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      executedAt: null,
    });

    await this.eventBus.publish(
      new DraftCreatedEvent(draft.id, draft.workspaceId, draft.draftType, draft.actorType),
    );

    await this.auditLogger.log({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      actorId: input.actorId,
      actorName: input.actorName,
      action: `Draft created: ${draft.changeSummary}`,
      actionCategory: 'draft_created',
      campaignId: input.campaignId,
      entityType: 'draft',
      entityId: draft.id,
      metadata: { draftType: draft.draftType, changeDetail: draft.changeDetail },
      source: input.actorType === 'ai' ? 'ai_agent' : 'dashboard',
    });

    return ok(draft);
  }
}
