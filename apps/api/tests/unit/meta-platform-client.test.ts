import { jest } from '@jest/globals';
import { MetaPlatformClient } from '../../src/infrastructure/platform/MetaPlatformClient';
import { resolveMetaAccessToken } from '../../src/infrastructure/platform/metaToken';
import { getMetaCampaigns } from '../../src/services/meta-api';
import { createMetaPlatformClientForWorkspace } from '../../src/platforms/index';
import { loadAdAccountById } from '../../src/platforms/account-store';

jest.mock('../../src/infrastructure/platform/metaToken', () => ({
  resolveMetaAccessToken: jest.fn(),
}));

jest.mock('../../src/services/meta-api', () => ({
  getMetaCampaigns: jest.fn(),
  getMetaCampaign: jest.fn(),
  createMetaCampaign: jest.fn(),
  updateMetaCampaign: jest.fn(),
  getMetaAdSets: jest.fn(),
  getMetaAds: jest.fn(),
  getMetaInsights: jest.fn(),
}));

jest.mock('../../src/platforms/account-store', () => ({
  loadAdAccountById: jest.fn(),
  loadWorkspaceAccounts: jest.fn(),
  persistRefreshedToken: jest.fn(),
  markAccountDisconnected: jest.fn(),
}));

const mockResolveMetaAccessToken = resolveMetaAccessToken as jest.MockedFunction<typeof resolveMetaAccessToken>;
const mockGetMetaCampaigns = getMetaCampaigns as jest.MockedFunction<typeof getMetaCampaigns>;
const mockLoadAdAccountById = loadAdAccountById as jest.MockedFunction<typeof loadAdAccountById>;

describe('MetaPlatformClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses per-account oauth token for API calls', async () => {
    mockResolveMetaAccessToken.mockResolvedValue('workspace-oauth-token');
    mockGetMetaCampaigns.mockResolvedValue([{ id: 'camp-1', name: 'Test', status: 'ACTIVE' }]);

    const client = new MetaPlatformClient('ad-account-uuid');
    const result = await client.listCampaigns('act_123');

    expect(mockResolveMetaAccessToken).toHaveBeenCalledWith('ad-account-uuid');
    expect(mockGetMetaCampaigns).toHaveBeenCalledWith('act_123', 'workspace-oauth-token');
    expect(result.success).toBe(true);
  });

  it('returns error when no token is available', async () => {
    mockResolveMetaAccessToken.mockResolvedValue(null);

    const client = new MetaPlatformClient('ad-account-uuid');
    const result = await client.listCampaigns('act_123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('not connected');
    }
    expect(mockGetMetaCampaigns).not.toHaveBeenCalled();
  });
});

describe('createMetaPlatformClientForWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a client for a meta account in the workspace', async () => {
    mockLoadAdAccountById.mockResolvedValue({
      id: 'acc-1',
      workspaceId: 'ws-1',
      platform: 'meta',
      platformAccountId: 'act_123',
      name: 'Meta Ads',
      currency: 'USD',
      timezone: 'UTC',
      status: 'active',
      accessToken: 'token',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const client = await createMetaPlatformClientForWorkspace('ws-1', 'acc-1');
    expect(client).toBeInstanceOf(MetaPlatformClient);
  });

  it('returns null when account belongs to another workspace', async () => {
    mockLoadAdAccountById.mockResolvedValue({
      id: 'acc-1',
      workspaceId: 'other-ws',
      platform: 'meta',
      platformAccountId: 'act_123',
      name: 'Meta Ads',
      currency: 'USD',
      timezone: 'UTC',
      status: 'active',
      accessToken: 'token',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(createMetaPlatformClientForWorkspace('ws-1', 'acc-1')).resolves.toBeNull();
  });
});
