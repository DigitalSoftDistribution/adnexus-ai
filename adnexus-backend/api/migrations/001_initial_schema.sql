-- migrate:up
-- =============================================================================
-- AdNexus AI — Production Database Schema
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Users & Authentication
-- =============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user', -- admin, editor, viewer
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, deleted
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Workspaces (multi-tenant)
-- =============================================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id),
  plan VARCHAR(50) DEFAULT 'growth', -- growth, scale, accelerate
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Workspace Members
-- =============================================================================
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'editor', -- admin, editor, viewer
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- =============================================================================
-- Connected Ad Accounts
-- =============================================================================
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- meta, google, tiktok, snap
  platform_account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'active', -- active, expired, disconnected
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, platform, platform_account_id)
);

-- =============================================================================
-- Campaigns
-- =============================================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  ad_account_id UUID REFERENCES ad_accounts(id),
  platform VARCHAR(50) NOT NULL,
  platform_campaign_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, ended
  objective VARCHAR(100),
  budget_type VARCHAR(50), -- daily, lifetime
  budget DECIMAL(12,2),
  bid_strategy VARCHAR(100),
  target_cpa DECIMAL(10,2),
  target_roas DECIMAL(5,2),
  targeting JSONB DEFAULT '{}', -- audiences, demographics, interests
  schedule JSONB DEFAULT '{}', -- start/end dates
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Ad Sets / Ad Groups
-- =============================================================================
CREATE TABLE ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  platform_ad_set_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  budget DECIMAL(12,2),
  targeting JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Ads / Creatives
-- =============================================================================
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id UUID REFERENCES ad_sets(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  platform_ad_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  creative_type VARCHAR(50), -- image, video, carousel, collection
  creative_url TEXT,
  headline TEXT,
  body TEXT,
  call_to_action VARCHAR(100),
  landing_page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Drafts (the core differentiator — AI-generated change proposals)
-- =============================================================================
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  ad_id UUID REFERENCES ads(id),
  draft_type VARCHAR(100) NOT NULL, -- budget_change, status_change, bid_change, targeting_change, new_campaign, new_ad
  title VARCHAR(255) NOT NULL,
  description TEXT,
  proposed_changes JSONB NOT NULL, -- the actual changes
  current_state JSONB, -- snapshot of current state
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, applied, failed, expired
  confidence_score DECIMAL(5,2), -- AI confidence 0-100
  created_by UUID REFERENCES users(id), -- NULL = AI created
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  fail_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Performance Metrics
-- =============================================================================
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value DECIMAL(12,2) DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency DECIMAL(5,2),
  ctr DECIMAL(5,4),
  cpc DECIMAL(10,2),
  cpm DECIMAL(10,2),
  cpa DECIMAL(10,2),
  roas DECIMAL(5,2),
  platform_data JSONB DEFAULT '{}',
  UNIQUE(campaign_id, date)
);

-- =============================================================================
-- AI Rules / Automation
-- =============================================================================
CREATE TABLE ai_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  platform VARCHAR(50), -- all, meta, google, tiktok, snap
  rule_type VARCHAR(100) NOT NULL, -- pause, scale, alert, budget_adjust
  conditions JSONB NOT NULL, -- [{metric, operator, value}]
  actions JSONB NOT NULL, -- [{action, params}]
  status VARCHAR(50) DEFAULT 'active', -- active, paused, archived
  confidence_threshold DECIMAL(5,2) DEFAULT 75.0,
  auto_execute BOOLEAN DEFAULT false,
  notification_channels JSONB DEFAULT '["in_app"]',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AI Action Logs
-- =============================================================================
CREATE TABLE ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES ai_rules(id),
  draft_id UUID REFERENCES drafts(id),
  campaign_id UUID REFERENCES campaigns(id),
  action_type VARCHAR(100) NOT NULL,
  description TEXT,
  confidence_score DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'success', -- success, failed, reverted
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Notifications
-- =============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL, -- draft, alert, report, system, ai_action
  title VARCHAR(255) NOT NULL,
  message TEXT,
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Audit Log
-- =============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL, -- campaign, draft, rule, setting
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Creative Performance (for fatigue detection)
-- =============================================================================
CREATE TABLE creative_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4),
  cpc DECIMAL(10,2),
  fatigue_score DECIMAL(5,2), -- 0-100, higher = more fatigued
  performance_trend VARCHAR(20), -- improving, stable, declining, fatigued
  UNIQUE(ad_id, date)
);

-- =============================================================================
-- API Keys (for developer access)
-- =============================================================================
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  scopes JSONB DEFAULT '["read"]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================
CREATE INDEX idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_drafts_workspace_status ON drafts(workspace_id, status);
CREATE INDEX idx_drafts_expires ON drafts(expires_at);
CREATE INDEX idx_metrics_campaign_date ON campaign_metrics(campaign_id, date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_audit_workspace_created ON audit_log(workspace_id, created_at);
CREATE INDEX idx_creative_perf_ad_date ON creative_performance(ad_id, date);
CREATE INDEX idx_ad_accounts_workspace ON ad_accounts(workspace_id);
CREATE INDEX idx_campaigns_ad_account ON campaigns(ad_account_id);
CREATE INDEX idx_ad_sets_campaign ON ad_sets(campaign_id);
CREATE INDEX idx_ads_campaign ON ads(campaign_id);
CREATE INDEX idx_ads_ad_set ON ads(ad_set_id);
CREATE INDEX idx_drafts_campaign ON drafts(campaign_id);
CREATE INDEX idx_drafts_ad ON drafts(ad_id);
CREATE INDEX idx_ai_rules_workspace ON ai_rules(workspace_id);
CREATE INDEX idx_ai_rules_status ON ai_rules(status);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX idx_creative_performance_date ON creative_performance(date);

-- Partial index for unread notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- GIN indexes for JSONB queries
CREATE INDEX idx_campaigns_targeting_gin ON campaigns USING GIN(targeting);
CREATE INDEX idx_ai_rules_conditions_gin ON ai_rules USING GIN(conditions);
CREATE INDEX idx_ai_rules_actions_gin ON ai_rules USING GIN(actions);
CREATE INDEX idx_drafts_proposed_gin ON drafts USING GIN(proposed_changes);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON ad_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ad_sets_updated_at BEFORE UPDATE ON ad_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON ads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_rules_updated_at BEFORE UPDATE ON ai_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policy helper: check workspace membership
CREATE OR REPLACE FUNCTION user_is_workspace_member(ws_id UUID, usr_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = usr_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- migrate:down
-- =============================================================================
-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
DROP TRIGGER IF EXISTS update_ad_accounts_updated_at ON ad_accounts;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
DROP TRIGGER IF EXISTS update_ad_sets_updated_at ON ad_sets;
DROP TRIGGER IF EXISTS update_ads_updated_at ON ads;
DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;
DROP TRIGGER IF EXISTS update_ai_rules_updated_at ON ai_rules;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS user_is_workspace_member(UUID, UUID);

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS creative_performance CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ai_action_logs CASCADE;
DROP TABLE IF EXISTS ai_rules CASCADE;
DROP TABLE IF EXISTS campaign_metrics CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS ads CASCADE;
DROP TABLE IF EXISTS ad_sets CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS ad_accounts CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS migrations CASCADE;
