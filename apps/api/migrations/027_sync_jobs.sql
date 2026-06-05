-- migrate:up
-- =============================================================================
-- 027 — sync_jobs + sync_errors
-- =============================================================================
-- Tracks ad-platform account sync runs (campaign/adset/ad/insight import) so the
-- account-level sync endpoint can report status, counts, duration, and partial
-- failures instead of being a fire-and-forget no-op. `ad_accounts.last_synced_at`
-- already exists (migration 024) and is stamped on successful runs.

CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  campaigns_synced INTEGER NOT NULL DEFAULT 0,
  metrics_synced INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  triggered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_workspace ON sync_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_account ON sync_jobs(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_started_at ON sync_jobs(started_at DESC);

CREATE TABLE IF NOT EXISTS sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  scope_id TEXT,
  code TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_errors_job ON sync_errors(sync_job_id);

-- migrate:down
DROP TABLE IF EXISTS sync_errors;
DROP TABLE IF EXISTS sync_jobs;
