# Known Limitations

> Last updated: 2026-06-12. This document is the honest, single-source inventory
> of functionality that is intentionally restricted, mocked, or incomplete in
> the current release. Read it together with `PATH_TO_V1.md` (launch
> status) and `../V2-ROADMAP.md` (planned work).

## Platform execution

- **Draft execution is flag-gated and off by default.** Drafts can be created,
  reviewed, approved, and rejected. Real platform execution now exists for the
  safe, reversible case — **Meta `status_change` (pause/resume)** — but it only
  runs when enabled for a workspace via `ENABLE_PLATFORM_EXECUTION=true` or the
  `PLATFORM_EXECUTION_ENABLED_WORKSPACES` allowlist. With the flag off (default),
  `ExecuteDraftUseCase` returns the same `v1_pilot_platform_execution_disabled`
  error and audits the attempt. When enabled, an approved pause/resume draft is
  applied via `MetaPlatformWriteService`, the draft is marked `executed`/`failed`,
  and before/after is recorded in the audit log
  (`apps/api/src/application/use-cases/draft/ExecuteDraftUseCase.ts`).
  **Still deferred:** budget/creative/structural writes, Google writes (capability
  gated off), automatic rollback, and the live-sandbox e2e. See
  [specs/DRAFT_EXECUTION_SPEC.md](specs/DRAFT_EXECUTION_SPEC.md).
- **TikTok and Snapchat sync is mock-only.** When `ENABLE_MOCK_SOCIAL_SYNC=true`,
  syncs for those platforms return deterministic fixtures from
  `MockSocialPlatformSyncService`; with the flag off (default) they are
  unavailable. Meta and Google integrations are real (OAuth + live APIs).

## AI / MCP

- AI features (morning brief, creative analysis, recommendations, etc.) call
  OpenAI (`gpt-4o`) with an Anthropic fallback and require `OPENAI_API_KEY`
  and/or `ANTHROPIC_API_KEY`. Credits are flat-rate per feature, pre-checked
  and deducted per call (`deductCredits` returns HTTP 402 when exhausted);
  there is no token-level metering.
- Monthly creative quotas are enforced on ad/creative draft creation
  (`assertCreativeQuota` in `apps/api/src/services/plan-limits.ts`), counting
  pending `creative_upload` drafts against `ai_credits.creatives_total`.
- The Python MCP server (`apps/mcp`) is functional over stdio/SSE. The Node
  API does not yet expose a production Streamable HTTP MCP endpoint.

## Webhooks

- Meta/TikTok webhook signature verification re-hashes the parsed JSON body
  rather than the original raw request bytes. Providers sign the raw bytes, so
  verification can fail (or pass incorrectly) when parser reformatting changes
  the byte stream. Fixing this requires capturing the raw body via the JSON
  body-parser's `verify` hook and threading it to the handlers.
- The Google webhook route validates the per-workspace secret; campaign
  resolution inside `webhook-handler.ts` scopes workspace/campaign lookup by
  `ad_accounts.platform` (fixed 2026-06-12, PR #159). **Adset** resolution
  remains unscoped because `adsets.platform` is not populated by metrics-sync;
  cross-platform `platform_adset_id` collisions are rare but documented here.

## Billing

- Stripe checkout, webhooks (signature-verified), and plan management work
  when `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_*` are
  configured. Without them billing endpoints respond with a clear
  "billing not configured" state.
- Plan quotas are enforced for campaigns (v1 route and v2 use case), creatives
  (monthly `ai_credits` + pending uploads), team size, and API keys.
  Impression-volume limits are not metered.

## Email

- Email delivery requires `SENDGRID_API_KEY` or `SMTP_*` configuration;
  otherwise a JSON dev transport is used (messages are logged, not sent).
- Signup does not require email verification; password reset is supported.

## Scheduled reports

- On-demand report generation, export (PDF/CSV/XLSX), and persistence to
  `report_results` work. Performance summaries include period-over-period KPI
  trends when prior-period campaign data is available. Recurring schedule
  payloads executed by the worker are stored in Redis (credentials are
  intentionally not persisted to the `scheduled_reports` table); a Redis flush
  drops pending worker schedules.
