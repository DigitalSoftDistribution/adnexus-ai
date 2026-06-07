-- migrate:up
-- =============================================================================
-- 028 — allow Supabase Auth-backed users without legacy password hashes
-- =============================================================================
-- Passwords are managed by Supabase Auth. Some environments still have the
-- legacy users.password_hash column as NOT NULL, while newer schemas have already
-- removed it. Keep this migration safe for both states.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END $$;

-- migrate:down
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash'
  ) THEN
    IF EXISTS (SELECT 1 FROM users WHERE password_hash IS NULL) THEN
      RAISE EXCEPTION 'Cannot set users.password_hash NOT NULL while NULL values exist';
    END IF;

    ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
  END IF;
END $$;
