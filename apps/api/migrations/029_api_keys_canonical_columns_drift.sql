-- migrate:up
-- =============================================================================
-- 029 — api_keys canonical columns drift repair
-- =============================================================================
-- Some live databases were created from an older api_keys shape that used
-- `permissions`/`key_preview` and omitted the v2 repository columns. Add only
-- missing canonical columns so reads, creates, and revokes use the repo schema.

DO $$
BEGIN
  IF to_regclass('public.api_keys') IS NOT NULL THEN
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scopes JSONB NOT NULL DEFAULT '["read"]'::jsonb;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'api_keys'
        AND column_name = 'scopes'
        AND data_type = 'ARRAY'
    ) THEN
      ALTER TABLE api_keys
        ALTER COLUMN scopes DROP DEFAULT,
        ALTER COLUMN scopes TYPE JSONB USING to_jsonb(COALESCE(scopes, ARRAY['read']::TEXT[])),
        ALTER COLUMN scopes SET DEFAULT '["read"]'::jsonb,
        ALTER COLUMN scopes SET NOT NULL;
    ELSE
      ALTER TABLE api_keys
        ALTER COLUMN scopes SET DEFAULT '["read"]'::jsonb,
        ALTER COLUMN scopes SET NOT NULL;
    END IF;

    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS calls_today INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS calls_this_month INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'api_keys'
        AND column_name = 'permissions'
    ) THEN
      UPDATE api_keys
      SET scopes = CASE
        WHEN permissions ? 'scopes' AND jsonb_typeof(permissions->'scopes') = 'array'
          THEN permissions->'scopes'
        WHEN permissions ? 'write' AND lower(COALESCE(permissions->>'write', '')) NOT IN ('', 'false', 'none', 'null')
          THEN '["read", "write"]'::jsonb
        ELSE '["read"]'::jsonb
      END
      WHERE scopes = '["read"]'::jsonb;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_status ON api_keys(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(key_hash) WHERE status = 'active';

-- migrate:down
-- Non-reversible drift repair: these are canonical columns required by the API.
