import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/index';
import { createOAuthState, verifyOAuthState } from '../../src/routes/auth/oauthState';
import { UUIDS } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

const mockSupabaseFrom = jest.fn();
const mockAxiosGet = jest.fn();

const mockMemoryNonceStore = new Map<string, string>();

jest.mock('../../src/lib/redis', () => {
  const mockRedisClient: Record<string, (...args: unknown[]) => unknown> = {
    set: (key: unknown) => {
      mockMemoryNonceStore.set(key as string, '1');
      return Promise.resolve('OK');
    },
    get: (key: unknown) => Promise.resolve(mockMemoryNonceStore.get(key as string) ?? null),
    del: (key: unknown) => Promise.resolve(mockMemoryNonceStore.delete(key as string) ? 1 : 0),
    // No-op surface so app modules (rate limiter, SSE) that share the client don't crash.
    duplicate: () => mockRedisClient,
    on: () => mockRedisClient,
    incr: () => Promise.resolve(1),
    expire: () => Promise.resolve(1),
    eval: () => Promise.resolve(1),
    quit: () => Promise.resolve('OK'),
    setex: () => Promise.resolve('OK'),
    publish: () => Promise.resolve(0),
    subscribe: () => Promise.resolve(undefined),
  };
  return {
    getRedisClient: () => mockRedisClient,
    isRedisAvailable: () => true,
  };
});

jest.mock('../../src/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockSupabaseFrom(...args) },
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) },
}));

type Builder = Record<string, jest.Mock>;

function chainBuilder(result: unknown): Builder {
  const b: Builder = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    update: jest.fn(() => b),
    insert: jest.fn(() => b),
    upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return b;
}

const workspaceId = UUIDS.workspace1;
const ownerId = UUIDS.owner;

beforeEach(() => {
  jest.clearAllMocks();
  mockMemoryNonceStore.clear();
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.META_APP_ID = 'meta-app';
  process.env.META_APP_SECRET = 'meta-secret';
  process.env.GOOGLE_CLIENT_ID = 'google-client';
  process.env.GOOGLE_CLIENT_SECRET = 'google-secret';

  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return chainBuilder({ data: { id: ownerId }, error: null });
    }
    if (table === 'workspace_members') {
      return chainBuilder({ data: { role: 'owner' }, error: null });
    }
    if (table === 'ad_accounts') {
      return chainBuilder({ data: null, error: null });
    }
    return chainBuilder({ data: null, error: null });
  });
});

describe('OAuth route hardening', () => {
  it('returns API callback redirect URIs from JSON connect responses', async () => {
    const token = generateToken(ownerId, 'owner', workspaceId);

    const response = await request(app)
      .get('/api/v1/auth/meta/connect')
      .query({ workspace_id: workspaceId })
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', workspaceId)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    const redirectUrl = new URL(response.body.data.redirectUrl);
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:5173/api/v1/auth/meta/callback');
    const state = verifyOAuthState(redirectUrl.searchParams.get('state'), 'meta');
    expect(state).toMatchObject({ platform: 'meta', workspaceId, userId: ownerId });
    expect(state?.nonce).toEqual(expect.any(String));
  });

  it('returns structured JSON for JSON OAuth callback failures', async () => {
    const response = await request(app)
      .get('/api/v1/auth/meta/callback')
      .query({ error: 'access_denied' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.type).toMatch(/json/);
    expect(response.body).toMatchObject({
      success: false,
      code: 'OAUTH_DENIED',
      data: { platform: 'meta', status: 'denied', reason: 'oauth_denied' },
    });
  });

  it('uses the same API callback URL during token exchange', async () => {
    const state = await createOAuthState({ platform: 'meta', workspaceId, userId: ownerId });
    mockAxiosGet
      .mockResolvedValueOnce({ data: { access_token: 'short-token' } })
      .mockResolvedValueOnce({ data: { access_token: 'long-token', expires_in: 3600 } })
      .mockResolvedValueOnce({ data: { data: [] } });

    const response = await request(app)
      .get('/api/v1/auth/meta/callback')
      .query({ code: 'oauth-code', state })
      .set('Accept', 'text/html');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('/dashboard/integrations');
    expect(mockAxiosGet).toHaveBeenCalledWith(
      expect.stringContaining('/oauth/access_token'),
      expect.objectContaining({
        params: expect.objectContaining({ redirect_uri: 'http://localhost:5173/api/v1/auth/meta/callback' }),
      }),
    );
  });

  it('embeds a nonce in state and rejects callback replay', async () => {
    const state = await createOAuthState({ platform: 'meta', workspaceId, userId: ownerId });
    const decoded = verifyOAuthState(state, 'meta');
    expect(decoded?.nonce).toEqual(expect.any(String));

    mockAxiosGet
      .mockResolvedValueOnce({ data: { access_token: 'short-token' } })
      .mockResolvedValueOnce({ data: { access_token: 'long-token', expires_in: 3600 } })
      .mockResolvedValueOnce({ data: { data: [] } });

    const first = await request(app)
      .get('/api/v1/auth/meta/callback')
      .query({ code: 'oauth-code', state })
      .set('Accept', 'application/json');

    expect(first.status).toBe(302);

    const replay = await request(app)
      .get('/api/v1/auth/meta/callback')
      .query({ code: 'oauth-code', state })
      .set('Accept', 'application/json');

    expect(replay.status).toBe(400);
    expect(replay.body).toMatchObject({
      success: false,
      code: 'INVALID_OAUTH_STATE',
      data: { platform: 'meta', reason: 'invalid_oauth_state' },
    });
    expect(mockAxiosGet).toHaveBeenCalledTimes(3);
  });

  it('rejects states that were not created by the connect flow', async () => {
    const forgedState = jwt.sign(
      { platform: 'meta', workspaceId, userId: ownerId, nonce: 'forged-nonce' },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' },
    );

    const response = await request(app)
      .get('/api/v1/auth/meta/callback')
      .query({ code: 'oauth-code', state: forgedState })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, code: 'INVALID_OAUTH_STATE' });
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('binds connect workspace to the authenticated session workspace', async () => {
    const token = generateToken(ownerId, 'owner', workspaceId);

    const response = await request(app)
      .get('/api/v1/auth/meta/connect')
      .query({ workspace_id: UUIDS.workspace2 })
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', workspaceId)
      .set('Accept', 'application/json');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'Workspace mismatch', code: 'FORBIDDEN' });
  });
});
