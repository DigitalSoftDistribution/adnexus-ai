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
pnpm --filter @adnexus/api exec jest tests/e2e/v1-sellability-qa.test.ts --runInBand --ci --forceExit
```

## Go/no-go rules

- Any failed **P0/P1** item blocks V1 launch and must map to a Linear blocker issue.
- Any failed **P2** item needs owner sign-off and a mitigation note before launch.
- Record environment, browser/device, user, workspace, and evidence links for each run.

## Manual matrix

| Area | Priority | Verification | Expected result | Status / evidence |
| --- | --- | --- | --- | --- |
| Marketing route/link smoke | P0 | Open `/en`, `/en/pricing`, `/en/features`, `/en/integrations`, `/en/security`, `/en/auth/signup`, `/en/auth/signin`; click primary CTA, pricing CTA, footer legal links. | Pages render with no 404/500, CTAs route to signup/signin or intended page, no console errors. | TODO |
| Protected dashboard route smoke | P0 | While signed out, open `/en/dashboard`, `/en/dashboard/campaigns`, `/en/dashboard/drafts`, `/en/dashboard/integrations`, `/en/dashboard/billing`, `/en/dashboard/settings`. | User is redirected to sign-in or shown a clear auth gate; no protected data leaks. | TODO |
| Signup/auth smoke | P0 | Create a new user with a fresh email, sign out, sign back in, refresh dashboard. | Session persists, dashboard loads, localized route remains correct. | TODO |
| Meta connect OAuth | P0 | From integrations/settings, start Meta connect using a test Meta business if available. | Consent URL opens, required scopes are requested, callback returns to app, connected account appears with account name/status. | TODO |
| Meta sync path | P0 | Trigger sync for connected Meta account/campaigns. | Sync job starts, progress/error state is visible, campaign list refreshes or shows actionable empty/error state. | TODO |
| Draft approval truth | P0 | Create or seed an AI draft, click review/approve action, then execute if separately available. | Review approval does not imply live campaign mutation unless explicit execute action succeeds. Audit/status copy is truthful. | TODO |
| Billing checkout | P0 | Start upgrade from billing/pricing with Stripe test price. | Stripe Checkout opens with correct plan, success/cancel redirects return to billing page. | TODO |
| Billing webhook | P0 | Complete Stripe test checkout or replay Stripe CLI webhook. | Workspace plan/subscription updates, audit log records event, duplicate webhook is idempotent. | TODO |
| Billing portal | P1 | Open customer portal for subscribed workspace. | Portal opens; return URL lands back on billing page. | TODO |
| Settings/API keys | P1 | Create, copy once, list, revoke API key. | Secret is only shown once, list masks key, revoke prevents further use. | TODO |
| Team RBAC | P0 | Invite/add owner/admin/member/viewer; attempt billing/settings/API key/OAuth actions per role. | Only authorized roles can mutate billing, OAuth, API keys, and team roles. Unauthorized users get 403 + clear UI copy. | TODO |
| Mobile smoke | P1 | Test core marketing, signup, dashboard nav, billing, integrations, drafts on 390×844 viewport. | No clipped CTAs, horizontal overflow, inaccessible menus, or unusable forms. | TODO |
| Accessibility smoke | P1 | Keyboard-only navigate signup, dashboard nav, integrations, drafts, billing; run axe/Lighthouse if available. | Focus is visible, dialogs trap/release focus, buttons have names, contrast passes obvious checks. | TODO |
| Observability | P1 | Verify `/health`, `/ready`, `/metrics`, Sentry/logging for failed OAuth/Stripe/sync paths. | Health endpoints respond appropriately and critical failures emit searchable logs/errors without secrets. | TODO |

## Automated coverage currently added

- API route/link smoke for public, protected, and V2 dashboard-backed endpoints.
- Signup/auth smoke using mocked Supabase store.
- Meta connect redirect and integrations surface smoke with mocked OAuth configuration.
- Draft approval vs execution contract guard.
- Billing plans/checkout/portal/webhook contract smoke without real Stripe credentials.
- Settings/API keys route wiring plus Meta OAuth RBAC guard for viewer role.

## Known manual gaps

- Real browser rendering and CTA clickthrough for marketing/dashboard routes.
- Real Meta OAuth consent/callback and ad account sync.
- Real Stripe Checkout, portal, and webhook replay.
- Mobile visual QA and accessibility tooling.
