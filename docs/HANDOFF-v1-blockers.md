# Handoff — the two P0 v1 blockers

> **RESOLVED (2026-06-07)** — Both P0 blockers described below are closed. This file is
> kept as a historical reference for agents who need the step-by-step context.
>
> | Blocker | Resolution date | PR |
> |---|---|---|
> | **P0-1** — Wire v2 Clean Architecture into the running server | 2026-06-07 | [#55](https://github.com/DigitalSoftDistribution/adnexus-ai/pull/55) — `mountV2Routes(app)` in `apps/api/src/index.ts:256 |
> | **P0-2** — Stand up the API as a Coolify app | 2026-06-07 | [#80](https://github.com/DigitalSoftDistribution/adnexus-ai/pull/80) — `adnexus-api` live at `https://adnexus-api.apps.softblaze.net` |
>
> Current status: [PATH_TO_V1.md](PATH_TO_V1.md) (status date 2026-06-10).

---

> For the next agent picking up after PR #12 (`fix/api-test-suite-green-2026-06-02`).
> Context: the test suite is now green and the API has a working Docker image, but
> two things stand between this and a usable v1. Both are described in
> [PATH_TO_V1.md](PATH_TO_V1.md); this file is the actionable, step-by-step handoff.

---

## P0-1 — Wire the v2 Clean Architecture into the running server

### The problem (precise)
- `apps/api/src/index.ts` is the deployed entrypoint (`package.json` `start: node dist/index.js`).
  It mounts **25 v1 routers** (`app.use('/api/v1/...')`) and **zero v2 routes**. It never imports
  `createServer.ts`.
- `apps/api/src/interface/http/createServer.ts` builds a SEPARATE Express app and mounts
  **19 `/api/v2/*` route groups** behind a DI container (`createServer` → `Container`). It is
  imported by nothing at runtime (only `src/interface/http/index.ts` re-exports it).
- The live Next.js frontend calls `/api/v2/*`:
  - `apps/web/components/dashboard/DashboardContent.tsx` → `GET /api/v2/campaigns/summary`
  - `apps/web/components/campaigns/CampaignsContent.tsx` → `GET /api/v2/campaigns?...` (expects `{ data: { campaigns, total } }`)
  - `apps/web/components/campaigns/*` → `/api/v2/campaigns/:id`, POST `/api/v2/campaigns`
  - `apps/web/next.config.ts` rewrites both `/api/v1/*` and `/api/v2/*` to `process.env.API_URL`.
- Net: in production today, every `/api/v2/*` call 404s because the served app has no v2 routes.

### What to do
1. Decide the composition (pick ONE):
   - **(A) Mount v2 inside `index.ts`** — import the container + the v2 route factories and add
     `app.use('/api/v2/...')` blocks alongside the v1 ones. Lowest risk; keeps the battle-tested
     v1 bootstrap. Mirror the 19 mounts already enumerated in `createServer.ts:166+`.
   - **(B) Make `createServer.ts` the entrypoint** and mount the stable v1 routers inside it, then
     point `start` at it. Cleaner long-term, higher risk (v1 has lots of middleware/order in
     `index.ts`: rate limiters, Stripe raw-body webhook, OAuth callbacks, SSE).
   - Recommendation: **(A)** for v1, refactor to (B) later.
2. Wire the DI `Container` once at boot and pass it to the v2 route factories
   (`createCampaignRoutes(container)`, etc. — signatures already exist).
3. Confirm the v2 success envelope matches what the frontend reads
   (`CampaignsContent` wants `data.data.campaigns` + `data.data.total`). This ties into **P0-3**
   in PATH_TO_V1 — align the route's list envelope with the frontend rather than adding adapters.

### Test gate / acceptance
- Add `apps/api/tests/integration/v2-*.test.ts` hitting the served `/api/v2/*` routes (auth required,
  RBAC, validation, `{ success, data }` / `{ success, error }` envelope). The v2 use-case unit tests
  already exist under `src/application/use-cases/**/*.test.ts` (run by `pnpm --filter @adnexus/api test`).
- Acceptance: every `/api/v2/*` route the live Next pages call returns 2xx with the documented shape
  against a running server (`node dist/index.js`), and `DashboardContent`/`CampaignsContent` render
  against it (their RTL tests already assert the expected response shapes).

### Landmines
- `index.ts` registers the Stripe webhook with a raw-body parser BEFORE `express.json()` — don't break
  that ordering when inserting v2 mounts.
- `authenticateToken` is applied globally before the v1 routes (`index.ts:254`); v2 routes use their own
  `unauthenticatedRateLimiter` for `/api/v2/auth`. Keep auth/rate-limit ordering per `createServer.ts`.
- The v2 container needs the same env (Supabase, Redis) the config schema validates at boot.

---

## P0-2 — Stand up the API as a Coolify app

### Status
- `apps/api/Dockerfile` is now a **working** root-context pnpm multi-stage build (this PR). Verified:
  `docker build -f apps/api/Dockerfile -t adnexus-api .` succeeds, container boots, `GET /health` → 200.
- Key gotchas already solved in the Dockerfile (do not regress):
  - Must `COPY .npmrc` (carries `public-hoist-pattern[]=*@types/*`) or `tsc` fails with TS2742 on
    express types in Docker (doesn't repro locally because of root hoisting).
  - Must copy the **root** `node_modules` (pnpm `.pnpm` store) into the runner, not just
    `apps/api/node_modules`, or `express` etc. fail to resolve at runtime.
  - Build context is the **repo root**, Dockerfile path is `apps/api/Dockerfile`, CMD is
    `node apps/api/dist/index.js`.

### What to do
1. Create a Coolify application for the API:
   - Source: this repo. Build pack: Dockerfile. **Build context: `/` (repo root). Dockerfile: `apps/api/Dockerfile`.**
   - Port: 3000. Healthcheck: `/health`.
2. Set env vars (the config schema fail-fasts on missing ones — see `apps/api/src/config/index.ts`).
   Minimum to boot (verified): `NODE_ENV`, `PORT`, `JWT_SECRET`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `REDIS_URL`, `META_APP_ID/SECRET/API_VERSION`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`. Add the rest the
   schema requires (Google/TikTok/Snap, Sentry, SMTP/Resend) per environment.
3. Point the Next app's `API_URL` (used by `next.config.ts` rewrites) at the deployed API URL.
4. Replace the stub `echo` deploy steps in `.github/workflows/deploy.yml` (or rely on Coolify's
   webhook auto-deploy and delete the stub job).

### Test gate / acceptance
- `coolify doctor <api-app>` healthy; `GET /health` 200 on the deployed URL.
- A Next **preview** → API → Supabase round-trip works (e.g. dashboard summary loads) — which also
  exercises P0-1.

### Useful commands
```bash
docker build -f apps/api/Dockerfile -t adnexus-api .            # local verify
coolify doctor <api-app>                                        # diagnostic ladder
coolify lastfail <api-app>                                      # if a deploy fails
```

---

## Quick orientation for the next agent
- Real status + milestones: [PATH_TO_V1.md](PATH_TO_V1.md)
- Coverage + structural findings: [architecture/test-coverage-matrix.md](architecture/test-coverage-matrix.md)
- Run all gates: `pnpm --filter @adnexus/api test && pnpm --filter @adnexus/web test && pnpm turbo typecheck`
- Do NOT trust the ✅ markers in `V2-ROADMAP.md` (it's a design spec; banner added).
