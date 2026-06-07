import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditApi } from '@/src/lib/auditApi';

describe('auditApi', () => {
  beforeEach(() => {
    localStorage.setItem('adnexus_token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('lists audit entries through authenticated /api/v2 fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          entries: [{ id: 'audit-1', created_at: '2026-06-07T00:00:00Z', actor_type: 'user', actor_id: null, actor_name: 'Ada', action: 'login', action_category: 'login', platform: null, campaign_id: null, details: null, source: null, ip_address: null }],
          total: 1,
          page: 2,
          limit: 10,
          totalPages: 1,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await auditApi.list({ page: 2, limit: 10, actorType: 'user', actionCategory: 'login' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v2/audit-log?page=2&limit=10&actor_type=user&action_category=login',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('exports CSV from real audit entries instead of fabricated mock data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            entries: [{ id: 'audit-1', created_at: '2026-06-07T00:00:00Z', actor_type: 'system', actor_id: null, actor_name: null, action: 'rule_triggered', action_category: 'rule_triggered', platform: 'meta', campaign_id: 'camp-1', details: null, source: 'worker', ip_address: null }],
            total: 1,
          },
        }),
      }),
    );

    const csv = await auditApi.export({});

    expect(csv).toContain('id,created_at,actor_type');
    expect(csv).toContain('"audit-1"');
    expect(csv).toContain('"rule_triggered"');
  });
});
