import type {
  IPlatformWriteService,
  PlatformWriteContext,
  PlatformWriteResult,
} from '../../application/ports/IPlatformWriteService';
import type { Platform } from '../../domain/entities/Campaign';
import { updateMetaCampaign } from '../../services/meta-api';
import { resolveMetaToken } from './metaToken';
import { getModuleLogger } from '../../lib/logger';

const log = getModuleLogger('meta-write');

/**
 * Mutates campaign state on Meta (pause/resume) using a per-account token.
 *
 * Only pause/resume are exposed for v1 — these are the safe, reversible writes.
 * Budget/creative/structural writes are intentionally out of scope until they
 * route through the draft-approval workflow.
 */
export class MetaPlatformWriteService implements IPlatformWriteService {
  supports(platform: Platform): boolean {
    return platform === 'meta';
  }

  private async setStatus(
    ctx: PlatformWriteContext,
    status: 'PAUSED' | 'ACTIVE',
  ): Promise<PlatformWriteResult> {
    if (!this.supports(ctx.platform)) return { applied: false, reason: 'unsupported' };
    if (!ctx.platformCampaignId) return { applied: false, reason: 'no_platform_id' };

    const token = await resolveMetaToken(ctx.adAccountId);
    if (!token) return { applied: false, reason: 'not_connected' };

    try {
      await updateMetaCampaign(ctx.platformCampaignId, token, { status });
      return { applied: true };
    } catch (e) {
      const message = (e as Error).message;
      log.warn({ campaignId: ctx.platformCampaignId, status, err: message }, 'Meta status write failed');
      return { applied: false, reason: 'platform_error', message };
    }
  }

  pauseCampaign(ctx: PlatformWriteContext): Promise<PlatformWriteResult> {
    return this.setStatus(ctx, 'PAUSED');
  }

  resumeCampaign(ctx: PlatformWriteContext): Promise<PlatformWriteResult> {
    return this.setStatus(ctx, 'ACTIVE');
  }
}
