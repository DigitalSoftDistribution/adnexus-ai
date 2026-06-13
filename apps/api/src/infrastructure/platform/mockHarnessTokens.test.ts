import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  harnessTokenForSeedPlatform,
  resolveMockHarnessToken,
  WIREMOCK_HARNESS_ACCOUNT_IDS,
  WIREMOCK_HARNESS_TOKENS,
} from './mockHarnessTokens';

vi.mock('../database/connection', () => ({
  query: vi.fn(),
}));

import { query } from '../database/connection';

const mockedQuery = vi.mocked(query);

describe('mockHarnessTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MOCK_PLATFORM_SYNC;
  });

  it('exposes WireMock-compatible account IDs and tokens', () => {
    expect(WIREMOCK_HARNESS_ACCOUNT_IDS.meta).toBe('act_1234567890');
    expect(WIREMOCK_HARNESS_ACCOUNT_IDS.google).toBe('1234567890');
    expect(harnessTokenForSeedPlatform('meta')).toBe(WIREMOCK_HARNESS_TOKENS.meta);
    expect(harnessTokenForSeedPlatform('tiktok')).toBeNull();
  });

  it('resolveMockHarnessToken returns token for mock-traffic accounts when enabled', async () => {
    process.env.MOCK_PLATFORM_SYNC = 'true';
    mockedQuery.mockResolvedValueOnce({
      rows: [{ metadata: { mockTraffic: true, seedTag: 'qa-mock-traffic-2026-06-07' } }],
      rowCount: 1,
    } as never);

    const token = await resolveMockHarnessToken('acc-1', 'meta');
    expect(token).toBe(WIREMOCK_HARNESS_TOKENS.meta);
  });

  it('resolveMockHarnessToken returns null when MOCK_PLATFORM_SYNC is off', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ metadata: { mockTraffic: true } }],
      rowCount: 1,
    } as never);

    const token = await resolveMockHarnessToken('acc-1', 'meta');
    expect(token).toBeNull();
    expect(mockedQuery).not.toHaveBeenCalled();
  });
});
