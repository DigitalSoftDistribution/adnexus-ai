/**
 * PlatformManager.connectAccount — OAuth placeholder removal (SB-3227)
 */

import { PlatformManager } from '../../src/platforms/index';
import { PLATFORM_CONFIG } from '../../src/platforms/config';
import { registerAllPlatformClients } from '../../src/platforms/register';
import { PlatformAPIError } from '../../src/platforms/errors';
import type { AdAccount } from '../../src/platforms/types';

jest.mock('../../src/platforms/meta/MetaPlatformClient', () => ({
  connectMetaAccount: jest.fn(),
  MetaPlatformClient: jest.fn(),
}));

const { connectMetaAccount } = jest.requireMock('../../src/platforms/meta/MetaPlatformClient') as {
  connectMetaAccount: jest.Mock;
};

const realAccount: AdAccount = {
  id: 'meta_acct_1',
  workspaceId: 'ws-1',
  platform: 'meta',
  platformAccountId: 'act_123456',
  name: 'Meta Main',
  currency: 'USD',
  timezone: 'America/New_York',
  status: 'active',
  accessToken: 'real-meta-token',
  refreshToken: 'real-refresh',
  tokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('PlatformManager.connectAccount', () => {
  let manager: PlatformManager;

  beforeEach(() => {
    jest.clearAllMocks();
    registerAllPlatformClients();
    manager = new PlatformManager(PLATFORM_CONFIG);
  });

  it('rejects empty OAuth authorization codes', async () => {
    await expect(manager.connectAccount('ws-1', 'meta', '   ')).rejects.toMatchObject({
      code: 'VALIDATION_MISSING_FIELD',
    });
    expect(connectMetaAccount).not.toHaveBeenCalled();
  });

  it('rejects unregistered platforms before OAuth exchange', async () => {
    await expect(manager.connectAccount('ws-1', 'twitter' as 'meta', 'auth-code')).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
    });
    expect(connectMetaAccount).not.toHaveBeenCalled();
  });

  it('routes non-meta platforms to auth callback routes instead of creating placeholders', async () => {
    await expect(manager.connectAccount('ws-1', 'google', 'auth-code')).rejects.toThrow(PlatformAPIError);
    await expect(manager.connectAccount('ws-1', 'google', 'auth-code')).rejects.toMatchObject({
      message: expect.stringContaining('auth callback routes'),
    });
    expect(connectMetaAccount).not.toHaveBeenCalled();
  });

  it('exchanges Meta OAuth codes and caches a real account', async () => {
    connectMetaAccount.mockResolvedValueOnce({
      account: realAccount,
      client: { platform: 'meta', account: realAccount },
    });

    const account = await manager.connectAccount('ws-1', 'meta', 'oauth-code', 'https://app.test/callback');

    expect(connectMetaAccount).toHaveBeenCalledWith(
      'oauth-code',
      'ws-1',
      'https://app.test/callback',
    );
    expect(account.accessToken).toBe('real-meta-token');
    expect(account.platformAccountId).toBe('act_123456');
    expect(account.accessToken).not.toBe('placeholder_token');
  });

  it('rejects placeholder_token results from OAuth exchange', async () => {
    connectMetaAccount.mockResolvedValueOnce({
      account: { ...realAccount, accessToken: 'placeholder_token' },
      client: { platform: 'meta', account: realAccount },
    });

    await expect(manager.connectAccount('ws-1', 'meta', 'oauth-code')).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
    });
  });

  it('rejects unresolved placeholder platform account IDs', async () => {
    connectMetaAccount.mockResolvedValueOnce({
      account: { ...realAccount, platformAccountId: 'placeholder' },
      client: { platform: 'meta', account: realAccount },
    });

    await expect(manager.connectAccount('ws-1', 'meta', 'oauth-code')).rejects.toMatchObject({
      code: 'VALIDATION_MISSING_FIELD',
    });
  });
});
