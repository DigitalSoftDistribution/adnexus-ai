// ============================================
// AdNexus AI — E2E Campaign CRUD Tests
// ============================================
// End-to-end tests for campaign management covering list, get, create,
// update, delete, pause, filters, pagination, and authorization.
//
// IMPORTANT: All mutating operations (create, update, delete, pause)
// go through the DRAFT workflow — they do NOT directly modify campaigns.

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import {
  setupTestDB,
  teardownTestDB,
  cleanupTables,
  createTestUser,
  createTestUsers,
  createTestWorkspace,
  addUserToWorkspace,
  generateAuthToken,
  createTestCampaign,
  buildE2EMockFrom,
  listTestCampaigns,
  findTestCampaignById,
  type TestUser,
  type TestWorkspace,
  type TestCampaign,
} from './setup';
import { UUIDS, mockCampaigns, mockAdAccounts } from '../fixtures/data';

// ─── Mock Supabase with E2E Store ────────────────────────────────

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

// ─── Mock raw-SQL `query()` with the same in-memory store ────────
//
// The v1 campaigns route (`src/routes/campaigns.ts`) does NOT use Supabase for
// its READ paths — it calls `query(sql, params)` from `src/db/connection`
// (raw PostgreSQL). The Supabase mock above never intercepts those reads, so
// without this mock the route attempts a real PG connection and hangs.
//
// This mock inspects the SQL string + params and returns store-backed
// `{ rows, rowCount }` from the SAME `testStore.campaigns` that `setup.ts`
// populates via `createTestCampaign`. It supports the exact queries the route
// (and the ownership/draft helpers) issue:
//   • ad_accounts platform lookup (getAdAccountPlatform)
//   • campaign+ad_account JOIN ownership lookup (verifyCampaignWorkspace)
//   • COUNT(*) for list pagination
//   • paginated data SELECT (LIMIT/OFFSET)
//   • single campaign by id
//   • adsets / ads / campaign_metrics (empty result sets — no fixtures stored)
//
// NOTE: mutations (create/update/delete/pause) go through `createDraft()` which
// uses Supabase (already mocked above), so they are NOT handled here.
const mockQuery = jest.fn();

jest.mock('../../src/db/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

interface QueryResultLike {
  rows: Record<string, unknown>[];
  rowCount: number;
}

const result = (rows: Record<string, unknown>[]): QueryResultLike => ({
  rows,
  rowCount: rows.length,
});

/**
 * Project a stored TestCampaign (camelCase) into the snake_case row the route
 * reads from `query()` (it does `SELECT c.*, a.platform, ...`).
 */
function campaignToRow(c: TestCampaign): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective,
    daily_budget: c.dailyBudget,
    platform: c.platform,
    workspace_id: c.workspaceId,
    ad_account_id: c.adAccountId,
    // platform_campaign_id is required by verifyCampaignWorkspace's return.
    platform_campaign_id: `pcid-${c.id}`,
    ad_account_account_id: 'act_1234567890',
    ad_account_name: 'Meta Ad Account',
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    roas: 0,
    conversions: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * The raw-SQL mock implementation. Branches on a normalized (whitespace-
 * collapsed, lowercased) SQL string. `params` carry the bound values.
 */
function runQueryMock(sql: string, params: unknown[] = []): QueryResultLike {
  const s = sql.replace(/\s+/g, ' ').trim().toLowerCase();

  // ── ad_accounts platform lookup (getAdAccountPlatform) ──
  // SELECT platform FROM ad_accounts WHERE id = $1 AND workspace_id = $2
  if (s.includes('from ad_accounts') && s.includes('select platform')) {
    const adAccountId = params[0];
    // The route only stores UUIDS.metaAccount as a valid Meta account in tests.
    if (adAccountId === UUIDS.metaAccount) {
      return result([{ platform: 'meta' }]);
    }
    // Unknown ad account → NotFound (route throws when rows.length === 0).
    return result([]);
  }

  // ── verifyCampaignWorkspace: campaigns JOIN ad_accounts by campaign id ──
  // SELECT c.id, c.name, a.platform, c.platform_campaign_id, c.status ...
  if (
    s.includes('from campaigns c') &&
    s.includes('join ad_accounts a') &&
    s.includes('where c.id = $1') &&
    s.includes('c.platform_campaign_id')
  ) {
    const campaignId = params[0] as string;
    const c = findTestCampaignById(campaignId);
    if (!c) return result([]);
    const row = campaignToRow(c);
    return result([
      {
        id: row.id,
        name: row.name,
        platform: row.platform,
        platform_campaign_id: row.platform_campaign_id,
        status: row.status,
      },
    ]);
  }

  // ── List: COUNT(*) for pagination ──
  if (s.includes('count(*)') && s.includes('from campaigns c') && s.includes('join ad_accounts a')) {
    const rows = listTestCampaigns().map(campaignToRow);
    return result([{ total: rows.length }]);
  }

  // ── Get single campaign by id (GET /:id) ──
  // SELECT c.*, a.platform, a.name AS ad_account_name ... WHERE c.id = $1 AND a.workspace_id = $2
  if (
    s.includes('from campaigns c') &&
    s.includes('join ad_accounts a') &&
    s.includes('where c.id = $1') &&
    s.includes('a.name as ad_account_name')
  ) {
    const campaignId = params[0] as string;
    const c = findTestCampaignById(campaignId);
    if (!c) return result([]);
    return result([campaignToRow(c)]);
  }

  // ── List: paginated data SELECT (c.* + join, LIMIT/OFFSET) ──
  if (s.includes('from campaigns c') && s.includes('join ad_accounts a') && s.includes('limit')) {
    // Last two params are LIMIT then OFFSET.
    const offset = Number(params[params.length - 1] ?? 0);
    const limit = Number(params[params.length - 2] ?? 20);
    const all = listTestCampaigns().map(campaignToRow);
    return result(all.slice(offset, offset + limit));
  }

  // ── adsets / ads / campaign_metrics → empty (no fixtures stored) ──
  if (s.includes('from adsets') || s.includes('from ads') || s.includes('from campaign_metrics')) {
    return result([]);
  }

  // ── campaign duplicate detail SELECT ──
  if (s.includes('from campaigns') && s.includes('where id = $1') && s.includes('objective')) {
    const c = findTestCampaignById(params[0] as string);
    return result(c ? [campaignToRow(c)] : []);
  }

  // Default: empty result set (any unhandled read).
  return result([]);
}

// ─── Suite Setup ─────────────────────────────────────────────────

describe('E2E: Campaign CRUD', () => {
  let dbConfig: Awaited<ReturnType<typeof setupTestDB>>;
  let owner: TestUser;
  let admin: TestUser;
  let viewer: TestUser;
  let workspace: TestWorkspace;
  let ownerToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    dbConfig = await setupTestDB();
    mockFrom.mockImplementation(buildE2EMockFrom());
    mockQuery.mockImplementation((sql: string, params?: unknown[]) =>
      Promise.resolve(runQueryMock(sql, params)),
    );
  });

  afterAll(async () => {
    await teardownTestDB(dbConfig);
  });

  beforeEach(async () => {
    await cleanupTables(['all']);
    jest.clearAllMocks();

    // Create standard test users and workspace
    owner = await createTestUser({ email: 'owner-campaign@example.com', name: 'Campaign Owner', role: 'owner' });
    admin = await createTestUser({ email: 'admin-campaign@example.com', name: 'Campaign Admin', role: 'admin' });
    viewer = await createTestUser({ email: 'viewer-campaign@example.com', name: 'Campaign Viewer', role: 'viewer' });
    workspace = await createTestWorkspace({ ownerId: owner.id, name: 'Campaign Test Workspace' });

    await addUserToWorkspace(owner.id, workspace.id, 'owner');
    await addUserToWorkspace(admin.id, workspace.id, 'admin');
    await addUserToWorkspace(viewer.id, workspace.id, 'viewer');

    ownerToken = generateAuthToken(owner.id, 'owner', workspace.id);
    viewerToken = generateAuthToken(viewer.id, 'viewer', workspace.id);

    mockFrom.mockImplementation(buildE2EMockFrom());
    // jest.clearAllMocks() above wiped the implementation — re-arm it.
    mockQuery.mockImplementation((sql: string, params?: unknown[]) =>
      Promise.resolve(runQueryMock(sql, params)),
    );
  });

  // ─── GET /campaigns (List) ───────────────────────────────────

  describe('GET /api/v1/campaigns', () => {
    it('should list campaigns and return 200 with paginated results', async () => {
      // Arrange: create multiple campaigns
      await createTestCampaign(workspace.id, { name: 'Campaign Alpha', status: 'active', platform: 'meta' });
      await createTestCampaign(workspace.id, { name: 'Campaign Beta', status: 'paused', platform: 'meta' });
      await createTestCampaign(workspace.id, { name: 'Campaign Gamma', status: 'active', platform: 'google' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
      // Realigned: the v1 route emits a FLAT pagination envelope
      // `{ success, data, total, page, totalPages }` (campaigns.ts:155-161),
      // NOT a nested `pagination` object. Assert the real fields.
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should filter campaigns by platform', async () => {
      // Arrange
      await createTestCampaign(workspace.id, { name: 'Meta Campaign 1', status: 'active', platform: 'meta' });
      await createTestCampaign(workspace.id, { name: 'Meta Campaign 2', status: 'active', platform: 'meta' });
      await createTestCampaign(workspace.id, { name: 'Google Campaign', status: 'active', platform: 'google' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/campaigns?platform=meta')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter campaigns by status', async () => {
      // Arrange
      await createTestCampaign(workspace.id, { name: 'Active 1', status: 'active' });
      await createTestCampaign(workspace.id, { name: 'Active 2', status: 'active' });
      await createTestCampaign(workspace.id, { name: 'Paused 1', status: 'paused' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/campaigns?status=active')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter campaigns by search query', async () => {
      // Arrange
      await createTestCampaign(workspace.id, { name: 'Summer Sale 2024', status: 'active' });
      await createTestCampaign(workspace.id, { name: 'Winter Promo', status: 'active' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/campaigns?q=Summer')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should paginate campaigns correctly', async () => {
      // Arrange: create 5 campaigns
      for (let i = 1; i <= 5; i++) {
        await createTestCampaign(workspace.id, { name: `Paginated Campaign ${i}`, status: 'active' });
      }

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act: page 1, limit 2
      const response = await request(app)
        .get('/api/v1/campaigns?page=1&limit=2')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      // Realigned to the route's FLAT envelope (campaigns.ts:155-161).
      // `limit` is not echoed back by the route, so we assert page size via
      // the returned data length instead. totalPages = ceil(5/2) = 3.
      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.data.length).toBe(2);
      expect(response.body.total).toBe(5);
      expect(response.body.totalPages).toBe(3);
    });

    it('should return empty array when no campaigns exist', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/campaigns');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── GET /campaigns/:id ──────────────────────────────────────

  describe('GET /api/v1/campaigns/:id', () => {
    it('should get a campaign by id and return 200', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, {
        name: 'Get Test Campaign',
        status: 'active',
        objective: 'CONVERSIONS',
        dailyBudget: 250,
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(campaign.id);
    });

    it('should return 404 for non-existent campaign', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/campaigns/non-existent-campaign-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .get(`/api/v1/campaigns/${UUIDS.campaign1}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /campaigns (Create) ────────────────────────────────

  describe('POST /api/v1/campaigns', () => {
    it('should create campaign and return 201 with DRAFT (not live campaign)', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${ownerToken}`)
        // Realigned to the v1 route's actual create schema (campaigns.ts:327-340):
        // camelCase keys, required `platform`, `adAccountId` (uuid), `budget`.
        // The schema is `.strict()` so snake_case keys (ad_account_id/daily_budget)
        // are rejected with 400.
        .send({
          adAccountId: UUIDS.metaAccount,
          name: 'New Test Campaign',
          platform: 'meta',
          objective: 'CONVERSIONS',
          budget: 200,
        });

      // Assert: Must return a DRAFT, not a campaign
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.draft_type).toBe('campaign_create');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.message.toLowerCase()).toContain('draft');
    });

    it('should NOT create a live campaign directly', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${ownerToken}`)
        // Realigned to the route's actual create schema. `status` is NOT an
        // accepted create field (the route is draft-first and rejects unknown
        // keys), so it is omitted — the response is still a pending draft.
        .send({
          adAccountId: UUIDS.metaAccount,
          name: 'Should Be Draft',
          platform: 'meta',
          objective: 'CONVERSIONS',
        });

      // Assert: Must be a draft, not a live campaign
      expect(response.status).toBe(201);
      expect(response.body.data.draft_type).toBeDefined();
      expect(response.body.data.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      // Arrange
      const token = generateAuthToken(owner.id, 'owner', workspace.id);

      // Act - missing name
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ad_account_id: UUIDS.metaAccount,
          objective: 'CONVERSIONS',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate ad_account_id format', async () => {
      // Arrange
      const token = generateAuthToken(owner.id, 'owner', workspace.id);

      // Act
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ad_account_id: 'not-a-uuid',
          name: 'Invalid Account',
          objective: 'CONVERSIONS',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate daily_budget is positive', async () => {
      // Arrange
      const token = generateAuthToken(owner.id, 'owner', workspace.id);

      // Act
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ad_account_id: UUIDS.metaAccount,
          name: 'Negative Budget',
          objective: 'CONVERSIONS',
          daily_budget: -50,
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/campaigns')
        .send({
          ad_account_id: UUIDS.metaAccount,
          name: 'No Auth Campaign',
          objective: 'CONVERSIONS',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── PUT /campaigns/:id (Update) ─────────────────────────────

  describe('PUT /api/v1/campaigns/:id', () => {
    it('should update campaign and return 200 with DRAFT', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, {
        name: 'Update Test Campaign',
        status: 'active',
        objective: 'CONVERSIONS',
        dailyBudget: 100,
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .put(`/api/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        // Realigned to the route's update schema (campaigns.ts:397-409):
        // camelCase, `.strict()`, uses `budget` (not `daily_budget`).
        .send({
          name: 'Updated Campaign Name',
          budget: 300,
        });

      // Assert: Must return a DRAFT for the update. With both name + budget
      // changing, the route picks `budget_change` as the draft type
      // (campaigns.ts:469-482); `name_change` if only the name changed.
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.draft_type).toMatch(/name_change|budget_change/);
      expect(response.body.data.status).toBe('pending');
    });

    it('should return 404 for non-existent campaign', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .put('/api/v1/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Should Not Update',
        });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should validate daily_budget is positive', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, { name: 'Budget Test' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .put(`/api/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          daily_budget: -100,
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .put(`/api/v1/campaigns/${UUIDS.campaign1}`)
        .send({ name: 'No Auth Update' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── DELETE /campaigns/:id ───────────────────────────────────

  describe('DELETE /api/v1/campaigns/:id', () => {
    it('should delete campaign and return 200 with DRAFT', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, {
        name: 'Delete Test Campaign',
        status: 'active',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .delete(`/api/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert: Must return a DRAFT for the delete
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.draft_type).toMatch(/campaign_delete|status_change/);
      expect(response.body.data.status).toBe('pending');
    });

    it('should return 404 for non-existent campaign', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .delete('/api/v1/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/v1/campaigns/${UUIDS.campaign1}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /campaigns/:id/pause ───────────────────────────────

  describe('POST /api/v1/campaigns/:id/pause', () => {
    it('should pause campaign and return 200 with DRAFT', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, {
        name: 'Pause Test Campaign',
        status: 'active',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/campaigns/${campaign.id}/pause`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert: Must return a DRAFT for the pause
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.draft_type).toMatch(/status_change|campaign_pause/);
      expect(response.body.data.status).toBe('pending');
    });

    it('should return 404 for non-existent campaign', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/campaigns/non-existent-id/pause')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post(`/api/v1/campaigns/${UUIDS.campaign1}/pause`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── Authorization & Roles ───────────────────────────────────

  describe('authorization and role-based access', () => {
    it('should allow owner to create campaign draft', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${ownerToken}`)
        // Realigned to the route's actual camelCase create schema.
        .send({
          adAccountId: UUIDS.metaAccount,
          name: 'Owner Campaign',
          platform: 'meta',
          objective: 'CONVERSIONS',
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should allow admin to create campaign draft', async () => {
      // Arrange
      const adminToken = generateAuthToken(admin.id, 'admin', workspace.id);
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        // Realigned to the route's actual camelCase create schema.
        .send({
          adAccountId: UUIDS.metaAccount,
          name: 'Admin Campaign',
          platform: 'meta',
          objective: 'CONVERSIONS',
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should deny viewer from creating campaign (403)', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          ad_account_id: UUIDS.metaAccount,
          name: 'Viewer Campaign',
          objective: 'CONVERSIONS',
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny viewer from updating campaign (403)', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, { name: 'Viewer Update Test' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .put(`/api/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Should Not Update' });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny viewer from deleting campaign (403)', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, { name: 'Viewer Delete Test' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .delete(`/api/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny viewer from pausing campaign (403)', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, { name: 'Viewer Pause Test' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/campaigns/${campaign.id}/pause`)
        .set('Authorization', `Bearer ${viewerToken}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow viewer to list campaigns (read access)', async () => {
      // Arrange
      await createTestCampaign(workspace.id, { name: 'Viewer List Test' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${viewerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow viewer to get a single campaign (read access)', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, { name: 'Viewer Get Test' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ─── GET /campaigns/:id/insights ─────────────────────────────

  describe('GET /api/v1/campaigns/:id/insights', () => {
    it('should return campaign insights', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, {
        name: 'Insights Test Campaign',
        status: 'active',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaign.id}/insights`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should accept date range parameters', async () => {
      // Arrange
      const campaign = await createTestCampaign(workspace.id, { name: 'Date Range Test' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaign.id}/insights?date_start=2024-01-01&date_end=2024-12-31`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent campaign insights', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/campaigns/non-existent/insights')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
