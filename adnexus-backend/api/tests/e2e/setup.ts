// ============================================
// AdNexus AI — E2E Test Setup & Utilities
// ============================================
// Provides test database management, user/workspace creation helpers,
// authentication token generation, and lifecycle hooks for E2E tests.
//
// Usage:
//   import { setupTestDB, teardownTestDB, createTestUser,
//            generateAuthToken, createTestWorkspace, cleanupTables } from './setup';

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { config } from '../../src/config';
import { supabase } from '../../src/lib/supabase';
import type { WorkspaceRole } from '../../src/types';

// ─── Environment Configuration ───────────────────────────────────

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-tests-only';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.STRIPE_SECRET_KEY = 'sk_test_stripe';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

// ─── Test Database Configuration ─────────────────────────────────

const TEST_DB_PREFIX = 'adnexus_test_';

export interface TestDBConfig {
  databaseName: string;
  migrationsRun: boolean;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  password: string;
  passwordHash: string;
  role: WorkspaceRole;
  workspaceId: string;
  createdAt: string;
}

export interface TestWorkspace {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  ownerId: string;
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface TestContext {
  dbConfig: TestDBConfig;
  users: TestUser[];
  workspaces: TestWorkspace[];
  tokens: Map<string, string>;
}

// ─── In-Memory Test Store (simulates DB for E2E isolation) ───────

const testStore = {
  users: new Map<string, TestUser>(),
  workspaces: new Map<string, TestWorkspace>(),
  workspaceMembers: new Map<string, { workspaceId: string; userId: string; role: WorkspaceRole }>(),
  passwordHashes: new Map<string, string>(),
  campaigns: new Map<string, Record<string, unknown>>(),
  drafts: new Map<string, Record<string, unknown>>(),
  auditLogs: new Map<string, Record<string, unknown>[]>(),
  passwordResets: new Map<string, { token: string; expiresAt: Date }>(),
};

// ─── Test Database Setup ─────────────────────────────────────────

/**
 * Initialize the test environment. Creates a fresh test database context
 * and runs migrations if needed. Call in `beforeAll`.
 */
export async function setupTestDB(): Promise<TestDBConfig> {
  const databaseName = `${TEST_DB_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Clear all in-memory stores for a fresh start
  testStore.users.clear();
  testStore.workspaces.clear();
  testStore.workspaceMembers.clear();
  testStore.passwordHashes.clear();
  testStore.campaigns.clear();
  testStore.drafts.clear();
  testStore.auditLogs.clear();
  testStore.passwordResets.clear();

  const dbConfig: TestDBConfig = {
    databaseName,
    migrationsRun: true,
  };

  return dbConfig;
}

/**
 * Tear down the test database and clean up resources.
 * Call in `afterAll`.
 */
export async function teardownTestDB(_dbConfig?: TestDBConfig): Promise<void> {
  // Clear all in-memory stores
  testStore.users.clear();
  testStore.workspaces.clear();
  testStore.workspaceMembers.clear();
  testStore.passwordHashes.clear();
  testStore.campaigns.clear();
  testStore.drafts.clear();
  testStore.auditLogs.clear();
  testStore.passwordResets.clear();

  // Clear all Jest mocks
  jest.clearAllMocks();
}

/**
 * Clean up specific tables between tests while preserving users/workspaces.
 * Call in `afterEach` for test isolation.
 */
export async function cleanupTables(tables?: string[]): Promise<void> {
  const tablesToClean = tables || ['campaigns', 'drafts', 'auditLogs', 'passwordResets'];

  for (const table of tablesToClean) {
    switch (table) {
      case 'campaigns':
        testStore.campaigns.clear();
        break;
      case 'drafts':
        testStore.drafts.clear();
        break;
      case 'auditLogs':
        testStore.auditLogs.clear();
        break;
      case 'passwordResets':
        testStore.passwordResets.clear();
        break;
      case 'all':
        testStore.campaigns.clear();
        testStore.drafts.clear();
        testStore.auditLogs.clear();
        testStore.passwordResets.clear();
        break;
    }
  }
}

// ─── Test User Creation ──────────────────────────────────────────

export interface CreateTestUserOptions {
  email?: string;
  name?: string;
  password?: string;
  role?: WorkspaceRole;
  workspaceId?: string;
}

/**
 * Create a test user with optional overrides. The user is stored in the
 * in-memory test store and can be referenced across tests.
 */
export async function createTestUser(
  options: CreateTestUserOptions = {},
): Promise<TestUser> {
  const id = randomUUID();
  const email = options.email || `test-${id.slice(0, 8)}@example.com`;
  const name = options.name || `Test User ${id.slice(0, 4)}`;
  const password = options.password || 'SecurePass123!';
  const role = options.role || 'owner';
  const workspaceId = options.workspaceId || '';

  const passwordHash = await bcrypt.hash(password, 12);

  const user: TestUser = {
    id,
    email,
    name,
    password,
    passwordHash,
    role,
    workspaceId,
    createdAt: new Date().toISOString(),
  };

  testStore.users.set(id, user);
  testStore.passwordHashes.set(id, passwordHash);

  // Store in supabase mock-compatible format for integration
  return user;
}

/**
 * Create multiple test users in one call.
 */
export async function createTestUsers(
  count: number,
  defaults: CreateTestUserOptions = {},
): Promise<TestUser[]> {
  const users: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    users.push(
      await createTestUser({
        ...defaults,
        email: defaults.email || `user${i + 1}@test.com`,
        name: defaults.name || `Test User ${i + 1}`,
      }),
    );
  }
  return users;
}

// ─── Authentication Token Generation ─────────────────────────────

export interface TokenPayload {
  sub: string;
  email: string;
  workspace_id: string;
  role: WorkspaceRole;
  iat?: number;
  exp?: number;
  type?: 'access' | 'refresh';
}

/**
 * Generate an access token for a test user.
 */
export function generateAuthToken(
  userId: string,
  role: WorkspaceRole = 'owner',
  workspaceId?: string,
  expiresIn: string = '7d',
): string {
  const user = testStore.users.get(userId);
  const wsId = workspaceId || user?.workspaceId || randomUUID();

  const payload: TokenPayload = {
    sub: userId,
    email: user?.email || 'test@example.com',
    workspace_id: wsId,
    role,
    type: 'access',
  };

  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/**
 * Generate a refresh token for a test user.
 */
export function generateRefreshToken(
  userId: string,
  expiresIn: string = '30d',
): string {
  const user = testStore.users.get(userId);

  const payload: TokenPayload = {
    sub: userId,
    email: user?.email || 'test@example.com',
    workspace_id: user?.workspaceId || randomUUID(),
    role: (user?.role || 'owner') as WorkspaceRole,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/**
 * Generate an expired access token for testing expired token scenarios.
 */
export function generateExpiredToken(
  userId: string,
  role: WorkspaceRole = 'owner',
  workspaceId?: string,
): string {
  const user = testStore.users.get(userId);
  const wsId = workspaceId || user?.workspaceId || randomUUID();

  const payload: TokenPayload = {
    sub: userId,
    email: user?.email || 'test@example.com',
    workspace_id: wsId,
    role,
    type: 'access',
  };

  return jwt.sign(payload, config.jwt.secret, { expiresIn: '-1h' });
}

/**
 * Generate a malformed token.
 */
export function generateMalformedToken(): string {
  return 'this.is.not.a.valid.jwt.token.for.testing';
}

/**
 * Generate a token signed with a wrong secret.
 */
export function generateWrongSecretToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      email: 'test@example.com',
      workspace_id: randomUUID(),
      role: 'owner' as WorkspaceRole,
      type: 'access' as const,
    },
    'this-is-a-wrong-secret-key-for-testing-only',
    { expiresIn: '7d' },
  );
}

/**
 * Verify and decode a token. Returns null if invalid.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  } catch {
    return null;
  }
}

// ─── Test Workspace Setup ────────────────────────────────────────

export interface CreateTestWorkspaceOptions {
  name?: string;
  slug?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  ownerId?: string;
  settings?: Record<string, unknown>;
}

/**
 * Create a test workspace with an owner. Returns the workspace and
 * automatically creates the workspace_membership link.
 */
export async function createTestWorkspace(
  options: CreateTestWorkspaceOptions = {},
): Promise<TestWorkspace> {
  const id = randomUUID();
  const name = options.name || `Test Workspace ${id.slice(0, 4)}`;
  const slug = options.slug || `test-workspace-${id.slice(0, 8)}`;
  const plan = options.plan || 'free';
  const ownerId = options.ownerId || '';
  const settings = options.settings || {};

  const workspace: TestWorkspace = {
    id,
    name,
    slug,
    plan,
    ownerId,
    settings,
    createdAt: new Date().toISOString(),
  };

  testStore.workspaces.set(id, workspace);

  // Create workspace membership for owner
  if (ownerId) {
    testStore.workspaceMembers.set(`${id}:${ownerId}`, {
      workspaceId: id,
      userId: ownerId,
      role: 'owner',
    });
  }

  return workspace;
}

/**
 * Add an existing user to a workspace with a specific role.
 */
export async function addUserToWorkspace(
  userId: string,
  workspaceId: string,
  role: WorkspaceRole = 'analyst',
): Promise<void> {
  testStore.workspaceMembers.set(`${workspaceId}:${userId}`, {
    workspaceId,
    userId,
    role,
  });

  // Update user's default workspace
  const user = testStore.users.get(userId);
  if (user) {
    user.workspaceId = workspaceId;
    user.role = role;
    testStore.users.set(userId, user);
  }
}

// ─── Test Campaign Helpers ───────────────────────────────────────

export interface TestCampaign {
  id: string;
  workspaceId: string;
  adAccountId: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number;
  platform: string;
}

/**
 * Create a test campaign in the in-memory store.
 */
export async function createTestCampaign(
  workspaceId: string,
  overrides: Partial<TestCampaign> = {},
): Promise<TestCampaign> {
  const id = overrides.id || randomUUID();

  const campaign: TestCampaign = {
    id,
    workspaceId,
    adAccountId: overrides.adAccountId || randomUUID(),
    name: overrides.name || `Test Campaign ${id.slice(0, 4)}`,
    status: overrides.status || 'active',
    objective: overrides.objective || 'CONVERSIONS',
    dailyBudget: overrides.dailyBudget || 100,
    platform: overrides.platform || 'meta',
  };

  testStore.campaigns.set(id, campaign);
  return campaign;
}

// ─── Test Draft Helpers ──────────────────────────────────────────

export interface TestDraft {
  id: string;
  workspaceId: string;
  campaignId: string;
  draftType: string;
  platform: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'scheduled';
  changeSummary: string;
  changeDetail: Record<string, unknown>;
  actorType: string;
  actorId: string;
  approverId?: string;
  approvalNote?: string;
  createdAt: string;
}

/**
 * Create a test draft in the in-memory store.
 */
export async function createTestDraft(
  workspaceId: string,
  overrides: Partial<TestDraft> = {},
): Promise<TestDraft> {
  const id = overrides.id || randomUUID();

  const draft: TestDraft = {
    id,
    workspaceId,
    campaignId: overrides.campaignId || randomUUID(),
    draftType: overrides.draftType || 'budget_change',
    platform: overrides.platform || 'meta',
    status: overrides.status || 'pending',
    changeSummary: overrides.changeSummary || `Test draft ${id.slice(0, 4)}`,
    changeDetail: overrides.changeDetail || { field: 'daily_budget', old_value: 100, new_value: 120 },
    actorType: overrides.actorType || 'user',
    actorId: overrides.actorId || '',
    approverId: overrides.approverId,
    approvalNote: overrides.approvalNote,
    createdAt: new Date().toISOString(),
  };

  testStore.drafts.set(id, draft);
  return draft;
}

// ─── Mock Supabase Builder for E2E Tests ─────────────────────────

/**
 * Build a comprehensive mock of the Supabase `from()` method that uses
 * the in-memory test store. This allows E2E tests to simulate a real
 * database without an actual DB connection.
 */
export function buildE2EMockFrom(): jest.Mock {
  return jest.fn((table: string) => {
    switch (table) {
      case 'users':
        return buildUsersQueryBuilder();
      case 'workspaces':
        return buildWorkspacesQueryBuilder();
      case 'workspace_members':
        return buildWorkspaceMembersQueryBuilder();
      case 'auth_passwords':
        return buildAuthPasswordsQueryBuilder();
      case 'campaigns':
        return buildCampaignsQueryBuilder();
      case 'drafts':
        return buildDraftsQueryBuilder();
      case 'password_resets':
        return buildPasswordResetsQueryBuilder();
      case 'audit_log':
        return buildAuditLogQueryBuilder();
      case 'ad_accounts':
        return buildAdAccountsQueryBuilder();
      default:
        return buildDefaultQueryBuilder();
    }
  });
}

// ─── Query Builder Factories ─────────────────────────────────────

function buildDefaultQueryBuilder() {
  const self = {
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
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb.call(self, { data: null, error: null, count: 0 })),
    ),
  };
  return self;
}

function buildUsersQueryBuilder() {
  let currentData: TestUser | null = null;
  let filterField: string | null = null;
  let filterValue: unknown = null;

  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation((data: Record<string, unknown> | Record<string, unknown>[]) => {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const user: TestUser = {
          id: (item.id as string) || randomUUID(),
          email: (item.email as string) || 'test@example.com',
          name: (item.name as string) || 'Test User',
          password: '',
          passwordHash: '',
          role: 'owner',
          workspaceId: (item.workspace_id as string) || '',
          createdAt: new Date().toISOString(),
        };
        testStore.users.set(user.id, user);
        currentData = user;
      }
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: currentData, error: null }) };
    }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation((field: string, value: unknown) => {
      filterField = field;
      filterValue = value;

      if (field === 'id') {
        currentData = testStore.users.get(value as string) || null;
      } else if (field === 'email') {
        for (const user of testStore.users.values()) {
          if (user.email === value) {
            currentData = user;
            break;
          }
        }
      }
      return { single: jest.fn().mockResolvedValue({ data: currentData, error: null }), select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    }),
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
    single: jest.fn().mockImplementation(() => {
      if (filterField === 'email' && filterValue) {
        for (const user of testStore.users.values()) {
          if (user.email === filterValue) {
            return Promise.resolve({ data: user, error: null });
          }
        }
        return Promise.resolve({ data: null, error: { message: 'Not found' } });
      }
      return Promise.resolve({ data: currentData, error: null });
    }),
    maybeSingle: jest.fn().mockResolvedValue({ data: currentData, error: null }),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: Array.from(testStore.users.values()), error: null, count: testStore.users.size })),
    ),
  };
}

function buildWorkspacesQueryBuilder() {
  let currentData: TestWorkspace | null = null;

  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation((data: Record<string, unknown> | Record<string, unknown>[]) => {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const ws: TestWorkspace = {
          id: (item.id as string) || randomUUID(),
          name: (item.name as string) || 'Test Workspace',
          slug: (item.slug as string) || `workspace-${Date.now()}`,
          plan: ((item.plan as 'free' | 'pro' | 'enterprise') || 'free'),
          ownerId: (item.owner_id as string) || '',
          settings: (item.settings as Record<string, unknown>) || {},
          createdAt: new Date().toISOString(),
        };
        testStore.workspaces.set(ws.id, ws);
        currentData = ws;
      }
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: currentData, error: null }) };
    }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation((_field: string, value: unknown) => {
      currentData = testStore.workspaces.get(value as string) || null;
      return { single: jest.fn().mockResolvedValue({ data: currentData, error: null }), select: jest.fn().mockReturnThis() };
    }),
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
    single: jest.fn().mockResolvedValue({ data: currentData, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: currentData, error: null }),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: Array.from(testStore.workspaces.values()), error: null, count: testStore.workspaces.size })),
    ),
  };
}

function buildWorkspaceMembersQueryBuilder() {
  let currentData: { workspaceId: string; userId: string; role: WorkspaceRole } | null = null;

  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation((data: Record<string, unknown> | Record<string, unknown>[]) => {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const member = {
          workspaceId: (item.workspace_id as string) || '',
          userId: (item.user_id as string) || '',
          role: (item.role as WorkspaceRole) || 'analyst',
        };
        testStore.workspaceMembers.set(`${member.workspaceId}:${member.userId}`, member);
        currentData = member;
      }
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: currentData, error: null }) };
    }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation((field: string, value: unknown) => {
      if (field === 'user_id') {
        for (const member of testStore.workspaceMembers.values()) {
          if (member.userId === value) {
            currentData = member;
            break;
          }
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: currentData, error: null }), order: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis() };
    }),
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
    single: jest.fn().mockImplementation(() => {
      return Promise.resolve({ data: currentData, error: null });
    }),
    maybeSingle: jest.fn().mockResolvedValue({ data: currentData, error: null }),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: Array.from(testStore.workspaceMembers.values()), error: null, count: testStore.workspaceMembers.size })),
    ),
  };
}

function buildAuthPasswordsQueryBuilder() {
  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation((data: Record<string, unknown>) => {
      testStore.passwordHashes.set((data.user_id as string) || '', (data.password_hash as string) || '');
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data, error: null }) };
    }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation((field: string, value: unknown) => {
      if (field === 'user_id') {
        const hash = testStore.passwordHashes.get(value as string);
        return { single: jest.fn().mockResolvedValue({ data: hash ? { password_hash: hash } : null, error: null }), select: jest.fn().mockReturnThis() };
      }
      return { single: jest.fn().mockResolvedValue({ data: null, error: null }), select: jest.fn().mockReturnThis() };
    }),
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
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: Array.from(testStore.passwordHashes.entries()).map(([userId, hash]) => ({ user_id: userId, password_hash: hash })), error: null, count: testStore.passwordHashes.size })),
    ),
  };
}

function buildCampaignsQueryBuilder() {
  let currentData: Record<string, unknown> | null = null;
  let filterField: string | null = null;
  let filterValue: unknown = null;

  return {
    select: jest.fn().mockImplementation((columns?: string) => {
      // Support join-style selects (e.g., '*, ad_accounts!inner(platform, workspace_id)')
      if (columns && columns.includes('ad_accounts')) {
        // Return campaigns enriched with ad_accounts data
        const campaigns = Array.from(testStore.campaigns.values());
        const enriched = campaigns.map(c => ({
          ...c,
          ad_accounts: { platform: (c as TestCampaign).platform || 'meta', workspace_id: (c as TestCampaign).workspaceId },
        }));
        return {
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockImplementation((_from: number, _to: number) => ({
            then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
              Promise.resolve(cb({ data: enriched, error: null, count: campaigns.length })),
            ),
          })),
          then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
            Promise.resolve(cb({ data: enriched, error: null, count: campaigns.length })),
          ),
        };
      }
      return {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentData, error: null }),
        then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
          Promise.resolve(cb({ data: Array.from(testStore.campaigns.values()), error: null, count: testStore.campaigns.size })),
        ),
      };
    }),
    insert: jest.fn().mockImplementation((data: Record<string, unknown> | Record<string, unknown>[]) => {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const campaign: TestCampaign = {
          id: (item.id as string) || randomUUID(),
          workspaceId: (item.workspace_id as string) || '',
          adAccountId: (item.ad_account_id as string) || '',
          name: (item.name as string) || 'Test Campaign',
          status: (item.status as string) || 'active',
          objective: (item.objective as string) || 'CONVERSIONS',
          dailyBudget: (item.daily_budget as number) || 0,
          platform: 'meta',
        };
        testStore.campaigns.set(campaign.id, campaign);
        currentData = campaign as unknown as Record<string, unknown>;
      }
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: currentData, error: null }) };
    }),
    update: jest.fn().mockImplementation((data: Record<string, unknown>) => {
      if (currentData && filterValue) {
        const updated = { ...currentData, ...data };
        testStore.campaigns.set(filterValue as string, updated);
        currentData = updated;
      }
      return { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: currentData, error: null }) };
    }),
    delete: jest.fn().mockImplementation(() => {
      if (filterValue) {
        testStore.campaigns.delete(filterValue as string);
      }
      return { eq: jest.fn().mockReturnThis() };
    }),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation((field: string, value: unknown) => {
      filterField = field;
      filterValue = value;
      if (field === 'id') {
        currentData = testStore.campaigns.get(value as string) || null;
      }
      return {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          const campaign = testStore.campaigns.get(value as string);
          return Promise.resolve({
            data: campaign ? { ...campaign, ad_accounts: { workspace_id: (campaign as TestCampaign).workspaceId, platform: (campaign as TestCampaign).platform } } : null,
            error: campaign ? null : { message: 'Not found' },
          });
        }),
        select: jest.fn().mockImplementation((columns?: string) => {
          if (columns && columns.includes('ad_accounts')) {
            const campaign = testStore.campaigns.get(value as string);
            return {
              single: jest.fn().mockResolvedValue({
                data: campaign ? { ...campaign, ad_accounts: { workspace_id: (campaign as TestCampaign).workspaceId, platform: (campaign as TestCampaign).platform } } : null,
                error: campaign ? null : { message: 'Not found' },
              }),
            };
          }
          return { single: jest.fn().mockResolvedValue({ data: currentData, error: null }) };
        }),
        then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) => {
          const campaigns = Array.from(testStore.campaigns.values()).filter(c => (c as TestCampaign).workspaceId === value);
          return Promise.resolve(cb({ data: campaigns, error: null, count: campaigns.length }));
        }),
      };
    }),
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
    range: jest.fn().mockImplementation((_from: number, _to: number) => ({
      then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) => {
        const campaigns = Array.from(testStore.campaigns.values());
        return Promise.resolve(cb({ data: campaigns, error: null, count: campaigns.length }));
      }),
    })),
    single: jest.fn().mockImplementation(() => {
      const campaign = filterValue ? testStore.campaigns.get(filterValue as string) : null;
      return Promise.resolve({
        data: campaign || null,
        error: campaign ? null : { message: 'Not found' },
      });
    }),
    maybeSingle: jest.fn().mockResolvedValue({ data: currentData, error: null }),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: Array.from(testStore.campaigns.values()), error: null, count: testStore.campaigns.size })),
    ),
  };
}

function buildDraftsQueryBuilder() {
  let currentData: Record<string, unknown> | null = null;
  let filterField: string | null = null;
  let filterValue: unknown = null;

  return {
    select: jest.fn().mockImplementation((columns?: string) => {
      return {
        eq: jest.fn().mockImplementation((field: string, value: unknown) => {
          if (field === 'workspace_id') {
            const drafts = Array.from(testStore.drafts.values()).filter(d => (d as TestDraft).workspaceId === value);
            return {
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockImplementation((_from: number, _to: number) => ({
                then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
                  Promise.resolve(cb({ data: drafts, error: null, count: drafts.length })),
                ),
              })),
              then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
                Promise.resolve(cb({ data: drafts, error: null, count: drafts.length })),
              ),
            };
          }
          if (field === 'status') {
            const drafts = Array.from(testStore.drafts.values()).filter(d => (d as TestDraft).status === value);
            return {
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockReturnThis(),
              then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
                Promise.resolve(cb({ data: drafts, error: null, count: drafts.length })),
              ),
            };
          }
          return {
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              const draft = testStore.drafts.get(value as string);
              return Promise.resolve({ data: draft || null, error: draft ? null : { message: 'Not found' } });
            }),
            then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
              Promise.resolve(cb({ data: Array.from(testStore.drafts.values()), error: null, count: testStore.drafts.size })),
            ),
          };
        }),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentData, error: null }),
        then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
          Promise.resolve(cb({ data: Array.from(testStore.drafts.values()), error: null, count: testStore.drafts.size })),
        ),
      };
    }),
    insert: jest.fn().mockImplementation((data: Record<string, unknown> | Record<string, unknown>[]) => {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const draft: TestDraft = {
          id: (item.id as string) || randomUUID(),
          workspaceId: (item.workspace_id as string) || '',
          campaignId: (item.campaign_id as string) || '',
          draftType: (item.draft_type as string) || 'budget_change',
          platform: (item.platform as string) || 'meta',
          status: (item.status as TestDraft['status']) || 'pending',
          changeSummary: (item.change_summary as string) || '',
          changeDetail: (item.change_detail as Record<string, unknown>) || {},
          actorType: (item.actor_type as string) || 'user',
          actorId: (item.actor_id as string) || '',
          createdAt: new Date().toISOString(),
        };
        testStore.drafts.set(draft.id, draft);
        currentData = draft as unknown as Record<string, unknown>;
      }
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: currentData, error: null }) };
    }),
    update: jest.fn().mockImplementation((data: Record<string, unknown>) => {
      if (filterValue) {
        const existing = testStore.drafts.get(filterValue as string);
        if (existing) {
          const updated = { ...existing, ...data, status: (data.status as TestDraft['status']) || (existing as TestDraft).status };
          testStore.drafts.set(filterValue as string, updated);
          currentData = updated as unknown as Record<string, unknown>;
        }
      }
      return {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: currentData, error: null }),
      };
    }),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation((field: string, value: unknown) => {
      filterField = field;
      filterValue = value;
      if (field === 'id') {
        currentData = testStore.drafts.get(value as string) || null;
      }
      return {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          const draft = testStore.drafts.get(value as string);
          return Promise.resolve({ data: draft || null, error: draft ? null : { message: 'Not found' } });
        }),
        select: jest.fn().mockImplementation(() => ({
          single: jest.fn().mockResolvedValue({ data: currentData, error: null }),
        })),
        then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) => {
          const drafts = Array.from(testStore.drafts.values()).filter(d => (d as TestDraft).workspaceId === value);
          return Promise.resolve(cb({ data: drafts, error: null, count: drafts.length }));
        }),
      };
    }),
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
    range: jest.fn().mockImplementation((_from: number, _to: number) => ({
      then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) => {
        const drafts = Array.from(testStore.drafts.values());
        return Promise.resolve(cb({ data: drafts, error: null, count: drafts.length }));
      }),
    })),
    single: jest.fn().mockImplementation(() => {
      const draft = filterValue ? testStore.drafts.get(filterValue as string) : null;
      return Promise.resolve({ data: draft || null, error: draft ? null : { message: 'Not found' } });
    }),
    maybeSingle: jest.fn().mockResolvedValue({ data: currentData, error: null }),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: Array.from(testStore.drafts.values()), error: null, count: testStore.drafts.size })),
    ),
  };
}

function buildPasswordResetsQueryBuilder() {
  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation((data: Record<string, unknown>) => {
      const id = randomUUID();
      testStore.passwordResets.set(id, {
        token: (data.token as string) || '',
        expiresAt: new Date((data.expires_at as string) || Date.now() + 3600000),
      });
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id, ...data }, error: null }) };
    }),
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
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: Array.from(testStore.passwordResets.values()), error: null, count: testStore.passwordResets.size })),
    ),
  };
}

function buildAuditLogQueryBuilder() {
  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation((data: Record<string, unknown> | Record<string, unknown>[]) => {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const id = randomUUID();
        const logs = testStore.auditLogs.get('default') || [];
        logs.push({ id, ...item });
        testStore.auditLogs.set('default', logs);
      }
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: items[0], error: null }) };
    }),
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
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: testStore.auditLogs.get('default') || [], error: null, count: (testStore.auditLogs.get('default') || []).length })),
    ),
  };
}

function buildAdAccountsQueryBuilder() {
  return {
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
    single: jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: { id: randomUUID(), platform: 'meta', account_id: 'act_1234567890', workspace_id: '' },
        error: null,
      }),
    ),
    maybeSingle: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: [], error: null, count: 0 })),
    ),
  };
}

// ─── Store Access (for assertions) ───────────────────────────────

/**
 * Get a user from the test store by ID.
 */
export function getTestUser(userId: string): TestUser | undefined {
  return testStore.users.get(userId);
}

/**
 * Get a workspace from the test store by ID.
 */
export function getTestWorkspace(workspaceId: string): TestWorkspace | undefined {
  return testStore.workspaces.get(workspaceId);
}

/**
 * Get a campaign from the test store by ID.
 */
export function getTestCampaign(campaignId: string): Record<string, unknown> | undefined {
  return testStore.campaigns.get(campaignId);
}

/**
 * Get a draft from the test store by ID.
 */
export function getTestDraft(draftId: string): Record<string, unknown> | undefined {
  return testStore.drafts.get(draftId);
}

/**
 * Get the count of items in a store table.
 */
export function getStoreCount(table: 'users' | 'workspaces' | 'campaigns' | 'drafts' | 'passwordResets'): number {
  switch (table) {
    case 'users': return testStore.users.size;
    case 'workspaces': return testStore.workspaces.size;
    case 'campaigns': return testStore.campaigns.size;
    case 'drafts': return testStore.drafts.size;
    case 'passwordResets': return testStore.passwordResets.size;
    default: return 0;
  }
}

// ─── Re-export Fixtures for Convenience ──────────────────────────

export { mockUsers, mockWorkspaces, mockWorkspaceMembers, UUIDS, mockPasswords } from '../fixtures/data';
