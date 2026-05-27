import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockRules, mockWorkspaces, UUIDS } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase ───────────────────────────────────────────────

const mockFrom = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ─── Mock Agent Engine ───────────────────────────────────────────

jest.mock('../../src/services/agent-engine', () => ({
  evaluateRules: jest.fn().mockResolvedValue({ triggered: 2, drafts: 2 }),
  runRuleCheck: jest.fn().mockResolvedValue(true),
}));

// ─── Suite: GET /agent/rules ─────────────────────────────────────

describe('GET /api/v1/agent/rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list all rules for workspace', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'automation_rules') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: [mockRules.budgetControl, mockRules.roasMonitor, mockRules.highCPA],
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
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
      if (table === 'automation_rules') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new automation rule', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'automation_rules') {
        return {
          insert: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
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
              }),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Budget Rule',
        description: 'Reduce budget when spend exceeds 90%',
        conditions: [{ metric: 'spend_pct', operator: 'gte', value: 90 }],
        actions: [{ type: 'decrease_budget', params: { percentage: 20 } }],
        platforms: ['meta'],
        status: 'active',
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
      if (table === 'automation_rules') {
        return {
          insert: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'multi-condition-rule',
                  workspace_id: mockWorkspaces.free.id,
                  name: 'Multi-Condition Rule',
                  conditions: [
                    { metric: 'cpa', operator: 'gt', value: 15 },
                    { metric: 'roas', operator: 'lt', value: 2 },
                  ],
                  actions: [{ type: 'create_draft', params: { notify: true } }],
                  platforms: ['meta', 'google'],
                  status: 'active',
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post('/api/v1/agent/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Multi-Condition Rule',
        conditions: [
          { metric: 'cpa', operator: 'gt', value: 15 },
          { metric: 'roas', operator: 'lt', value: 2 },
        ],
        actions: [{ type: 'create_draft', params: { notify: true } }],
        platforms: ['meta', 'google'],
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data.conditions).toHaveLength(2);
    expect(response.body.data.platforms).toEqual(['meta', 'google']);
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
      if (table === 'automation_rules') {
        return {
          insert: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 'rule-id', status: 'active' },
                error: null,
              }),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
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
      if (table === 'automation_rules') {
        return {
          insert: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 'rule-id', platforms: ['meta'] },
                error: null,
              }),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
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

// ─── Suite: PATCH /agent/rules/:id ───────────────────────────────

describe('PATCH /api/v1/agent/rules/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update an existing rule', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'automation_rules') {
        return {
          update: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockImplementation(() => ({
                select: jest.fn().mockImplementation(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { ...mockRules.budgetControl, name: 'Updated Budget Control', status: 'paused' },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .patch(`/api/v1/agent/rules/${UUIDS.rule1}`)
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
      if (table === 'automation_rules') {
        return {
          update: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockImplementation(() => ({
                select: jest.fn().mockImplementation(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                  }),
                })),
              })),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .patch('/api/v1/agent/rules/non-existent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .patch(`/api/v1/agent/rules/${UUIDS.rule1}`)
      .send({ name: 'Updated' });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should update only provided fields', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'automation_rules') {
        return {
          update: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockImplementation(() => ({
                select: jest.fn().mockImplementation(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { ...mockRules.budgetControl, description: 'Updated description only' },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .patch(`/api/v1/agent/rules/${UUIDS.rule1}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated description only' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// ─── Suite: DELETE /agent/rules/:id ──────────────────────────────

describe('DELETE /api/v1/agent/rules/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a rule', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'automation_rules') {
        return {
          delete: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .delete(`/api/v1/agent/rules/${UUIDS.rule1}`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('deleted');
  });
});

// ─── Suite: GET /agent/status ────────────────────────────────────

describe('GET /api/v1/agent/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return agent status', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .get('/api/v1/agent/status')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.is_running).toBe(true);
    expect(response.body.data.check_interval_minutes).toBe(15);
    expect(response.body.data.last_check).toBeDefined();
    expect(response.body.data.next_check).toBeDefined();
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger manual rule evaluation', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);
    const { evaluateRules } = jest.requireMock('../../src/services/agent-engine');
    evaluateRules.mockResolvedValueOnce({ triggered: 3, drafts: 3 });

    // Act
    const response = await request(app)
      .post('/api/v1/agent/run-now')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.triggered).toBe(3);
    expect(response.body.data.drafts).toBe(3);
    expect(response.body.message).toContain('3 triggered');
  });

  it('should handle zero triggered rules', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);
    const { evaluateRules } = jest.requireMock('../../src/services/agent-engine');
    evaluateRules.mockResolvedValueOnce({ triggered: 0, drafts: 0 });

    // Act
    const response = await request(app)
      .post('/api/v1/agent/run-now')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.triggered).toBe(0);
    expect(response.body.data.drafts).toBe(0);
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
    const { evaluateRules } = jest.requireMock('../../src/services/agent-engine');
    evaluateRules.mockRejectedValueOnce(new Error('Evaluation failed'));

    // Act
    const response = await request(app)
      .post('/api/v1/agent/run-now')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: GET /agent/optimizations ─────────────────────────────

describe('GET /api/v1/agent/optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return recent optimizations', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_log') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: [
              { id: 'opt1', action: 'Draft created: Pause campaign', action_category: 'agent_action', created_at: '2024-06-01T10:00:00.000Z' },
              { id: 'opt2', action: 'Draft created: Reduce budget', action_category: 'agent_action', created_at: '2024-06-01T09:00:00.000Z' },
            ],
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/agent/optimizations')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should limit to 50 optimizations', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_log') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockImplementation((n: number) => ({
            then: jest.fn().mockResolvedValue({
              data: Array(n).fill({ id: 'opt', action_category: 'agent_action' }),
              error: null,
            }),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/agent/optimizations')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeLessThanOrEqual(50);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/agent/optimizations');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
