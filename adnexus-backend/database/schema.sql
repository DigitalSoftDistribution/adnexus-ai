-- AdNexus AI — Full PostgreSQL Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE: Users & Workspaces
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium', 'agency')),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branding JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'analyst' CHECK (role IN ('owner', 'admin', 'analyst', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================
-- AD ACCOUNTS: Platform OAuth connections
-- ============================================

CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'snap')),
  account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error', 'refresh_needed')),
  oauth_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, platform, account_id)
);

-- ============================================
-- CAMPAIGNS, ADSETS, ADS
-- ============================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform_campaign_id VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft', 'error', 'ended')),
  objective VARCHAR(100),
  daily_budget DECIMAL(12,2),
  lifetime_budget DECIMAL(12,2),
  budget_type VARCHAR(20) CHECK (budget_type IN ('daily', 'lifetime')),
  spend DECIMAL(12,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  cpa DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(8,2) DEFAULT 0,
  frequency DECIMAL(6,2) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  cpm DECIMAL(10,2) DEFAULT 0,
  cpc DECIMAL(10,2) DEFAULT 0,
  video_views BIGINT DEFAULT 0,
  video_p25 DECIMAL(5,2) DEFAULT 0,
  video_p50 DECIMAL(5,2) DEFAULT 0,
  video_p75 DECIMAL(5,2) DEFAULT 0,
  video_p100 DECIMAL(5,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  platform_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE adsets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  platform_adset_id VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft', 'error')),
  daily_budget DECIMAL(12,2),
  bid_strategy VARCHAR(50),
  bid_amount DECIMAL(10,2),
  targeting JSONB DEFAULT '{}',
  platform_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adset_id UUID REFERENCES adsets(id) ON DELETE CASCADE,
  platform_ad_id VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft', 'error')),
  creative_type VARCHAR(50),
  creative_url TEXT,
  creative_text TEXT,
  spend DECIMAL(12,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  cpa DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(8,2) DEFAULT 0,
  frequency DECIMAL(6,2) DEFAULT 0,
  fatigue_score DECIMAL(5,2) DEFAULT 0,
  fatigue_status VARCHAR(20) DEFAULT 'healthy' CHECK (fatigue_status IN ('healthy', 'warning', 'critical', 'exhausted')),
  platform_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DRAFTS: THE CORE DIFFERENTIATOR
-- ============================================

CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'snap', 'all')),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  adset_id UUID REFERENCES adsets(id) ON DELETE SET NULL,
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  draft_type VARCHAR(50) NOT NULL CHECK (draft_type IN (
    'budget_change', 'status_change', 'bid_adjustment', 'targeting_edit',
    'creative_upload', 'campaign_create', 'campaign_duplicate', 'campaign_delete',
    'ab_test_create', 'budget_reallocation', 'rule_based', 'audience_edit',
    'schedule_change', 'name_change'
  )),
  change_summary VARCHAR(500) NOT NULL,
  change_detail JSONB NOT NULL,
  ai_reasoning TEXT,
  impact_estimate VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_applied', 'scheduled', 'error')),
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  actor_type VARCHAR(20) DEFAULT 'ai' CHECK (actor_type IN ('ai', 'user', 'system')),
  actor_id UUID,
  actor_name VARCHAR(255),
  rule_id UUID,
  approver_id UUID,
  approval_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================
-- AUTOMATION RULES
-- ============================================

CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  platforms JSONB DEFAULT '["meta","google","tiktok","snap"]',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  applied_count INTEGER DEFAULT 0,
  last_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('ai', 'user', 'system', 'api', 'webhook')),
  actor_id UUID,
  actor_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) CHECK (action_category IN ('campaign_created', 'campaign_updated', 'campaign_deleted', 'budget_changed', 'status_changed', 'creative_uploaded', 'draft_created', 'draft_approved', 'draft_rejected', 'rule_triggered', 'agent_action', 'user_login', 'api_call', 'webhook_event')),
  platform VARCHAR(20),
  campaign_id UUID,
  adset_id UUID,
  ad_id UUID,
  details JSONB NOT NULL DEFAULT '{}',
  source VARCHAR(50) DEFAULT 'dashboard',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- API KEYS
-- ============================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_preview VARCHAR(20),
  permissions JSONB NOT NULL DEFAULT '{"read": true, "write": "draft_first"}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WEBHOOKS
-- ============================================

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_delivered_at TIMESTAMPTZ,
  last_status INTEGER,
  fail_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI CREDITS
-- ============================================

CREATE TABLE ai_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  credits_used INTEGER DEFAULT 0,
  credits_limit INTEGER NOT NULL,
  top_up_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, month)
);

CREATE TABLE credit_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  feature VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  platform VARCHAR(20),
  credits_used INTEGER NOT NULL,
  cost_estimate DECIMAL(10,4) DEFAULT 0,
  month VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GOALS
-- ============================================

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('roas', 'cpa', 'ctr', 'spend', 'conversions', 'custom')),
  platform VARCHAR(20),
  target_value DECIMAL(12,4) NOT NULL,
  current_value DECIMAL(12,4) DEFAULT 0,
  baseline_value DECIMAL(12,4),
  unit VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'at_risk', 'off_track')),
  campaign_ids JSONB DEFAULT '[]',
  alert_when VARCHAR(20) DEFAULT 'at_risk' CHECK (alert_when IN ('at_risk', 'off_track', 'never')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEDULED REPORTS
-- ============================================

CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  schedule_cron VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENTS (for background job processing)
-- ============================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_campaigns_account ON campaigns(ad_account_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_adsets_campaign ON adsets(campaign_id);
CREATE INDEX idx_ads_adset ON ads(adset_id);
CREATE INDEX idx_drafts_workspace_status ON drafts(workspace_id, status);
CREATE INDEX idx_drafts_created ON drafts(created_at DESC);
CREATE INDEX idx_audit_workspace_time ON audit_log(workspace_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action_category);
CREATE INDEX idx_credits_workspace_month ON ai_credits(workspace_id, month);
CREATE INDEX idx_credit_usage_workspace_month ON credit_usage_log(workspace_id, month);
CREATE INDEX idx_events_workspace_processed ON events(workspace_id, processed, created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) for Supabase
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY users_read_own ON users FOR SELECT USING (auth.uid() = id);

-- Workspace members can read their workspaces
CREATE POLICY workspaces_member_read ON workspaces
  FOR SELECT USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid()));

CREATE POLICY workspace_members_read ON workspace_members
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()
  ));

-- All data scoped to workspace
CREATE POLICY ad_accounts_workspace ON ad_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = ad_accounts.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY campaigns_workspace ON campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM ad_accounts aa JOIN workspace_members wm ON aa.workspace_id = wm.workspace_id
    WHERE campaigns.ad_account_id = aa.id AND wm.user_id = auth.uid())
);
CREATE POLICY drafts_workspace ON drafts FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = drafts.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY audit_workspace ON audit_log FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = audit_log.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY goals_workspace ON goals FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = goals.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY api_keys_workspace ON api_keys FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = api_keys.workspace_id AND wm.user_id = auth.uid())
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ad_accounts_updated_at BEFORE UPDATE ON ad_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER adsets_updated_at BEFORE UPDATE ON adsets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ads_updated_at BEFORE UPDATE ON ads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTH HELPERS (managed by API, not Supabase Auth directly)
-- ============================================

CREATE TABLE auth_passwords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_passwords_user ON auth_passwords(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(token_hash);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) for Supabase
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY users_read_own ON users FOR SELECT USING (auth.uid() = id);

-- Workspace members can read their workspaces
CREATE POLICY workspaces_member_read ON workspaces
  FOR SELECT USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid()));

CREATE POLICY workspace_members_read ON workspace_members
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()
  ));

-- All data scoped to workspace
CREATE POLICY ad_accounts_workspace ON ad_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = ad_accounts.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY campaigns_workspace ON campaigns FOR ALL USING (
  EXISTS (SELECT 1 FROM ad_accounts aa JOIN workspace_members wm ON aa.workspace_id = wm.workspace_id
    WHERE campaigns.ad_account_id = aa.id AND wm.user_id = auth.uid())
);
CREATE POLICY drafts_workspace ON drafts FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = drafts.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY audit_workspace ON audit_log FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = audit_log.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY goals_workspace ON goals FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = goals.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY api_keys_workspace ON api_keys FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = api_keys.workspace_id AND wm.user_id = auth.uid())
);

-- Auth helpers RLS
CREATE POLICY auth_passwords_user ON auth_passwords FOR ALL USING (user_id = auth.uid());
CREATE POLICY password_resets_user ON password_resets FOR ALL USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ad_accounts_updated_at BEFORE UPDATE ON ad_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER adsets_updated_at BEFORE UPDATE ON adsets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ads_updated_at BEFORE UPDATE ON ads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER auth_passwords_updated_at BEFORE UPDATE ON auth_passwords FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- MORNING BRIEFS
-- ============================================

CREATE TABLE morning_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  headline VARCHAR(500) NOT NULL,
  summary TEXT NOT NULL,
  highlights JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  alerts JSONB DEFAULT '[]',
  metrics_summary JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_morning_briefs_workspace ON morning_briefs(workspace_id, generated_at DESC);

-- Enable RLS for morning_briefs
ALTER TABLE morning_briefs ENABLE ROW LEVEL SECURITY;

-- Workspace members can read morning briefs for their workspace
CREATE POLICY morning_briefs_workspace ON morning_briefs FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = morning_briefs.workspace_id AND wm.user_id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER morning_briefs_updated_at BEFORE UPDATE ON morning_briefs FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- REPORT RESULTS
-- ============================================

CREATE TABLE report_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}',
  html_content TEXT,
  recipients JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_report_results_scheduled ON report_results(scheduled_report_id, created_at DESC);
