// ============================================
// AdNexus AI — V2 Reports + Agent Smoke Integration Tests
// ============================================
// Mirrors v2-reports-dashboard.test.ts / v2-campaigns.test.ts: verifies the v2
// runtime mount serves these route groups from apps/api/src/index.ts.
//
// Coverage:
//   • GET /api/v2/reports
//   • GET /api/v2/agent/status
//   • GET /api/v2/agent/recommendations
//   • GET /api/v2/drafts
//   • GET /api/v2/search
//
// Each endpoint: 401 without auth + happy path with test JWT from tests/utils.

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { UUIDS } from '../fixtures/data';

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

jest.mock('../../src/ai-engine', () => ({
  RuleEvaluator: jest.fn().mockImplementation(() => ({ evaluateRules: jest.fn() })),
  RecommendationGenerator: jest.fn().mockImplementation(() => ({
    generateRecommendations: jest.fn().mockResolvedValue([]),
  })),
  CreativeFatigueDetector: jest.fn().mockImplementation(() => ({
    calculateFatigueScores: jest.fn().mockResolvedValue([]),
  })),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const v2Query = (jest.requireMock('../../src/infrastructure/database/connection') as any)
  .query as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

const UNAUTHORIZED = { success: false, error: { code: 'UNAUTHORIZED' } };

beforeEach(() => {
  jest.clearAllMocks();
  v2Query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('V2 runtime mount — reports + agent smoke', () => {
  describe('GET /api/v2/reports', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/reports');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject(UNAUTHORIZED);
    });

    it('returns 200 with the reports list envelope for an owner', async () => {
      v2Query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .get('/api/v2/reports')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: { reports: [], total: 0, page: 1, limit: 20 },
      });
      expect(v2Query).toHaveBeenCalledWith(
        expect.stringContaining('FROM reports'),
        expect.arrayContaining([UUIDS.workspace1]),
      );
    });
  });

  describe('GET /api/v2/agent/status', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/agent/status');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject(UNAUTHORIZED);
    });

    it('returns 200 with agent status for an owner', async () => {
      v2Query.mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .get('/api/v2/agent/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        isRunning: true,
        rulesActive: 2,
        optimizationsToday: 0,
        creditsUsed: 0,
        creditsTotal: 1000,
      });
      expect(res.body.data.nextRunAt).toEqual(expect.any(String));
      expect(v2Query).toHaveBeenCalledWith(
        expect.stringContaining('FROM automation_rules'),
        [UUIDS.workspace1],
      );
    });
  });

  describe('GET /api/v2/agent/recommendations', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/agent/recommendations');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject(UNAUTHORIZED);
    });

    it('returns 200 with an empty recommendations array for an owner', async () => {
      v2Query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .get('/api/v2/agent/recommendations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: [] });
      expect(v2Query).toHaveBeenCalledWith(
        expect.stringContaining('FROM ai_recommendation_states'),
        [UUIDS.workspace1],
      );
    });
  });

  describe('GET /api/v2/drafts', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/drafts');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject(UNAUTHORIZED);
    });

    it('returns 200 with the drafts list envelope for an owner', async () => {
      v2Query
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .get('/api/v2/drafts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: { drafts: [], total: 0, page: 1, totalPages: 0 },
      });
      expect(v2Query).toHaveBeenCalledWith(
        expect.stringContaining('FROM drafts'),
        expect.arrayContaining([UUIDS.workspace1]),
      );
    });
  });

  describe('GET /api/v2/search', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app).get('/api/v2/search?q=test');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject(UNAUTHORIZED);
    });

    it('returns 200 with search results for an owner', async () => {
      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .get('/api/v2/search?q=test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: [] });
      expect(v2Query).toHaveBeenCalledWith(
        expect.stringContaining('FROM campaigns c'),
        expect.arrayContaining([UUIDS.workspace1, '%test%']),
      );
    });
  });
});
