# AdNexus AI — Roadmap

> Last updated: 2026-06-14. Single forward-looking roadmap, consolidated from the
> 360° verification pass. Companions: `POSITIONING_2026.md` (strategy),
> `V1_PUNCH_LIST.md` (detailed status), `KNOWN_LIMITATIONS.md` (honest inventory),
> and `specs/*` (implementation plans).

## Strategic frame

AdNexus AI is **the governed, cross-platform, multilingual ad-ops workspace where
AI drafts every change and a human (or approval chain) signs off before anything
goes live.** In 2026 the platforms shipped free official MCPs, so "MCP-native +
write tools" is now table stakes. The surviving, defensible moats are:

1. **Draft-first governance + audit trail** (EU AI Act tailwind) — already built.
2. **Cross-platform unification** (one ROAS/CPA across channels) — half-built.
3. **Multilingual** (10 locales) — shipped; a wedge US-centric rivals ignore.

Lead with these; demote MCP messaging.

## Now — what's done (verified at code level, 2026-06-14)

- **Real draft execution** (Meta pause/resume) behind a per-workspace flag — a
  hardened `approved → executing → executed │ failed` state machine with atomic
  claim, lease-based crash recovery, and full audit. (`specs/DRAFT_EXECUTION_SPEC.md`)
- **Single response envelope** for v2 list endpoints ↔ frontend (no adapters).
- **Webhook raw-body signature verification** (Meta/TikTok, raw bytes).
- **Accounts/teams**: signup, signin, password reset, invites, 4-role RBAC, API
  keys, audit log, Stripe billing UI.
- **Multi-language**: `next-intl`, 10 locales, parity guarded in CI.
- **AI**: morning brief, creative-fatigue (+ detail view), recommendations,
  budget optimization, A/B analysis — OpenAI primary, Anthropic fallback, plus a
  real statistical engine (regression, z-score anomalies, forecasting).
- **MCP server** (Python/FastMCP, 17 tools).

## v1.0 — close to ship

The last code ship-blocker:

| Item | Status | Owner-area | Notes |
|---|---|---|---|
| **Email verification on signup** (P0-C) | 🟡 implemented | auth | `specs/EMAIL_VERIFICATION_SPEC.md`. API/UI gate landed; verify live Supabase/email delivery on preview. |
| Billing e2e (P0-E) | 🟡 offline harness + v2 gate | billing | Service-boundary Stripe webhook→credits e2e exists; v2 billing actions require verified email; live Stripe webhook confirmation still credential-blocked. |
| v1 launch smoke green | recurring | release | `pnpm smoke:v1` now includes authenticated billing-plan + notification surface probes; run against preview before go/no-go. |
| Morning Brief dashboard surface (T2) | 🟡 implemented | dashboard/worker | Latest in-app morning brief now appears on `/dashboard`; preview verification required. |

**Launch gate:** P0-C shipped + smoke green. Then flip draft execution on for 1–2
design-partner workspaces and watch audit/error rates.

## v1.1 — the moats (P1, ~4–8 weeks)

| # | Item | Why | Effort |
|---|---|---|---|
| T1 | **Cross-platform unified attribution** — one blended ROAS/CPA across Meta+Google with per-channel drill-down | #1 surviving moat; official MCPs are siloed | 2–3 wks |
| T2 | **Surface Morning Brief in-app** — read/persist endpoint + dashboard card | a headline AI feature is currently email-only | 2–3 days |
| T4 | **Governed autonomous mode** — let approved rules apply changes continuously, audit trail as the seatbelt | counter to Ryze/AdScale without losing control | ~1 wk on top of execution |
| — | **Budget-write phase of execution** — Meta daily-budget writes + Google write adapter + rollback (`RevertDraftUseCase`) | extends the now-proven engine | 1–2 wks |
| T5 | **TikTok integration (real)** or honest "coming soon" gating | fastest-growing channel; today it's mock | 2–3 wks |

## v1.2 — account maturity for the agency ICP (P2)

- Account deletion (GDPR) · Multi-workspace / client switching + white-label ·
  SSO/SAML · Approval chains (agency → client approver) · Self-serve AI-credit
  top-ups · i18n backfill (54 keys/locale) + `hreflang` on marketing.

## v2 — platform hardening

- Native Node Streamable-HTTP MCP endpoint (drop the Python sidecar dependency).
- Observability: P50/P95/P99, error-rate alerting, load testing.
- Cursor pagination / field selection / ETag on list endpoints.
- Reconciliation sweep for stuck `executing` drafts (auto, beyond the lease).
- Competitor/creative research surface (a gap every MCP shares — green-field).

## Sequencing

```
Week 1     P0-C email verification + billing e2e → v1.0 ship gate
Week 1–2   Enable execution for design partners; T2 Morning Brief; account deletion
Week 2–4   T1 unified attribution (the moat) ──────────────┐
Week 4–6   Budget-write phase; T4 autonomous mode; T5 TikTok │ overlap as staffing allows
Week 6+    v1.2 account maturity, then v2 hardening ─────────┘
```

## Tracking

Detailed, code-verified status lives in `V1_PUNCH_LIST.md`; this file is the
altitude view. Update both when an item lands.
