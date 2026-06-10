# Test Coverage Matrix & Architecture Findings

> Updated 2026-06-10 (SB-3098 gap audit).
> Original audit: 2026-06-02, branch `fix/api-test-suite-green-2026-06-02`.

## TL;DR — status as of 2026-06-10

1. **The deployed API serves v1 and v2.** `apps/api/src/index.ts` mounts 25 v1 routes **and**
   v2 Clean Architecture routes via `mountV2Routes(app)` at line 256. The Next.js frontend
   rewrites `/api/v2/*` to the API (`apps/web/next.config.ts`); dashboard calls hit served v2
   routes on preview (`https://adnexus-api.apps.softblaze.net`).

2. **v2 integration tests exist.** `apps/api/tests/integration/v2-campaigns.test.ts`,
   `v2-settings-api-keys.test.ts`, and `v2-reports-dashboard.test.ts` exercise served `/api/v2/*`
   routes (auth, RBAC, envelope). Additional v2 unit coverage in `apps/api/tests/unit/v2-auth-proxy.test.ts`.

3. **Use-case unit tests are wired and growing.** ~30 vitest files under
   `apps/api/src/application/use-cases/**/*.test.ts` run as part of
   `pnpm --filter @adnexus/api test` (jest suites + vitest). Repo-wide: **77** test files;
   Playwright smoke at repo root (`pnpm test:smoke`, `playwright.config.ts` on `main`).

4. **The dead Vite SPA was deleted (2026-06-02).** Next.js is canonical; ADR-003 superseded.

## API test suites (jest, `apps/api/tests/`)

| Suite | Targets | Status |
|---|---|---|
| `unit/auth.test.ts` | helpers | PASS |
| `unit/ai-engine.test.ts` | ai-engine | PASS |
| `unit/cache-service.test.ts` | cache | PASS |
| `unit/platforms.test.ts` | platform clients | PASS |
| `unit/drafts-service.test.ts` | v1 drafts svc | PASS |
| `unit/rate-limiter.test.ts` | rate limiter | PASS |
| `unit/v2-auth-proxy.test.ts` | v2 auth proxy | PASS |
| `workers/generate-reports.test.ts` | report worker | PASS |
| `integration/auth-routes.test.ts` | v1 auth | PASS |
| `integration/campaign-routes.test.ts` | v1 campaigns | PASS |
| `integration/draft-routes.test.ts` | v1 drafts | PASS |
| `integration/agent-routes.test.ts` | v1 agent | PASS |
| `integration/billing-routes.test.ts` | v1 billing | PASS |
| `integration/v2-campaigns.test.ts` | v2 campaigns (served) | PASS |
| `integration/v2-settings-api-keys.test.ts` | v2 settings/API keys | PASS |
| `integration/v2-reports-dashboard.test.ts` | v2 reports/dashboard | PASS |
| `e2e/auth.test.ts` | v1 auth flow | PASS |
| `e2e/campaigns.test.ts` | v1 campaigns | PASS |
| `e2e/drafts.test.ts` | v1 drafts | PASS |
| `e2e/v1-sellability-qa.test.ts` | launch sellability smoke | PASS |
| `e2e/billing-flow.test.ts`, `e2e/alerts-flow.test.ts` | critical flows | PASS |

Historical note: the 2026-06-02 audit triaged 250+ failures into infra fixes, stale mocks, and
a handful of real product bugs (error envelope, ZodError status, 409 conflicts, v1 campaign RBAC).

## v2 Clean Architecture — use-case coverage

~110 use cases in `apps/api/src/application/use-cases/`; **~30** have co-located vitest unit tests
(template: `CreateCampaignUseCase.test.ts`). Integration coverage for served v2 routes: **3 suites**
(see above).

| Use-case area | Use cases (approx) | Unit tests (approx) |
|---|---|---|
| campaign | 13 | several |
| draft | 10 | several |
| settings / billing / alert / audience / report / … | ~87 | remainder of ~30 files |
| **Total** | **~110** | **~30** |

## Recommended test targets (ongoing)

- **Unit (vitest):** expand critical-path use cases — Approve/Execute/RejectDraft, billing
  subscriptions, settings RBAC, integrations sync.
- **Integration:** extend v2 route coverage as new dashboard surfaces ship.
- **E2E:** billing plan-upgrade→Stripe-webhook→credits (partial integration coverage today).
- **Playwright:** extend `pnpm test:smoke` for marketing and dashboard happy paths on preview.

## Frontend (apps/web)

| Test | Targets | Status |
|---|---|---|
| RTL for `components/*Content` | live Next dashboard | ADDED (Dashboard, Campaigns templates) |
| Dead SPA tests | removed with SPA deletion | DROPPED |

Run: `pnpm --filter @adnexus/web test`
