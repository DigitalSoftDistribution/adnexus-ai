CREATE TABLE IF NOT EXISTS draft_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('pre_execution', 'post_execution', 'rollback')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_draft_snapshots_draft ON draft_snapshots(draft_id);
CREATE INDEX idx_draft_snapshots_workspace ON draft_snapshots(workspace_id);
