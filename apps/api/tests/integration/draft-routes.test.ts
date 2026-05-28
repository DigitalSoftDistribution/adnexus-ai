import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockDrafts, mockWorkspaces, UUIDS, mockAdAccounts, mockCampaigns } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase ───────────────────────────────────────────────

const mockFrom = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ─── Mock Meta API ───────────────────────────────────────────────

jest.mock('../../src/services/meta-api', () => ({
  updateMetaCampaign: jest.fn().mockResolvedValue(undefined),
  createMetaCampaign: jest.fn().mockResolvedValue('new-campaign-id'),
}));

// ─── Suite: GET /drafts ──────────────────────────────────────────

describe('GET /api/v1/drafts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list drafts for workspace', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: [mockDrafts.pendingBudget, mockDrafts.pendingStatus],
            error: null,
            count: 2,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/drafts')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBe(2);
  });

  it('should filter drafts by status', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(function(this: unknown) {
            return {
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockReturnThis(),
              then: jest.fn().mockResolvedValue({
                data: [mockDrafts.pendingBudget],
                error: null,
                count: 1,
              }),
            };
          }),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/drafts?status=pending')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should filter drafts by platform', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(function(this: unknown) {
            return {
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockReturnThis(),
              then: jest.fn().mockResolvedValue({
                data: [mockDrafts.pendingBudget],
                error: null,
                count: 1,
              }),
            };
          }),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/drafts?platform=meta')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should paginate drafts', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: [mockDrafts.pendingBudget],
            error: null,
            count: 25,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/drafts?page=2&limit=5')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(5);
    expect(response.body.pagination.total).toBe(25);
    expect(response.body.pagination.total_pages).toBe(5);
  });
});

// ─── Suite: GET /drafts/stats ────────────────────────────────────

describe('GET /api/v1/drafts/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return draft statistics', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnThis(),
          head: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation(function(this: unknown, cb: (r: { count: number }) => unknown) {
            return Promise.resolve(cb({ count: 3 }));
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/drafts/stats')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(typeof response.body.data.pending).toBe('number');
    expect(typeof response.body.data.approved_today).toBe('number');
    expect(typeof response.body.data.rejected_today).toBe('number');
    expect(typeof response.body.data.auto_applied_today).toBe('number');
  });
});

// ─── Suite: POST /drafts ─────────────────────────────────────────

describe('POST /api/v1/drafts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          insert: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'new-draft-id',
                  workspace_id: mockWorkspaces.free.id,
                  draft_type: 'budget_change',
                  status: 'pending',
                  change_summary: 'Increase budget by 20%',
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'audit_log') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post('/api/v1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform: 'meta',
        campaign_id: UUIDS.campaign1,
        draft_type: 'budget_change',
        change_summary: 'Increase budget by 20%',
        change_detail: { field: 'daily_budget', old_value: 100, new_value: 120 },
        ai_reasoning: 'High ROAS suggests room for budget increase',
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.draft_type).toBe('budget_change');
  });

  it('should validate required fields', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act - missing change_summary
    const response = await request(app)
      .post('/api/v1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform: 'meta',
        draft_type: 'budget_change',
        change_detail: { field: 'daily_budget' },
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate platform enum', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform: 'invalid_platform',
        draft_type: 'budget_change',
        change_summary: 'Test',
        change_detail: {},
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate draft_type enum', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform: 'meta',
        draft_type: 'invalid_type',
        change_summary: 'Test',
        change_detail: {},
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /drafts/:id/approve ─────────────────────────────

describe('POST /api/v1/drafts/:id/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should approve a pending draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDrafts.pendingBudget, status: 'pending' as const },
                error: null,
              }),
            })),
          })),
          update: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              select: jest.fn().mockImplementation(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDrafts.pendingBudget, status: 'approved' as const, approver_id: UUIDS.owner },
                  error: null,
                }),
              })),
            })),
          })),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnThis(),
        };
      }
      if (table === 'ad_accounts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockAdAccounts.meta, error: null }),
        };
      }
      if (table === 'audit_log') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/approve`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('approved');
    expect(response.body.message).toContain('approved');
  });

  it('should reject approval of non-pending draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDrafts.approvedBudget, status: 'approved' as const },
                error: null,
              }),
            })),
          })),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft3}/approve`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 for non-existent draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Draft not found' },
              }),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post('/api/v1/drafts/non-existent/approve')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/approve`);

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /drafts/:id/reject ──────────────────────────────

describe('POST /api/v1/drafts/:id/reject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject a pending draft with reason', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDrafts.pendingBudget, status: 'pending' as const },
                error: null,
              }),
            })),
          })),
          update: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              select: jest.fn().mockImplementation(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDrafts.pendingBudget, status: 'rejected' as const, approver_id: UUIDS.owner, approval_note: 'Too aggressive' },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      if (table === 'audit_log') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Too aggressive' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('rejected');
    expect(response.body.message).toContain('rejected');
  });

  it('should reject a pending draft without reason', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDrafts.pendingBudget, status: 'pending' as const },
                error: null,
              }),
            })),
          })),
          update: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              select: jest.fn().mockImplementation(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDrafts.pendingBudget, status: 'rejected' as const, approver_id: UUIDS.owner },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      if (table === 'audit_log') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('rejected');
  });

  it('should reject rejection of already-approved draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDrafts.approvedBudget, status: 'approved' as const },
                error: null,
              }),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft3}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Should not work' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/reject`)
      .send({ reason: 'Test' });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /drafts/:id/schedule ────────────────────────────

describe('POST /api/v1/drafts/:id/schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should schedule a pending draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDrafts.pendingBudget, status: 'pending' as const },
                error: null,
              }),
            })),
          })),
          update: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              select: jest.fn().mockImplementation(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDrafts.pendingBudget, status: 'scheduled' as const, scheduled_at: '2024-06-15T09:00:00.000Z' },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/schedule`)
      .set('Authorization', `Bearer ${token}`)
      .send({ execute_at: '2024-06-15T09:00:00.000Z' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('scheduled');
    expect(response.body.message).toContain('scheduled');
  });

  it('should reject scheduling with invalid datetime', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/schedule`)
      .set('Authorization', `Bearer ${token}`)
      .send({ execute_at: 'not-a-valid-date' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject scheduling non-pending draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drafts') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDrafts.approvedBudget, status: 'approved' as const },
                error: null,
              }),
            })),
          })),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft3}/schedule`)
      .set('Authorization', `Bearer ${token}`)
      .send({ execute_at: '2024-06-15T09:00:00.000Z' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/schedule`)
      .send({ execute_at: '2024-06-15T09:00:00.000Z' });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
