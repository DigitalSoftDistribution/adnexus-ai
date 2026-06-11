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

const webhookRow = {
  id: '99999999-9999-9999-9999-999999999991',
  workspace_id: UUIDS.workspace1,
  name: 'Slack',
  url: 'https://hooks.example.com/slack',
  secret: 'whsec_test',
  events: ['campaign.updated'],
  status: 'active',
  last_triggered_at: null,
  failure_count: 0,
  created_by: null,
  created_at: '2026-06-10T00:00:00.000Z',
  updated_at: '2026-06-10T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  v2Query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('V2 runtime mount — /api/v2/webhooks/config', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).put('/api/v2/webhooks/config/99999999-9999-9999-9999-999999999991');
    expect(res.status).toBe(401);
  });

  it('updates a webhook config for an admin', async () => {
    v2Query
      .mockResolvedValueOnce({ rows: [webhookRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...webhookRow, name: 'Renamed' }], rowCount: 1 });

    const token = generateToken(UUIDS.admin, 'admin', UUIDS.workspace1);
    const res = await request(app)
      .put(`/api/v2/webhooks/config/${webhookRow.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { name: 'Renamed' } });
  });

  it('deletes a webhook config for an admin', async () => {
    v2Query
      .mockResolvedValueOnce({ rows: [webhookRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const token = generateToken(UUIDS.admin, 'admin', UUIDS.workspace1);
    const res = await request(app)
      .delete(`/api/v2/webhooks/config/${webhookRow.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { deleted: true } });
  });

  it('lists webhook deliveries for an admin', async () => {
    v2Query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const token = generateToken(UUIDS.admin, 'admin', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/webhooks/deliveries')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [] });
  });
});
