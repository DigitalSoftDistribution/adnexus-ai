import { describe, it, expect } from 'vitest';
import type { Platform } from '../../domain/entities/Campaign';

// Minimal mapToAd platform resolution — mirrors AdRepository private mapper.
function resolveAdPlatform(row: {
  campaign?: { platform?: Platform };
  adset?: { platform?: Platform };
  adAccount?: { platform?: Platform };
}): Platform | null {
  return (row.campaign?.platform ?? row.adset?.platform ?? row.adAccount?.platform ?? null) as Platform | null;
}

describe('Ad list platform field (SB-3220)', () => {
  it('resolves platform from campaign, then adset, then ad account', () => {
    expect(resolveAdPlatform({
      campaign: { platform: 'meta' },
      adset: { platform: 'google' },
      adAccount: { platform: 'snap' },
    })).toBe('meta');

    expect(resolveAdPlatform({
      adset: { platform: 'tiktok' },
      adAccount: { platform: 'snap' },
    })).toBe('tiktok');

    expect(resolveAdPlatform({ adAccount: { platform: 'google' } })).toBe('google');
    expect(resolveAdPlatform({})).toBeNull();
  });
});
