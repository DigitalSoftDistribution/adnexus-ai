// SB-3239 — POST /api/v2/ads/bulk/validate integration stub

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { generateToken } from '../utils/helpers';
import { UUIDS } from '../fixtures/data';

describe('V2 runtime mount — POST /api/v2/ads/bulk/validate', () => {
  describe('auth', () => {
    it('returns 401 without a Bearer token', async () => {
      const res = await request(app)
        .post('/api/v2/ads/bulk/validate')
        .send({ specs: [{ adsetId: UUIDS.adset1, name: 'Test Ad' }] });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    });
  });

  describe('RBAC', () => {
    it('returns 403 for viewer role', async () => {
      const token = generateToken(UUIDS.viewer, 'viewer', UUIDS.workspace1);
      const res = await request(app)
        .post('/api/v2/ads/bulk/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({ specs: [{ adsetId: UUIDS.adset1, name: 'Test Ad' }] });

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
    });
  });

  describe('success envelope', () => {
    it('returns validation results for owner with valid specs', async () => {
      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .post('/api/v2/ads/bulk/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          specs: [
            {
              adsetId: UUIDS.adset1,
              name: 'Launch A',
              headline: 'Grow faster',
              creativeType: 'image',
              creativeUrl: 'https://cdn.example.com/a.png',
              landingPageUrl: 'https://example.com',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('results');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data.summary.total).toBe(1);
      expect(res.body.data.results[0].valid).toBe(true);
    });

    it('returns warnings for policy/size issues without creating ads', async () => {
      const token = generateToken(UUIDS.owner, 'owner', UUIDS.workspace1);
      const res = await request(app)
        .post('/api/v2/ads/bulk/validate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          specs: [
            {
              adsetId: UUIDS.adset1,
              name: 'Oversized headline',
              headline: 'A'.repeat(50),
              creativeType: 'image',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results[0].warnings.length).toBeGreaterThan(0);
      expect(res.body.data.summary.warningCount).toBeGreaterThan(0);
    });
  });
});
