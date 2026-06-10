import { jest } from '@jest/globals';
import { query } from '../../src/infrastructure/database/connection';
import { refreshMetaToken } from '../../src/services/meta-api';
import {
  getDevMetaAccessToken,
  resolveMetaAccessToken,
  resolveMetaToken,
  unwrapStoredOAuthToken,
} from '../../src/infrastructure/platform/metaToken';

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

jest.mock('../../src/services/meta-api', () => ({
  refreshMetaToken: jest.fn(),
}));

jest.mock('../../src/platforms/account-store', () => ({
  persistRefreshedToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/security/encryption', () => ({
  decryptToken: jest.fn((wrapped: string) => wrapped.replace('enc:v1:', 'decrypted:')),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockRefreshMetaToken = refreshMetaToken as jest.MockedFunction<typeof refreshMetaToken>;

describe('metaToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.META_ACCESS_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('unwrapStoredOAuthToken', () => {
    it('returns plain tokens unchanged', () => {
      expect(unwrapStoredOAuthToken('plain-oauth-token')).toBe('plain-oauth-token');
    });

    it('decrypts enc:v1 tokens', () => {
      expect(unwrapStoredOAuthToken('enc:v1:ciphertext')).toBe('decrypted:ciphertext');
    });
  });

  describe('getDevMetaAccessToken', () => {
    it('returns META_ACCESS_TOKEN in test', () => {
      process.env.NODE_ENV = 'test';
      process.env.META_ACCESS_TOKEN = 'dev-token';
      expect(getDevMetaAccessToken()).toBe('dev-token');
    });

    it('returns null in production even when META_ACCESS_TOKEN is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.META_ACCESS_TOKEN = 'prod-should-not-use';
      expect(getDevMetaAccessToken()).toBeNull();
    });
  });

  describe('resolveMetaToken', () => {
    it('returns oauth token from ad_accounts when not expiring soon', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          oauth_token: 'workspace-token',
          refresh_token: 'refresh',
          token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
        }],
        rowCount: 1,
      } as never);

      await expect(resolveMetaToken('acc-1')).resolves.toBe('workspace-token');
    });

    it('returns null when no oauth token is stored', async () => {
      mockQuery.mockResolvedValue({ rows: [{ oauth_token: null }], rowCount: 1 } as never);
      await expect(resolveMetaToken('acc-1')).resolves.toBeNull();
    });

    it('refreshes when token expires soon', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          oauth_token: 'old-token',
          refresh_token: 'refresh-token',
          token_expires_at: new Date(Date.now() + 60_000).toISOString(),
        }],
        rowCount: 1,
      } as never);
      mockRefreshMetaToken.mockResolvedValue({ access_token: 'new-token', expires_in: 3600 });

      await expect(resolveMetaToken('acc-1')).resolves.toBe('new-token');
      expect(mockRefreshMetaToken).toHaveBeenCalledWith('refresh-token');
    });
  });

  describe('resolveMetaAccessToken', () => {
    it('prefers workspace oauth token over dev fallback', async () => {
      process.env.NODE_ENV = 'test';
      process.env.META_ACCESS_TOKEN = 'dev-token';
      mockQuery.mockResolvedValue({
        rows: [{
          oauth_token: 'workspace-token',
          refresh_token: null,
          token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
        }],
        rowCount: 1,
      } as never);

      await expect(resolveMetaAccessToken('acc-1')).resolves.toBe('workspace-token');
    });

    it('falls back to META_ACCESS_TOKEN in test when account has no token', async () => {
      process.env.NODE_ENV = 'test';
      process.env.META_ACCESS_TOKEN = 'dev-token';
      mockQuery.mockResolvedValue({ rows: [{ oauth_token: null }], rowCount: 1 } as never);

      await expect(resolveMetaAccessToken('acc-1')).resolves.toBe('dev-token');
    });

    it('does not use META_ACCESS_TOKEN in production when account has no token', async () => {
      process.env.NODE_ENV = 'production';
      process.env.META_ACCESS_TOKEN = 'prod-should-not-use';
      mockQuery.mockResolvedValue({ rows: [{ oauth_token: null }], rowCount: 1 } as never);

      await expect(resolveMetaAccessToken('acc-1')).resolves.toBeNull();
    });
  });
});
