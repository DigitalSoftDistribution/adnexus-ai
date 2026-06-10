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

describe('V2 runtime mount — /api/v2/settings/profile', () => {
  it('returns profile for an authenticated viewer', async () => {
    v2Query.mockResolvedValueOnce({
      rows: [{
        id: UUIDS.viewer,
        email: 'viewer@example.com',
        name: 'Viewer',
        avatar_url: null,
      }],
      rowCount: 1,
    });

    const token = generateToken(UUIDS.viewer, 'viewer', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/settings/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { email: 'viewer@example.com', name: 'Viewer' },
    });
  });

  it('updates profile for an authenticated viewer', async () => {
    v2Query
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{
          id: UUIDS.viewer,
          email: 'viewer@example.com',
          name: 'Updated Name',
          avatar_url: null,
        }],
        rowCount: 1,
      });

    const token = generateToken(UUIDS.viewer, 'viewer', UUIDS.workspace1);
    const res = await request(app)
      .put('/api/v2/settings/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { name: 'Updated Name' } });
  });

  it('returns connect URL for settings integration connect', async () => {
    const token = generateToken(UUIDS.admin, 'admin', UUIDS.workspace1);
    const res = await request(app)
      .post('/api/v2/settings/integrations/meta')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.connectUrl).toContain('/api/v1/auth/meta/connect');
  });

  it('disconnects a platform from settings for an admin', async () => {
    v2Query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const token = generateToken(UUIDS.admin, 'admin', UUIDS.workspace1);
    const res = await request(app)
      .delete('/api/v2/settings/integrations/meta')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { disconnected: true } });
  });
});
