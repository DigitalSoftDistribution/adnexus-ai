import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockCampaigns, mockWorkspaces, UUIDS, mockAdAccounts } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

// ─── Mock Supabase ───────────────────────────────────────────────

const mockFrom = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ─── Suite: GET /campaigns ───────────────────────────────────────

describe('GET /api/v1/campaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list campaigns for authenticated workspace', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: [
              { ...mockCampaigns.highSpend, ad_accounts: { platform: 'meta' } },
              { ...mockCampaigns.lowROAS, ad_accounts: { platform: 'meta' } },
            ],
            error: null,
            count: 2,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.pagination).toBeDefined();
  });

  it('should filter campaigns by platform', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({
              data: [{ ...mockCampaigns.highSpend, ad_accounts: { platform: 'meta' } }],
              error: null,
              count: 1,
            }),
          })),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
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

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(function(this: unknown) {
            return {
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockReturnThis(),
              then: jest.fn().mockResolvedValue({
                data: [{ ...mockCampaigns.highSpend, status: 'active', ad_accounts: { platform: 'meta' } }],
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
      .get('/api/v1/campaigns?status=active')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should paginate campaigns', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: [{ ...mockCampaigns.highSpend, ad_accounts: { platform: 'meta' } }],
            error: null,
            count: 50,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns?page=2&limit=10')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(10);
    expect(response.body.pagination.total).toBe(50);
    expect(response.body.pagination.total_pages).toBe(5);
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a single campaign', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockCampaigns.highSpend, ad_accounts: { workspace_id: mockWorkspaces.free.id, platform: 'meta' } },
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

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

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns/non-existent-id')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

// ─── Suite: POST /campaigns ──────────────────────────────────────

describe('POST /api/v1/campaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a draft instead of live campaign', async () => {
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
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ad_account_id: UUIDS.metaAccount,
        name: 'Summer Sale 2024',
        objective: 'CONVERSIONS',
        daily_budget: 200,
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.draft_type).toBe('campaign_create');
    expect(response.body.data.status).toBe('pending');
    expect(response.body.message).toContain('Draft');
  });

  it('should validate required fields', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

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

  it('should validate ad_account_id is a valid UUID', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ad_account_id: 'not-a-uuid',
        name: 'Test Campaign',
        objective: 'CONVERSIONS',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should validate daily_budget is positive', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    // Act
    const response = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ad_account_id: UUIDS.metaAccount,
        name: 'Test Campaign',
        objective: 'CONVERSIONS',
        daily_budget: -100,
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not create live campaign directly', async () => {
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
                  status: 'pending',
                  draft_type: 'campaign_create',
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
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ad_account_id: UUIDS.metaAccount,
        name: 'Test Campaign',
        objective: 'CONVERSIONS',
        status: 'active', // User wants active
      });

    // Assert
    expect(response.status).toBe(201);
    // Should be a draft, not a live campaign
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.draft_type).toBe('campaign_create');
  });
});

// ─── Suite: GET /campaigns/:id/insights ──────────────────────────

describe('GET /api/v1/campaigns/:id/insights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return campaign insights', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockCampaigns.highSpend,
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get(`/api/v1/campaigns/${UUIDS.campaign1}/insights`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.campaign_id).toBe(UUIDS.campaign1);
    expect(response.body.data.spend).toBeDefined();
    expect(response.body.data.impressions).toBeDefined();
    expect(response.body.data.clicks).toBeDefined();
    expect(response.body.data.ctr).toBeDefined();
  });

  it('should accept date range parameters', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockCampaigns.highSpend,
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get(`/api/v1/campaigns/${UUIDS.campaign1}/insights?date_start=2024-05-01&date_end=2024-05-31`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.date_range.start).toBe('2024-05-01');
    expect(response.body.data.date_range.end).toBe('2024-05-31');
  });

  it('should return 404 for non-existent campaign insights', async () => {
    // Arrange
    const token = generateToken(UUIDS.owner, 'owner', mockWorkspaces.free.id);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });

    // Act
    const response = await request(app)
      .get('/api/v1/campaigns/non-existent/insights')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
