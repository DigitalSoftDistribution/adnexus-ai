CREATE TABLE IF NOT EXISTS adsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_adset_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  daily_budget NUMERIC,
  bid_strategy TEXT,
  bid_amount NUMERIC,
  targeting JSONB DEFAULT '{}',
  platform_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_adsets_campaign ON adsets(campaign_id);
CREATE INDEX idx_adsets_workspace ON adsets(workspace_id);

CREATE TRIGGER update_adsets_updated_at
  BEFORE UPDATE ON adsets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
