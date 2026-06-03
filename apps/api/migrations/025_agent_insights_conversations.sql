-- migrate:up
-- =============================================================================
-- 025 — AI agent: insights, recommendation states, conversations
-- =============================================================================
-- Backing tables for the v2 AI Agent surface: stored insights, per-workspace
-- recommendation apply/dismiss state, and lightweight chat conversations.

-- ── AI insights ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT 'medium',
  confidence NUMERIC NOT NULL DEFAULT 0.7,
  related_campaigns JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_insights_workspace ON ai_insights(workspace_id, created_at DESC);

-- ── Recommendation apply/dismiss state ───────────────────────────────────────
-- Recommendations are generated on the fly; we persist only the user's decision
-- against the (workspace, recommendation) pair.
CREATE TABLE IF NOT EXISTS ai_recommendation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  applied_draft_id UUID,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, recommendation_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_rec_states_workspace ON ai_recommendation_states(workspace_id);

-- ── Agent conversations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_conv_workspace ON agent_conversations(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_messages_conv ON agent_messages(conversation_id, created_at ASC);

-- migrate:down
DROP TABLE IF EXISTS agent_messages;
DROP TABLE IF EXISTS agent_conversations;
DROP TABLE IF EXISTS ai_recommendation_states;
DROP TABLE IF EXISTS ai_insights;
