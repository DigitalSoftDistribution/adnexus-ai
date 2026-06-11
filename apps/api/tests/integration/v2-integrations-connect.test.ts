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

describe('V2 runtime mount — /api/v2/integrations', () => {
  it('returns connect URL for POST /integrations/:platform/connect', async () => {
    const token = generateToken(UUIDS.admin, 'admin', UUIDS.workspace1);
    const res = await request(app)
      .post('/api/v2/integrations/meta/connect')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.connectUrl).toContain('workspace_id=');
  });

  it('lists ad accounts for a platform', async () => {
    v2Query
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{
          id: UUIDS.metaAccount,
          workspace_id: UUIDS.workspace1,
          platform: 'meta',
          platform_account_id: 'act_123',
          name: 'Meta Main',
          status: 'active',
          oauth_token: null,
          refresh_token: null,
          token_expires_at: null,
          is_active: true,
          scopes: [],
          last_synced_at: null,
          spend_cap: null,
          disabled_reason: null,
          metadata: {},
          created_at: '2026-06-10T00:00:00.000Z',
          updated_at: '2026-06-10T00:00:00.000Z',
        }],
        rowCount: 1,
      });

    const token = generateToken(UUIDS.viewer, 'viewer', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/integrations/meta/accounts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ platformAccountId: 'act_123', name: 'Meta Main' });
  });
});
