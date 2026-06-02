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
      // List route returns pagination fields FLAT on the envelope
      // (total/page/totalPages) — matching the canonical integration contract.
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
      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.total).toBe(5);
      expect(response.body.totalPages).toBe(3);
      expect(response.body.data.length).toBe(2);
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
        .send({
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
          name: 'New Test Campaign',
          objective: 'CONVERSIONS',
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
        .send({
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
          name: 'Should Be Draft',
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
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
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
          adAccountId: 'not-a-uuid',
          platform: 'meta',
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
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
          name: 'Negative Budget',
          objective: 'CONVERSIONS',
          budget: -50,
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
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
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
        .send({
          name: 'Updated Campaign Name',
          budget: 300,
        });

      // Assert: Must return a DRAFT for the update
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.draft_type).toMatch(/campaign_update|budget_change/);
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
          budget: -100,
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
        .send({
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
          name: 'Owner Campaign',
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
        .send({
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
          name: 'Admin Campaign',
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
          adAccountId: UUIDS.metaAccount,
          platform: 'meta',
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
