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

describe('V2 runtime mount — /api/v2/reports scheduled + results', () => {
  it('lists scheduled reports', async () => {
    v2Query
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const token = generateToken(UUIDS.viewer, 'viewer', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/reports/scheduled')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { total: 0, reports: [] } });
  });

  it('creates a scheduled report for an editor', async () => {
    v2Query.mockResolvedValueOnce({
      rows: [{
        id: '88888888-8888-8888-8888-888888888881',
        workspace_id: UUIDS.workspace1,
        name: 'Weekly digest',
        description: null,
        report_type: 'performance',
        config: {},
        schedule_cron: '0 8 * * 1',
        recipients: [],
        format: 'pdf',
        status: 'active',
        last_run_at: null,
        last_run_status: null,
        next_run_at: '2026-06-10T08:00:00.000Z',
        created_by: UUIDS.analyst,
        created_at: '2026-06-10T00:00:00.000Z',
        updated_at: '2026-06-10T00:00:00.000Z',
      }],
      rowCount: 1,
    });

    const token = generateToken(UUIDS.analyst, 'editor', UUIDS.workspace1);
    const res = await request(app)
      .post('/api/v2/reports/scheduled')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Weekly digest',
        reportType: 'performance',
        scheduleCron: '0 8 * * 1',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, data: { name: 'Weekly digest' } });
  });
});
