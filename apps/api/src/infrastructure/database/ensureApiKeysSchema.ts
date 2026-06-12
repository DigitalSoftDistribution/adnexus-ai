import { query } from './connection';

let ensured: Promise<void> | null = null;

/**
 * Preview databases can lag behind migration 030. Add the platforms column
 * idempotently before api_keys reads/writes that depend on it.
 */
export async function ensureApiKeysSchema(): Promise<void> {
  if (ensured) {
    return ensured;
  }

  ensured = (async () => {
    await query(`
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
    `);
  })().catch((err: unknown) => {
    ensured = null;
    throw err;
  });

  return ensured;
}
