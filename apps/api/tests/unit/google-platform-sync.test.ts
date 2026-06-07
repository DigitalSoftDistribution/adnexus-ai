import { jest } from '@jest/globals';
import { GooglePlatformSyncService } from '../../src/infrastructure/platform/GooglePlatformSyncService';
import { query } from '../../src/infrastructure/database/connection';
import {
  fetchGoogleAdGroups,
  fetchGoogleAds,
  fetchGoogleCampaigns,
  fetchGoogleInsights,
  refreshGoogleToken,
} from '../../src/services/google-api';

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

jest.mock('../../src/services/google-api', () => ({
  fetchGoogleAdGroups: jest.fn(),
  fetchGoogleAds: jest.fn(),
  fetchGoogleCampaigns: jest.fn(),
  fetchGoogleInsights: jest.fn(),
  refreshGoogleToken: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockFetchCampaigns = fetchGoogleCampaigns as jest.MockedFunction<typeof fetchGoogleCampaigns>;
const mockFetchInsights = fetchGoogleInsights as jest.MockedFunction<typeof fetchGoogleInsights>;
const mockFetchAdGroups = fetchGoogleAdGroups as jest.MockedFunction<typeof fetchGoogleAdGroups>;
const mockFetchAds = fetchGoogleAds as jest.MockedFunction<typeof fetchGoogleAds>;
const mockRefreshToken = refreshGoogleToken as jest.MockedFunction<typeof refreshGoogleToken>;

describe('GooglePlatformSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({
      rows: [{ oauth_token: 'access-token', refresh_token: 'refresh-token', token_expires_at: new Date(Date.now() + 3600_000).toISOString() }],
      rowCount: 1,
    } as never);
    mockFetchCampaigns.mockResolvedValue([]);
    mockFetchInsights.mockResolvedValue([]);
    mockFetchAdGroups.mockResolvedValue([]);
    mockFetchAds.mockResolvedValue([]);
    mockRefreshToken.mockResolvedValue({ accessToken: 'new-access-token', expiresAt: new Date(Date.now() + 3600_000) });
  });

  it('supports Google and imports campaigns, metrics, ad groups, and ads', async () => {
    mockFetchCampaigns.mockResolvedValue([
      {
        resource_name: 'customers/1234567890/campaigns/111',
        id: '111',
        name: 'Search Growth',
        status: 'ENABLED',
        advertising_channel_type: 'SEARCH',
        campaign_budget: '25000000',
        start_date: '20260601',
        customer_id: '1234567890',
      },
    ]);
    mockFetchInsights.mockResolvedValue([
      {
        campaign_id: '111',
        campaign_name: 'Search Growth',
        status: 'ENABLED',
        advertising_channel_type: 'SEARCH',
        metrics_clicks: '40',
        metrics_impressions: '1000',
        metrics_ctr: '4',
        metrics_average_cpc: '500000',
        metrics_cost_micros: '20000000',
        metrics_conversions: '5',
        metrics_conversions_value: '120000000',
        metrics_view_through_conversions: '1',
        campaign_start_date: '20260601',
      },
    ]);
    mockFetchAdGroups.mockResolvedValue([
      {
        resource_name: 'customers/1234567890/adGroups/222',
        id: '222',
        name: 'Core keywords',
        status: 'ENABLED',
        campaign: 'customers/1234567890/campaigns/111',
        cpc_bid_micros: '1000000',
      },
    ]);
    mockFetchAds.mockResolvedValue([
      {
        resource_name: 'customers/1234567890/adGroupAds/222~333',
        id: '333',
        name: 'RSA 1',
        status: 'ENABLED',
        ad_group: 'customers/1234567890/adGroups/222',
        ad: {
          id: '333',
          name: 'RSA 1',
          type: 'RESPONSIVE_SEARCH_AD',
          final_urls: ['https://example.com'],
          responsive_search_ad: { headlines: [{ text: 'Buy now' }] },
        },
      },
    ]);

    const service = new GooglePlatformSyncService();
    const result = await service.syncAccount({
      platform: 'google',
      adAccountId: 'account-uuid',
      platformAccountId: '1234567890',
    });

    expect(service.supports('google')).toBe(true);
    expect(result?.errors).toEqual([]);
    expect(result?.campaigns).toHaveLength(1);
    expect(result?.campaigns[0]).toMatchObject({
      platformCampaignId: '111',
      name: 'Search Growth',
      status: 'active',
      objective: 'sales',
      dailyBudget: null,
      metrics: {
        spend: 20,
        impressions: 1000,
        clicks: 40,
        conversions: 5,
        roas: 6,
      },
      adSets: [
        {
          platformAdSetId: '222',
          name: 'Core keywords',
          status: 'active',
          ads: [
            {
              platformAdId: '333',
              name: 'RSA 1',
              status: 'active',
              creativeType: 'RESPONSIVE_SEARCH_AD',
              creativeUrl: 'https://example.com',
              creativeText: 'Buy now',
            },
          ],
        },
      ],
    });
    expect(mockFetchCampaigns).toHaveBeenCalledWith('1234567890', 'access-token', { status: 'all' });
  });

  it('refreshes expired Google tokens before platform calls', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ oauth_token: 'old-token', refresh_token: 'refresh-token', token_expires_at: new Date(Date.now() - 1000).toISOString() }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const service = new GooglePlatformSyncService();
    await service.syncAccount({
      platform: 'google',
      adAccountId: 'account-uuid',
      platformAccountId: '1234567890',
    });

    expect(mockRefreshToken).toHaveBeenCalledWith('refresh-token');
    expect(mockFetchCampaigns).toHaveBeenCalledWith('1234567890', 'new-access-token', { status: 'all' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE ad_accounts'),
      expect.arrayContaining(['account-uuid', 'new-access-token']),
    );
  });
});
