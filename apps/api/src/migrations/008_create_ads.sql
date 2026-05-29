CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  adset_id UUID NOT NULL REFERENCES adsets(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_ad_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  creative_type TEXT,
  creative_url TEXT,
  creative_text TEXT,
  spend NUMERIC DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cpa NUMERIC,
  roas NUMERIC,
  frequency NUMERIC,
  fatigue_score NUMERIC,
  fatigue_status TEXT,
  review_status TEXT,
  policy_violations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ads_adset ON ads(adset_id);
CREATE INDEX idx_ads_campaign ON ads(campaign_id);
CREATE INDEX idx_ads_workspace ON ads(workspace_id);
CREATE INDEX idx_ads_fatigue ON ads(fatigue_score) WHERE fatigue_score IS NOT NULL;

CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
