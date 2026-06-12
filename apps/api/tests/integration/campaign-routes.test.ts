import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockCampaigns, mockWorkspaces, UUIDS, mockAdAccounts } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase ───────────────────────────────────────────────
//
// The campaign routes read campaign data via raw SQL (db/connection.query),
// but a few things still go through Supabase:
//   • the auth middleware verifies the caller via from('users').single()
//   • createDraft() (used by POST /campaigns) inserts into from('drafts') and
//     from('audit_log').
// jest.mock is hoisted, so the factory builds its own mocks and we retrieve the
// instances afterwards via jest.requireMock().

jest.mock('../../src/lib/supabase', () => {
  const from = jest.fn();
  const auth = {
    admin: {
      listUsers: jest.fn(),
      createUser: jest.fn(),
      deleteUser: jest.fn(),
      updateUserById: jest.fn(),
      getUserById: jest.fn(),
    },
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn(),
  };
  return { supabase: { from, auth } };
});

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockSupabase = (jest.requireMock('../../src/lib/supabase') as any).supabase;
const mockFrom = mockSupabase.from as jest.Mock;
// db/connection.query is mocked globally in tests/setup.ts; grab the same mock
// instance so each test can drive the SQL results the route reads.
const mockQuery = (jest.requireMock('../../src/db/connection') as any).query as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** No-op chainable query-builder for tables a test does not configure. */
function defaultBuilder() {
  const builder: Record<string, unknown> = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    range: jest.fn(() => builder),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((cb: (r: unknown) => unknown) => Promise.resolve(cb({ data: null, error: null }))),
  };
  return builder;
}

/**
 * Default from() implementation: the auth middleware looks the caller up via
 * from('users').select('id').eq().single(); resolve that to a valid user so
 * authenticated requests pass. Everything else falls back to a no-op builder.
 */
function defaultFromImpl(table: string) {
  if (table === 'users') {
    const builder = defaultBuilder();
    (builder.single as jest.Mock).mockResolvedValue({ data: { id: UUIDS.owner }, error: null });
    return builder;
  }
  if (table === 'workspace_members') {
    // requireRole() resolves the caller's role here; the suite authenticates as
    // the workspace owner, so return an owner membership.
    const builder = defaultBuilder();
    (builder.single as jest.Mock).mockResolvedValue({ data: { role: 'owner' }, error: null });
    return builder;
  }
  return defaultBuilder();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation(defaultFromImpl);
  // Default: every SQL query resolves empty. Tests override per-call.
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ─── Suite: GET /campaigns ───────────────────────────────────────

describe('GET /api/v1/campaigns', () => {
  it('should list campaigns for authenticated workspace', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Route runs: (1) COUNT query, (2) data query.
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          { ...mockCampaigns.highSpend, platform: 'meta' },
          { ...mockCampaigns.lowROAS, platform: 'meta' },
        ],
        rowCount: 2,
      });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBe(2);
    expect(response.body.page).toBe(1);
  });

  it('should filter campaigns by platform', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ ...mockCampaigns.highSpend, platform: 'meta' }],
        rowCount: 1,
      });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns?platform=meta')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should filter campaigns by status', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ ...mockCampaigns.highSpend, status: 'active', platform: 'meta' }],
        rowCount: 1,
      });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns?status=active')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should paginate campaigns', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 50 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ ...mockCampaigns.highSpend, platform: 'meta' }],
        rowCount: 1,
      });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns?page=2&limit=10')
      .set('Authorization', `Bearer ${token}`);

    // Assert — the list route returns pagination fields flat on the envelope.
    expect(response.status).toBe(200);
    expect(response.body.page).toBe(2);
    expect(response.body.total).toBe(50);
    expect(response.body.totalPages).toBe(5);
  });

  it('should require authentication', async () => {
    // Act
    const response = await request(app)
      .get('/api/v1/campaigns');

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: GET /campaigns/:id ───────────────────────────────────

describe('GET /api/v1/campaigns/:id', () => {
  it('should get a single campaign', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Route runs: (1) campaign lookup, (2) ad sets, (3) ads (only if ad sets).
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ ...mockCampaigns.highSpend, platform: 'meta', ad_account_name: 'Meta Ad Account' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ad sets

    // Act
    const response = await request(app)
      .get(`/api/v1/campaigns/${UUIDS.campaign1}`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(UUIDS.campaign1);
  });

  it('should return 404 for non-existent campaign', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Campaign lookup returns no rows → NotFoundError.
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /campaigns ──────────────────────────────────────

describe('POST /api/v1/campaigns', () => {
  it('should create a draft instead of live campaign', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // getAdAccountPlatform() runs a SQL lookup returning the ad account platform.
    mockQuery.mockResolvedValue({ rows: [{ platform: 'meta' }], rowCount: 1 });

    // createDraft() inserts via Supabase.
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users' || table === 'workspace_members') return defaultFromImpl(table);
      if (table === 'drafts') {
        return {
          insert: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'new-draft-id',
                  workspace_id: mockWorkspaces.free.id,
                  draft_type: 'campaign_create',
                  status: 'pending',
                  change_summary: 'Create campaign "Summer Sale 2024"',
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        };
      }
      return defaultBuilder();
    });

    // Act
    const response = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        adAccountId: UUIDS.metaAccount,
        platform: 'meta',
        name: 'Summer Sale 2024',
        objective: 'CONVERSIONS',
        budget: 200,
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.draft_type).toBe('campaign_create');
    expect(response.body.data.status).toBe('pending');
    expect(response.body.message).toContain('drafted');
  });

  it('should reject campaign creation when the plan quota is exhausted', async () => {
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ plan: 'free' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });

    const response = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        adAccountId: UUIDS.metaAccount,
        platform: 'meta',
        name: 'Over Limit Campaign',
        objective: 'CONVERSIONS',
      });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/Campaign limit reached/i);
  });

  it('should validate required fields', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act - missing name and platform
    const response = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        adAccountId: UUIDS.metaAccount,
        objective: 'CONVERSIONS',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate adAccountId is a valid UUID', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        adAccountId: 'not-a-uuid',
        platform: 'meta',
        name: 'Test Campaign',
        objective: 'CONVERSIONS',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate budget is positive', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        adAccountId: UUIDS.metaAccount,
        platform: 'meta',
        name: 'Test Campaign',
        objective: 'CONVERSIONS',
        budget: -100,
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not create live campaign directly (drafts only)', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockQuery.mockResolvedValue({ rows: [{ platform: 'meta' }], rowCount: 1 });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users' || table === 'workspace_members') return defaultFromImpl(table);
      if (table === 'drafts') {
        return {
          insert: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 'new-draft-id', status: 'pending', draft_type: 'campaign_create' },
                error: null,
              }),
            })),
          })),
        };
      }
      return defaultBuilder();
    });

    // Act — the route rejects unknown fields (.strict()), so a client cannot
    // sneak server-controlled fields like `status` through.
    const response = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        adAccountId: UUIDS.metaAccount,
        platform: 'meta',
        name: 'Test Campaign',
        objective: 'CONVERSIONS',
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.draft_type).toBe('campaign_create');
  });
});

// ─── Suite: GET /campaigns/:id/insights ──────────────────────────

describe('GET /api/v1/campaigns/:id/insights', () => {
  it('should return campaign insights', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Route runs: (1) verifyCampaignWorkspace, (2) totals, (3) daily breakdown.
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: UUIDS.campaign1,
          name: 'High Spend Campaign',
          platform: 'meta',
          platform_campaign_id: UUIDS.platformCampaign1,
          status: 'active',
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{
          total_impressions: 500000,
          total_clicks: 2500,
          total_spend: 450,
          total_conversions: 120,
          total_conversion_value: 1890,
          total_reach: 238095,
          avg_ctr: 0.5,
          avg_cpc: 0.18,
          avg_cpm: 0.9,
          avg_cpa: 3.75,
          avg_roas: 4.2,
          avg_frequency: 2.1,
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    // Act
    const response = await request(app)
      .get(`/api/v1/campaigns/${UUIDS.campaign1}/insights`)
      .set('Authorization', `Bearer ${token}`);

    // Assert — insights returns campaign_id, date_range, totals, daily.
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.campaign_id).toBe(UUIDS.campaign1);
    expect(response.body.data.totals).toBeDefined();
    expect(response.body.data.totals.total_spend).toBeDefined();
    expect(response.body.data.totals.total_impressions).toBeDefined();
    expect(response.body.data.totals.total_clicks).toBeDefined();
  });

  it('should accept date range parameters', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: UUIDS.campaign1,
          name: 'High Spend Campaign',
          platform: 'meta',
          platform_campaign_id: UUIDS.platformCampaign1,
          status: 'active',
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{}], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    // Act
    const response = await request(app)
      .get(`/api/v1/campaigns/${UUIDS.campaign1}/insights?dateFrom=2024-05-01&dateTo=2024-05-31`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.date_range.from).toBe('2024-05-01');
    expect(response.body.data.date_range.to).toBe('2024-05-31');
  });

  it('should return 404 for non-existent campaign insights', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // verifyCampaignWorkspace finds no rows → NotFoundError.
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns/00000000-0000-0000-0000-000000000000/insights')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
