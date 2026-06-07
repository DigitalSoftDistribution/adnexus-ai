import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { UUIDS } from '../fixtures/data';

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const v2Query = (jest.requireMock('../../src/infrastructure/database/connection') as any)
  .query as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  jest.clearAllMocks();
  v2Query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('V2 runtime mount — /api/v2/settings/api-keys', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).get('/api/v2/settings/api-keys');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('returns the API key list envelope for an owner', async () => {
    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/settings/api-keys')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [] });
    expect(v2Query).toHaveBeenCalledWith(
      expect.stringContaining('FROM api_keys'),
      [UUIDS.workspace1],
    );
  });

  it('creates an API key with JSON scopes for an owner', async () => {
    v2Query.mockResolvedValueOnce({
      rows: [{
        id: '99999999-9999-9999-9999-999999999999',
        workspace_id: UUIDS.workspace1,
        name: 'QA Key',
        key_hash: 'hash',
        key_prefix: 'ak_live_...abcd',
        scopes: ['read'],
        status: 'active',
        expires_at: null,
        created_by: null,
        revoked_by: null,
        revoked_at: null,
        last_used_at: null,
        calls_today: 0,
        calls_this_month: 0,
        created_at: '2026-06-07T00:00:00.000Z',
        updated_at: '2026-06-07T00:00:00.000Z',
      }],
      rowCount: 1,
    });

    const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
    const res = await request(app)
      .post('/api/v2/settings/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'QA Key' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'QA Key',
        scopes: ['read'],
        status: 'active',
      },
    });
    expect(res.body.data.fullKey).toEqual(expect.stringMatching(/^ak_live_/));
    expect(v2Query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO api_keys'),
      expect.arrayContaining([JSON.stringify(['read'])]),
    );
  });

  it('returns 403 for a non-admin workspace role', async () => {
    const token = generateToken(UUIDS.viewer, 'viewer', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/settings/api-keys')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });
});
