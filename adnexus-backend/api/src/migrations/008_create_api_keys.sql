-- @ts-nocheck
-- Migration: Create api_keys table for API key management
-- Created: 2025-01-20

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- We store a SHA-256 hash of the key, never the full key itself
  key_hash TEXT NOT NULL,
  -- Human-readable prefix for display (e.g., "ak_live_...X8f2")
  key_prefix TEXT NOT NULL,
  -- Scopes as a JSON array: ["read"], ["read", "write"], etc.
  scopes JSONB NOT NULL DEFAULT '["read"]',
  -- Key status: active or revoked
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  -- Optional expiration date
  expires_at TIMESTAMPTZ,
  -- Tracking
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  -- Usage counters
  calls_today INTEGER NOT NULL DEFAULT 0,
  calls_this_month INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_status ON api_keys(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Partial index for active keys (faster auth lookups)
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(key_hash) WHERE status = 'active';

-- Comment on table
cOMMENT ON TABLE api_keys IS 'Stores API keys for programmatic workspace access. Full keys are never stored; only SHA-256 hashes and display prefixes are kept.';
