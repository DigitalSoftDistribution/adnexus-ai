import { query } from '../database/connection';
import type { AdAccountPlatform } from '../../domain/entities/AdAccount';

/** WireMock stub tokens — see apps/api/tests/wiremock/mappings/adnexus-v2-platforms.json */
export const WIREMOCK_HARNESS_TOKENS: Record<'meta' | 'google', string> = {
  meta: 'EAAMockAccessToken1234567890',
  google: 'ya29.MockGoogleAccessToken1234567890',
};

/** WireMock-compatible platform account IDs for live sync QA. */
export const WIREMOCK_HARNESS_ACCOUNT_IDS: Record<'meta' | 'google', string> = {
  meta: 'act_1234567890',
  google: '1234567890',
};

export function isMockPlatformSyncEnabled(): boolean {
  return process.env.MOCK_PLATFORM_SYNC === 'true';
}

export function harnessTokenForPlatform(platform: string): string | null {
  if (platform === 'meta' || platform === 'google') {
    return WIREMOCK_HARNESS_TOKENS[platform];
  }
  return null;
}

/**
 * When MOCK_PLATFORM_SYNC=true, return a WireMock harness token for ad accounts
 * seeded by the mock-traffic harness (metadata.mockTraffic === true).
 */
export async function resolveMockHarnessToken(
  adAccountId: string,
  platform: string,
): Promise<string | null> {
  if (!isMockPlatformSyncEnabled()) return null;

  const token = harnessTokenForPlatform(platform);
  if (!token) return null;

  const { rows } = await query<{ metadata: Record<string, unknown> | string | null }>(
    `SELECT metadata FROM ad_accounts WHERE id = $1 LIMIT 1`,
    [adAccountId],
  );
  const raw = rows[0]?.metadata;
  const metadata =
    typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : (raw ?? {});

  return metadata.mockTraffic === true ? token : null;
}

export function harnessTokenForSeedPlatform(platform: AdAccountPlatform): string | null {
  if (platform === 'meta' || platform === 'google') {
    return WIREMOCK_HARNESS_TOKENS[platform];
  }
  return null;
}
