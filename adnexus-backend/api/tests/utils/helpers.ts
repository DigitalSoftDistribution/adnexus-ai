// ============================================
// AdNexus AI — Test Helpers
// ============================================

import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../../src/config';
import type { JWTPayload, WorkspaceRole } from '../../src/types';
import { mockUsers, mockWorkspaces, UUIDS } from '../fixtures/data';

// ─── JWT Token Generation ────────────────────────────────────────

/**
 * Generate a JWT token for testing with the given user and role.
 */
export function generateToken(userId: string, role: WorkspaceRole = 'owner', workspaceId?: string): string {
  const user = Object.values(mockUsers).find(u => u.id === userId) ?? mockUsers.owner;
  const wsId = workspaceId ?? mockWorkspaces.free.id;

  return jwt.sign(
    {
      sub: userId,
      email: user.email,
      workspace_id: wsId,
      role,
    },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
}

/**
 * Generate an expired JWT token for testing.
 */
export function generateExpiredToken(userId: string, role: WorkspaceRole = 'owner', workspaceId?: string): string {
  const user = Object.values(mockUsers).find(u => u.id === userId) ?? mockUsers.owner;
  const wsId = workspaceId ?? mockWorkspaces.free.id;

  return jwt.sign(
    {
      sub: userId,
      email: user.email,
      workspace_id: wsId,
      role,
      iat: Math.floor(Date.now() / 1000) - 86400,
      exp: Math.floor(Date.now() / 1000) - 3600,
    },
    config.jwt.secret,
  );
}

/**
 * Generate a malformed/corrupted JWT token.
 */
export function generateMalformedToken(): string {
  return 'this.is.not.a.valid.jwt.token';
}

/**
 * Generate a JWT signed with a different secret.
 */
export function generateWrongSecretToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      email: 'test@example.com',
      workspace_id: mockWorkspaces.free.id,
      role: 'owner' as WorkspaceRole,
    },
    'wrong-secret-key',
    { expiresIn: '7d' }
  );
}

// ─── Express Request Mock ────────────────────────────────────────

export interface MockRequestOverrides {
  user?: Partial<JWTPayload>;
  workspaceId?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  ip?: string;
}

/**
 * Create a mock Express request object for unit tests.
 */
export function createMockRequest(overrides: MockRequestOverrides = {}): Request {
  const defaultUser: JWTPayload = {
    sub: UUIDS.owner,
    email: mockUsers.owner.email,
    workspace_id: mockWorkspaces.free.id,
    role: 'owner',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 604800,
  };

  return {
    user: overrides.user ? { ...defaultUser, ...overrides.user } as JWTPayload : defaultUser,
    workspaceId: overrides.workspaceId ?? mockWorkspaces.free.id,
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    params: overrides.params ?? {},
    headers: {
      authorization: `Bearer ${generateToken(UUIDS.owner, 'owner')}`,
      'content-type': 'application/json',
      ...overrides.headers,
    },
    ip: overrides.ip ?? '127.0.0.1',
    method: 'GET',
    url: '/test',
    path: '/test',
    // Minimal mock for remaining Request properties
    get: jest.fn().mockImplementation((header: string) => {
      return overrides.headers?.[header.toLowerCase()] ?? null;
    }) as unknown as Request['get'],
    header: jest.fn() as unknown as Request['header'],
    accepts: jest.fn() as unknown as Request['accepts'],
    acceptsCharsets: jest.fn() as unknown as Request['acceptsCharsets'],
    acceptsEncodings: jest.fn() as unknown as Request['acceptsEncodings'],
    acceptsLanguages: jest.fn() as unknown as Request['acceptsLanguages'],
    range: jest.fn() as unknown as Request['range'],
    // Required Request properties
    app: {} as unknown as Request['app'],
    baseUrl: '',
    fresh: false,
    hostname: 'localhost',
    protocol: 'http',
    secure: false,
    originalUrl: '/test',
    route: {} as unknown as Request['route'],
    stale: false,
    subdomains: [],
    xhr: false,
    cookies: {},
    signedCookies: {},
  } as unknown as Request;
}

/**
 * Create a mock Express request WITHOUT authentication.
 */
export function createUnauthenticatedMockRequest(overrides: Omit<MockRequestOverrides, 'user'> = {}): Request {
  return {
    ...createMockRequest(overrides),
    user: undefined,
    workspaceId: undefined,
    headers: {
      'content-type': 'application/json',
      ...overrides.headers,
    },
  } as unknown as Request;
}

// ─── Express Response Mock ───────────────────────────────────────

/**
 * Create a mock Express response object with Jest spy functions.
 */
export function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    locals: {},
    app: {} as unknown as Response['app'],
    headersSent: false,
    locals_: {},
  } as unknown as Response;

  return res;
}

// ─── Express NextFunction Mock ───────────────────────────────────

/**
 * Create a mock Express next function.
 */
export function createMockNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

// ─── Supabase Query Chain Mocking ────────────────────────────────

/**
 * Build a mock Supabase query chain that resolves to a given result.
 * Use this to mock specific Supabase responses.
 */
export function mockSupabaseQuery(result: { data: unknown; error: null } | { data: null; error: { message: string; code?: string } }, count?: number | null) {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockResolvedValue({ ...result, count: count ?? null }),
  };

  return mockChain;
}

/**
 * Build a mock Supabase client with a specific query chain.
 */
export function createMockSupabase(mockChain: ReturnType<typeof mockSupabaseQuery>) {
  return {
    from: jest.fn().mockReturnValue(mockChain),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  };
}

/**
 * Set up a complete mock for supabase module's `from().select()` chain.
 */
export function setupSupabaseMock(
  data: unknown = null,
  error: { message: string; code?: string } | null = null,
  count: number | null = null,
) {
  const resolvedValue = error
    ? { data: null, error, count: count ?? null }
    : { data, error: null, count: count ?? null };

  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) => {
      return Promise.resolve(cb.call(chain, resolvedValue));
    }),
  };

  return { from: jest.fn().mockReturnValue(chain), chain };
}

// ─── Axios Mock Helpers ──────────────────────────────────────────

/**
 * Set up axios mock for a specific response.
 */
export function setupAxiosMock(response: unknown, shouldReject = false, error?: unknown) {
  const axiosMock = jest.requireMock('axios');
  if (shouldReject) {
    axiosMock.get.mockRejectedValueOnce(error ?? new Error('Network error'));
    axiosMock.post.mockRejectedValueOnce(error ?? new Error('Network error'));
  } else {
    axiosMock.get.mockResolvedValueOnce({ data: response });
    axiosMock.post.mockResolvedValueOnce({ data: response });
  }
}

// ─── Test Data Builders ──────────────────────────────────────────

/**
 * Create a minimal campaign object for condition testing.
 */
export function buildCampaign(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: UUIDS.campaign1,
    name: 'Test Campaign',
    status: 'active',
    daily_budget: 100,
    lifetime_budget: 0,
    spend: 50,
    impressions: 10000,
    clicks: 100,
    ctr: 1.0,
    conversions: 20,
    cpa: 2.5,
    roas: 3.0,
    frequency: 1.5,
    reach: 6667,
    cpm: 5.0,
    cpc: 0.5,
    platform_campaign_id: UUIDS.platformCampaign1,
    ad_account_id: UUIDS.metaAccount,
    ...overrides,
  };
}

/**
 * Create a minimal automation rule for testing.
 */
export function buildRule(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: UUIDS.rule1,
    workspace_id: UUIDS.workspace1,
    name: 'Test Rule',
    description: 'A test automation rule',
    conditions: [{ metric: 'spend_pct', operator: 'gte', value: 90 }],
    actions: [{ type: 'decrease_budget', params: { percentage: 20 } }],
    platforms: ['meta'] as const,
    status: 'active' as const,
    applied_count: 0,
    ...overrides,
  };
}

/**
 * Create a draft input for testing createDraft.
 */
export function buildCreateDraftInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    workspaceId: UUIDS.workspace1,
    platform: 'meta' as const,
    campaignId: UUIDS.campaign1,
    draftType: 'budget_change' as const,
    changeSummary: 'Test draft change',
    changeDetail: { field: 'daily_budget', old_value: 100, new_value: 80 },
    actorType: 'user' as const,
    actorId: UUIDS.owner,
    ...overrides,
  };
}
