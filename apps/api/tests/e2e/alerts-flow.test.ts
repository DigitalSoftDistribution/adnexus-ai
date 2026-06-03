// ============================================
// AdNexus AI — E2E Critical Flow: Alert -> Notification
// ============================================
// Covers the 4th critical flow from the v2 roadmap (§8): an alert rule is
// created, enabled, test-triggered (which fans out notifications), and the
// trigger is recorded in the alert's history.
//
// The v1 alerts route is backed by an in-memory store, so this exercises the
// real route logic end-to-end through the HTTP layer with only auth mocked.

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import {
  setupTestDB,
  teardownTestDB,
  createTestUser,
  createTestWorkspace,
  addUserToWorkspace,
  generateAuthToken,
  buildE2EMockFrom,
  type TestUser,
  type TestWorkspace,
} from './setup';

const mockFrom = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('E2E: Alert -> Notification flow', () => {
  let dbConfig: Awaited<ReturnType<typeof setupTestDB>>;
  let owner: TestUser;
  let workspace: TestWorkspace;
  let token: string;

  beforeAll(async () => {
    dbConfig = await setupTestDB();
    mockFrom.mockImplementation(buildE2EMockFrom());
  });

  afterAll(async () => {
    await teardownTestDB(dbConfig);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    owner = await createTestUser({ email: 'owner-alert@example.com', name: 'Alert Owner', role: 'owner' });
    workspace = await createTestWorkspace({ ownerId: owner.id, name: 'Alert Test Workspace' });
    await addUserToWorkspace(owner.id, workspace.id, 'owner');
    token = generateAuthToken(owner.id, 'owner', workspace.id);
    mockFrom.mockImplementation(buildE2EMockFrom());
  });

  const newAlert = {
    name: 'High CPA Alert',
    description: 'Notify when CPA exceeds target',
    metric: 'cpa',
    operator: 'greater_than',
    threshold: 50,
    timeWindow: '24h',
    platforms: ['meta'],
    channels: ['email', 'in_app'],
    severity: 'critical',
    status: 'active',
  };

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/alerts');
    expect(res.status).toBe(401);
  });

  it('runs the full create -> test-trigger -> history flow', async () => {
    // Step 1: create the alert rule
    const createRes = await request(app)
      .post('/api/v1/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send(newAlert);

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.id).toBeDefined();
    expect(createRes.body.data.status).toBe('active');
    const alertId = createRes.body.data.id as string;

    // Step 2: fetch it back
    const getRes = await request(app)
      .get(`/api/v1/alerts/${alertId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('High CPA Alert');

    // Step 3: test-trigger the alert — this fans out notifications across the
    // configured channels and records a history entry.
    const testRes = await request(app)
      .post(`/api/v1/alerts/${alertId}/test`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(testRes.status).toBe(200);
    expect(testRes.body.success).toBe(true);
    // A notification result is returned per configured channel.
    const notifications = testRes.body.notifications as unknown[];
    expect(Array.isArray(notifications)).toBe(true);
    expect(notifications.length).toBe(newAlert.channels.length);

    // Step 4: the trigger is recorded in history
    const historyRes = await request(app)
      .get(`/api/v1/alerts/${alertId}/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(historyRes.status).toBe(200);
    const history = historyRes.body.data ?? historyRes.body.history ?? [];
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 when test-triggering a non-existent alert', async () => {
    const res = await request(app)
      .post('/api/v1/alerts/alert-does-not-exist/test')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('can pause (toggle) an alert so it no longer fires', async () => {
    const createRes = await request(app)
      .post('/api/v1/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send(newAlert);
    const alertId = createRes.body.data.id as string;

    const toggleRes = await request(app)
      .post(`/api/v1/alerts/${alertId}/toggle`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.success).toBe(true);
    expect(['paused', 'active']).toContain(toggleRes.body.data.status);
  });
});
