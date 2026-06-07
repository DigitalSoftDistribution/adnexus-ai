import { describe, expect, it, vi } from 'vitest';
import { CompositePlatformSyncService } from './CompositePlatformSyncService';
import type { IPlatformSyncService } from '../../application/ports/IPlatformSyncService';

const makeService = (platform: 'meta' | 'tiktok'): IPlatformSyncService => ({
  supports: vi.fn((candidate) => candidate === platform),
  syncCampaign: vi.fn().mockResolvedValue({
    spend: 1,
    impressions: 1,
    clicks: 1,
    ctr: 1,
    conversions: 1,
    cpa: 1,
    roas: 1,
    frequency: 1,
    cpm: 1,
    cpc: 1,
  }),
  syncAccount: vi.fn().mockResolvedValue({ campaigns: [], errors: [] }),
});

describe('CompositePlatformSyncService', () => {
  it('routes sync calls to the service that supports the requested platform', async () => {
    const meta = makeService('meta');
    const tiktok = makeService('tiktok');
    const composite = new CompositePlatformSyncService([meta, tiktok]);

    await composite.syncAccount({ platform: 'tiktok', adAccountId: 'acc-1', platformAccountId: 'adv-1' });

    expect(meta.syncAccount).not.toHaveBeenCalled();
    expect(tiktok.syncAccount).toHaveBeenCalledOnce();
  });

  it('returns null for unsupported platforms', async () => {
    const composite = new CompositePlatformSyncService([makeService('meta')]);

    expect(composite.supports('snap')).toBe(false);
    await expect(
      composite.syncCampaign({ platform: 'snap', adAccountId: 'acc-1', platformCampaignId: 'camp-1' }),
    ).resolves.toBeNull();
  });
});
