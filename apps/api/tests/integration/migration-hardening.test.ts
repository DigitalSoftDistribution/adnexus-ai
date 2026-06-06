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

  it('synchronizes ad_accounts.is_active for every normalized status', () => {
    const migration = readFileSync(join(migrationsDir, '024_oauth_and_onboarding.sql'), 'utf8');

    expect(migration).toContain("UPDATE ad_accounts SET is_active = (status = 'active');");
    expect(migration).not.toContain("WHERE is_active IS NULL");
  });
});
