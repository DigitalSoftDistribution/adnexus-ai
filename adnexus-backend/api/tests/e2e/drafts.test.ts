// ============================================
// AdNexus AI — E2E Draft Workflow Tests
// ============================================
// End-to-end tests for the draft approval workflow covering list, create,
// approve, reject, cancel, and edge cases like non-existent drafts and
// duplicate approvals.

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import {
  setupTestDB,
  teardownTestDB,
  cleanupTables,
  createTestUser,
  createTestWorkspace,
  addUserToWorkspace,
  generateAuthToken,
  createTestDraft,
  buildE2EMockFrom,
  type TestUser,
  type TestWorkspace,
  type TestDraft,
} from './setup';
import { UUIDS, mockDrafts } from '../fixtures/data';

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

// ─── Mock Meta API ───────────────────────────────────────────────

jest.mock('../../src/services/meta-api', () => ({
  updateMetaCampaign: jest.fn().mockResolvedValue(undefined),
  createMetaCampaign: jest.fn().mockResolvedValue('new-campaign-id'),
}));

// ─── Suite Setup ─────────────────────────────────────────────────

describe('E2E: Draft Workflow', () => {
  let dbConfig: Awaited<ReturnType<typeof setupTestDB>>;
  let owner: TestUser;
  let admin: TestUser;
  let analyst: TestUser;
  let workspace: TestWorkspace;
  let ownerToken: string;
  let adminToken: string;

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
    owner = await createTestUser({ email: 'owner-draft@example.com', name: 'Draft Owner', role: 'owner' });
    admin = await createTestUser({ email: 'admin-draft@example.com', name: 'Draft Admin', role: 'admin' });
    analyst = await createTestUser({ email: 'analyst-draft@example.com', name: 'Draft Analyst', role: 'analyst' });
    workspace = await createTestWorkspace({ ownerId: owner.id, name: 'Draft Test Workspace' });

    await addUserToWorkspace(owner.id, workspace.id, 'owner');
    await addUserToWorkspace(admin.id, workspace.id, 'admin');
    await addUserToWorkspace(analyst.id, workspace.id, 'analyst');

    ownerToken = generateAuthToken(owner.id, 'owner', workspace.id);
    adminToken = generateAuthToken(admin.id, 'admin', workspace.id);

    mockFrom.mockImplementation(buildE2EMockFrom());
  });

  // ─── GET /drafts (List) ──────────────────────────────────────

  describe('GET /api/v1/drafts', () => {
    it('should list drafts and return 200', async () => {
      // Arrange: create multiple drafts
      await createTestDraft(workspace.id, { draftType: 'budget_change', status: 'pending', changeSummary: 'Draft 1' });
      await createTestDraft(workspace.id, { draftType: 'status_change', status: 'pending', changeSummary: 'Draft 2' });
      await createTestDraft(workspace.id, { draftType: 'budget_change', status: 'approved', changeSummary: 'Draft 3' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/drafts')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter drafts by status', async () => {
      // Arrange
      await createTestDraft(workspace.id, { status: 'pending', changeSummary: 'Pending Draft' });
      await createTestDraft(workspace.id, { status: 'approved', changeSummary: 'Approved Draft' });
      await createTestDraft(workspace.id, { status: 'rejected', changeSummary: 'Rejected Draft' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/drafts?status=pending')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter drafts by platform', async () => {
      // Arrange
      await createTestDraft(workspace.id, { platform: 'meta', changeSummary: 'Meta Draft' });
      await createTestDraft(workspace.id, { platform: 'google', changeSummary: 'Google Draft' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/drafts?platform=meta')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter drafts by draft_type', async () => {
      // Arrange
      await createTestDraft(workspace.id, { draftType: 'budget_change', changeSummary: 'Budget Draft' });
      await createTestDraft(workspace.id, { draftType: 'status_change', changeSummary: 'Status Draft' });
      await createTestDraft(workspace.id, { draftType: 'campaign_create', changeSummary: 'Create Draft' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/drafts?draft_type=budget_change')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should paginate drafts correctly', async () => {
      // Arrange: create 7 drafts
      for (let i = 1; i <= 7; i++) {
        await createTestDraft(workspace.id, { changeSummary: `Paginated Draft ${i}` });
      }

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act: page 2, limit 3
      const response = await request(app)
        .get('/api/v1/drafts?page=2&limit=3')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(3);
      expect(response.body.pagination.total).toBe(7);
      expect(response.body.pagination.total_pages).toBe(3);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/drafts');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── GET /drafts/stats ───────────────────────────────────────

  describe('GET /api/v1/drafts/stats', () => {
    it('should return draft statistics', async () => {
      // Arrange
      await createTestDraft(workspace.id, { status: 'pending' });
      await createTestDraft(workspace.id, { status: 'pending' });
      await createTestDraft(workspace.id, { status: 'approved' });
      await createTestDraft(workspace.id, { status: 'rejected' });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/drafts/stats')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/drafts/stats');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /drafts (Create) ───────────────────────────────────

  describe('POST /api/v1/drafts', () => {
    it('should create a new draft and return 201', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/drafts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          platform: 'meta',
          campaign_id: UUIDS.campaign1,
          draft_type: 'budget_change',
          change_summary: 'Increase budget by 20%',
          change_detail: { field: 'daily_budget', old_value: 100, new_value: 120 },
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.draft_type).toBe('budget_change');
    });

    it('should create a campaign_create draft', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/drafts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          platform: 'meta',
          draft_type: 'campaign_create',
          change_summary: 'Create new conversion campaign',
          change_detail: { name: 'New Campaign', objective: 'CONVERSIONS', daily_budget: 100 },
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.draft_type).toBe('campaign_create');
      expect(response.body.data.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      // Arrange
      const token = generateAuthToken(owner.id, 'owner', workspace.id);

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
      const token = generateAuthToken(owner.id, 'owner', workspace.id);

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
      const token = generateAuthToken(owner.id, 'owner', workspace.id);

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

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/drafts')
        .send({
          platform: 'meta',
          draft_type: 'budget_change',
          change_summary: 'Test',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /drafts/:id/approve ────────────────────────────────

  describe('POST /api/v1/drafts/:id/approve', () => {
    it('should approve a pending draft and return applied status', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'pending',
        draftType: 'budget_change',
        changeSummary: 'Approve this budget change',
        changeDetail: { field: 'daily_budget', old_value: 100, new_value: 120 },
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert: draft approved and applied
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.message.toLowerCase()).toContain('approved');
    });

    it('should reject approval of non-existent draft (404)', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/drafts/non-existent-draft-id/approve')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject approval of already approved draft (409)', async () => {
      // Arrange: create an already-approved draft
      const draft = await createTestDraft(workspace.id, {
        status: 'approved',
        draftType: 'budget_change',
        changeSummary: 'Already approved',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act: try to approve again
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should reject approval of already rejected draft (409)', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'rejected',
        draftType: 'budget_change',
        changeSummary: 'Already rejected',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should reject approval of cancelled draft (409)', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'cancelled',
        draftType: 'budget_change',
        changeSummary: 'Already cancelled',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should allow admin to approve a draft', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'pending',
        draftType: 'status_change',
        changeSummary: 'Admin approval test',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, { status: 'pending' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/approve`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /drafts/:id/reject ─────────────────────────────────

  describe('POST /api/v1/drafts/:id/reject', () => {
    it('should reject a pending draft and return rejected status', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'pending',
        draftType: 'budget_change',
        changeSummary: 'Reject this draft',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Too aggressive budget increase' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.message.toLowerCase()).toContain('reject');
    });

    it('should reject a pending draft without reason', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'pending',
        draftType: 'status_change',
        changeSummary: 'Reject without reason',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
    });

    it('should reject rejection of already-approved draft (400)', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'approved',
        draftType: 'budget_change',
        changeSummary: 'Already approved',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Should fail' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject rejection of already-rejected draft (400)', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'rejected',
        draftType: 'budget_change',
        changeSummary: 'Already rejected',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Should fail' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent draft', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/drafts/non-existent/reject')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Test' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, { status: 'pending' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/reject`)
        .send({ reason: 'Test' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /drafts/:id/cancel ─────────────────────────────────

  describe('POST /api/v1/drafts/:id/cancel', () => {
    it('should cancel a pending draft and return cancelled status', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'pending',
        draftType: 'budget_change',
        changeSummary: 'Cancel this draft',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should reject cancellation of already-approved draft (400)', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'approved',
        draftType: 'budget_change',
        changeSummary: 'Already approved',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject cancellation of already-rejected draft (400)', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'rejected',
        draftType: 'budget_change',
        changeSummary: 'Already rejected',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject cancellation of already-cancelled draft (400)', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'cancelled',
        draftType: 'budget_change',
        changeSummary: 'Already cancelled',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent draft', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post('/api/v1/drafts/non-existent/cancel')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, { status: 'pending' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/cancel`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── POST /drafts/:id/schedule ───────────────────────────────

  describe('POST /api/v1/drafts/:id/schedule', () => {
    it('should schedule a pending draft', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'pending',
        draftType: 'budget_change',
        changeSummary: 'Schedule this draft',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/schedule`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ execute_at: '2024-12-31T23:59:59.000Z' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('scheduled');
    });

    it('should reject scheduling with invalid datetime', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'pending',
        draftType: 'budget_change',
        changeSummary: 'Invalid schedule',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/schedule`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ execute_at: 'not-a-valid-date' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject scheduling non-pending draft', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        status: 'approved',
        draftType: 'budget_change',
        changeSummary: 'Already approved',
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/schedule`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ execute_at: '2024-12-31T23:59:59.000Z' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, { status: 'pending' });
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .post(`/api/v1/drafts/${draft.id}/schedule`)
        .send({ execute_at: '2024-12-31T23:59:59.000Z' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── GET /drafts/:id ─────────────────────────────────────────

  describe('GET /api/v1/drafts/:id', () => {
    it('should get a single draft by id', async () => {
      // Arrange
      const draft = await createTestDraft(workspace.id, {
        draftType: 'budget_change',
        status: 'pending',
        changeSummary: 'Get single draft test',
        changeDetail: { field: 'daily_budget', old_value: 50, new_value: 100 },
      });

      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get(`/api/v1/drafts/${draft.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(draft.id);
    });

    it('should return 404 for non-existent draft', async () => {
      // Arrange
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Act
      const response = await request(app)
        .get('/api/v1/drafts/non-existent-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .get(`/api/v1/drafts/${UUIDS.draft1}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ─── Complete Draft Workflow ─────────────────────────────────

  describe('complete draft lifecycle workflow', () => {
    it('should handle full create -> approve workflow', async () => {
      // Step 1: Create a draft
      const createResponse = await request(app)
        .post('/api/v1/drafts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          platform: 'meta',
          campaign_id: UUIDS.campaign1,
          draft_type: 'budget_change',
          change_summary: 'End-to-end budget increase',
          change_detail: { field: 'daily_budget', old_value: 100, new_value: 150 },
          ai_reasoning: 'High ROAS justifies budget increase',
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.status).toBe('pending');
      const draftId = createResponse.body.data.id;

      // Refresh mock for the approval step
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Step 2: Approve the draft
      const approveResponse = await request(app)
        .post(`/api/v1/drafts/${draftId}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.data.status).toBe('approved');
    });

    it('should handle full create -> reject workflow', async () => {
      // Step 1: Create a draft
      const createResponse = await request(app)
        .post('/api/v1/drafts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          platform: 'meta',
          campaign_id: UUIDS.campaign1,
          draft_type: 'status_change',
          change_summary: 'Pause underperforming campaign',
          change_detail: { field: 'status', old_value: 'ACTIVE', new_value: 'PAUSED' },
        });

      expect(createResponse.status).toBe(201);
      const draftId = createResponse.body.data.id;

      // Refresh mock
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Step 2: Reject the draft
      const rejectResponse = await request(app)
        .post(`/api/v1/drafts/${draftId}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Campaign performance is seasonal' });

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.data.status).toBe('rejected');
    });

    it('should handle full create -> cancel workflow', async () => {
      // Step 1: Create a draft
      const createResponse = await request(app)
        .post('/api/v1/drafts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          platform: 'meta',
          campaign_id: UUIDS.campaign1,
          draft_type: 'budget_change',
          change_summary: 'Budget change to cancel',
          change_detail: { field: 'daily_budget', old_value: 200, new_value: 300 },
        });

      expect(createResponse.status).toBe(201);
      const draftId = createResponse.body.data.id;

      // Refresh mock
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Step 2: Cancel the draft
      const cancelResponse = await request(app)
        .post(`/api/v1/drafts/${draftId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.data.status).toBe('cancelled');
    });

    it('should handle full create -> schedule -> approve workflow', async () => {
      // Step 1: Create a draft
      const createResponse = await request(app)
        .post('/api/v1/drafts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          platform: 'meta',
          campaign_id: UUIDS.campaign1,
          draft_type: 'budget_change',
          change_summary: 'Scheduled budget change',
          change_detail: { field: 'daily_budget', old_value: 100, new_value: 200 },
        });

      expect(createResponse.status).toBe(201);
      const draftId = createResponse.body.data.id;

      // Refresh mock
      mockFrom.mockImplementation(buildE2EMockFrom());

      // Step 2: Schedule the draft
      const scheduleResponse = await request(app)
        .post(`/api/v1/drafts/${draftId}/schedule`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ execute_at: '2024-12-31T23:59:59.000Z' });

      expect(scheduleResponse.status).toBe(200);
      expect(scheduleResponse.body.data.status).toBe('scheduled');
    });
  });
});
