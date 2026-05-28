CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{}',
  participants UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_collaboration_sessions_workspace ON collaboration_sessions(workspace_id);
CREATE INDEX idx_collaboration_sessions_entity ON collaboration_sessions(entity_type, entity_id);
CREATE INDEX idx_collaboration_sessions_status ON collaboration_sessions(status);

CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
