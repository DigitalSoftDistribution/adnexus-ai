import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockRules, mockWorkspaces, UUIDS } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase ───────────────────────────────────────────────
//
// The agent routes are Supabase-backed (automation_rules, audit_log, ai_*).
// jest.mock is hoisted, so the factory builds the mock and we grab the same
// `from` instance afterwards via jest.requireMock().

jest.mock('../../src/lib/supabase', () => {
  const from = jest.fn();
  const auth = {
    admin: { listUsers: jest.fn(), createUser: jest.fn(), deleteUser: jest.fn(), getUserById: jest.fn() },
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn(),
  };
  return { supabase: { from, auth } };
});

// ─── Mock the AI engine ──────────────────────────────────────────
//
// agent routes import RuleEvaluator / RecommendationGenerator / CreativeFatigueDetector
// from ../ai-engine. Only run-now exercises RuleEvaluator here.
const mockEvaluateRules = jest.fn<() => Promise<unknown>>();
jest.mock('../../src/ai-engine', () => ({
  RuleEvaluator: jest.fn().mockImplementation(() => ({ evaluateRules: mockEvaluateRules })),
  RecommendationGenerator: jest.fn().mockImplementation(() => ({
    generateRecommendations: jest.fn().mockResolvedValue([]),
  })),
  CreativeFatigueDetector: jest.fn().mockImplementation(() => ({
    calculateFatigueScores: jest.fn().mockResolvedValue([]),
  })),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockSupabase = (jest.requireMock('../../src/lib/supabase') as any).supabase;
const mockFrom = mockSupabase.from as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Generic chainable query-builder. */
function builder(opts: {
  single?: { data: unknown; error: unknown };
  list?: { data: unknown[]; error: unknown; count?: number };
} = {}) {
  const single = opts.single ?? { data: null, error: null };
  const list = opts.list ?? { data: [], error: null, count: 0 };
  const b: Record<string, unknown> = {
    select: jest.fn(() => b),
    insert: jest.fn(() => b),
    update: jest.fn(() => b),
    delete: jest.fn(() => b),
    eq: jest.fn(() => b),
    in: jest.fn(() => b),
    is: jest.fn(() => b),
    or: jest.fn(() => b),
    gte: jest.fn(() => b),
    lte: jest.fn(() => b),
    contains: jest.fn(() => b),
    order: jest.fn(() => b),
    limit: jest.fn(() => b),
    range: jest.fn(() => b),
    single: jest.fn().mockResolvedValue(single),
    maybeSingle: jest.fn().mockResolvedValue(single),
    then: jest.fn((cb: (r: unknown) => unknown) =>
      Promise.resolve(cb({ data: list.data, error: list.error, count: list.count ?? null }))),
  };
  return b;
}

/** Auth middleware verifies caller via from('users').single(); resolve to a valid user. */
function usersBuilder() {
  return builder({ single: { data: { id: UUIDS.owner }, error: null } });
}

function defaultFromImpl(table: string) {
  if (table === 'users') return usersBuilder();
  return builder();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation(defaultFromImpl);
  mockEvaluateRules.mockResolvedValue([]);
});

// ─── Suite: GET /agent/rules ─────────────────────────────────────

describe('GET /api/v1/agent/rules', () => {
  it('should list all rules for workspace', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') {
        return builder({
          list: {
            data: [mockRules.budgetControl, mockRules.roasMonitor, mockRules.highCPA],
            error: null,
            count: 3,
          },
        });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .get('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(3);
  });

  it('should return empty array when no rules exist', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') return builder({ list: { data: [], error: null, count: 0 } });
      return builder();
    });

    // Act
    const response = await request(app)
      .get('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/agent/rules');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /agent/rules ────────────────────────────────────

describe('POST /api/v1/agent/rules', () => {
  it('should create a new automation rule', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') {
        return builder({
          single: {
            data: {
              id: 'new-rule-id',
              workspace_id: mockWorkspaces.free.id,
              name: 'Test Budget Rule',
              conditions: [{ metric: 'spend_pct', operator: 'gte', value: 90 }],
              actions: [{ type: 'decrease_budget', params: { percentage: 20 } }],
              platforms: ['meta'],
              status: 'active',
              created_at: new Date().toISOString(),
            },
            error: null,
          },
        });
      }
      return builder();
    });

    // Act — route schema: { name, conditions[], actions[], platform?, ... }.
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Budget Rule',
        description: 'Reduce budget when spend exceeds 90%',
        platform: 'meta',
        conditions: [{ metric: 'spend_pct', operator: 'gte', value: 90 }],
        actions: [{ type: 'decrease_budget', params: { percentage: 20 } }],
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Budget Rule');
    expect(response.body.data.conditions).toHaveLength(1);
    expect(response.body.data.actions).toHaveLength(1);
  });

  it('should create rule with multiple conditions', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') {
        return builder({
          single: {
            data: {
              id: 'multi-condition-rule',
              workspace_id: mockWorkspaces.free.id,
              name: 'Multi-Condition Rule',
              conditions: [
                { metric: 'cpa', operator: 'gt', value: 15 },
                { metric: 'roas', operator: 'lt', value: 2 },
              ],
              actions: [{ type: 'create_draft', params: { notify: true } }],
              platforms: ['meta', 'google', 'tiktok', 'snap'],
              status: 'active',
              created_at: new Date().toISOString(),
            },
            error: null,
          },
        });
      }
      return builder();
    });

    // Act — platform 'all' expands to all four platforms in the DB row.
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Multi-Condition Rule',
        platform: 'all',
        conditions: [
          { metric: 'cpa', operator: 'gt', value: 15 },
          { metric: 'roas', operator: 'lt', value: 2 },
        ],
        actions: [{ type: 'create_draft', params: { notify: true } }],
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data.conditions).toHaveLength(2);
  });

  it('should validate required name field', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        conditions: [{ metric: 'spend', operator: 'gt', value: 100 }],
        actions: [{ type: 'notify', params: {} }],
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate conditions array', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Rule',
        conditions: 'not-an-array',
        actions: [{ type: 'notify', params: {} }],
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate actions array', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Rule',
        conditions: [{ metric: 'spend', operator: 'gt', value: 100 }],
        actions: 'not-an-array',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should default status to active', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') {
        return builder({ single: { data: { id: 'rule-id', status: 'active' }, error: null } });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Default Status Rule',
        conditions: [{ metric: 'spend', operator: 'gt', value: 100 }],
        actions: [{ type: 'notify', params: {} }],
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('active');
  });

  it('should default platforms to ["meta"]', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') {
        return builder({ single: { data: { id: 'rule-id', platforms: ['meta'] }, error: null } });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Default Platform Rule',
        conditions: [{ metric: 'spend', operator: 'gt', value: 100 }],
        actions: [{ type: 'notify', params: {} }],
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data.platforms).toEqual(['meta']);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .send({
        name: 'Test Rule',
        conditions: [{ metric: 'spend', operator: 'gt', value: 100 }],
        actions: [{ type: 'notify', params: {} }],
      });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: PUT /agent/rules/:id ─────────────────────────────────

describe('PUT /api/v1/agent/rules/:id', () => {
  it('should update an existing rule', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    const rulesBuilder = builder();
    // First single() (existence check) returns the rule id; second single()
    // (the update) returns the updated record.
    (rulesBuilder.single as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ data: { id: UUIDS.rule1 }, error: null })
      .mockResolvedValue({
        data: { ...mockRules.budgetControl, name: 'Updated Budget Control', status: 'paused' },
        error: null,
      });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') return rulesBuilder;
      return builder();
    });

    // Act
    const response = await request(app)
      .put(`/api/v1/agent/rules/${UUIDS.rule1}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Budget Control',
        status: 'paused',
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Budget Control');
    expect(response.body.data.status).toBe('paused');
  });

  it('should return 404 for non-existent rule', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') {
        return builder({ single: { data: null, error: { message: 'Not found' } } });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .put('/api/v1/agent/rules/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .put(`/api/v1/agent/rules/${UUIDS.rule1}`)
      .send({ name: 'Updated' });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should update only provided fields', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    const rulesBuilder = builder();
    (rulesBuilder.single as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ data: { id: UUIDS.rule1 }, error: null })
      .mockResolvedValue({
        data: { ...mockRules.budgetControl, description: 'Updated description only' },
        error: null,
      });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') return rulesBuilder;
      return builder();
    });

    // Act
    const response = await request(app)
      .put(`/api/v1/agent/rules/${UUIDS.rule1}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated description only' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// ─── Suite: DELETE /agent/rules/:id ──────────────────────────────

describe('DELETE /api/v1/agent/rules/:id', () => {
  it('should archive a rule', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'automation_rules') {
        return builder({ single: { data: { id: UUIDS.rule1, name: 'Budget Control' }, error: null } });
      }
      return builder();
    });

    // Act — DELETE soft-archives the rule.
    const response = await request(app)
      .delete(`/api/v1/agent/rules/${UUIDS.rule1}`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('archived');
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .delete(`/api/v1/agent/rules/${UUIDS.rule1}`);

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: GET /agent/status ────────────────────────────────────

describe('GET /api/v1/agent/status', () => {
  it('should return agent status', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      // automation_rules / audit_log counts, ai_credits single
      if (table === 'ai_credits') {
        return builder({ single: { data: { credits_used: 10, credits_limit: 100 }, error: null } });
      }
      return builder({ list: { data: [], error: null, count: 0 } });
    });

    // Act
    const response = await request(app)
      .get('/api/v1/agent/status')
      .set('Authorization', `Bearer ${token}`);

    // Assert — the status route returns isRunning/rulesActive/nextRunAt/etc.
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isRunning).toBe(true);
    expect(response.body.data.nextRunAt).toBeDefined();
    expect(typeof response.body.data.rulesActive).toBe('number');
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/agent/status');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /agent/run-now ──────────────────────────────────

describe('POST /api/v1/agent/run-now', () => {
  it('should trigger manual rule evaluation', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);
    // RuleEvaluator.evaluateRules returns an array of per-rule results.
    mockEvaluateRules.mockResolvedValueOnce([
      { ruleId: 'r1', ruleName: 'Rule 1', triggered: true, matchedCampaigns: ['c1'], draftsCreated: ['d1'] },
      { ruleId: 'r2', ruleName: 'Rule 2', triggered: true, matchedCampaigns: ['c2'], draftsCreated: ['d2'] },
      { ruleId: 'r3', ruleName: 'Rule 3', triggered: true, matchedCampaigns: ['c3'], draftsCreated: ['d3'] },
    ]);

    // Act
    const response = await request(app)
      .post('/api/v1/agent/run-now')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.triggered).toBe(3);
    expect(response.body.data.draftsCreated).toBe(3);
    expect(response.body.message).toContain('3 triggered');
  });

  it('should handle zero triggered rules', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);
    mockEvaluateRules.mockResolvedValueOnce([]);

    // Act
    const response = await request(app)
      .post('/api/v1/agent/run-now')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.triggered).toBe(0);
    expect(response.body.data.draftsCreated).toBe(0);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/agent/run-now');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should handle evaluation errors gracefully', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);
    mockEvaluateRules.mockRejectedValueOnce(new Error('Evaluation failed'));

    // Act
    const response = await request(app)
      .post('/api/v1/agent/run-now')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: GET /agent/logs ──────────────────────────────────────

describe('GET /api/v1/agent/logs', () => {
  it('should return AI action logs', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'ai_action_logs') {
        return builder({
          list: {
            data: [
              { id: 'log1', action: 'Pause campaign', status: 'success', created_at: '2024-06-01T10:00:00.000Z' },
              { id: 'log2', action: 'Reduce budget', status: 'success', created_at: '2024-06-01T09:00:00.000Z' },
            ],
            error: null,
            count: 2,
          },
        });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .get('/api/v1/agent/logs')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBe(2);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/agent/logs');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
