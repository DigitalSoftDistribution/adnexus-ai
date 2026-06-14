# AdNexus AI — v1 Punch List (360° verification, 2026-06-13)

> Consolidated, honest, prioritized list produced from a full-codebase + market
> verification pass. Every item is tagged with verified reality (not the
> aspirational docs), effort, and acceptance criteria. Pairs with
> `PATH_TO_V1.md` (status), `KNOWN_LIMITATIONS.md` (honest inventory), and
> `POSITIONING_2026.md` (strategy).

## How verified

- **Code-level inventory** of `apps/api` (148 use-cases / 23 domains), `apps/web`
  (71 routes), `apps/mcp` (17 tools), and `packages/*`.
- **Capability ports** read directly: `apps/api/src/application/ports/AdPlatformCapabilities.ts`.
- **Fresh market research** (June 2026) — see § References.

## Reality check: what's already TRUE (don't "fix" these)

These were suspected gaps that turned out to be **already handled** — flagged so
nobody burns time on them:

- ✅ **Platform gating is honest.** The integrations dashboard is capability-aware
  (`AdPlatformCapabilities.ts` + `IntegrationsContent.tsx`): TikTok/Snap are
  `mock_ready` with `canConnectOAuth:false` (connect button disabled), Google is
  `read_only`, only Meta is fully `live`. LinkedIn is **not** offered in the
  dashboard integrations list. No false promises in that UI.
- ✅ **Multi-language is real and shipped.** `next-intl`, 10 locales
  (en, de, pl, es, fr, it, pt, nl, ru, ja), ~800 keys each, locale routing +
  middleware + `LanguageSwitcher`. ~94% parity with English (54-key lag, now
  guarded — see I-1 below).
- ✅ **Account/team features are real.** Signup, signin, password reset, team
  invites + accept, 4-role RBAC, API-key create/list/revoke, audit log, Stripe
  billing UI (plans/usage/invoices/portal) — all wired to live endpoints.

## P0 — true v1 ship blockers

### P0-A — Enable real draft execution (Meta + Google write path) 🟡 core wiring landed
- **Was:** `ExecuteDraftUseCase` always returned
  `v1_pilot_platform_execution_disabled` — the product could draft/review/approve
  but not push a change to a live ad account.
- **Done (this pass):** the execution path is wired behind a per-workspace flag
  (`ENABLE_PLATFORM_EXECUTION` / `PLATFORM_EXECUTION_ENABLED_WORKSPACES`, default
  OFF). When enabled, an approved **Meta `status_change` (pause/resume)** draft
  resolves the campaign's platform ids, calls `MetaPlatformWriteService`, marks
  the draft `executed`/`failed`, and records before/after in the audit log.
  Flag-off behavior is byte-for-byte unchanged. Covered by 10 vitest cases
  (`ExecuteDraftUseCase.test.ts`); API typecheck + draft suites green.
- **Remaining:** budget-change writes (new adapter method), Google write service
  (`canWriteCampaigns` still gated off), automatic rollback (`RevertDraftUseCase`;
  the `before` snapshot already persists), and the live-sandbox e2e.
- **Plan:** see `specs/DRAFT_EXECUTION_SPEC.md` (updated with status).

### P0-B — Single success envelope for list endpoints ✅ done (verified 2026-06-14)
- **Reality (re-audited):** the *served v2* path and the live frontend already
  agree on one shape. `ListCampaignsUseCase` returns `{ campaigns, total, … }`,
  `CampaignController` wraps it as `{ success, data }`, and `CampaignsContent.tsx`
  reads `data.data.campaigns` / `data.data.total` with **no shape adapters**. The
  three contradictory shapes in the historical `PATH_TO_V1.md` P0-3 referred to
  the old v1/e2e contracts; the v2 surface converged. Drafts/audiences follow the
  same `{ success, data:{ items, total } }` convention.
- **Remaining:** none for v1. (If a future endpoint needs cursor pagination, add a
  shared list envelope helper — tracked under P2.)

### P0-C — Email verification on signup ❌ the real remaining P0
- **Reality (re-audited):** genuinely missing. Signup (`apps/api/src/routes/auth.ts`)
  creates the Supabase user with `email_confirm: true` (auto-confirmed) and never
  sets/checks `users.email_verified` (column exists, defaults false). Nothing
  gates on it. Table-stakes + abuse vector for a paid SaaS / EU target.
- **Plan:** see `specs/EMAIL_VERIFICATION_SPEC.md`. Mirrors the existing
  Supabase-OTP password-reset flow (no new token table needed). Email transport
  already exists (SendGrid/SMTP/JSON-dev).
- **Not deploy-verifiable in CI sandbox** (needs live Supabase + email); build +
  unit-test the gate logic, verify the email/Supabase wiring on a preview.
- **Acceptance:** new accounts get a verification email; `email_verified` flips on
  verify; unverified accounts are gated from billing/connect actions.

### P0-D — Webhook raw-body signature verification ✅ done (verified 2026-06-14)
- **Reality (re-audited):** already correct. `express.json`'s `verify` hook
  captures `req.rawBody` (`apps/api/src/index.ts`), and the inbound webhook routes
  (`apps/api/src/routes/webhooks.ts`) thread it into `verifyMetaSignature` /
  `verifyTikTokSignature`, which hash the **original raw bytes** (re-serialized
  body is only a fallback when raw bytes are absent). The v2 `webhooks` routes are
  config CRUD only — no inbound receiver is missing this. `KNOWN_LIMITATIONS.md`
  was stale and is now corrected.
- **Remaining:** none for v1. (Optional: a fixture test asserting a known-good
  provider signature verifies — nice-to-have, not blocking.)

### P0-E — Billing e2e (plan-upgrade → webhook → credits)
- **Reality:** code path works; only integration coverage today. This is a
  **test-coverage** gap, not a code gap.
- **Effort:** ~2 days with Stripe signature fixtures. **Acceptance:** e2e proves
  upgrade → webhook → credit grant on the served surface.

## P1 — needed right after v1 (the moats)

### T1 — Cross-platform unified attribution 🟡 top strategic gap
- **Reality:** per-platform metrics sync exists; a single unified ROAS/CPA across
  Meta+Google **does not**. This is the #1 surviving moat (`POSITIONING_2026.md`).
- **Effort:** ~2–3 weeks. **Acceptance:** one dashboard number for blended
  ROAS/CPA/spend across connected platforms, with per-channel drill-down.

### T2 — Surface Morning Brief in the product UI
- **Reality:** backend worker generates it (`workers/morning-brief.ts`, 5 credits,
  z-score anomalies) and **emails** it, but there is **no dashboard surface** —
  one of three marketing-headline AI features is invisible in-app.
- **Effort:** ~2–3 days (add a read/persist endpoint for the latest brief + a
  dashboard card/page). **Acceptance:** `/dashboard` shows today's brief.

### T3 — Creative-fatigue detail view ✅ DONE in this pass
- **Reality (was):** `/dashboard/creatives` showed fatigue scores but the richer
  `GET /api/v2/ads/:id/creative-performance` endpoint was unwired.
- **Done:** Creative Explorer rows now expand to load CTR/conversion trends, the
  recommended refresh window, and a health score from that endpoint
  (`apps/web/components/creatives/CreativeExplorerSkeleton.tsx`). Typecheck green.
- **Remaining:** add a `/dashboard/creatives` route into the sidebar nav if not
  already linked; add an RTL test.

### T4 — Autonomous mode (opt-in), governed
- **Reality:** automation rules exist (`use-cases/agent/*`) but execution is
  gated by P0-A. Once execution lands, allow approved rules to apply changes
  continuously — with the audit trail as the seatbelt. This is the counter to
  Ryze/AdScale. **Effort:** ~1 week on top of P0-A.

### T5 — Decide TikTok/Snap story
- **Reality:** mock-only. Either ship a real integration (TikTok first — fastest
  growing) or keep the honest "coming soon" gating and market "Meta + Google
  today." **Don't** let mock data look real in demos. **Effort:** real TikTok ≈
  2–3 weeks; gating is already done.

## P2 — account maturity for the agency ICP

- **A1 — Account deletion (GDPR).** No UI today; EU target market expects it.
  ~3 days (soft-delete + data-export + confirm flow).
- **A2 — Multi-workspace / client switching + white-label.** Strategy promises
  white-label at the $499 Agency tier; verify/implement theming. ~1–2 weeks.
- **A3 — SSO/SAML** for Enterprise. ~1–2 weeks.
- **A4 — Approval chains** (agency → client approver). Directly extends the
  governance moat. ~1 week.
- **A5 — Self-serve AI-credit top-ups.** No purchase flow today. ~3 days.

## I — infrastructure / hygiene

### I-1 — i18n parity guard ✅ DONE in this pass
- **Done:** `apps/web/scripts/check-i18n-parity.cjs` + `i18n:check` script + CI
  job (`.github/workflows/ci.yml`). Baseline snapshot locks the current 54-key
  lag; CI fails if any locale regresses (a new English key shipped untranslated).
- **Remaining:** backfill the 54 missing keys per locale (needs real translation,
  not machine fallback) and ratchet the baseline down. `pnpm --filter @adnexus/web
  i18n:report` lists exactly which keys.

### I-2 — Native Node Streamable-HTTP MCP endpoint
- **Reality:** only the Python sidecar exposes HTTP MCP; the Node API does not.
  ~1 week. Removes the cross-language dependency.

### I-3 — Observability + load testing
- P50/P95/P99 request metrics, error-rate alerting, load test (roadmap §4/§9).

## Suggested sequencing

1. **Week 1–3:** P0-A (draft execution) — unblocks the core promise and T4.
   In parallel (cheap, independent): P0-B, P0-C, P0-D, T2, A1.
2. **Week 3–4:** P0-E, finish T3 nav/test, I-1 backfill, positioning rollout.
3. **Week 4–7:** T1 (unified attribution) — the strategic moat. Then T4, T5, A4.

## References (market, June 2026)

- AdKit — Pipeboard vs Meta Ads MCP: https://adkit.so/comparisons/pipeboard-vs-meta-ads-mcp
- Synter — Ad Platform MCP Servers 2026: https://syntermedia.ai/blog/best-ad-platform-mcp-servers
- PaidSync — Best MCP for Ads 2026: https://paidsync.ai/blog/best-mcp-for-ads-management
- Adspirer — 10 Best Ad MCP Servers 2026: https://www.adspirer.com/docs/guides/best-ad-mcp-servers-2026
- SegmentStream — Best MCP Servers for Marketers 2026: https://segmentstream.com/blog/articles/best-mcp-servers-for-marketers
- Ryze — Best MCP for Meta Ads 2026: https://www.get-ryze.ai/blog/best-mcp-for-meta-ads
- Cometly — AI-Powered Ad Optimization Platforms 2026: https://www.cometly.com/post/ai-powered-ad-optimization-platform
