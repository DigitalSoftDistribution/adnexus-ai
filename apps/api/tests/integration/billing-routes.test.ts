import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockWorkspaces, UUIDS, mockCreditUsageLog } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase ───────────────────────────────────────────────

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// ─── Suite: GET /billing/subscription ────────────────────────────

describe('GET /api/v1/billing/subscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return subscription details for free plan', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspaces') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { plan: 'free' },
            error: null,
          }),
        };
      }
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          eq2: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              credits_used: 45,
              credits_limit: 100,
            },
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/subscription')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.plan).toBe('free');
    expect(response.body.data.plan_name).toBe('Free');
    expect(response.body.data.price).toBe(0);
    expect(response.body.data.credits_used).toBe(45);
    expect(response.body.data.credits_limit).toBe(100);
    expect(response.body.data.credits_remaining).toBe(55);
    expect(response.body.data.month).toBeDefined();
  });

  it('should return subscription details for pro plan', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.pro.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspaces') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { plan: 'pro' },
            error: null,
          }),
        };
      }
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              credits_used: 850,
              credits_limit: 2000,
            },
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/subscription')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.plan).toBe('pro');
    expect(response.body.data.plan_name).toBe('Pro');
    expect(response.body.data.credits_limit).toBe(2000);
  });

  it('should handle missing credit record gracefully', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'workspaces') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { plan: 'free' },
            error: null,
          }),
        };
      }
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/subscription')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.credits_used).toBe(0);
    expect(response.body.data.credits_limit).toBe(100); // Free plan default
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/billing/subscription');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: GET /billing/credits ─────────────────────────────────

describe('GET /api/v1/billing/credits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return credit balance and usage breakdown', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              credits_used: 45,
              credits_limit: 100,
            },
            error: null,
          }),
        };
      }
      if (table === 'credit_usage_log') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: mockCreditUsageLog,
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/credits')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.balance).toBeDefined();
    expect(response.body.data.balance.used).toBe(45);
    expect(response.body.data.balance.limit).toBe(100);
    expect(response.body.data.balance.remaining).toBe(55);
    expect(response.body.data.by_feature).toBeDefined();
    expect(response.body.data.log).toBeDefined();
    expect(Array.isArray(response.body.data.log)).toBe(true);
  });

  it('should aggregate usage by feature correctly', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { credits_used: 55, credits_limit: 100 },
            error: null,
          }),
        };
      }
      if (table === 'credit_usage_log') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: [
              { id: '1', feature: 'morning_brief', credits_used: 8 },
              { id: '2', feature: 'morning_brief', credits_used: 8 },
              { id: '3', feature: 'ai_chat_query', credits_used: 3 },
              { id: '4', feature: 'ai_chat_query', credits_used: 3 },
              { id: '5', feature: 'ai_chat_query', credits_used: 3 },
            ],
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/credits')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.body.data.by_feature).toEqual({
      morning_brief: 16,
      ai_chat_query: 9,
    });
  });

  it('should handle month query parameter', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { credits_used: 80, credits_limit: 100 },
            error: null,
          }),
        };
      }
      if (table === 'credit_usage_log') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/credits?month=2024-05')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.balance.month).toBe('2024-05');
  });

  it('should handle missing credit data', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'credit_usage_log') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/billing/credits')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.balance.used).toBe(0);
    expect(response.body.data.balance.limit).toBe(100); // Free default
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/billing/credits');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /billing/use-credits ────────────────────────────

describe('POST /api/v1/billing/use-credits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should deduct credits for a feature', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { credits_used: 45, credits_limit: 100 },
            error: null,
          }),
        };
      }
      if (table === 'credit_usage_log') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    mockRpc.mockResolvedValue({ data: null, error: null });

    // Act
    const response = await request(app)
      .post('/api/v1/billing/use-credits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        feature: 'ai_chat_query',
        action: 'query',
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.credits_used).toBe(3); // ai_chat_query costs 3
  });

  it('should reject when credit limit exceeded', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { credits_used: 99, credits_limit: 100 },
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act - morning_brief costs 8 credits, 99 + 8 = 107 > 100
    const response = await request(app)
      .post('/api/v1/billing/use-credits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        feature: 'morning_brief',
        action: 'generate',
      });

    // Assert
    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('CREDIT_LIMIT');
  });

  it('should handle credit deduction with platform parameter', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { credits_used: 50, credits_limit: 100 },
            error: null,
          }),
        };
      }
      if (table === 'credit_usage_log') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    mockRpc.mockResolvedValue({ data: null, error: null });

    // Act
    const response = await request(app)
      .post('/api/v1/billing/use-credits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        feature: 'mcp_tool_call',
        action: 'call',
        platform: 'meta',
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.credits_used).toBe(2); // mcp_tool_call costs 2
  });

  it('should use default cost of 1 for unknown features', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { credits_used: 50, credits_limit: 100 },
            error: null,
          }),
        };
      }
      if (table === 'credit_usage_log') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    mockRpc.mockResolvedValue({ data: null, error: null });

    // Act
    const response = await request(app)
      .post('/api/v1/billing/use-credits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        feature: 'unknown_feature',
        action: 'test',
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.credits_used).toBe(1); // Default cost
  });

  it('should validate required feature field', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/billing/use-credits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'query',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate required action field', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/billing/use-credits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        feature: 'ai_chat_query',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should handle edge case of exactly at limit', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { credits_used: 100, credits_limit: 100 },
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act - Any additional usage should be rejected
    const response = await request(app)
      .post('/api/v1/billing/use-credits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        feature: 'ai_chat_query',
        action: 'query',
      });

    // Assert - 100 + 3 > 100
    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('CREDIT_LIMIT');
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/billing/use-credits')
      .send({
        feature: 'morning_brief',
        action: 'generate',
      });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: Credit Cost Mapping ──────────────────────────────────

describe('credit cost mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct costs for all known features', async () => {
    // Arrange
    const { CREDIT_COSTS } = require('../../src/types');

    // Assert - Verify the CREDIT_COSTS map from types
    expect(CREDIT_COSTS.morning_brief).toBe(8);
    expect(CREDIT_COSTS.ai_chat_query).toBe(3);
    expect(CREDIT_COSTS.creative_generation).toBe(15);
    expect(CREDIT_COSTS.campaign_analysis).toBe(10);
    expect(CREDIT_COSTS.anomaly_detection).toBe(12);
    expect(CREDIT_COSTS.report_generation).toBe(10);
    expect(CREDIT_COSTS.budget_optimization).toBe(8);
    expect(CREDIT_COSTS.audience_insight).toBe(5);
    expect(CREDIT_COSTS.ab_test_analysis).toBe(10);
    expect(CREDIT_COSTS.mcp_tool_call).toBe(2);
    expect(CREDIT_COSTS.audit_run).toBe(15);
  });
});
