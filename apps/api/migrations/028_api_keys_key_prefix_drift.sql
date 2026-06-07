-- migrate:up
-- =============================================================================
-- 028 — api_keys key_prefix drift repair
-- =============================================================================
-- The canonical API key display column is key_prefix. Some live databases were
-- created with the legacy key_preview name; repair that drift without touching
-- environments that already match the canonical schema.

DO $$
BEGIN
  IF to_regclass('public.api_keys') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'api_keys'
         AND column_name = 'key_prefix'
     )
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'api_keys'
         AND column_name = 'key_preview'
     ) THEN
    ALTER TABLE api_keys ADD COLUMN key_prefix TEXT;
    UPDATE api_keys SET key_prefix = key_preview WHERE key_prefix IS NULL;

    IF NOT EXISTS (SELECT 1 FROM api_keys WHERE key_prefix IS NULL) THEN
      ALTER TABLE api_keys ALTER COLUMN key_prefix SET NOT NULL;
    END IF;
  END IF;
END $$;

-- migrate:down
-- Non-reversible drift repair: key_prefix is the canonical column and should not
-- be removed on rollback.
