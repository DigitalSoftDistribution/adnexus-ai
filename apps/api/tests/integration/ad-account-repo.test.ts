/**
 * Integration test example — AdAccountRepository against real PostgreSQL.
 *
 * Prerequisites:
 *   docker compose -f docker-compose.test.yml up -d
 *   TEST_DATABASE_URL=postgres://test:test@localhost:5433/adnexus_test
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { AdAccountRepository } from '../../src/infrastructure/repositories/AdAccountRepository';
import { runMigrations, seedFixtures, cleanDatabase, pool } from './setup';

describe('AdAccountRepository (integration)', () => {
  let repo: AdAccountRepository;
  let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

  beforeAll(async () => {
    await runMigrations();
    fixtures = await seedFixtures();
    repo = new AdAccountRepository();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates and retrieves an ad account', async () => {
    const created = await repo.create({
      workspaceId: fixtures.workspaceId,
      platform: 'google',
      platformAccountId: 'gact_456',
      name: 'Google Ads Account',
      status: 'ACTIVE',
      tokenExpiresAt: null,
      spendCap: 5000,
      disabledReason: null,
      metadata: { region: 'US' },
    });

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.platform).toBe('google');
    expect(created.name).toBe('Google Ads Account');
    expect(created.status).toBe('ACTIVE');
    expect(created.metadata).toEqual({ region: 'US' });

    const found = await repo.findById(created.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
  });

  it('finds by workspace', async () => {
    await repo.create({
      workspaceId: fixtures.workspaceId,
      platform: 'meta',
      platformAccountId: 'meta_789',
      name: 'Meta Account',
      status: 'ACTIVE',
      tokenExpiresAt: null,
      spendCap: null,
      disabledReason: null,
      metadata: {},
    });

    const accounts = await repo.findByWorkspace(fixtures.workspaceId);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
  });

  it('finds by platform account id', async () => {
    await repo.create({
      workspaceId: fixtures.workspaceId,
      platform: 'tiktok',
      platformAccountId: 'tt_unique_001',
      name: 'TikTok Account',
      status: 'ACTIVE',
      tokenExpiresAt: null,
      spendCap: null,
      disabledReason: null,
      metadata: {},
    });

    const found = await repo.findByPlatformAccountId('tt_unique_001', 'tiktok');
    expect(found).toBeDefined();
    expect(found!.name).toBe('TikTok Account');
  });

  it('updates an ad account', async () => {
    const created = await repo.create({
      workspaceId: fixtures.workspaceId,
      platform: 'snap',
      platformAccountId: 'snap_001',
      name: 'Snap Account',
      status: 'ACTIVE',
      tokenExpiresAt: null,
      spendCap: null,
      disabledReason: null,
      metadata: {},
    });

    const updated = await repo.update(created.id, {
      name: 'Snap Account (Updated)',
      status: 'DISCONNECTED',
      disabledReason: 'Token expired',
    });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe('Snap Account (Updated)');
    expect(updated!.status).toBe('DISCONNECTED');
    expect(updated!.disabledReason).toBe('Token expired');
  });

  it('deletes an ad account', async () => {
    const created = await repo.create({
      workspaceId: fixtures.workspaceId,
      platform: 'linkedin',
      platformAccountId: 'li_001',
      name: 'LinkedIn Account',
      status: 'ACTIVE',
      tokenExpiresAt: null,
      spendCap: null,
      disabledReason: null,
      metadata: {},
    });

    const deleted = await repo.delete(created.id);
    expect(deleted).toBe(true);

    const found = await repo.findById(created.id);
    expect(found).toBeNull();
  });

  it('counts by workspace', async () => {
    await repo.create({
      workspaceId: fixtures.workspaceId,
      platform: 'meta',
      platformAccountId: 'count_1',
      name: 'Count Test 1',
      status: 'ACTIVE',
      tokenExpiresAt: null,
      spendCap: null,
      disabledReason: null,
      metadata: {},
    });

    await repo.create({
      workspaceId: fixtures.workspaceId,
      platform: 'google',
      platformAccountId: 'count_2',
      name: 'Count Test 2',
      status: 'ACTIVE',
      tokenExpiresAt: null,
      spendCap: null,
      disabledReason: null,
      metadata: {},
    });

    const count = await repo.countByWorkspace(fixtures.workspaceId);
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
