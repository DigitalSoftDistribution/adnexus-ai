import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockDrafts, mockWorkspaces, UUIDS, mockAdAccounts, mockCampaigns } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase ───────────────────────────────────────────────
//
// The draft routes are entirely Supabase-backed (drafts, audit_log,
// notifications, plus the DraftExecutionEngine stores for campaigns/snapshots/
// execution_logs). jest.mock is hoisted, so the factory builds the mock and we
// grab the same `from` instance afterwards via jest.requireMock().

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

// ─── Mock the Meta platform client ───────────────────────────────
//
// The approve path drives the DraftExecutionEngine, which applies the change
// via MetaApiClient and then verifies by re-fetching the campaign. Return a
// campaign whose state matches the proposed budget (dailyBudget = 400, i.e.
// raw daily_budget = 40000 cents) so verification succeeds.
jest.mock('../../src/platforms/meta/client', () => ({
  MetaApiClient: jest.fn().mockImplementation(() => ({
    setAccessToken: jest.fn(),
    getCampaign: jest.fn().mockResolvedValue({
      id: '12020000000000001',
      name: 'High Spend Campaign',
      status: 'ACTIVE',
      daily_budget: 40000,
      lifetime_budget: undefined,
      account_id: 'act_1234567890',
    }),
    updateCampaign: jest.fn().mockResolvedValue(undefined),
  })),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockSupabase = (jest.requireMock('../../src/lib/supabase') as any).supabase;
const mockFrom = mockSupabase.from as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Generic chainable query-builder. Every chain method returns `this`, terminal
 * single()/maybeSingle() resolve to {data,error}, and awaiting the builder
 * (.then) resolves to {data,error,count}. Pass overrides for specific results.
 */
function builder(opts: {
  single?: { data: unknown; error: unknown };
  maybeSingle?: { data: unknown; error: unknown };
  list?: { data: unknown[]; error: unknown; count?: number };
} = {}) {
  const single = opts.single ?? { data: null, error: null };
  const maybeSingle = opts.maybeSingle ?? { data: null, error: null };
  const list = opts.list ?? { data: [], error: null, count: 0 };
  const b: Record<string, unknown> = {
    select: jest.fn(() => b),
    insert: jest.fn(() => b),
    update: jest.fn(() => b),
    delete: jest.fn(() => b),
    eq: jest.fn(() => b),
    neq: jest.fn(() => b),
    in: jest.fn(() => b),
    gte: jest.fn(() => b),
    lte: jest.fn(() => b),
    or: jest.fn(() => b),
    order: jest.fn(() => b),
    limit: jest.fn(() => b),
    range: jest.fn(() => b),
    single: jest.fn().mockResolvedValue(single),
    maybeSingle: jest.fn().mockResolvedValue(maybeSingle),
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
});

// ─── Suite: GET /drafts ──────────────────────────────────────────

describe('GET /api/v1/drafts', () => {
  it('should list drafts for workspace', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        // Used both for the paginated list query (await → .then with count) and
        // for the stats query (await → .then). Same shape works for both.
        return builder({
          list: { data: [mockDrafts.pendingBudget, mockDrafts.pendingStatus], error: null, count: 2 },
        });
      }
      return builder();
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
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({ list: { data: [mockDrafts.pendingBudget], error: null, count: 1 } });
      }
      return builder();
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
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({ list: { data: [mockDrafts.pendingBudget], error: null, count: 1 } });
      }
      return builder();
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
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({ list: { data: [mockDrafts.pendingBudget], error: null, count: 25 } });
      }
      return builder();
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
  it('should return draft statistics', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({
          list: {
            data: [
              { status: 'pending', created_at: '2024-06-01T00:00:00Z', resolved_at: null },
              { status: 'approved', created_at: '2024-06-01T00:00:00Z', resolved_at: '2024-06-01T01:00:00Z' },
              { status: 'rejected', created_at: '2024-06-01T00:00:00Z', resolved_at: '2024-06-01T02:00:00Z' },
            ],
            error: null,
            count: 3,
          },
        });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .get('/api/v1/drafts/stats')
      .set('Authorization', `Bearer ${token}`);

    // Assert — the stats route returns a status-count breakdown plus
    // avgApprovalTime; it does not return *_today fields.
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(typeof response.body.data.total).toBe('number');
    expect(typeof response.body.data.pending).toBe('number');
    expect(typeof response.body.data.approved).toBe('number');
    expect(typeof response.body.data.rejected).toBe('number');
  });
});

// ─── Suite: POST /drafts ─────────────────────────────────────────

describe('POST /api/v1/drafts', () => {
  it('should create a new draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({
          single: {
            data: {
              id: 'new-draft-id',
              workspace_id: mockWorkspaces.free.id,
              draft_type: 'budget_change',
              status: 'pending',
              change_summary: 'Increase budget by 20%',
              created_at: new Date().toISOString(),
            },
            error: null,
          },
        });
      }
      // audit_log / notifications / workspace_members all no-op
      return builder({ list: { data: [], error: null } });
    });

    // Act — the route's create schema uses { type, title, proposedChanges }.
    const response = await request(app)
      .post('/api/v1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform: 'meta',
        campaignId: UUIDS.campaign1,
        type: 'budget_change',
        title: 'Increase budget by 20%',
        proposedChanges: { field: 'daily_budget', old_value: 100, new_value: 120 },
        description: 'High ROAS suggests room for budget increase',
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

    // Act - missing title and proposedChanges
    const response = await request(app)
      .post('/api/v1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform: 'meta',
        type: 'budget_change',
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
        type: 'budget_change',
        title: 'Test',
        proposedChanges: {},
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate draft type enum', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/drafts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        platform: 'meta',
        type: 'invalid_type',
        title: 'Test',
        proposedChanges: {},
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /drafts/:id/approve ─────────────────────────────

describe('POST /api/v1/drafts/:id/approve', () => {
  it('should approve a pending draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // The approve path runs the full DraftExecutionEngine:
    //   load draft → validate (needs campaign) → snapshot → apply (platform
    //   client via ad_accounts oauth token) → mark approved.
    // created_at must be recent — the approve route rejects drafts older than 7
    // days as expired (mockDrafts fixtures use 2024 dates).
    const pendingDraft = {
      ...mockDrafts.pendingBudget,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      campaigns: { ...mockCampaigns.highSpend, platform: 'meta' },
    };
    const approvedDraft = {
      ...mockDrafts.pendingBudget,
      status: 'approved' as const,
      approver_id: UUIDS.owner,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({
          single: { data: pendingDraft, error: null },
          list: { data: [pendingDraft], error: null },
        });
      }
      if (table === 'campaigns') {
        return builder({
          single: { data: { ...mockCampaigns.highSpend, platform: 'meta' }, error: null },
        });
      }
      if (table === 'ad_accounts') {
        return builder({ single: { data: mockAdAccounts.meta, error: null } });
      }
      return builder({ list: { data: [], error: null } });
    });

    // The update().eq().select().single() that marks the draft approved needs
    // to resolve to the approved record. drafts builder's single() returns
    // pendingDraft, so override just the update terminal by re-stubbing.
    const draftsBuilder = builder({
      single: { data: approvedDraft, error: null },
      list: { data: [pendingDraft], error: null },
    });
    // First single() (load) should return pending; subsequent single() (update)
    // returns approved. Use mockResolvedValueOnce for the load, default approved.
    (draftsBuilder.single as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ data: pendingDraft, error: null })
      .mockResolvedValue({ data: approvedDraft, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') return draftsBuilder;
      if (table === 'campaigns') {
        return builder({ single: { data: { ...mockCampaigns.highSpend, platform: 'meta' }, error: null } });
      }
      if (table === 'ad_accounts') {
        return builder({ single: { data: mockAdAccounts.meta, error: null } });
      }
      return builder({ list: { data: [], error: null } });
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

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
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({
          single: { data: { ...mockDrafts.approvedBudget, status: 'approved', campaigns: null }, error: null },
        });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft3}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 for non-existent draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({ single: { data: null, error: { message: 'Draft not found' } } });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .post('/api/v1/drafts/00000000-0000-0000-0000-000000000000/approve')
      .set('Authorization', `Bearer ${token}`)
      .send({});

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
  it('should reject a pending draft with reason', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    const draftsBuilder = builder();
    (draftsBuilder.single as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ data: { ...mockDrafts.pendingBudget, status: 'pending' }, error: null })
      .mockResolvedValue({
        data: { ...mockDrafts.pendingBudget, status: 'rejected', approver_id: UUIDS.owner, approval_note: 'Too aggressive' },
        error: null,
      });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') return draftsBuilder;
      return builder({ list: { data: [], error: null } });
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

  it('should reject without a reason (validation error)', async () => {
    // Arrange — the reject route requires a non-empty reason.
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject rejection of already-approved draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({ single: { data: { ...mockDrafts.approvedBudget, status: 'approved' }, error: null } });
      }
      return builder();
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
  it('should schedule a pending draft', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();

    const draftsBuilder = builder();
    (draftsBuilder.single as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ data: { ...mockDrafts.pendingBudget, status: 'pending' }, error: null })
      .mockResolvedValue({
        data: { ...mockDrafts.pendingBudget, status: 'scheduled', scheduled_at: futureDate },
        error: null,
      });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') return draftsBuilder;
      return builder();
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/schedule`)
      .set('Authorization', `Bearer ${token}`)
      .send({ execute_at: futureDate });

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
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder();
      if (table === 'drafts') {
        return builder({ single: { data: { ...mockDrafts.approvedBudget, status: 'approved' }, error: null } });
      }
      return builder();
    });

    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft3}/schedule`)
      .set('Authorization', `Bearer ${token}`)
      .send({ execute_at: futureDate });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should require authentication', async () => {
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    // Act
    const response = await request(app)
      .post(`/api/v1/drafts/${UUIDS.draft1}/schedule`)
      .send({ execute_at: futureDate });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
