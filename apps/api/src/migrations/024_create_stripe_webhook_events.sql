-- Idempotency ledger for Stripe webhooks.
-- Stripe delivers each event at-least-once and retries on non-2xx, so handlers
-- must dedupe by event id to avoid re-processing (e.g. double-applying credits
-- or subscription state transitions). We INSERT the event id before processing;
-- a primary-key conflict means we've already handled it and can skip.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received
  ON stripe_webhook_events(received_at);
