import { jest } from '@jest/globals';
import {
  decryptOAuthTokenFromStorage,
  encryptOAuthTokenForStorage,
  oauthTokensForDbWrite,
} from '../../src/security/oauth-token-crypto';
import { isEncrypted } from '../../src/security/encryption';

const sampleAccessToken = 'meta-access-token-abc123';
const sampleRefreshToken = 'meta-refresh-token-xyz789';

describe('oauth-token-crypto', () => {
  it('encrypts and decrypts tokens round-trip', () => {
    const stored = encryptOAuthTokenForStorage(sampleAccessToken);
    expect(stored).toBeTruthy();
    expect(isEncrypted(stored)).toBe(true);
    expect(decryptOAuthTokenFromStorage(stored)).toBe(sampleAccessToken);
  });

  it('does not double-encrypt already wrapped tokens', () => {
    const once = encryptOAuthTokenForStorage(sampleAccessToken)!;
    const twice = encryptOAuthTokenForStorage(once);
    expect(twice).toBe(once);
  });

  it('passes through legacy plaintext on read', () => {
    expect(decryptOAuthTokenFromStorage('legacy-plaintext-token')).toBe('legacy-plaintext-token');
  });

  it('returns null for empty values', () => {
    expect(encryptOAuthTokenForStorage(null)).toBeNull();
    expect(encryptOAuthTokenForStorage('')).toBeNull();
    expect(decryptOAuthTokenFromStorage(null)).toBeNull();
    expect(decryptOAuthTokenFromStorage('')).toBeNull();
  });

  it('oauthTokensForDbWrite encrypts both access and refresh tokens', () => {
    const { oauth_token, refresh_token } = oauthTokensForDbWrite(sampleAccessToken, sampleRefreshToken);
    expect(isEncrypted(oauth_token)).toBe(true);
    expect(isEncrypted(refresh_token!)).toBe(true);
    expect(decryptOAuthTokenFromStorage(oauth_token)).toBe(sampleAccessToken);
    expect(decryptOAuthTokenFromStorage(refresh_token)).toBe(sampleRefreshToken);
  });
});

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

import { query } from '../../src/infrastructure/database/connection';
import { loadWorkspaceAccounts, persistRefreshedToken } from '../../src/platforms/account-store';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('account-store token persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persistRefreshedToken stores encrypted oauth_token', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);

    await persistRefreshedToken('acct-1', sampleAccessToken, new Date().toISOString());

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(isEncrypted(params[1] as string)).toBe(true);
    expect(decryptOAuthTokenFromStorage(params[1] as string)).toBe(sampleAccessToken);
  });

  it('loadWorkspaceAccounts decrypts tokens from DB rows', async () => {
    const encrypted = encryptOAuthTokenForStorage(sampleAccessToken)!;
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'acct-1',
          workspace_id: 'ws-1',
          platform: 'meta',
          platform_account_id: 'act_123',
          name: 'Test',
          oauth_token: encrypted,
          refresh_token: null,
          token_expires_at: null,
          status: 'active',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: null,
        },
      ],
      rowCount: 1,
    } as never);

    const accounts = await loadWorkspaceAccounts('ws-1');
    expect(accounts[0].accessToken).toBe(sampleAccessToken);
  });
});
