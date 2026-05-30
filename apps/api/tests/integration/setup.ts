/**
 * Integration test setup — seeds the test database with minimal fixtures.
 *
 * Usage:
 *   docker compose -f docker-compose.test.yml up -d
 *   DATABASE_URL=postgres://test:test@localhost:5433/adnexus_test npx vitest run --config vitest.config.integration.ts
 */

import { Pool } from 'pg';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgres://test:test@localhost:5433/adnexus_test';

const pool = new Pool({ connectionString: TEST_DB_URL });

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'snap', 'linkedin')),
        platform_account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCONNECTED', 'ERROR')),
        token_expires_at TIMESTAMPTZ,
        spend_cap NUMERIC,
        disabled_reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(workspace_id, platform, platform_account_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        platform_campaign_id TEXT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        objective TEXT,
        budget TEXT,
        budget_type TEXT,
        daily_budget NUMERIC,
        lifetime_budget NUMERIC,
        spend NUMERIC DEFAULT 0,
        impressions BIGINT DEFAULT 0,
        clicks BIGINT DEFAULT 0,
        ctr NUMERIC,
        conversions INTEGER DEFAULT 0,
        cpa NUMERIC,
        roas NUMERIC,
        frequency NUMERIC,
        cpm NUMERIC,
        cpc NUMERIC,
        start_date TEXT,
        end_date TEXT,
        platform_data JSONB,
        lead_form_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function seedFixtures(): Promise<{
  userId: string;
  workspaceId: string;
  adAccountId: string;
  campaignId: string;
}> {
  const { rows: [user] } = await pool.query(
    `INSERT INTO users (email, name, role) VALUES ('test@adnexus.test', 'Test User', 'admin') RETURNING id`,
  );

  const { rows: [workspace] } = await pool.query(
    `INSERT INTO workspaces (name, plan) VALUES ('Test Workspace', 'pro') RETURNING id`,
  );

  const { rows: [adAccount] } = await pool.query(
    `INSERT INTO ad_accounts (workspace_id, platform, platform_account_id, name, status) VALUES ($1, 'meta', 'act_123', 'Test Ad Account', 'ACTIVE') RETURNING id`,
    [workspace.id],
  );

  const { rows: [campaign] } = await pool.query(
    `INSERT INTO campaigns (workspace_id, ad_account_id, platform, name, status) VALUES ($1, $2, 'meta', 'Test Campaign', 'active') RETURNING id`,
    [workspace.id, adAccount.id],
  );

  return {
    userId: user.id,
    workspaceId: workspace.id,
    adAccountId: adAccount.id,
    campaignId: campaign.id,
  };
}

export async function cleanDatabase(): Promise<void> {
  await pool.query('DELETE FROM campaigns');
  await pool.query('DELETE FROM ad_accounts');
  await pool.query('DELETE FROM workspaces');
  await pool.query('DELETE FROM users');
}

export { pool };
