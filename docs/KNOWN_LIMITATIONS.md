# Known Limitations

> Last updated: 2026-06-11. This document is the honest, single-source inventory
> of functionality that is intentionally restricted, mocked, or incomplete in
> the current release. Read it together with `PATH_TO_V1.md` (launch
> status) and `../V2-ROADMAP.md` (planned work).

## Platform execution

- **Draft execution is disabled (v1 pilot policy).** Drafts can be created,
  reviewed, approved, and rejected, but executing a draft never writes to an
  ad platform. `ExecuteDraftUseCase` returns a structured
  `v1_pilot_platform_execution_disabled` error and records the attempt in the
  audit log (`apps/api/src/application/use-cases/draft/ExecuteDraftUseCase.ts`).
  Enabling real execution requires platform write-scope credentials, rollback
  handling, and an estimated 2–3 weeks of engineering.
- **TikTok and Snapchat sync is mock-only.** When `ENABLE_MOCK_SOCIAL_SYNC=true`,
  syncs for those platforms return deterministic fixtures from
  `MockSocialPlatformSyncService`; with the flag off (default) they are
  unavailable. Meta and Google integrations are real (OAuth + live APIs).

## AI / MCP

- AI features (morning brief, creative analysis, recommendations, etc.) call
  OpenAI (`gpt-4o`) with an Anthropic fallback and require `OPENAI_API_KEY`
  and/or `ANTHROPIC_API_KEY`. Credits are flat-rate per feature, pre-checked
  and deducted per call; there is no token-level metering.
- The Python MCP server (`apps/mcp`) is functional over stdio/SSE. The Node
  API does not yet expose a production Streamable HTTP MCP endpoint.

## Webhooks

- Meta/TikTok webhook signature verification re-hashes the parsed JSON body
  rather than the original raw request bytes. Providers sign the raw bytes, so
  verification can fail (or pass incorrectly) when parser reformatting changes
  the byte stream. Fixing this requires capturing the raw body via the JSON
  body-parser's `verify` hook and threading it to the handlers.
- The Google webhook route validates the per-workspace secret but the handler
  re-resolves the tenant from payload IDs; campaign/adset resolution inside
  `webhook-handler.ts` matches on platform-native IDs without a platform
  predicate. Workspaces that link the same ad account in multiple workspaces
  could route an event to the wrong tenant. TikTok/Snap webhooks are mock-only
  (see Platform execution above), which bounds the practical impact today.

## Billing

- Stripe checkout, webhooks (signature-verified), and plan management work
  when `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_*` are
  configured. Without them billing endpoints respond with a clear
  "billing not configured" state.
- Plan quotas are enforced for campaigns (v1 route and v2 use case), team
  size, and API keys. Impression-volume limits are not metered.

## Email

- Email delivery requires `SENDGRID_API_KEY` or `SMTP_*` configuration;
  otherwise a JSON dev transport is used (messages are logged, not sent).
- Signup does not require email verification; password reset is supported.

## Scheduled reports

- On-demand report generation, export (PDF/CSV/XLSX), and persistence to
  `report_results` work. Recurring schedule payloads executed by the worker
  are stored in Redis (credentials are intentionally not persisted to the
  `scheduled_reports` table); a Redis flush drops pending worker schedules.
