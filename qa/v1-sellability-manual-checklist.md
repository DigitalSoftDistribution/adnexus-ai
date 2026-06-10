# V1 Sellability Manual QA Checklist (SB-3099)

## Last audit (2026-06-10, SB-3098)

| Item | Value |
|---|---|
| **Web preview** | `https://adnexus-ai.apps.softblaze.net` (Coolify app `adnexus-ai`) |
| **API preview** | `https://adnexus-api.apps.softblaze.net` (Coolify app `adnexus-api`) |
| **PR preview pattern** | `https://pr-<N>-adnexus-ai.previews.softblaze.net` (stable per open PR) |
| **Automated API smoke** | `pnpm --filter @adnexus/api exec jest tests/e2e/v1-sellability-qa.test.ts --runInBand --ci --forceExit` |
| **Launch smoke CLI** | `pnpm smoke:v1 -- --base-url https://adnexus-api.apps.softblaze.net --web-url https://adnexus-ai.apps.softblaze.net` |
| **Playwright (main)** | `pnpm test:smoke` — root `playwright.config.ts`; marketing/auth/dashboard paths |
| **v2 integration** | `apps/api/tests/integration/v2-*.test.ts` — campaigns, settings/API keys, reports |
| **Use-case unit tests** | ~30 vitest files under `apps/api/src/application/use-cases/` (77 test files repo-wide) |
| **Manual gaps** | Real Meta OAuth consent, Stripe Checkout/portal, mobile visual QA, axe/Lighthouse (see below) |

Wait for `coolify/adnexus-ai` GitHub commit status success before treating preview URLs as current.

---

Use this checklist for launch go/no-go gaps that cannot be fully automated without browser access, real OAuth consent, Stripe credentials, or production-like seeded data. Pair it with the executable smoke suite:

```bash
pnpm smoke:v1 -- --base-url https://adnexus-api.apps.softblaze.net --web-url https://adnexus-ai.apps.softblaze.net
```

**Last preview QA run:** 2026-06-10 — Web `https://adnexus-ai.apps.softblaze.net`, API `https://adnexus-api.apps.softblaze.net`

## Go/no-go rules

- Any failed **P0/P1** item blocks V1 launch and must map to a Linear blocker issue.
- Any failed **P2** item needs owner sign-off and a mitigation note before launch.
- Record environment, browser/device, user, workspace, and evidence links for each run.

## Manual matrix

| Area | Priority | Verification | Expected result | Status / evidence |
| --- | --- | --- | --- | --- |
| Marketing route/link smoke | P0 | Open `/en`, `/en/pricing`, `/en/features`, `/en/integrations`, `/en/security`, `/en/auth/signup`, `/en/auth/signin`; click primary CTA, pricing CTA, footer legal links. | Pages render with no 404/500, CTAs route to signup/signin or intended page, no console errors. | **PASS** (route HTTP) — 2026-06-10: `curl` + `scripts/v1-smoke.mjs` — `/en`, `/en/pricing`, `/en/features`, `/en/integrations`, `/en/security`, `/en/auth/signup`, `/en/auth/signin` all **HTTP 200** (no 5xx). CTA clickthrough + console sweep remain **MANUAL** (browser). |
| Protected dashboard route smoke | P0 | While signed out, open `/en/dashboard`, `/en/dashboard/campaigns`, `/en/dashboard/drafts`, `/en/dashboard/integrations`, `/en/dashboard/billing`, `/en/dashboard/settings`. | User is redirected to sign-in or shown a clear auth gate; no protected data leaks. | **PASS** (auth boundary) — 2026-06-10: `scripts/v1-smoke.mjs` — dashboard routes return **HTTP 200** (Next.js shell); unauthenticated API probes `/api/v2/campaigns/summary`, `/integrations`, `/drafts`, `/billing`, `/settings`, `/reports` all **HTTP 401** via web rewrite + direct API. No protected JSON leaked without session. Server-side redirect not observed; client auth gate assumed — verify in browser. |
| Signup/auth smoke | P0 | Create a new user with a fresh email, sign out, sign back in, refresh dashboard. | Session persists, dashboard loads, localized route remains correct. | **MANUAL** — requires live Supabase signup + email confirmation; not run on preview 2026-06-10. |
| Meta connect OAuth | P0 | From integrations/settings, start Meta connect using a test Meta business if available. | Consent URL opens, required scopes are requested, callback returns to app, connected account appears with account name/status. | **BLOCKED** — live Meta OAuth consent + test business credentials required; not run 2026-06-10. |
| Meta sync path | P0 | Trigger sync for connected Meta account/campaigns. | Sync job starts, progress/error state is visible, campaign list refreshes or shows actionable empty/error state. | **BLOCKED** — depends on connected Meta account; not run 2026-06-10. |
| Draft approval truth | P0 | Create or seed an AI draft, click review/approve action, then execute if separately available. | Review approval does not imply live campaign mutation unless explicit execute action succeeds. Audit/status copy is truthful. | **MANUAL** — requires authenticated workspace + draft seed data; contract covered in Jest e2e mocks only. |
| Billing checkout | P0 | Start upgrade from billing/pricing with Stripe test price. | Stripe Checkout opens with correct plan, success/cancel redirects return to billing page. | **BLOCKED** — live Stripe Checkout + test price required; not run 2026-06-10. |
| Billing webhook | P0 | Complete Stripe test checkout or replay Stripe CLI webhook. | Workspace plan/subscription updates, audit log records event, duplicate webhook is idempotent. | **BLOCKED** — Stripe webhook replay / test checkout required; not run 2026-06-10. |
| Billing portal | P1 | Open customer portal for subscribed workspace. | Portal opens; return URL lands back on billing page. | **BLOCKED** — active Stripe subscription + portal session required; not run 2026-06-10. |
| Settings/API keys | P1 | Create, copy once, list, revoke API key. | Secret is only shown once, list masks key, revoke prevents further use. | **MANUAL** — requires authenticated owner session; route wiring verified in Jest integration tests only. |
| Team RBAC | P0 | Invite/add owner/admin/member/viewer; attempt billing/settings/API key/OAuth actions per role. | Only authorized roles can mutate billing, OAuth, API keys, and team roles. Unauthorized users get 403 + clear UI copy. | **BLOCKED** — multi-user workspace + role matrix required; not run 2026-06-10. |
| Mobile smoke | P1 | Test core marketing, signup, dashboard nav, billing, integrations, drafts on 390×844 viewport. | No clipped CTAs, horizontal overflow, inaccessible menus, or unusable forms. | **MANUAL** — viewport/layout QA needs browser (Playwright `tests/smoke/` not present on `main` 2026-06-10). |
| Accessibility smoke | P1 | Keyboard-only navigate signup, dashboard nav, integrations, drafts, billing; run axe/Lighthouse if available. | Focus is visible, dialogs trap/release focus, buttons have names, contrast passes obvious checks. | **MANUAL** — keyboard/axe/Lighthouse pass not run 2026-06-10. |
| Observability | P1 | Verify `/health`, `/ready`, `/metrics`, Sentry/logging for failed OAuth/Stripe/sync paths. | Health endpoints respond appropriately and critical failures emit searchable logs/errors without secrets. | **PASS** — 2026-06-10: `curl` + `scripts/v1-smoke.mjs` — `/health` **200**, `/ready` **200**, `/metrics` **200**, `/api/v2/openapi.json` **200**; CORS preflight **204**. Sentry/OAuth/Stripe failure log sweep **MANUAL**. |

## Automated coverage currently added

- API route/link smoke for public, protected, and V2 dashboard-backed endpoints.
- Signup/auth smoke using mocked Supabase store.
- Meta connect redirect and integrations surface smoke with mocked OAuth configuration.
- Draft approval vs execution contract guard.
- Billing plans/checkout/portal/webhook contract smoke without real Stripe credentials.
- Settings/API keys route wiring plus Meta OAuth RBAC guard for viewer role.

## Preview smoke summary (2026-06-10)

```
node scripts/v1-smoke.mjs \
  --base-url https://adnexus-api.apps.softblaze.net \
  --web-url https://adnexus-ai.apps.softblaze.net
```

**Result:** 25/25 checks passed (API health/ready/metrics/openapi, CORS, unauth 401s, web routes, web API rewrite).

## Visual QA — Coolify preview (2026-06-10, run #3)

**Environment:** main web `https://adnexus-ai.apps.softblaze.net` · main API `https://adnexus-api.apps.softblaze.net`  
**Method:** `coolify doctor`, route `curl`, Firecrawl scrape (markdown + screenshot @ 1280×800)

### Coolify doctor

| App | Status | FQDN probe | Notes |
| --- | --- | --- | --- |
| adnexus-ai | `running:unknown` | HTTP **307** → `/en` | Main container + PR sidecars (`pr-86`, `pr-87`, `pr-107`, …) running. Last 3 deploys **finished**. |
| adnexus-api | `running:healthy` | HTTP **401** on `/` | `/health` **200**, `/ready` **200**, `/metrics` **200**. No failed deploys in 24h. |

### Main route HTTP codes

| Route | Code | Notes |
| --- | --- | --- |
| `/` | 200 | Redirect chain ends at `/en` |
| `/en` | 200 | Homepage |
| `/en/pricing` | 200 | Feature comparison + savings calculator |
| `/en/dashboard/billing` | 200 | Unauthenticated → client redirect to `/en/auth/signin` (auth gate OK) |
| `/en/auth/signup` | 200 | Signup form renders |
| `/en/auth/signin` | 200 | Sign-in form renders |
| `/en/auth/login` | **404** | Broken alias — use `/en/auth/signin` |
| API `/` | 401 | Expected (auth required) |
| API `/health` | 200 | |
| API `/ready` | 200 | |
| API `/metrics` | 200 | |

### Firecrawl visual pass (main)

| Page | HTTP | Visual / content | Severity |
| --- | --- | --- | --- |
| `/en` | 200 | **PASS** — Hero, dashboard mock KPIs, draft inbox preview, feature grid, inline pricing cards, FAQ, footer CTAs all present in markdown. Nav + “Start Free Trial” / “Sign in” links resolve. | — |
| `/en/pricing` | 200 | **PASS (partial)** — Nav, feature-comparison matrix, mobile plan cards, savings calculator, footer all render. **P2:** No pricing-tier hero/plan cards above the fold (page opens on “Feature comparison”; tiers live on homepage). | P2 |
| `/en/dashboard/billing` | 200→signin | **PASS** — Unauthenticated users land on sign-in (“Welcome back”) with email/password + signup link. No billing data leaked. | — |
| `/en/auth/signup` | 200 | **PASS** — “Create an account” form: Full Name, Email, Password, Sign Up CTA, sign-in link. | — |

### PR preview FQDNs (`gh pr checks`)

| PR | Branch | `coolify/adnexus-ai` | Preview URL | HTTP | Action |
| --- | --- | --- | --- | --- | --- |
| [#106](https://github.com/DigitalSoftDistribution/adnexus-ai/pull/106) | `feat/qa-evidence-sb-3220-2026-06-10` | **pass** | `https://pr-106-adnexus-ai.previews.softblaze.net` | **404** | Coolify container `…-pr-86`/`pr-107` running but **CF/Caddy route missing** for `previews.softblaze.net` PR hostnames — infra blocker for PR visual QA |
| [#107](https://github.com/DigitalSoftDistribution/adnexus-ai/pull/107) | `feat/docs-refresh-sb-3098` | **pass** | `https://pr-107-adnexus-ai.previews.softblaze.net` | **404** | Same routing gap |
| [#86](https://github.com/DigitalSoftDistribution/adnexus-ai/pull/86) | `feat/stripe-portal-wire-2026-06-07` | *absent* | `https://pr-86-adnexus-ai.previews.softblaze.net` | **404** | CI **Test fail**; no Coolify status on latest commit; container exists from older deploy |

### Visual issues logged

1. **P2 — `/en/auth/login` 404:** Legacy/login alias not routed; marketing links correctly use `/en/auth/signin`.
2. **P2 — Pricing page hierarchy:** Dedicated pricing page lacks tier hero; comparison table is first visible section (tiers duplicated on homepage).
3. **P1 — PR preview URLs unreachable:** `pr-<N>-adnexus-ai.previews.softblaze.net` returns 404 despite successful Coolify builds on PRs 106/107 — blocks branch-preview visual QA until DNS/Traefik ingress wired.

## Known manual gaps

- Real browser rendering and CTA clickthrough for marketing/dashboard routes.
- Real Meta OAuth consent/callback and ad account sync.
- Real Stripe Checkout, portal, and webhook replay.
- Mobile visual QA and accessibility tooling.
- Live signup/session persistence on preview Supabase.
- PR preview hostname routing on `previews.softblaze.net` (404 today).
