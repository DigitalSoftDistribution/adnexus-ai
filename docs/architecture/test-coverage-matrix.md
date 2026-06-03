# Test Coverage Matrix & Architecture Findings

> Generated 2026-06-02 during the comprehensive testing + path-to-v1 effort.
> Branch: `fix/api-test-suite-green-2026-06-02`.

## TL;DR — the three structural surprises

1. **The deployed API serves v1 only.** `apps/api/src/index.ts` (the entrypoint behind
   `start: node dist/index.js`) mounts **25 v1 routes and zero v2 routes**, and never imports
   `createServer.ts`. The entire v2 Clean Architecture server
   (`apps/api/src/interface/http/createServer.ts`, ~110 use cases, 20 v2 route files, the DI
   container) is **built but unwired at runtime**. V2-ROADMAP marks Phases 1-5 "COMPLETE", but
   v2 is not actually served. The Next.js frontend rewrites `/api/v2/*` to the API
   (`apps/web/next.config.ts`), so any dashboard call to v2 currently hits a 404 unless the
   page falls back to v1.

2. **Every existing API test targets v1.** 9 test files reference `/api/v1/*`; **0 reference
   `/api/v2/*`**. The v2 layer has only **3 vitest unit files** under `src/` (CreateCampaignUseCase,
   Result, EventBus = 27 tests) and these are **not run by `pnpm test`** (the script runs jest with
   `roots: ['tests']`; the vitest config `include: ['src/**/*.test.ts']` is never invoked by CI).

3. **The web app ships a dead Vite SPA.** `apps/web` builds Next.js (`app/`), but also contains an
   unbuilt Vite SPA (`index.html`, `src/main.tsx`, `src/App.tsx`, `src/spa-pages/` 65 pages,
   `src/views/` orphan duplicate). ADR-003 declared Vite canonical; later Coolify/Next commits
   reversed that. Decision (2026-06-02): **keep Next.js, delete the dead Vite SPA**, supersede
   ADR-003. Note: `apps/web/lib/*` and `apps/web/hooks/*` (live Next code) re-export from
   `apps/web/src/lib/*`, so `src/lib/` is SHARED and must be preserved during SPA deletion.

## API test suites (jest, `apps/api/tests/`)

| Suite | Targets | Baseline | After infra fixes |
|---|---|---|---|
| `unit/auth.test.ts` | helpers | PASS | PASS |
| `unit/ai-engine.test.ts` | ai-engine | PASS | PASS |
| `unit/cache-service.test.ts` | cache | PASS | PASS |
| `unit/platforms.test.ts` | platform clients | PASS | PASS |
| `unit/drafts-service.test.ts` | v1 drafts svc | FAIL | PASS (fixed: getDraft mock seam, paginate assertion, audit thenable) |
| `unit/rate-limiter.test.ts` | rate limiter | FAIL | PASS (boundary `>=`) |
| `unit/agent-engine.test.ts` | rule engine | FAIL | see triage |
| `workers/generate-reports.test.ts` | report worker | FAIL (vitest leftovers) | PASS (jest globals) |
| `integration/auth-routes.test.ts` | v1 auth | FAIL | see triage |
| `integration/campaign-routes.test.ts` | v1 campaigns | FAIL | see triage |
| `integration/draft-routes.test.ts` | v1 drafts | FAIL | see triage |
| `integration/agent-routes.test.ts` | v1 agent | FAIL | see triage |
| `integration/billing-routes.test.ts` | v1 billing | FAIL | see triage |
| `e2e/auth.test.ts` | v1 auth flow | FAIL (no `auth.admin` mock) | see triage |
| `e2e/campaigns.test.ts` | v1 campaigns | FAIL | see triage |
| `e2e/drafts.test.ts` | v1 drafts | FAIL | see triage |

Root causes of the FAILs were **test-infra / stale-mock**, not (mostly) product logic:
- jest `transform` only matched `.ts`; a real `await`-outside-async bug in `auth-routes.test.ts`
  (used `bcrypt.hashSync` fix) produced a misleading parse error.
- `generate-reports.test.ts` was a half-converted vitest file (`const {describe}=jest`, `vi` shim).
- Integration/e2e supabase mocks were incomplete vs current routes (missing `auth.admin.*`,
  `signInWithPassword`, full query chains).
- One genuine product bug found + fixed: `errorHandler` emitted a flat `{error,code}` instead of the
  documented `{success:false,error:{code,message,details}}` envelope, and `ZodError` fell through to
  500 instead of 400.

## v2 Clean Architecture — coverage gap (the big one)

20 v2 route files in `apps/api/src/interface/http/routes/`; ~110 use cases in
`apps/api/src/application/use-cases/`. Unit-test coverage:

| Use-case area | Use cases | Unit tests |
|---|---|---|
| campaign | 13 | 1 (`CreateCampaignUseCase`) |
| draft | 10 | 0 |
| ad / ad-set | 9 | 0 |
| agent | 7 | 0 |
| alert | 7 | 0 |
| audience | 6 | 0 |
| report | 6 | 0 |
| goal | 6 | 0 |
| settings | 11 | 0 |
| billing | 5 | 0 |
| asset | 5 | 0 |
| export | 4 | 0 |
| admin | 4 | 0 |
| notification / search / webhook / audit-log / workspace / ad-account | ~18 | 0 |
| **Total** | **~110** | **1** |

Integration coverage of v2 routes: **0**.

## Recommended test targets (Phase 4)

- **Unit (vitest, mirror `CreateCampaignUseCase.test.ts`):** the critical-path use cases first —
  Approve/Execute/RejectDraft, Update/Delete/Pause/ActivateCampaign, Create/CancelSubscription
  (billing), CreateApiKey/UpdateTeamMemberRole (settings RBAC).
- **Integration (against `createServer` once wired):** auth-required, RBAC, validation, and the
  `{success,error}` envelope for each v2 resource.
- **E2E (4 critical flows):** signup→connect→create campaign; AI draft→approve→execute;
  plan upgrade→webhook→credits; alert→notification.
- **Wire vitest into CI:** add a `test:unit:v2` (vitest) step so the 3 existing + new use-case tests
  actually run.

## Frontend (apps/web)

| Test | Targets | Keep? |
|---|---|---|
| `src/App.test.tsx` | string-matches dead SPA routes | DROP with SPA deletion |
| `src/spa-pages/*.test.ts`, `src/views/*.test.ts` | dead SPA pages | DROP with SPA deletion |
| `src/stores/draftStore.test.ts`, `src/lib/api.test.ts` | SPA store/client | DROP if SPA-only |
| NEW: RTL for `components/*Content` | live Next dashboard | ADD |
