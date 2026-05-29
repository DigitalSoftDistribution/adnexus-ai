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

CREATE INDEX idx_webhook_payloads_config ON webhook_payloads(webhook_config_id);
CREATE INDEX idx_webhook_payloads_workspace ON webhook_payloads(workspace_id);
CREATE INDEX idx_webhook_payloads_status ON webhook_payloads(delivery_status);
CREATE INDEX idx_webhook_payloads_created_at ON webhook_payloads(created_at DESC);
