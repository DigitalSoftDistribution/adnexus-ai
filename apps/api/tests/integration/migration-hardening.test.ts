import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration hardening', () => {
  const migrationsDir = join(__dirname, '../../migrations');

  it('seeds api_keys.scopes as text arrays to match the schema', () => {
    const seed = readFileSync(join(migrationsDir, '002_seed_data.sql'), 'utf8');

    expect(seed).toContain("ARRAY['read', 'write']::TEXT[]");
    expect(seed).toContain("ARRAY['read']::TEXT[]");
    expect(seed).not.toContain('::jsonb, NOW() - INTERVAL');
  });

  it('converts legacy api_keys.scopes text arrays to jsonb before API inserts', () => {
    const migration = readFileSync(join(migrationsDir, '029_api_keys_canonical_columns_drift.sql'), 'utf8');

    expect(migration).toContain("AND data_type = 'ARRAY'");
    expect(migration).toContain("ALTER COLUMN scopes TYPE JSONB USING to_jsonb(COALESCE(scopes, ARRAY['read']::TEXT[]))");
    expect(migration).toContain("ALTER COLUMN scopes SET DEFAULT '[\"read\"]'::jsonb");
  });

  it('adds api_keys.platforms for scoped platform isolation', () => {
    const migration = readFileSync(join(migrationsDir, '030_api_keys_platforms.sql'), 'utf8');

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS platforms JSONB NOT NULL');
    expect(migration).toContain('["meta","google","tiktok","snap"]');
  });

  it('expands legacy api_keys.scopes to resource:operation format', () => {
    const migration = readFileSync(join(migrationsDir, '031_api_keys_legacy_scopes.sql'), 'utf8');

    expect(migration).toContain("scope_entry IN ('read', 'write', 'admin')");
    expect(migration).toContain("format('%s:%s', resource_name, scope_entry)");
  });

  it('synchronizes ad_accounts.is_active for every normalized status', () => {
    const migration = readFileSync(join(migrationsDir, '024_oauth_and_onboarding.sql'), 'utf8');

    expect(migration).toContain("UPDATE ad_accounts SET is_active = (status = 'active');");
    expect(migration).not.toContain("WHERE is_active IS NULL");
  });

  it('creates refresh_tokens in the canonical migrations directory', () => {
    const migration = readFileSync(join(migrationsDir, '032_create_refresh_tokens.sql'), 'utf8');

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS refresh_tokens');
    expect(migration).toContain('token_hash TEXT NOT NULL UNIQUE');
    expect(migration).toContain('replaced_by UUID REFERENCES refresh_tokens(id)');
  });
});
