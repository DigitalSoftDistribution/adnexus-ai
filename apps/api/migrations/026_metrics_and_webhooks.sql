-- migrate:up
-- =============================================================================
-- 026 — campaign_metrics + webhook_configs + webhook_payloads
-- =============================================================================
-- These tables exist in the per-table migration set (src/migrations 006/019/020)
-- but were never applied to this database. The dashboard/campaign performance
-- charts read campaign_metrics; the Webhooks feature reads webhook_configs +
-- webhook_payloads. Created idempotently so re-running is safe.

-- Ensure the shared updated_at trigger function exists (idempotent).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Per-day campaign performance metrics ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_metrics (
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
  ctr DECIMAL(7,4),
  cpc DECIMAL(10,2),
  cpm DECIMAL(10,2),
  cpa DECIMAL(10,2),
  roas DECIMAL(7,2),
  platform_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_date ON campaign_metrics(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON campaign_metrics(date);

-- ── Webhook configurations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_workspace ON webhook_configs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_status ON webhook_configs(status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_webhook_configs_updated_at') THEN
    CREATE TRIGGER update_webhook_configs_updated_at
      BEFORE UPDATE ON webhook_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── Webhook delivery payloads ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'retrying')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_webhook_payloads_config ON webhook_payloads(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_payloads_workspace ON webhook_payloads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_payloads_status ON webhook_payloads(delivery_status);

-- migrate:down
DROP TABLE IF EXISTS webhook_payloads;
DROP TABLE IF EXISTS webhook_configs;
DROP TABLE IF EXISTS campaign_metrics;
