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

// ─── Generic Chainable Store-Backed Query Builder ────────────────

/**
 * Configuration for a chainable supabase-like query builder backed by the
 * in-memory test store.
 *
 * `listRows()` returns ALL rows for the table (snake_case shaped) so filters,
 * ordering, ranges, counts, joins and terminal resolvers can be applied
 * generically — mirroring the parts of the supabase-js builder our routes use.
 */
interface ChainableConfig {
  /** Return the full snake_case row set for this table from the store. */
  listRows: () => Record<string, unknown>[];
  /** Insert handler — receives a row, persists it, returns the stored row. */
  onInsert?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Update handler — receives (id, patch), mutates store, returns updated row. */
  onUpdate?: (id: string, patch: Record<string, unknown>) => Record<string, unknown> | null;
  /** Delete handler — receives id, removes from store. */
  onDelete?: (id: string) => void;
  /** Optional join enrichment applied to each row when select() includes a join. */
  enrich?: (row: Record<string, unknown>, selectColumns: string) => Record<string, unknown>;
  /** When true, ignore all eq/in/gte/... filters (synthetic single-row tables). */
  skipFilters?: boolean;
}

type Filter = { op: 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt'; field: string; value: unknown };

function applyFilters(rows: Record<string, unknown>[], filters: Filter[]): Record<string, unknown>[] {
  return rows.filter((row) =>
    filters.every((f) => {
      const v = row[f.field];
      switch (f.op) {
        case 'eq':
          return v === f.value;
        case 'neq':
          return v !== f.value;
        case 'in':
          return Array.isArray(f.value) && (f.value as unknown[]).includes(v);
        case 'gte':
          return v != null && (v as string | number) >= (f.value as string | number);
        case 'lte':
          return v != null && (v as string | number) <= (f.value as string | number);
        case 'gt':
          return v != null && (v as string | number) > (f.value as string | number);
        case 'lt':
          return v != null && (v as string | number) < (f.value as string | number);
        default:
          return true;
      }
    }),
  );
}

/**
 * Build a fully chainable supabase-like query builder. Every filter/order/range
 * method returns `this`, so arbitrary chains (`.eq().eq().in().gte().order().range()`)
 * resolve correctly. The builder is a thenable: awaiting it (or calling `.then`)
 * resolves `{ data, error, count }`. `.single()` / `.maybeSingle()` resolve a
 * single record. Insert/update/delete are supported via the config handlers.
 */
function buildChainableBuilder(config: ChainableConfig) {
  const filters: Filter[] = [];
  let selectColumns = '*';
  let countRequested = false;
  let headOnly = false;
  let pendingInsert: Record<string, unknown> | Record<string, unknown>[] | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;
  let isDelete = false;
  let rangeBounds: { from: number; to: number } | null = null;
  let returnInserted: Record<string, unknown>[] = [];

  const resolveRows = (): { data: Record<string, unknown>[]; count: number } => {
    // Mutation paths first
    if (pendingInsert !== null) {
      const items = Array.isArray(pendingInsert) ? pendingInsert : [pendingInsert];
      const inserted = items.map((item) => (config.onInsert ? config.onInsert(item) : item));
      returnInserted = inserted;
      return { data: inserted, count: inserted.length };
    }
    if (pendingUpdate !== null) {
      const idFilter = filters.find((f) => f.field === 'id' && f.op === 'eq');
      const updated: Record<string, unknown>[] = [];
      if (idFilter && config.onUpdate) {
        const row = config.onUpdate(idFilter.value as string, pendingUpdate);
        if (row) updated.push(row);
      }
      return { data: updated, count: updated.length };
    }
    if (isDelete) {
      const idFilter = filters.find((f) => f.field === 'id' && f.op === 'eq');
      if (idFilter && config.onDelete) config.onDelete(idFilter.value as string);
      return { data: [], count: 0 };
    }

    // Read path
    let rows = config.listRows();
    if (config.enrich && selectColumns !== '*') {
      rows = rows.map((r) => config.enrich!(r, selectColumns));
    }
    if (!config.skipFilters) {
      rows = applyFilters(rows, filters);
    }
    const total = rows.length;
    if (rangeBounds) {
      rows = rows.slice(rangeBounds.from, rangeBounds.to + 1);
    }
    if (headOnly) {
      return { data: [], count: total };
    }
    return { data: rows, count: total };
  };

  const builder = {
    select: jest.fn((columns?: string, opts?: { count?: string; head?: boolean }) => {
      if (typeof columns === 'string') selectColumns = columns;
      if (opts?.count) countRequested = true;
      if (opts?.head) headOnly = true;
      // After an insert/update, select() marks that we want the row(s) back.
      return builder;
    }),
    insert: jest.fn((data: Record<string, unknown> | Record<string, unknown>[]) => {
      pendingInsert = data;
      return builder;
    }),
    update: jest.fn((data: Record<string, unknown>) => {
      pendingUpdate = data;
      return builder;
    }),
    delete: jest.fn(() => {
      isDelete = true;
      return builder;
    }),
    upsert: jest.fn((data: Record<string, unknown>) => {
      pendingInsert = data;
      return builder;
    }),
    eq: jest.fn((field: string, value: unknown) => {
      filters.push({ op: 'eq', field, value });
      return builder;
    }),
    neq: jest.fn((field: string, value: unknown) => {
      filters.push({ op: 'neq', field, value });
      return builder;
    }),
    in: jest.fn((field: string, value: unknown[]) => {
      filters.push({ op: 'in', field, value });
      return builder;
    }),
    gt: jest.fn((field: string, value: unknown) => {
      filters.push({ op: 'gt', field, value });
      return builder;
    }),
    lt: jest.fn((field: string, value: unknown) => {
      filters.push({ op: 'lt', field, value });
      return builder;
    }),
    gte: jest.fn((field: string, value: unknown) => {
      filters.push({ op: 'gte', field, value });
      return builder;
    }),
    lte: jest.fn((field: string, value: unknown) => {
      filters.push({ op: 'lte', field, value });
      return builder;
    }),
    like: jest.fn(() => builder),
    ilike: jest.fn(() => builder),
    or: jest.fn(() => builder),
    match: jest.fn(() => builder),
    is: jest.fn(() => builder),
    not: jest.fn(() => builder),
    contains: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    range: jest.fn((from: number, to: number) => {
      rangeBounds = { from, to };
      return builder;
    }),
    single: jest.fn(() => {
      // For insert/update, return the affected row.
      if (pendingInsert !== null) {
        const { data } = resolveRows();
        const row = data[0] ?? null;
        return Promise.resolve({ data: row, error: row ? null : { message: 'Insert failed' } });
      }
      if (pendingUpdate !== null) {
        const { data } = resolveRows();
        const row = data[0] ?? null;
        return Promise.resolve({ data: row, error: row ? null : { message: 'Not found' } });
      }
      const { data } = resolveRows();
      const row = data[0] ?? null;
      return Promise.resolve({ data: row, error: row ? null : { message: 'Not found' } });
    }),
    maybeSingle: jest.fn(() => {
      const { data } = resolveRows();
      return Promise.resolve({ data: data[0] ?? null, error: null });
    }),
    count: jest.fn(() => builder),
    then: jest.fn((onFulfilled: (result: { data: unknown; error: unknown; count: number | null }) => unknown) => {
      const { data, count } = resolveRows();
      return Promise.resolve(
        onFulfilled({ data, error: null, count: countRequested ? count : count }),
      );
    }),
  };

  return builder;
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

  // Project a stored member (camelCase) into the snake_case row shape the
  // routes (and real Supabase) read, e.g. `membership.workspace_id`.
  const toRow = (
    member: { workspaceId: string; userId: string; role: WorkspaceRole } | null,
  ) =>
    member
      ? {
          workspace_id: member.workspaceId,
          user_id: member.userId,
          role: member.role,
          created_at: new Date().toISOString(),
        }
      : null;

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
      return { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: toRow(currentData), error: null }) };
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
      } else if (field === 'workspace_id') {
        for (const member of testStore.workspaceMembers.values()) {
          if (member.workspaceId === value) {
            currentData = member;
            break;
          }
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((innerField: string, innerValue: unknown) => {
          if (innerField === 'user_id') {
            for (const member of testStore.workspaceMembers.values()) {
              if (member.userId === innerValue) {
                currentData = member;
                break;
              }
            }
          } else if (innerField === 'workspace_id') {
            for (const member of testStore.workspaceMembers.values()) {
              if (member.workspaceId === innerValue) {
                currentData = member;
                break;
              }
            }
          }
          return {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: toRow(currentData), error: null }),
            maybeSingle: jest.fn().mockResolvedValue({ data: toRow(currentData), error: null }),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
          };
        }),
        single: jest.fn().mockResolvedValue({ data: toRow(currentData), error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: toRow(currentData), error: null }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
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
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => {
      return Promise.resolve({ data: toRow(currentData), error: null });
    }),
    maybeSingle: jest.fn().mockImplementation(() => {
      return Promise.resolve({ data: toRow(currentData), error: null });
    }),
    count: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb: (result: unknown) => unknown) =>
      Promise.resolve(cb({ data: Array.from(testStore.workspaceMembers.values()).map(toRow), error: null, count: testStore.workspaceMembers.size })),
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

/**
 * Map a stored TestDraft (camelCase) to the snake_case DB row shape the
 * routes/services expect from supabase.
 */
function draftToRow(d: TestDraft & Record<string, unknown>): Record<string, unknown> {
  return {
    id: d.id,
    workspace_id: d.workspaceId,
    campaign_id: d.campaignId,
    campaign_name: (d.campaignName as string) ?? null,
    ad_id: (d.adId as string) ?? null,
    draft_type: d.draftType,
    platform: d.platform,
    status: d.status,
    change_summary: d.changeSummary,
    change_detail: d.changeDetail,
    ai_reasoning: (d.aiReasoning as string) ?? null,
    impact_estimate: (d.impactEstimate as string) ?? null,
    actor_type: d.actorType,
    actor_id: d.actorId,
    actor_name: (d.actorName as string) ?? null,
    rule_id: (d.ruleId as string) ?? null,
    approver_id: d.approverId ?? null,
    approval_note: d.approvalNote ?? null,
    scheduled_at: (d.scheduledAt as string) ?? null,
    executed_at: (d.executedAt as string) ?? null,
    resolved_at: (d.resolvedAt as string) ?? null,
    error_message: (d.errorMessage as string) ?? null,
    created_at: d.createdAt,
    // Joined campaign relation is null in the in-memory store.
    campaigns: null,
  };
}

/** Apply a snake_case DB patch back onto the stored TestDraft (camelCase). */
function applyDraftPatch(id: string, patch: Record<string, unknown>): Record<string, unknown> | null {
  const existing = testStore.drafts.get(id) as (TestDraft & Record<string, unknown>) | undefined;
  if (!existing) return null;
  if (patch.status !== undefined) existing.status = patch.status as TestDraft['status'];
  if (patch.approver_id !== undefined) existing.approverId = patch.approver_id as string;
  if (patch.approval_note !== undefined) existing.approvalNote = patch.approval_note as string;
  if (patch.scheduled_at !== undefined) (existing as Record<string, unknown>).scheduledAt = patch.scheduled_at;
  if (patch.executed_at !== undefined) (existing as Record<string, unknown>).executedAt = patch.executed_at;
  if (patch.resolved_at !== undefined) (existing as Record<string, unknown>).resolvedAt = patch.resolved_at;
  if (patch.error_message !== undefined) (existing as Record<string, unknown>).errorMessage = patch.error_message;
  testStore.drafts.set(id, existing);
  return draftToRow(existing);
}

function buildDraftsQueryBuilder() {
  return buildChainableBuilder({
    listRows: () =>
      Array.from(testStore.drafts.values()).map((d) => draftToRow(d as TestDraft & Record<string, unknown>)),
    onInsert: (item) => {
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
        approverId: item.approver_id as string | undefined,
        approvalNote: item.approval_note as string | undefined,
        createdAt: new Date().toISOString(),
      };
      // Preserve extra columns (campaign_name, ad_id, ai_reasoning, etc.)
      const stored = Object.assign(draft, {
        campaignName: item.campaign_name,
        adId: item.ad_id,
        aiReasoning: item.ai_reasoning,
        impactEstimate: item.impact_estimate,
        actorName: item.actor_name,
        ruleId: item.rule_id,
      });
      testStore.drafts.set(draft.id, stored);
      return draftToRow(stored as TestDraft & Record<string, unknown>);
    },
    onUpdate: (id, patch) => applyDraftPatch(id, patch),
    onDelete: (id) => {
      testStore.drafts.delete(id);
    },
  });
}

function _legacyBuildDraftsQueryBuilder() {
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
  return buildChainableBuilder({
    listRows: () => testStore.auditLogs.get('default') || [],
    onInsert: (item) => {
      const id = randomUUID();
      const row = { id, ...item };
      const logs = testStore.auditLogs.get('default') || [];
      logs.push(row);
      testStore.auditLogs.set('default', logs);
      return row;
    },
  });
}

function buildAdAccountsQueryBuilder() {
  // Provide a single connected Meta ad account that carries an oauth_token so
  // the draft execution engine's platform-client factory can initialize.
  // Filters (workspace_id / platform) are ignored — the synthetic account
  // matches any workspace in the in-memory store.
  return buildChainableBuilder({
    listRows: () => [
      {
        id: randomUUID(),
        platform: 'meta',
        account_id: 'act_1234567890',
        workspace_id: '',
        oauth_token: 'test-oauth-token',
      },
    ],
    skipFilters: true,
  });
}

// ─── Mock Supabase Auth Admin Builder for E2E Tests ──────────────

/**
 * Build a comprehensive mock of the Supabase `auth` namespace (including
 * `auth.admin.*`) backed by the same in-memory `testStore`. This lets E2E
 * tests exercise signup/signin/forgot-password/change-password flows that
 * rely on the Supabase Auth Admin API without a real Supabase project.
 *
 * Backing semantics:
 * - `admin.listUsers()` reflects every user currently in `testStore.users`,
 *   so duplicate-email detection works for both `createTestUser()` and users
 *   created via `admin.createUser()` within the same test.
 * - `admin.createUser()` inserts a new user into `testStore.users` (so it is
 *   discoverable by subsequent `listUsers()` calls) and returns its id/email.
 * - `signInWithPassword()` verifies the supplied password against the stored
 *   bcrypt hash, so correct passwords succeed and wrong/unknown ones fail.
 */
export function buildE2EAuthMock() {
  const findUserByEmail = (email: string): TestUser | undefined => {
    const lower = email.toLowerCase();
    for (const user of testStore.users.values()) {
      if (user.email.toLowerCase() === lower) {
        return user;
      }
    }
    return undefined;
  };

  const toAuthUser = (user: TestUser) => ({
    id: user.id,
    email: user.email,
    user_metadata: { name: user.name },
    app_metadata: {},
    aud: 'authenticated',
    created_at: user.createdAt,
  });

  return {
    // ── Standard (non-admin) auth surface ──
    getUser: jest.fn(async (_token?: string) => {
      return { data: { user: null }, error: null };
    }),
    signInWithPassword: jest.fn(async (credentials: { email: string; password: string }) => {
      const user = findUserByEmail(credentials.email);
      if (!user) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', status: 400 },
        };
      }
      const hash = user.passwordHash || testStore.passwordHashes.get(user.id);
      const passwordValid = hash
        ? await bcrypt.compare(credentials.password, hash)
        : credentials.password === user.password;
      if (!passwordValid) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', status: 400 },
        };
      }
      return {
        data: {
          user: toAuthUser(user),
          session: { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' },
        },
        error: null,
      };
    }),
    signOut: jest.fn(async () => ({ error: null })),
    resetPasswordForEmail: jest.fn(async (_email: string, _opts?: Record<string, unknown>) => ({
      data: {},
      error: null,
    })),

    // ── Admin auth surface (service-role) ──
    admin: {
      listUsers: jest.fn(async () => ({
        data: { users: Array.from(testStore.users.values()).map(toAuthUser) },
        error: null,
      })),
      createUser: jest.fn(async (attrs: {
        email: string;
        password?: string;
        email_confirm?: boolean;
        user_metadata?: { name?: string };
      }) => {
        const id = randomUUID();
        const name = attrs.user_metadata?.name || 'Test User';
        const passwordHash = attrs.password ? await bcrypt.hash(attrs.password, 12) : '';
        const user: TestUser = {
          id,
          email: attrs.email,
          name,
          password: attrs.password || '',
          passwordHash,
          role: 'owner',
          workspaceId: '',
          createdAt: new Date().toISOString(),
        };
        testStore.users.set(id, user);
        if (passwordHash) {
          testStore.passwordHashes.set(id, passwordHash);
        }
        return { data: { user: toAuthUser(user) }, error: null };
      }),
      deleteUser: jest.fn(async (id: string) => {
        testStore.users.delete(id);
        testStore.passwordHashes.delete(id);
        return { data: { user: null }, error: null };
      }),
      updateUserById: jest.fn(async (
        id: string,
        attrs: { password?: string; email?: string; user_metadata?: { name?: string } },
      ) => {
        const user = testStore.users.get(id);
        if (!user) {
          return { data: { user: null }, error: { message: 'User not found', status: 404 } };
        }
        if (attrs.password) {
          const passwordHash = await bcrypt.hash(attrs.password, 12);
          user.password = attrs.password;
          user.passwordHash = passwordHash;
          testStore.passwordHashes.set(id, passwordHash);
        }
        if (attrs.email) {
          user.email = attrs.email;
        }
        if (attrs.user_metadata?.name) {
          user.name = attrs.user_metadata.name;
        }
        testStore.users.set(id, user);
        return { data: { user: toAuthUser(user) }, error: null };
      }),
      getUserById: jest.fn(async (id: string) => {
        const user = testStore.users.get(id);
        return {
          data: { user: user ? toAuthUser(user) : null },
          error: null,
        };
      }),
    },
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
