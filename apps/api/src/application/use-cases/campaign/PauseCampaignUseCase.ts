import type { ICampaignRepository } from '../../../domain/repositories/ICampaignRepository';
import type { IPlatformWriteService } from '../../ports/IPlatformWriteService';
import type { IAuditLogger } from '../../ports/IAuditLogger';
import type { Campaign } from '../../../domain/entities/Campaign';
import { Result, ok, err, ForbiddenError, NotFoundError, DomainError } from '../../../domain/value-objects/Result';

export interface PauseCampaignInput {
  campaignId: string;
  workspaceId: string;
  userRole: string;
  userId?: string;
}

/** Raised when the ad platform rejected a write (pause/resume). */
export class PlatformWriteError extends DomainError {
  constructor(message: string) {
    super(message, 'PLATFORM_WRITE_FAILED', 502);
    this.name = 'PlatformWriteError';
    Object.setPrototypeOf(this, PlatformWriteError.prototype);
  }
}

export class PauseCampaignUseCase {
  constructor(
    private campaignRepo: ICampaignRepository,
    /** Optional: when present, the pause is also applied on the ad platform. */
    private platformWrite?: IPlatformWriteService,
    /** Optional: when present, records an audit entry for the pause. */
    private auditLogger?: IAuditLogger,
  ) {}

  async execute(input: PauseCampaignInput): Promise<Result<Campaign>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to pause campaigns'));
    }

    const campaign = await this.campaignRepo.findByIdAndWorkspace(input.campaignId, input.workspaceId);
    if (!campaign) {
      return err(new NotFoundError('Campaign'));
    }

    // Apply on the platform first so we never report a paused campaign that is
    // still spending live. A hard platform rejection aborts before the local
    // write; "not connected / no platform id" falls through to a local-only
    // update (campaign exists only in AdNexus).
    let platformApplied = false;
    if (
      this.platformWrite?.supports(campaign.platform) &&
      campaign.platformCampaignId &&
      campaign.adAccountId
    ) {
      const result = await this.platformWrite.pauseCampaign({
        platform: campaign.platform,
        platformCampaignId: campaign.platformCampaignId,
        adAccountId: campaign.adAccountId,
      });
      if (!result.applied && result.reason === 'platform_error') {
        return err(new PlatformWriteError(`Failed to pause on platform: ${result.message}`));
      }
      platformApplied = result.applied;
    }

    const updated = await this.campaignRepo.update(input.campaignId, { status: 'paused' });
    if (!updated) {
      return err(new NotFoundError('Campaign'));
    }

    await this.auditLogger?.log({
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      action: `Campaign paused: ${campaign.name}`,
      actionCategory: 'campaign_paused',
      platform: campaign.platform,
      campaignId: campaign.id,
      entityType: 'campaign',
      entityId: campaign.id,
      metadata: { platformApplied, platformCampaignId: campaign.platformCampaignId },
      source: 'dashboard',
    });

    return ok(updated);
  }
}
