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
import { UUIDS } from '../fixtures/data';

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
  // Synthetic ad-account registry. The campaigns route resolves a campaign's
  // platform via SELECT ... FROM ad_accounts; there is no first-class ad_accounts
  // helper, so we seed it from fixtures + createTestCampaign.
  adAccounts: new Map<string, { id: string; workspaceId: string; platform: string; accountId: string; name: string }>(),
};

// Seed the two fixture ad accounts so POST /campaigns (which sends
// UUIDS.metaAccount / UUIDS.googleAccount) can resolve a platform. These are
// workspace-agnostic: getAdAccountPlatform matches on id, and the per-test
// workspace id is dynamic.
function seedDefaultAdAccounts(): void {
  testStore.adAccounts.set(UUIDS.metaAccount, {
    id: UUIDS.metaAccount, workspaceId: '', platform: 'meta', accountId: 'act_1234567890', name: 'Meta Ad Account',
  });
  testStore.adAccounts.set(UUIDS.googleAccount, {
    id: UUIDS.googleAccount, workspaceId: '', platform: 'google', accountId: '123-456-7890', name: 'Google Ad Account',
  });
}

// ─── Store-backed raw SQL query() mock ───────────────────────────
//
// The campaigns route (src/routes/campaigns.ts) reads/writes via raw SQL using
// query() from src/db/connection — NOT via supabase. tests/setup.ts mocks that
// module so query() always returns { rows: [], rowCount: 0 }, which makes the
// campaigns e2e suite see an empty DB (lists empty, get-by-id 404, create 404).
//
// Here we replace that mock's implementation with one backed by the in-memory
// testStore. We match the SQL the route issues loosely (case-insensitive key
// substrings) and honor the positional $1..$n params. The route projects the
// campaign columns in snake_case plus the joined ad-account columns, so we shape
// rows accordingly.

interface AdAccountRow {
  id: string;
  workspaceId: string;
  platform: string;
  accountId: string;
  name: string;
}

/** Build the snake_case "campaign joined with ad_account" row the route selects. */
function campaignJoinRow(c: TestCampaign): Record<string, unknown> | null {
  const account = testStore.adAccounts.get(c.adAccountId);
  const platform = account?.platform ?? c.platform;
  const workspaceId = c.workspaceId;
  return {
    // campaign columns (c.*)
    id: c.id,
    workspace_id: workspaceId,
    ad_account_id: c.adAccountId,
    name: c.name,
    status: c.status,
    objective: c.objective,
    daily_budget: c.dailyBudget,
    platform_campaign_id: `ext_${c.id.slice(0, 8)}`,
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    roas: 0,
    conversions: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    // joined ad_account columns
    platform,
    ad_account_account_id: account?.accountId ?? `act_${c.adAccountId.slice(0, 8)}`,
    ad_account_name: account?.name ?? `${platform} Ad Account`,
  };
}

/** Resolve campaigns for a workspace honoring optional platform/status/name filters. */
function filterCampaigns(
  workspaceId: string,
  opts: { platform?: string; status?: string; nameLike?: string } = {},
): Record<string, unknown>[] {
  let rows = Array.from(testStore.campaigns.values())
    .map((c) => c as unknown as TestCampaign)
    .filter((c) => c.workspaceId === workspaceId)
    .map((c) => campaignJoinRow(c))
    .filter((r): r is Record<string, unknown> => r !== null);

  if (opts.platform) rows = rows.filter((r) => r.platform === opts.platform);
  if (opts.status) rows = rows.filter((r) => r.status === opts.status);
  if (opts.nameLike) {
    const needle = opts.nameLike.replace(/%/g, '').toLowerCase();
    rows = rows.filter((r) => String(r.name).toLowerCase().includes(needle));
  }
  return rows;
}

/**
 * Parse the dynamic WHERE filters the list/count queries build. The route always
 * puts workspace_id at $1, then appends a.platform / c.status / c.name ILIKE in
 * that order using the remaining params (before the trailing LIMIT/OFFSET pair).
 */
function parseListFilters(
  sqlLower: string,
  params: unknown[],
): { workspaceId: string; platform?: string; status?: string; nameLike?: string } {
  const workspaceId = params[0] as string;
  let idx = 1;
  const out: { workspaceId: string; platform?: string; status?: string; nameLike?: string } = { workspaceId };
  if (sqlLower.includes('a.platform =')) out.platform = params[idx++] as string;
  if (sqlLower.includes('c.status =')) out.status = params[idx++] as string;
  if (sqlLower.includes('c.name ilike')) out.nameLike = params[idx++] as string;
  return out;
}

function storeBackedQuery(sql: string, params: unknown[] = []): { rows: Record<string, unknown>[]; rowCount: number } {
  const s = sql.toLowerCase();
  const wrap = (rows: Record<string, unknown>[]) => ({ rows, rowCount: rows.length });

  // getAdAccountPlatform: SELECT platform FROM ad_accounts WHERE id = $1 AND workspace_id = $2
  if (s.includes('from ad_accounts') && s.includes('select platform')) {
    const account = testStore.adAccounts.get(params[0] as string);
    return wrap(account ? [{ platform: account.platform }] : []);
  }

  // verifyCampaignWorkspace: SELECT c.id, c.name, a.platform, c.platform_campaign_id, c.status ... WHERE c.id = $1 AND a.workspace_id = $2
  if (s.includes('from campaigns c') && s.includes('c.platform_campaign_id') && s.includes('where c.id =')) {
    const c = testStore.campaigns.get(params[0] as string) as unknown as TestCampaign | undefined;
    const ws = params[1] as string;
    if (!c || c.workspaceId !== ws) return wrap([]);
    const row = campaignJoinRow(c)!;
    return wrap([{
      id: row.id,
      name: row.name,
      platform: row.platform,
      platform_campaign_id: row.platform_campaign_id,
      status: row.status,
    }]);
  }

  // get-by-id detail: SELECT c.*, a.platform, a.name AS ad_account_name ... WHERE c.id = $1 AND a.workspace_id = $2 LIMIT 1
  if (
    s.includes('from campaigns c') &&
    s.includes('where c.id =') &&
    s.includes('a.workspace_id =') &&
    s.includes('c.*')
  ) {
    const c = testStore.campaigns.get(params[0] as string) as unknown as TestCampaign | undefined;
    const ws = params[1] as string;
    if (!c || c.workspaceId !== ws) return wrap([]);
    return wrap([campaignJoinRow(c)!]);
  }

  // Count: SELECT COUNT(*)::int AS total FROM campaigns c JOIN ad_accounts a ...
  if (s.includes('count(*)::int as total') && s.includes('from campaigns c')) {
    const f = parseListFilters(s, params);
    const rows = filterCampaigns(f.workspaceId, f);
    return wrap([{ total: rows.length }]);
  }

  // Data list: SELECT c.*, a.platform, a.account_id AS ad_account_account_id ... ORDER BY ... LIMIT $ OFFSET $
  if (s.includes('from campaigns c') && s.includes('ad_account_account_id')) {
    const f = parseListFilters(s, params);
    let rows = filterCampaigns(f.workspaceId, f);
    // ORDER BY created_at DESC is the route default; store rows share a created_at
    // so insertion order (Map order) is a stable proxy. Honor LIMIT/OFFSET.
    const limit = Number(params[params.length - 2]);
    const offset = Number(params[params.length - 1]);
    if (!Number.isNaN(offset)) rows = rows.slice(offset);
    if (!Number.isNaN(limit)) rows = rows.slice(0, limit);
    return wrap(rows);
  }

  // Summary aggregate (total/active/spend/...)
  if (s.includes('total_campaigns') && s.includes('from campaigns c')) {
    const ws = params[0] as string;
    const rows = filterCampaigns(ws);
    const active = rows.filter((r) => r.status === 'active').length;
    return wrap([{
      total_campaigns: rows.length,
      active_campaigns: active,
      total_spend: 0,
      total_conversions: 0,
      avg_ctr: 0,
      avg_roas: 0,
    }]);
  }

  // Summary platform breakdown
  if (s.includes('group by a.platform') && s.includes('from campaigns c')) {
    const ws = params[0] as string;
    const rows = filterCampaigns(ws);
    const byPlatform = new Map<string, { platform: string; count: number; active_count: number; total_spend: number }>();
    for (const r of rows) {
      const p = String(r.platform);
      const entry = byPlatform.get(p) ?? { platform: p, count: 0, active_count: 0, total_spend: 0 };
      entry.count++;
      if (r.status === 'active') entry.active_count++;
      byPlatform.set(p, entry);
    }
    return wrap(Array.from(byPlatform.values()));
  }

  // Summary status breakdown
  if (s.includes('group by c.status') && s.includes('from campaigns c')) {
    const ws = params[0] as string;
    const rows = filterCampaigns(ws);
    const byStatus = new Map<string, { status: string; count: number }>();
    for (const r of rows) {
      const st = String(r.status);
      const entry = byStatus.get(st) ?? { status: st, count: 0 };
      entry.count++;
      byStatus.set(st, entry);
    }
    return wrap(Array.from(byStatus.values()));
  }

  // adsets / ads / campaign_metrics / duplicate-detail campaigns lookup → empty.
  // The route handles empty rows gracefully (empty ad_sets, zeroed insights).
  return wrap([]);
}

/**
 * Install the store-backed implementation onto the globally-mocked query().
 * tests/setup.ts mocks src/db/connection; we grab the same mock instance and
 * drive it from the in-memory store.
 */
function installStoreBackedDbQuery(): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const dbMock = jest.requireMock('../../src/db/connection') as any;
  if (dbMock?.query?.mockImplementation) {
    (dbMock.query as jest.Mock).mockImplementation((sql: string, params?: unknown[]) =>
      Promise.resolve(storeBackedQuery(sql, params ?? [])),
    );
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// Install immediately on module load so it is active for every e2e suite that
// imports this setup (campaigns, drafts, auth, ...). beforeEach's
// jest.clearAllMocks() clears call history but preserves implementations.
installStoreBackedDbQuery();

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
  testStore.adAccounts.clear();
  seedDefaultAdAccounts();

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
  testStore.adAccounts.clear();

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
        testStore.adAccounts.clear();
        seedDefaultAdAccounts();
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
        testStore.adAccounts.clear();
        seedDefaultAdAccounts();
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

  // Register a synthetic ad account for this campaign so the campaigns route's
  // SQL JOIN (campaigns -> ad_accounts) and getAdAccountPlatform() resolve.
  if (!testStore.adAccounts.has(campaign.adAccountId)) {
    testStore.adAccounts.set(campaign.adAccountId, {
      id: campaign.adAccountId,
      workspaceId,
      platform: campaign.platform,
      accountId: `act_${campaign.adAccountId.slice(0, 10)}`,
      name: `${campaign.platform} Ad Account`,
    });
  }

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

  const campaignId = overrides.campaignId || randomUUID();
  const platform = overrides.platform || 'meta';

  // Ensure the campaign the draft references exists in the store so the
  // execution engine's validator (checkCampaignExists -> getCampaign) passes.
  // Without this, approve/reject/cancel flows fail validation with
  // CAMPAIGN_NOT_FOUND -> 500 EXECUTION_FAILED.
  if (!testStore.campaigns.has(campaignId)) {
    await createTestCampaign(workspaceId, {
      id: campaignId,
      platform: platform as TestCampaign['platform'],
      status: 'active',
      dailyBudget: 100,
    });
  }

  const draft: TestDraft = {
    id,
    workspaceId,
    campaignId,
    draftType: overrides.draftType || 'budget_change',
    platform,
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
  // Delegate to the generic store-backed chainable builder so that arbitrary
  // chains the routes use (e.g. `.select('user_id').eq('workspace_id', x).in('role', [...])`
  // in notifyApprovers) resolve correctly. Members are stored camelCase; project
  // them to the snake_case row shape the routes (and real Supabase) read.
  const toRow = (m: { workspaceId: string; userId: string; role: WorkspaceRole }) => ({
    workspace_id: m.workspaceId,
    user_id: m.userId,
    role: m.role,
    created_at: new Date().toISOString(),
  });

  return buildChainableBuilder({
    listRows: () => Array.from(testStore.workspaceMembers.values()).map(toRow),
    onInsert: (item) => {
      const member = {
        workspaceId: (item.workspace_id as string) || '',
        userId: (item.user_id as string) || '',
        role: (item.role as WorkspaceRole) || 'analyst',
      };
      testStore.workspaceMembers.set(`${member.workspaceId}:${member.userId}`, member);
      return toRow(member);
    },
  });
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
  // Project stored campaigns (camelCase) into the snake_case row shape the
  // routes and engine mappers read (e.g. mapDbCampaignToEngineCampaign reads
  // `daily_budget`, `created_at`, `ad_account_id`). Delegate to the generic
  // store-backed chainable builder so chains like
  // `.select('*').eq('id', x).single()` resolve from the store, and join
  // selects (`*, ad_accounts!inner(...)`) get enriched.
  const toRow = (c: Record<string, unknown>) => {
    const tc = c as TestCampaign;
    return {
      id: tc.id,
      workspace_id: tc.workspaceId,
      ad_account_id: tc.adAccountId,
      name: tc.name,
      status: tc.status,
      objective: tc.objective,
      daily_budget: tc.dailyBudget,
      platform: tc.platform,
      platform_campaign_id: (c.platformCampaignId as string) ?? tc.id,
      created_at: (c.createdAt as string) ?? new Date().toISOString(),
      updated_at: (c.updatedAt as string) ?? new Date().toISOString(),
    };
  };

  return buildChainableBuilder({
    listRows: () => Array.from(testStore.campaigns.values()).map(toRow),
    onInsert: (item) => {
      const campaign: TestCampaign = {
        id: (item.id as string) || randomUUID(),
        workspaceId: (item.workspace_id as string) || '',
        adAccountId: (item.ad_account_id as string) || '',
        name: (item.name as string) || 'Test Campaign',
        status: (item.status as string) || 'active',
        objective: (item.objective as string) || 'CONVERSIONS',
        dailyBudget: (item.daily_budget as number) || 0,
        platform: (item.platform as TestCampaign['platform']) || 'meta',
      };
      testStore.campaigns.set(campaign.id, campaign);
      return toRow(campaign as unknown as Record<string, unknown>);
    },
    onUpdate: (id, patch) => {
      const existing = testStore.campaigns.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch } as Record<string, unknown>;
      testStore.campaigns.set(id, updated);
      return toRow(updated);
    },
    onDelete: (id) => {
      testStore.campaigns.delete(id);
    },
    enrich: (row, columns) => {
      if (columns.includes('ad_accounts')) {
        return {
          ...row,
          ad_accounts: { platform: row.platform, workspace_id: row.workspace_id },
        };
      }
      return row;
    },
  });
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
