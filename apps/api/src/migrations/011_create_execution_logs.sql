CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed', 'rolled_back')),
  details JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_execution_logs_draft ON execution_logs(draft_id);
CREATE INDEX idx_execution_logs_workspace ON execution_logs(workspace_id);
CREATE INDEX idx_execution_logs_created_at ON execution_logs(created_at DESC);
