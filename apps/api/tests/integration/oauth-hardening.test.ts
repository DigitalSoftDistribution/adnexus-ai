import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/index';
import { UUIDS } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

const mockSupabaseFrom = jest.fn();
const mockAxiosGet = jest.fn();

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
    const state = jwt.sign({ platform: 'meta', workspaceId, userId: ownerId }, process.env.JWT_SECRET!, { expiresIn: '10m' });
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
});
