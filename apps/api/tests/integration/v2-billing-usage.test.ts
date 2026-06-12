import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';
import { mockWorkspaces, UUIDS } from '../fixtures/data';
import { generateToken } from '../utils/helpers';

jest.mock('../../src/lib/supabase', () => {
  const from = jest.fn();
  const auth = {
    admin: { listUsers: jest.fn(), createUser: jest.fn(), getUserById: jest.fn() },
    signInWithPassword: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn(),
  };
  return { supabase: { from, auth } };
});

const mockWorkspacesFindFirst = jest.fn<() => Promise<unknown>>();
const mockCreditsFindFirst = jest.fn<() => Promise<unknown>>();

jest.mock('../../src/db', () => ({
  db: {
    query: {
      workspaces: { findFirst: (...a: unknown[]) => mockWorkspacesFindFirst(...(a as [])) },
      workspaceCredits: { findFirst: (...a: unknown[]) => mockCreditsFindFirst(...(a as [])) },
    },
    update: jest.fn(() => ({ set: () => ({ where: () => Promise.resolve(undefined) }) })),
    insert: jest.fn(() => ({ values: () => Promise.resolve(undefined) })),
  },
}));

jest.mock('../../src/db/schema', () => ({
  workspaces: { id: 'id' },
  workspaceCredits: { workspaceId: 'workspaceId' },
  auditLogs: {},
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockSupabase = (jest.requireMock('../../src/lib/supabase') as any).supabase;
const mockFrom = mockSupabase.from as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

function usersBuilder() {
  const b: Record<string, unknown> = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    single: jest.fn().mockResolvedValue({ data: { id: UUIDS.owner }, error: null }),
  };
  return b;
}

const WS_ID = mockWorkspaces.free.id;

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation(() => usersBuilder());
  mockWorkspacesFindFirst.mockResolvedValue(undefined);
  mockCreditsFindFirst.mockResolvedValue(undefined);
});

describe('GET /api/v2/billing/usage', () => {
  it('returns period totals in the v2 success/data envelope', async () => {
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);
    mockWorkspacesFindFirst.mockResolvedValue({
      id: WS_ID,
      name: 'Test Workspace',
      plan: 'free',
      subscriptionStatus: 'active',
      currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-30T23:59:59.000Z'),
    });
    mockCreditsFindFirst.mockResolvedValue({
      creativesUsed: 2,
      impressionsUsed: 100,
      aiCreditsUsed: 10,
    });

    const response = await request(app)
      .get('/api/v2/billing/usage')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      workspaceId: WS_ID,
      plan: 'free',
      period: {
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-06-30T23:59:59.000Z',
      },
      credits: {
        creativesUsed: 2,
        creativesTotal: 5,
        impressionsUsed: 100,
        impressionsTotal: 1000,
        aiCreditsUsed: 10,
        aiCreditsTotal: 50,
      },
      detailedBreakdownAvailable: false,
    });
  });

  it('returns 404 when workspace is missing', async () => {
    const token = generateToken(UUIDS.owner, 'owner', WS_ID);

    const response = await request(app)
      .get('/api/v2/billing/usage')
      .set('Authorization', `Bearer ${token}`)
      .set('x-workspace-id', WS_ID);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v2/billing/usage');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
