-- migrate:up
-- =============================================================================
-- 031 — expand legacy api_keys.scopes to resource:operation format
-- =============================================================================
-- Pre-scoping keys stored coarse values like ["read"] or ["read","write"].
-- Expand them in-place so scoped route checks work without manual re-creation.

DO $$
DECLARE
  key_row RECORD;
  resources TEXT[] := ARRAY[
    'campaigns', 'ads', 'drafts', 'reports', 'audiences', 'settings',
    'notifications', 'billing', 'goals', 'exports', 'search', 'rag',
    'webhooks', 'audit-log', 'comments', 'alerts', 'agent'
  ];
  resource_name TEXT;
  scope_entry TEXT;
  expanded JSONB;
BEGIN
  IF to_regclass('public.api_keys') IS NULL THEN
    RETURN;
  END IF;

  FOR key_row IN
    SELECT id, scopes
    FROM api_keys
    WHERE jsonb_typeof(scopes) = 'array'
      AND jsonb_array_length(scopes) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(scopes) AS s(value)
        WHERE s.value LIKE '%:%'
      )
  LOOP
    expanded := '[]'::jsonb;

    FOR scope_entry IN
      SELECT jsonb_array_elements_text(key_row.scopes)
    LOOP
      IF scope_entry IN ('read', 'write', 'admin') THEN
        FOREACH resource_name IN ARRAY resources LOOP
          expanded := expanded || to_jsonb(format('%s:%s', resource_name, scope_entry));
        END LOOP;
      END IF;
    END LOOP;

    IF jsonb_array_length(expanded) > 0 THEN
      UPDATE api_keys
      SET scopes = expanded
      WHERE id = key_row.id;
    END IF;
  END LOOP;
END $$;

-- migrate:down
-- Non-reversible: legacy scopes cannot be reconstructed from expanded grants.
