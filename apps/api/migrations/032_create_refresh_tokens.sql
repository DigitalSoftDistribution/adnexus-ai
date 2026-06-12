-- migrate:up
-- =============================================================================
-- 032 — refresh_tokens table for AUTH-001 rotation
-- =============================================================================
-- The refresh-token service (signin/signup/refresh/logout) persists hashed
-- refresh tokens in Postgres. Migration 023 lived only under src/migrations/
-- which the deploy runner never reads (apps/api/migrations/ is canonical).
-- Without this table, /api/v1/auth/signin returns 500 on preview/prod.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by UUID REFERENCES refresh_tokens(id),
  device_fingerprint TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- migrate:down
DROP TABLE IF EXISTS refresh_tokens;
