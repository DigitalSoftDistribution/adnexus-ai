-- migrate:up
-- =============================================================================
-- 030 — api_keys platforms column for platform-level isolation
-- =============================================================================
-- API keys can restrict access to specific ad platforms (meta, google, tiktok, snap).
-- Defaults to all platforms for backward compatibility with existing keys.

DO $$
BEGIN
  IF to_regclass('public.api_keys') IS NOT NULL THEN
    ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS platforms JSONB NOT NULL
      DEFAULT '["meta","google","tiktok","snap"]'::jsonb;

    UPDATE api_keys
    SET platforms = '["meta","google","tiktok","snap"]'::jsonb
    WHERE platforms IS NULL;
  END IF;
END $$;

-- migrate:down
-- Non-reversible: platforms is required by scoped API key auth.
