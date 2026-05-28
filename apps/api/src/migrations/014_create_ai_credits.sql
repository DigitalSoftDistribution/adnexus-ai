CREATE TABLE IF NOT EXISTS ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  creatives_used INTEGER DEFAULT 0,
  creatives_total INTEGER DEFAULT 0,
  impressions_used BIGINT DEFAULT 0,
  impressions_total BIGINT DEFAULT 0,
  ai_credits_used INTEGER DEFAULT 0,
  ai_credits_total INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  credits_limit INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, month)
);

CREATE INDEX idx_ai_credits_workspace ON ai_credits(workspace_id);
CREATE INDEX idx_ai_credits_month ON ai_credits(month);

CREATE TRIGGER update_ai_credits_updated_at
  BEFORE UPDATE ON ai_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
