import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { UUIDS } from '../fixtures/data';
import { REPORT_TEMPLATES } from '../../src/domain/reports/reportTemplates';

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

describe('V2 runtime mount — /api/v2/reports/templates', () => {
  it('returns static report templates instead of treating templates as a report id', async () => {
    const token = generateToken(UUIDS.viewer, 'viewer', UUIDS.workspace1);
    const res = await request(app)
      .get('/api/v2/reports/templates')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: REPORT_TEMPLATES });
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data[0]).toMatchObject({
      id: 'performance-summary',
      type: 'performance',
    });
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v2/reports/templates');

    expect(res.status).toBe(401);
  });
});
