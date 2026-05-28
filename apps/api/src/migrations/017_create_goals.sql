CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('spend', 'roas', 'ctr', 'conversions', 'cpa', 'impressions', 'clicks')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  campaign_ids UUID[] DEFAULT '{}',
  platform TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'missed', 'paused')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_workspace ON goals(workspace_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_metric ON goals(metric_type);

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
