# AdNexus AI v1 Launch Readiness

> Linear: SB-3098, SB-3099, SB-3183
> Scope: launch test matrix, go/no-go criteria, environment readiness, monitoring checks, and operator runbooks.
> Status: safety net created; several launch blockers remain open below.

## Repository-grounded commands

Run these from the repo root unless noted.

| Gate | Command | Required for go? | Notes |
|---|---|---:|---|
| Install | `pnpm install --frozen-lockfile` | Yes | Uses root `pnpm-workspace.yaml`. |
| API unit/integration/e2e | `pnpm --filter @adnexus/api test` | Yes | Runs Jest suites plus v2 Vitest use-case tests. |
| API unit only | `pnpm --filter @adnexus/api test:unit` | Yes | Fast regression for auth, platform clients, drafts, rate limiting. |
| API integration | `pnpm --filter @adnexus/api test:integration` | Yes | Contract-level routes, including billing/campaign/draft/auth coverage. |
| Web component tests | `pnpm --filter @adnexus/web test` | Yes | RTL/Vitest app component tests. |
| Typecheck | `pnpm turbo typecheck` or `beast typecheck` | Yes | Agent-side quality gate; GitHub CI is not the source of truth here. |
| Build | `pnpm build` or `beast build` | Yes | Turborepo production build. |
| Lightweight launch smoke | `pnpm smoke:v1 -- --base-url <api-url> --web-url <web-url> --origin <web-origin>` | Yes for deployed preview | Verifies health, readiness, metrics, OpenAPI, preview CORS, unauthenticated `/api/v2` behavior, web routes, and web-to-API rewrites. Add `--token` or `SMOKE_AUTH_TOKEN` for authenticated probes. |
| API image | `docker build -f apps/api/Dockerfile -t adnexus-api .` | Yes before API deploy | Confirms root-context API Docker build. |
| Web image | `docker build -t adnexus-web .` | Yes before web deploy | Confirms Next standalone artifact. |

## Runtime surfaces used by the checklist

### Web routes

| Flow | Route |
|---|---|
| Marketing home | `/en` |
| Signup | `/en/auth/signup` |
| Sign in | `/en/auth/signin` |
| Onboarding | `/en/onboarding` |
| Dashboard | `/en/dashboard` |
| Campaign list | `/en/dashboard/campaigns` |
| Campaign create | `/en/dashboard/campaigns/new` |
| Campaign detail | `/en/dashboard/campaigns/:id` |
| Campaign edit | `/en/dashboard/campaigns/:id/edit` |
| Draft approval | `/en/dashboard/drafts` |
| Billing | `/en/dashboard/billing` |
| Settings | `/en/dashboard/settings` |
| Integrations / Meta connect surface | `/en/dashboard/integrations` |
| Audit log | `/en/dashboard/audit-log` |
| Reports | `/en/dashboard/reports` |

### Current preview deploys

| Surface | Coolify app | URL | Notes |
|---|---|---|---|
| Web | `adnexus-ai` | `https://adnexus-ai.apps.softblaze.net` | Next standalone app. Uses `API_URL` for `/api/v1/*` and `/api/v2/*` rewrites. |
| API | `adnexus-api` | `https://adnexus-api.apps.softblaze.net` | Express API built from `apps/api/Dockerfile`; liveness is `/health`, readiness is `/ready`, metrics are `/metrics`. |

### API routes and observability endpoints

| Surface | Route |
|---|---|
| Liveness | `GET /health` |
| Readiness | `GET /ready` |
| Prometheus metrics | `GET /metrics` |
| v2 OpenAPI | `GET /api/v2/openapi.json` |
| v2 API docs | `GET /api/v2/docs` |
| Auth | `/api/v1/auth/*`, `/api/v2/auth/*` |
| Campaigns | `/api/v1/campaigns/*`, `/api/v2/campaigns/*` |
| Drafts | `/api/v1/drafts/*`, `/api/v2/drafts/*` |
| Billing | `/api/v1/billing/*`, `/api/v2/billing/*` |
| Settings | `/api/v1/settings/*`, `/api/v2/settings/*` |
| Integrations / account sync | `/api/v2/integrations/*` |
| Audit log | `/api/v1/audit-log/*`, `/api/v2/audit-log/*` |
| Webhooks | `/api/v1/webhooks/*`, `/api/v2/webhooks/*` |
| Realtime events | `GET /api/v2/events?token=...` |

## Test matrix

### Automated test coverage to run before go/no-go

| Area | Current automated coverage | Required launch evidence | Owner action |
|---|---|---|---|
| Auth signup/signin/refresh | `apps/api/tests/unit/auth.test.ts`, `apps/api/tests/integration/auth-routes.test.ts`, `apps/api/tests/e2e/auth.test.ts` | API tests green; browser signup/signin flow captured on preview. | Run API tests and browser QA. |
| Campaign CRUD and RBAC | `apps/api/tests/e2e/campaigns.test.ts`, `apps/api/tests/integration/campaign-routes.test.ts`, `apps/api/tests/integration/v2-campaigns.test.ts`, campaign use-case tests | API tests green; dashboard campaign list/create/detail/edit works against deployed `/api/v2`. | Run API tests, smoke, and browser QA. |
| Meta connect and sync | `apps/api/tests/unit/meta-api.test.ts`, `apps/api/tests/unit/platforms.test.ts`, ad-account/integration use-case tests | OAuth app configured; test account can connect Meta; sync writes ad accounts, campaigns, ad sets, and metrics. | Manual browser QA plus run platform tests. |
| Dashboard metrics correctness | campaign summary endpoints, report routes, `apps/api/src/infrastructure/platform/syncPersistence.ts` | Dashboard values match Supabase source rows and Meta fixture/source export within agreed tolerance. | Manual data reconciliation. |
| Campaign detail | campaign route/use-case tests | Detail page loads from `/api/v2/campaigns/:id`; edit route preserves data and audit history. | Browser QA. |
| Draft approval | `apps/api/tests/e2e/drafts.test.ts`, draft route/use-case tests | Draft create -> submit/approve/reject/execute paths work; every mutation writes an audit event. | API tests and browser QA. |
| Billing and credits | `apps/api/tests/integration/billing-routes.test.ts`, `apps/api/tests/e2e/billing-flow.test.ts` | Stripe checkout/portal/webhook fixtures pass; credits/plan update visible in UI after webhook. | Run billing tests; webhook replay in staging. |
| Settings and API keys | settings routes, `apps/api/src/routes/api-keys.ts`, v2 settings routes | Profile/settings persist; API key create/revoke works; revoked keys fail immediately; audit log present. | Browser/API manual QA. |
| Audit logs | `apps/api/src/routes/audit-log.ts`, `apps/api/src/infrastructure/audit/SupabaseAuditLogger.ts` | Mutating campaign, draft, billing, settings, and key operations create searchable audit records. | Manual DB/API verification. |
| API contracts | v2 OpenAPI generator and route integration tests | `GET /api/v2/openapi.json` returns 200 JSON; frontend response envelope matches served API. | Smoke plus contract tests. |
| Health/metrics | `/health`, `/ready`, `/metrics` in `apps/api/src/index.ts` | `/health` 200, `/ready` 200 in deploy, `/metrics` exposes Prometheus text. | Smoke and monitoring setup. |
| Web pages | `apps/web` Vitest tests | Key routes return non-5xx and render no obvious broken shell. | Smoke and browser QA. |

### Browser QA flows

Each flow must be executed on the branch preview or staging URL, with console/network errors checked.

| Flow | Steps | Pass criteria | Evidence |
|---|---|---|---|
| Signup | Visit `/en/auth/signup`, create user/workspace, land in onboarding or dashboard. | No 4xx/5xx except expected validation; user and workspace rows exist; session survives refresh. | Screenshot + user/workspace IDs. |
| Connect Meta | Visit `/en/dashboard/integrations`, start Meta OAuth, complete callback with test app/user. | Connected account appears; encrypted token stored server-side; audit event written. | Screenshot + ad account ID + audit row. |
| Sync | Trigger/schedule account sync. | Sync job completes; campaigns/ad sets/metrics rows created or updated; errors observable in logs. | Sync job ID + sample DB rows. |
| Dashboard | Visit `/en/dashboard`. | Summary cards and charts render from `/api/v2/campaigns/summary` without fallback-only mock data. | Screenshot + API response sample. |
| Campaign detail | Open `/en/dashboard/campaigns/:id`. | Campaign detail, metrics, history, and edit link work. | Screenshot + campaign ID. |
| Draft approval | Create or open draft, submit, approve/reject, execute. | State transitions are correct; unauthorized roles cannot approve; audit log records each mutation. | Screenshot + draft ID + audit rows. |
| Billing | Visit `/en/dashboard/billing`, start checkout/portal or test webhook replay. | Stripe session/webhook succeeds; plan/credits update in app. | Stripe event ID + workspace plan. |
| Settings | Visit `/en/dashboard/settings`, update profile/org/API key settings. | Persistence works; API key create/revoke lifecycle works; audit records written. | Screenshot + audit rows. |

## Security launch checks

| Check | Required result | How to verify |
|---|---|---|
| Auth cookies/tokens | Access/refresh tokens are not exposed to client logs or localStorage unless intentionally documented. | Browser storage inspection and Sentry/log review. |
| JWT secret | `JWT_SECRET` is >= 32 chars and unique per environment. | Env inventory; do not print value. |
| Supabase service key | Only API server has `SUPABASE_SERVICE_KEY`; web only uses anon key. | Coolify/env inventory. |
| Platform token storage | Meta/Google/TikTok/Snap tokens are encrypted at rest before DB persistence. | Review `apps/api/src/security/encryption.ts` and platform token persistence path. |
| RBAC | Viewer/read-only roles cannot mutate campaigns, drafts, billing, settings, API keys, or integrations. | API integration tests plus manual role test. |
| Ownership | Workspace A cannot read or mutate Workspace B records. | API integration tests with two workspaces. |
| Audit logs | Sensitive mutations write audit rows with actor, workspace, entity, action, and timestamp. | Query audit log API/DB after each browser QA mutation. |
| API keys | Generated keys are shown once, stored hashed, and revocation is immediate. | Manual API-key flow and DB verification. |
| Webhooks | Stripe/platform webhook signatures are verified before side effects. | Fixture replay with invalid and valid signatures. |
| Sentry redaction | Authorization headers, cookies, API keys, and platform tokens are redacted. | Trigger staging test error and inspect Sentry event. |

## Environment readiness checklist

| Area | Required before launch | Source of truth |
|---|---|---|
| API deploy | Coolify API app exists, build context repo root, Dockerfile `apps/api/Dockerfile`, port 3001 or configured `PORT`, health `/health`. | Coolify app config. |
| Web deploy | Next app points `API_URL` at deployed API; `/api/v1/*` and `/api/v2/*` rewrites work. | `apps/web/next.config.ts` and Coolify env. |
| Supabase | Project URL, anon key, service key, migrations/schema applied, seed/demo data loaded where needed. | `apps/api/src/db/schema.ts`, Supabase dashboard, env inventory. |
| Auth | Supabase Auth settings, redirect URLs, email templates, and JWT settings configured for preview/staging/prod. | Supabase Auth settings. |
| Meta OAuth | Meta app has callback URL, app mode/test users, permissions, app secret, API version. | Meta developer app. |
| Stripe | Products/prices, checkout/portal, webhook endpoint, webhook secret, test/live mode separation. | Stripe dashboard and env. |
| Redis | `REDIS_URL` configured if queues/cache/realtime need it; readiness records redis status. | Coolify env and `/ready`. |
| Sentry | `SENTRY_DSN` set for API and web if web instrumentation exists; release/environment tags visible. | Sentry project settings. |
| Metrics/logging | `/metrics` scraped; API logs include request IDs and no secrets; alerting thresholds configured. | Prometheus/Grafana/Coolify logs. |
| Backups | Supabase backup/restore procedure documented and tested; rollback path known. | Ops runbook below. |

## Operational runbooks

### Platform API failure

1. Check `/health`, `/ready`, and `/metrics` on the API URL.
2. Check Coolify status/logs for API and web apps.
3. Review Sentry for recent platform errors tagged by provider.
4. Inspect sync job status and retry only idempotent jobs.
5. If Meta/API credentials are invalid or rate-limited, disable new sync attempts, keep dashboard read-only, and notify affected workspaces.
6. Verify recovery by running one scoped sync and confirming metrics rows update.

### Billing or webhook failure

1. Confirm Stripe dashboard event delivery and webhook signing secret for the environment.
2. Replay one failed Stripe event to staging or preview first when possible.
3. Check billing route logs and workspace billing/credit rows.
4. If credits/plan are stale, reconcile from Stripe event ID and record an audit log entry.
5. Re-run `pnpm --filter @adnexus/api test:integration` for billing routes after any code fix.

### Backup, recovery, rollback

1. Before launch, capture the current production Supabase backup policy and last successful backup timestamp.
2. Keep previous web/API deployment available in Coolify or image registry.
3. Roll back web and API together if frontend/API envelope changes are involved.
4. After rollback, run `pnpm smoke:v1 -- --base-url <api-url> --web-url <web-url>` and verify `/ready` returns 200.
5. For data recovery, restore to a separate Supabase project first, inspect affected rows, then apply targeted repair scripts.

## Go/no-go criteria

### Go

All of the following must be true:

- All required command gates above pass, including `smoke:v1` against the deployed preview/staging URLs.
- Browser QA flows pass for signup, connect Meta, sync, dashboard, campaign detail, draft approval, billing, and settings.
- `/health`, `/ready`, `/metrics`, and `/api/v2/openapi.json` are reachable from the deployed API URL.
- Web preview routes return non-5xx and dashboard calls use the deployed API instead of mock-only fallback data.
- Supabase, Meta OAuth, Stripe, Redis, Sentry, metrics, and logs are configured for the target environment.
- P0 blockers below are closed or explicitly waived by the owner with customer impact documented.

### No-go

Any of the following blocks v1 launch:

- Signup/signin cannot create a workspace and persist a session.
- Meta connect or sync cannot complete with a test account.
- Dashboard/campaign screens cannot read from the served `/api/v2` API.
- Billing webhook cannot update plan/credits reliably.
- Viewer or cross-workspace access can mutate or read unauthorized data.
- Platform tokens, API keys, cookies, or authorization headers appear in logs/Sentry/browser storage.
- `/ready` is 503 in the target environment, or `/metrics` is unavailable to monitoring.
- Backups/rollback path is unknown or untested.

## Exact remaining v1 blockers

| ID | Blocker | Evidence | Required closure |
|---|---|---|---|
| B1 | API Coolify app and env readiness still need final environment wiring. | `docs/HANDOFF-v1-blockers.md` lists API Coolify app creation and env setup as remaining; current work did not provision cloud resources. | Create/verify API Coolify app, set env vars, run `coolify doctor`, and point web `API_URL` at it. |
| B2 | Billing flow needs deployed e2e/webhook proof. | `docs/PATH_TO_V1.md` says billing has integration coverage but needs e2e once served billing surface is available. | Replay Stripe webhook in staging/preview and verify plan/credits update in UI and DB. |
| B3 | Response-envelope/frontend contract must be verified on the served API. | Prior blocker doc called out v1/v2/frontend envelope drift; `apps/api/src/index.ts` now mounts v2, but deployed runtime must be proven. | Smoke/API contract tests and browser dashboard/campaign QA against deployed API. |
| B4 | Meta OAuth/sync needs environment-level proof. | Code/tests exist, but OAuth app callback, app mode/test users, and token persistence are environment concerns. | Complete Meta test-account connect and sync evidence. |
| B5 | Supabase migration/seed readiness is not documented as an applied production/staging state. | No `supabase/` migrations directory exists; schema lives in `apps/api/src/db/schema.ts`. | Confirm schema application process, seed data, and backup/restore runbook for target Supabase project. |
| B6 | Sentry/metrics/logging must be verified in the target environment. | **2026-06-10 (SB-3228):** `/health`, `/ready`, `/metrics` return **200** on `https://adnexus-api.apps.softblaze.net`. `/metrics` exposes Prometheus counters/histograms. Coolify env has **no `SENTRY_DSN`** on `adnexus-api` or `adnexus-ai` — Sentry disabled in prod preview. Scrape/alert wiring not confirmed. | Set `SENTRY_DSN` in Coolify, trigger test error and verify redaction, register Prometheus scrape target + alert path. |
| B7 | Security findings require final review or waiver. | `SECURITY_AUDIT.md` lists high/critical-style findings such as refresh-token rotation and secret-management weaknesses. | Fix or explicitly waive each launch-relevant P0/P1 finding with owner sign-off. |
