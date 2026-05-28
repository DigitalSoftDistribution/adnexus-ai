CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_type TEXT,
  actor_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  action_category TEXT,
  platform TEXT,
  campaign_id UUID,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  details JSONB,
  source TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_workspace ON audit_log(workspace_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action_category);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_campaign ON audit_log(campaign_id);
