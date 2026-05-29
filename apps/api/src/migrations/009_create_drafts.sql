CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  campaign_name TEXT,
  adset_id UUID REFERENCES adsets(id) ON DELETE SET NULL,
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  draft_type TEXT NOT NULL CHECK (draft_type IN (
    'budget_change', 'status_change', 'bid_adjustment', 'targeting_edit',
    'creative_upload', 'campaign_create', 'campaign_update', 'campaign_delete',
    'campaign_duplicate', 'ab_test_create', 'budget_reallocate', 'rule_based',
    'audience_edit', 'schedule_change', 'name_change'
  )),
  change_summary TEXT NOT NULL,
  change_detail JSONB DEFAULT '{}',
  ai_reasoning TEXT,
  impact_estimate JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_applied', 'scheduled', 'executed', 'error', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  actor_type TEXT,
  actor_id UUID,
  actor_name TEXT,
  rule_id UUID,
  approver_id UUID REFERENCES users(id),
  approval_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_drafts_workspace ON drafts(workspace_id);
CREATE INDEX idx_drafts_campaign ON drafts(campaign_id);
CREATE INDEX idx_drafts_status ON drafts(status);
CREATE INDEX idx_drafts_type ON drafts(draft_type);
CREATE INDEX idx_drafts_created_at ON drafts(created_at DESC);
CREATE INDEX idx_drafts_actor ON drafts(actor_id);
