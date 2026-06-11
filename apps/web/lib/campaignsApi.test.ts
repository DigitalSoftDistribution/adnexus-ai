import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, campaignsApi } from '@/src/lib/api';

describe('campaignsApi.list', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DEMO_MODE', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns mock campaigns only when VITE_DEMO_MODE is explicitly true', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    vi.useFakeTimers();

    const promise = campaignsApi.list();
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.data.some((campaign) => campaign.name === 'Summer Sale 2026')).toBe(true);
    vi.useRealTimers();
  });

  it('propagates API errors instead of falling back to mock data', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(
      new AxiosError('Service Unavailable', undefined, undefined, undefined, {
        status: 503,
        statusText: 'Service Unavailable',
        data: {},
        headers: {},
        config: {} as never,
      }),
    );

    await expect(campaignsApi.list()).rejects.toThrow();
  });

  it('calls the live API when demo mode is off even without VITE_API_URL', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: { data: [], total: 0, page: 1, limit: 20, totalPages: 0 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });

    await campaignsApi.list();

    expect(getSpy).toHaveBeenCalledWith(
      '/campaigns',
      expect.objectContaining({ params: expect.objectContaining({ page: 1, limit: 20 }) }),
    );
  });
});
