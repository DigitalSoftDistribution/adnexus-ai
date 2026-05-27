import { jest } from '@jest/globals';
import axios from 'axios';
import {
  getMetaOAuthUrl,
  exchangeMetaCode,
  refreshMetaToken,
  getMetaAdAccounts,
  getMetaCampaigns,
  getMetaCampaign,
  createMetaCampaign,
  updateMetaCampaign,
  getMetaInsights,
  normalizeMetaCampaign,
} from '../../src/services/meta-api';
import { PlatformError } from '../../src/lib/errors';
import { mockMetaCampaignResponse, mockMetaInsightsResponse, mockMetaTokenResponse } from '../fixtures/data';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Suite: Campaign Normalization ───────────────────────────────

describe('normalizeMetaCampaign', () => {
  it('should normalize an ACTIVE campaign correctly', () => {
    // Arrange
    const metaCampaign = { ...mockMetaCampaignResponse };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.platform).toBe('meta');
    expect(result.status).toBe('active');
    expect(result.name).toBe('High Spend Campaign');
    expect(result.objective).toBe('CONVERSIONS');
    expect(result.daily_budget).toBe(500); // 50000 cents / 100
    expect(result.budget_type).toBe('daily');
    expect(result.platform_campaign_id).toBe(metaCampaign.id);
  });

  it('should normalize a PAUSED campaign correctly', () => {
    // Arrange
    const metaCampaign = { ...mockMetaCampaignResponse, status: 'PAUSED' };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.status).toBe('paused');
  });

  it('should normalize an ARCHIVED campaign correctly', () => {
    // Arrange
    const metaCampaign = { ...mockMetaCampaignResponse, status: 'ARCHIVED' };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.status).toBe('ended');
  });

  it('should handle lifetime_budget correctly', () => {
    // Arrange
    const metaCampaign = {
      ...mockMetaCampaignResponse,
      daily_budget: undefined,
      lifetime_budget: '1000000',
    };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.daily_budget).toBeUndefined();
    expect(result.lifetime_budget).toBe(10000); // 1000000 / 100
    expect(result.budget_type).toBe('lifetime');
  });

  it('should handle undefined budget fields', () => {
    // Arrange
    const metaCampaign = {
      ...mockMetaCampaignResponse,
      daily_budget: undefined,
      lifetime_budget: undefined,
    };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.daily_budget).toBeUndefined();
    expect(result.lifetime_budget).toBeUndefined();
    expect(result.budget_type).toBeUndefined();
  });

  it('should parse numeric budget strings correctly', () => {
    // Arrange
    const metaCampaign = {
      ...mockMetaCampaignResponse,
      daily_budget: '25000',
    };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.daily_budget).toBe(250); // 25000 / 100
  });

  it('should initialize metrics to zero', () => {
    // Arrange
    const metaCampaign = { ...mockMetaCampaignResponse };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.spend).toBe(0);
    expect(result.impressions).toBe(0);
    expect(result.clicks).toBe(0);
    expect(result.ctr).toBe(0);
    expect(result.conversions).toBe(0);
    expect(result.cpa).toBe(0);
    expect(result.roas).toBe(0);
    expect(result.frequency).toBe(0);
  });

  it('should preserve platform_data', () => {
    // Arrange
    const metaCampaign = { ...mockMetaCampaignResponse, extra_field: 'test' };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.platform_data).toBeDefined();
  });

  it('should parse dates correctly', () => {
    // Arrange
    const metaCampaign = {
      ...mockMetaCampaignResponse,
      start_time: '2024-03-15T08:00:00+0000',
      stop_time: '2024-06-30T23:59:59+0000',
    };

    // Act
    const result = normalizeMetaCampaign(metaCampaign);

    // Assert
    expect(result.start_date).toBe('2024-03-15');
    expect(result.end_date).toBe('2024-06-30');
  });
});

// ─── Suite: Insight Aggregation ──────────────────────────────────

describe('getMetaInsights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return aggregated insights for a campaign', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: mockMetaInsightsResponse });

    // Act
    const result = await getMetaInsights(
      '12020000000000001',
      'mock-token',
      '2024-06-01',
      '2024-06-30',
    );

    // Assert
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('should return empty object when no insights data', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    // Act
    const result = await getMetaInsights(
      '12020000000000001',
      'mock-token',
      '2024-06-01',
      '2024-06-30',
    );

    // Assert
    expect(result).toEqual({});
  });

  it('should include breakdown parameter when provided', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: mockMetaInsightsResponse });

    // Act
    await getMetaInsights(
      '12020000000000001',
      'mock-token',
      '2024-06-01',
      '2024-06-30',
      'age,gender',
    );

    // Assert
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    const callArgs = mockedAxios.get.mock.calls[0];
    expect(callArgs[1]?.params).toBeDefined();
  });
});

// ─── Suite: Token Refresh ────────────────────────────────────────

describe('refreshMetaToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should refresh token successfully', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: mockMetaTokenResponse });

    // Act
    const result = await refreshMetaToken('old-refresh-token');

    // Assert
    expect(result.access_token).toBe('mock-refreshed-access-token');
    expect(result.expires_in).toBe(5184000);
    expect(result.token_type).toBe('bearer');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should throw PlatformError when refresh fails', async () => {
    // Arrange
    const axiosError = {
      response: {
        data: {
          error: {
            message: 'Invalid refresh token',
            type: 'OAuthException',
            code: 190,
          },
        },
      },
      message: 'Request failed with status code 400',
    };
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    // Act & Assert
    await expect(refreshMetaToken('invalid-token')).rejects.toThrow(PlatformError);
    await expect(refreshMetaToken('invalid-token')).rejects.toThrow('Token refresh failed');
  });

  it('should throw PlatformError on network error', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValueOnce(new Error('Network timeout'));

    // Act & Assert
    await expect(refreshMetaToken('valid-token')).rejects.toThrow(PlatformError);
  });
});

// ─── Suite: OAuth Code Exchange ──────────────────────────────────

describe('exchangeMetaCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should exchange code for token successfully', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: mockMetaTokenResponse });

    // Act
    const result = await exchangeMetaCode('auth-code-123', 'http://localhost:3001/auth/meta/callback');

    // Assert
    expect(result.access_token).toBe('mock-refreshed-access-token');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('should throw PlatformError when code exchange fails', async () => {
    // Arrange
    const axiosError = {
      response: {
        data: {
          error: {
            message: 'Invalid authorization code',
            type: 'OAuthException',
            code: 100,
          },
        },
      },
      message: 'Request failed with status code 400',
    };
    mockedAxios.get.mockRejectedValueOnce(axiosError);

    // Act & Assert
    await expect(exchangeMetaCode('invalid-code', 'http://localhost/callback')).rejects.toThrow(PlatformError);
  });
});

// ─── Suite: OAuth URL Generation ─────────────────────────────────

describe('getMetaOAuthUrl', () => {
  it('should generate a valid OAuth URL', () => {
    // Arrange
    const redirectUri = 'http://localhost:3001/auth/meta/callback';
    const state = 'test-state-value';

    // Act
    const result = getMetaOAuthUrl(redirectUri, state);

    // Assert
    expect(result).toContain('facebook.com');
    expect(result).toContain('dialog/oauth');
    expect(result).toContain(encodeURIComponent(redirectUri));
    expect(result).toContain('state=' + state);
    expect(result).toContain('response_type=code');
    expect(result).toContain('scope=');
  });

  it('should include all required scopes', () => {
    // Act
    const result = getMetaOAuthUrl('http://localhost/callback', 'state');

    // Assert
    expect(result).toContain('ads_read');
    expect(result).toContain('ads_management');
    expect(result).toContain('business_management');
  });
});

// ─── Suite: Error Handling ───────────────────────────────────────

describe('error handling for API failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw PlatformError when fetching campaigns fails', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid token' } } },
      message: 'Request failed with status code 401',
    });

    // Act & Assert
    await expect(getMetaCampaigns('act_123', 'invalid-token')).rejects.toThrow(PlatformError);
  });

  it('should throw PlatformError when fetching a single campaign fails', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { error: { message: 'Campaign not found' } } },
      message: 'Request failed with status code 404',
    });

    // Act & Assert
    await expect(getMetaCampaign('invalid-id', 'mock-token')).rejects.toThrow(PlatformError);
  });

  it('should throw PlatformError when creating campaign fails', async () => {
    // Arrange
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid campaign structure' } } },
      message: 'Request failed with status code 400',
    });

    // Act & Assert
    await expect(
      createMetaCampaign('act_123', 'mock-token', {
        name: 'Test',
        objective: 'CONVERSIONS',
        status: 'PAUSED',
      }),
    ).rejects.toThrow(PlatformError);
  });

  it('should throw PlatformError when updating campaign fails', async () => {
    // Arrange
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { error: { message: 'Cannot edit archived campaign' } } },
      message: 'Request failed with status code 400',
    });

    // Act & Assert
    await expect(
      updateMetaCampaign('archived-campaign-id', 'mock-token', { status: 'ACTIVE' }),
    ).rejects.toThrow(PlatformError);
  });

  it('should throw PlatformError when fetching ad accounts fails', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { error: { message: 'Session expired' } } },
      message: 'Request failed with status code 401',
    });

    // Act & Assert
    await expect(getMetaAdAccounts('expired-token')).rejects.toThrow(PlatformError);
  });

  it('should include platform name in error messages', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { error: { message: 'Rate limit exceeded' } } },
      message: 'Request failed with status code 429',
    });

    // Act & Assert
    await expect(getMetaCampaigns('act_123', 'token')).rejects.toThrow('[meta]');
  });

  it('should handle network-level errors gracefully', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    // Act & Assert
    await expect(getMetaCampaigns('act_123', 'token')).rejects.toThrow(PlatformError);
  });

  it('should handle errors without response body', async () => {
    // Arrange
    mockedAxios.get.mockRejectedValueOnce({ message: 'Network Error' });

    // Act & Assert
    await expect(getMetaCampaigns('act_123', 'token')).rejects.toThrow(PlatformError);
  });
});

// ─── Suite: Ad Accounts ──────────────────────────────────────────

describe('getMetaAdAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return array of ad accounts', async () => {
    // Arrange
    const accounts = [
      { id: 'act_123', name: 'Account 1', account_status: 1 },
      { id: 'act_456', name: 'Account 2', account_status: 2 },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: { data: accounts } });

    // Act
    const result = await getMetaAdAccounts('valid-token');

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('act_123');
  });

  it('should return empty array when no accounts', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    // Act
    const result = await getMetaAdAccounts('valid-token');

    // Assert
    expect(result).toEqual([]);
  });
});

// ─── Suite: Get Campaigns ────────────────────────────────────────

describe('getMetaCampaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return campaigns for an account', async () => {
    // Arrange
    const campaigns = [
      { id: 'camp1', name: 'Campaign 1', status: 'ACTIVE' },
      { id: 'camp2', name: 'Campaign 2', status: 'PAUSED' },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: { data: campaigns } });

    // Act
    const result = await getMetaCampaigns('act_123', 'valid-token');

    // Assert
    expect(result).toHaveLength(2);
  });

  it('should filter by status when provided', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    // Act
    await getMetaCampaigns('act_123', 'valid-token', 'active');

    // Assert
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    const callArgs = mockedAxios.get.mock.calls[0];
    expect(callArgs[1]?.params).toBeDefined();
  });

  it('should not filter when status is "all"', async () => {
    // Arrange
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    // Act
    await getMetaCampaigns('act_123', 'valid-token', 'all');

    // Assert
    const callArgs = mockedAxios.get.mock.calls[0];
    const params = callArgs[1]?.params as Record<string, unknown> | undefined;
    expect(params?.effective_status).toBeUndefined();
  });
});

// ─── Suite: Create Campaign ──────────────────────────────────────

describe('createMetaCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a campaign and return its ID', async () => {
    // Arrange
    mockedAxios.post.mockResolvedValueOnce({ data: { id: '12020000000000999' } });

    // Act
    const result = await createMetaCampaign('act_123', 'valid-token', {
      name: 'New Campaign',
      objective: 'CONVERSIONS',
      status: 'ACTIVE',
    });

    // Assert
    expect(result).toBe('12020000000000999');
  });

  it('should always create campaign as PAUSED (safety)', async () => {
    // Arrange
    mockedAxios.post.mockResolvedValueOnce({ data: { id: 'camp_123' } });

    // Act
    await createMetaCampaign('act_123', 'valid-token', {
      name: 'Test',
      objective: 'CONVERSIONS',
      status: 'ACTIVE', // User requested ACTIVE
    });

    // Assert
    const postData = mockedAxios.post.mock.calls[0][1] as { status: string };
    expect(postData.status).toBe('PAUSED'); // But we force PAUSED
  });

  it('should convert daily_budget to cents', async () => {
    // Arrange
    mockedAxios.post.mockResolvedValueOnce({ data: { id: 'camp_123' } });

    // Act
    await createMetaCampaign('act_123', 'valid-token', {
      name: 'Test',
      objective: 'CONVERSIONS',
      status: 'PAUSED',
      daily_budget: 250.50,
    });

    // Assert
    const postData = mockedAxios.post.mock.calls[0][1] as { daily_budget: number };
    expect(postData.daily_budget).toBe(25050); // 250.50 * 100 rounded
  });
});

// ─── Suite: Update Campaign ──────────────────────────────────────

describe('updateMetaCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update campaign fields', async () => {
    // Arrange
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    // Act
    await updateMetaCampaign('camp_123', 'valid-token', { name: 'Updated Name', status: 'PAUSED' });

    // Assert
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, data] = mockedAxios.post.mock.calls[0];
    expect(data).toEqual({ name: 'Updated Name', status: 'PAUSED' });
  });
});
