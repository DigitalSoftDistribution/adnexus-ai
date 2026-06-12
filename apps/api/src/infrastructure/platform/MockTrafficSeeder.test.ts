import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MockTrafficSeeder,
  MOCK_TRAFFIC_ALL_PLATFORMS,
  MOCK_TRAFFIC_COUNTS_PER_PLATFORM,
} from './MockTrafficSeeder';

vi.mock('../database/connection', () => ({
  query: vi.fn(),
}));

vi.mock('./syncPersistence', () => ({
  writeCampaignMetrics: vi.fn().mockResolvedValue(undefined),
}));

import { query } from '../database/connection';
import { writeCampaignMetrics } from './syncPersistence';

const mockedQuery = vi.mocked(query);
const mockedWriteMetrics = vi.mocked(writeCampaignMetrics);

function mockResult(rows: Record<string, unknown>[] = [], rowCount = rows.length) {
  return {
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

function idSequence(ids: string[]): void {
  let index = 0;
  mockedQuery.mockImplementation(async (sql: string) => {
    const text = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    if (text.startsWith('select id from ad_accounts')) {
      return mockResult();
    }
    if (text.startsWith('insert into ad_accounts')) {
      return mockResult([{ id: ids[index++] ?? `acc-${index}` }], 1);
    }
    if (text.startsWith('select id from campaigns')) {
      return mockResult();
    }
    if (text.startsWith('insert into campaigns')) {
      return mockResult([{ id: ids[index++] ?? `cmp-${index}` }], 1);
    }
    if (text.startsWith('select id from adsets')) {
      return mockResult();
    }
    if (text.startsWith('insert into adsets')) {
      return mockResult([{ id: ids[index++] ?? `as-${index}` }], 1);
    }
    if (text.startsWith('select id from ads')) {
      return mockResult();
    }
    if (text.startsWith('insert into ads') || text.startsWith('insert into sync_jobs')) {
      return mockResult([], 1);
    }
    return mockResult();
  });
}

describe('MockTrafficSeeder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds all four wiremock platforms with campaigns, ad sets, ads, and metrics', async () => {
    idSequence(['acc-meta', 'cmp-a', 'cmp-b']);

    const result = await new MockTrafficSeeder().seed({
      workspaceId: 'ws-qa',
      userId: 'user-qa',
      platforms: MOCK_TRAFFIC_ALL_PLATFORMS,
      variant: 'baseline',
    });

    expect(result.accountsSeeded).toBe(4);
    expect(result.platforms).toEqual(MOCK_TRAFFIC_ALL_PLATFORMS);
    expect(result.campaignsSeeded).toBe(MOCK_TRAFFIC_ALL_PLATFORMS.length * MOCK_TRAFFIC_COUNTS_PER_PLATFORM.campaigns);
    expect(result.adSetsSeeded).toBe(MOCK_TRAFFIC_ALL_PLATFORMS.length * MOCK_TRAFFIC_COUNTS_PER_PLATFORM.adSets);
    expect(result.adsSeeded).toBe(MOCK_TRAFFIC_ALL_PLATFORMS.length * MOCK_TRAFFIC_COUNTS_PER_PLATFORM.ads);
    expect(result.metricsSeeded).toBe(result.campaignsSeeded * 14);
    expect(result.campaignStatuses).toEqual(['active', 'paused']);
    expect(mockedWriteMetrics).toHaveBeenCalled();
  });

  it('tags seeded rows with qa-mock-traffic-2026-06-07 metadata', async () => {
    idSequence(['acc-meta']);

    await new MockTrafficSeeder().seed({
      workspaceId: 'ws-qa',
      userId: 'user-qa',
      platforms: ['meta'],
      variant: 'baseline',
    });

    const accountInsert = mockedQuery.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO ad_accounts'),
    );
    expect(String(accountInsert?.[1]?.[4])).toContain('qa-mock-traffic-2026-06-07');

    const adInsert = mockedQuery.mock.calls.find(([sql]) =>
      /insert into ads\s*\(/i.test(String(sql)),
    );
    expect(adInsert?.[1]?.[6]).toBe('active');
    expect(adInsert?.[1]?.[10]).toBe(22);
    expect(adInsert?.[1]?.[11]).toBe('healthy');
  });

  it('persists archived-like ads as paused with critical fatigue', async () => {
    idSequence(['acc-meta']);

    await new MockTrafficSeeder().seed({
      workspaceId: 'ws-qa',
      userId: 'user-qa',
      platforms: ['meta'],
      variant: 'baseline',
    });

    const adInserts = mockedQuery.mock.calls.filter(([sql]) =>
      /insert into ads\s*\(/i.test(String(sql)),
    );
    expect(adInserts).toHaveLength(12);

    const archivedLike = adInserts.filter(([, params]) =>
      String(params?.[5]).includes('(archived)'),
    );
    expect(archivedLike).toHaveLength(4);
    for (const [, params] of archivedLike) {
      expect(params?.[6]).toBe('paused');
      expect(params?.[10]).toBe(85);
      expect(params?.[11]).toBe('critical');
    }
  });
});
