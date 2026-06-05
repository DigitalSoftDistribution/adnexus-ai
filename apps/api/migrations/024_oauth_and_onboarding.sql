-- migrate:up
-- =============================================================================
-- 024 — OAuth token reconciliation + onboarding flag
-- =============================================================================
-- Reconciles the `ad_accounts` token columns referenced by the Meta/Google
-- OAuth callbacks with the canonical schema (migration 001), and adds an
-- onboarding-completion flag to `workspaces` so the in-app onboarding wizard
-- can gate new workspaces.
--
-- Canonical token columns on the live schema are `oauth_token` /
-- `refresh_token` / `platform_account_id` / `name` / `status`. The OAuth writers
-- and the v2 PlatformManager are aligned to these. This migration only ADDS the
-- columns that were genuinely missing (`scopes`, `is_active`, `last_synced_at`)
-- so all readers/writers agree on one shape.

-- ── ad_accounts: OAuth metadata ──────────────────────────────────────────────
ALTER TABLE ad_accounts
  ADD COLUMN IF NOT EXISTS scopes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Some migration sets created `account_name`; application code and OAuth use
-- canonical `name`. Add/backfill `name` so both initial schemas converge.
ALTER TABLE ad_accounts
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'account_name'
  ) THEN
    UPDATE ad_accounts SET name = account_name
      WHERE name IS NULL AND account_name IS NOT NULL;
  END IF;
END $$;

UPDATE ad_accounts SET name = platform_account_id WHERE name IS NULL;
ALTER TABLE ad_accounts ALTER COLUMN name SET NOT NULL;

-- Reconcile token columns. Migration 001 created `access_token` (NOT NULL), but
-- every OAuth writer, the PlatformManager, and the sync/write services use
-- `oauth_token`. Add `oauth_token`/`refresh_token` if missing and backfill from
-- the legacy `access_token`, so a database built purely from migrations exposes
-- the column names all readers/writers expect.
ALTER TABLE ad_accounts
  ADD COLUMN IF NOT EXISTS oauth_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'access_token'
  ) THEN
    UPDATE ad_accounts SET oauth_token = access_token
      WHERE oauth_token IS NULL AND access_token IS NOT NULL;
    -- Disconnect flows null the tokens, so the legacy NOT NULL must be relaxed.
    ALTER TABLE ad_accounts ALTER COLUMN access_token DROP NOT NULL;
  END IF;
END $$;

-- Normalize legacy uppercase statuses to the lowercase status vocabulary used by
-- OAuth, sync, repositories, and integration health.
UPDATE ad_accounts
SET status = CASE LOWER(COALESCE(status, ''))
  WHEN '' THEN 'active'
  WHEN 'active' THEN 'active'
  WHEN 'enabled' THEN 'active'
  WHEN 'pending' THEN 'active'
  WHEN 'disconnected' THEN 'disconnected'
  WHEN 'inactive' THEN 'disconnected'
  WHEN 'paused' THEN 'disconnected'
  WHEN 'disabled' THEN 'disconnected'
  WHEN 'removed' THEN 'disconnected'
  WHEN 'revoked' THEN 'disconnected'
  WHEN 'expired' THEN 'expired'
  WHEN 'refresh_needed' THEN 'expired'
  WHEN 'token_expired' THEN 'expired'
  WHEN 'needs_reauth' THEN 'expired'
  WHEN 'error' THEN 'error'
  ELSE 'error'
END;

-- Keep is_active consistent with canonical status for pre-existing rows.
UPDATE ad_accounts SET is_active = (status = 'active');

ALTER TABLE ad_accounts DROP CONSTRAINT IF EXISTS ad_accounts_status_check;
ALTER TABLE ad_accounts
  ADD CONSTRAINT ad_accounts_status_check
  CHECK (status IN ('active', 'disconnected', 'expired', 'error'));

ALTER TABLE ad_accounts ALTER COLUMN status SET DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_ad_accounts_is_active ON ad_accounts(is_active);

-- ── workspaces: onboarding flag ──────────────────────────────────────────────
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT;

-- migrate:down
-- Note: oauth_token/refresh_token are intentionally NOT dropped here. They are
-- the canonical token columns the whole app reads/writes and may pre-date this
-- migration on existing databases; dropping them on rollback would break OAuth.
ALTER TABLE ad_accounts
  DROP COLUMN IF EXISTS scopes,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS last_synced_at;

DROP INDEX IF EXISTS idx_ad_accounts_is_active;

ALTER TABLE workspaces
  DROP COLUMN IF EXISTS onboarding_completed_at,
  DROP COLUMN IF EXISTS onboarding_step;
