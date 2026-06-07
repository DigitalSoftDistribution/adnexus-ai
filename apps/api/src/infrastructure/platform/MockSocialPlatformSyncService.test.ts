import { describe, expect, it } from 'vitest';
import { MockSocialPlatformSyncService } from './MockSocialPlatformSyncService';

describe('MockSocialPlatformSyncService', () => {
  it('is disabled by default so TikTok and Snap are not presented as live sync', async () => {
    const service = new MockSocialPlatformSyncService(false);

    expect(service.supports('tiktok')).toBe(false);
    expect(service.supports('snap')).toBe(false);
    await expect(
      service.syncAccount({ platform: 'tiktok', adAccountId: 'acc-1', platformAccountId: 'adv-1' }),
    ).resolves.toBeNull();
  });

  it('returns deterministic TikTok account sync fixtures when explicitly enabled', async () => {
    const service = new MockSocialPlatformSyncService(true);
    const result = await service.syncAccount({
      platform: 'tiktok',
      adAccountId: 'acc-1',
      platformAccountId: 'adv-1',
    });

    expect(service.supports('tiktok')).toBe(true);
    expect(result?.campaigns).toHaveLength(1);
    expect(result?.campaigns[0]).toMatchObject({
      platformCampaignId: 'tt_mock_campaign_001',
      status: 'paused',
      metrics: expect.objectContaining({ impressions: 12000, clicks: 480 }),
    });
    expect(result?.campaigns[0].adSets?.[0].ads[0]).toMatchObject({
      platformAdId: 'tt_mock_ad_001',
      creativeType: 'video',
    });
  });

  it('returns deterministic Snapchat account sync fixtures when explicitly enabled', async () => {
    const service = new MockSocialPlatformSyncService(true);
    const result = await service.syncAccount({
      platform: 'snap',
      adAccountId: 'acc-1',
      platformAccountId: 'snap-ad-account-1',
    });

    expect(service.supports('snap')).toBe(true);
    expect(result?.campaigns[0]).toMatchObject({
      platformCampaignId: 'snap_mock_campaign_001',
      status: 'paused',
      metrics: expect.objectContaining({ impressions: 9000, clicks: 315 }),
    });
  });
});
