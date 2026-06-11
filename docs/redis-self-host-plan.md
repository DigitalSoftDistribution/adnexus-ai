# Self-Hosted Redis for AdNexus — Implementation Plan

> **Status:** Plan only — do not deploy until [SB-3235](https://linear.app/softblaze/issue/SB-3235/self-hosted-redis-for-adnexus) is in progress.  
> **Parent:** [SB-3098](https://linear.app/softblaze/issue/SB-3098) (launch readiness)  
> **Decision:** Self-build Redis on our stack — **not** Upstash or other external SaaS ([SB-3234](https://linear.app/softblaze/issue/SB-3234)).

## Current state (2026-06-11)

| Item | Value |
|---|---|
| `REDIS_URL` in Coolify (`adnexus-api`) | **Not set** |
| `apps/api` config | `REDIS_URL` optional (`z.string().url().optional()`) |
| Client library | `ioredis` + `bullmq` |
| Prod API URL | `https://adnexus-api.apps.softblaze.net` (VPS Coolify, `*.apps.softblaze.net`) |

The API boots and serves traffic without Redis. `/ready` reports `redis: not_configured` when `REDIS_URL` is absent; readiness still passes if Supabase is healthy.

---

## What AdNexus uses Redis for

### Today (code exists; mostly graceful without Redis)

| Feature | Module | Without Redis |
|---|---|---|
| **HTTP rate limiting** | `middleware/rateLimiter.ts` | In-memory fallback per process (not distributed) |
| **OAuth CSRF nonce** | `routes/auth/oauthState.ts` | In-memory Map fallback (breaks multi-replica replay protection) |
| **API response cache** | `services/cache-service.ts` | Cache miss → direct DB/API (slower, more platform API calls) |
| **Recent searches** | `services/search-service.ts` | Skipped silently |
| **Realtime SSE/WS** | `realtime/EventBus.ts` | Local-only delivery (no cross-instance fan-out) |
| **Morning brief scheduler** | `workers/morning-brief.ts` | Not started (`index.ts` skips when `!isRedisAvailable()`) |
| **Readiness probe** | `index.ts` `/ready` | `not_configured` (non-blocking) |

### Future / wired but not imported at boot (hard-require Redis when enabled)

| Worker / queue | Module | Notes |
|---|---|---|
| Campaign sync (15m cron) | `workers/sync-campaigns.ts` | BullMQ + DLQ |
| Metrics sync | `workers/metrics-sync.ts` | Defaults to `localhost:6379` if URL missing (unsafe in prod) |
| Rule evaluation | `workers/rule-evaluator.ts`, `evaluate-rules.ts` | **Throws at import** if no `REDIS_URL` |
| Report generator | `workers/report-generator.ts`, `generate-reports.ts` | Scheduled reports |
| Morning brief | `workers/morning-brief.ts` | Daily cron per timezone |
| Email queue | `workers/email-worker.ts`, `services/email.ts` | Transactional + onboarding |
| Onboarding drip | `workers/onboarding-emails.ts` | Delayed jobs |
| Fatigue detection | `workers/detect-fatigue.ts` | Pub/sub for alerts |
| Webhook delivery queue | `services/webhook.ts` | Retry queue in Redis lists |
| MCP v2 (planned) | `docs/MCP_V2_PLAN.md` | Per-tool rate-limit weights |

**MCP app (`apps/mcp`):** no Redis usage today.

---

## Hosting options (our stack)

### Option A — Coolify managed Redis on **same VPS** as `adnexus-api` (recommended)

Provision a Coolify **Redis** service on server destination `2` (VPS `178.105.222.41`, side-project tier per `_deploy-routing.mdc`), same Docker network as `adnexus-api`.

| Pros | Cons |
|---|---|
| Persistent volume, backups via Coolify/volume snapshots | Another managed service to monitor |
| Private Docker network — no public Redis port | Coolify Redis UI/env wiring is manual first time |
| Survives API container redeploys | Slightly more ops than sidecar |
| Clean separation: API scales independently of Redis (within VPS) | Single-node Redis (no HA) — acceptable for preview/early prod |
| Matches how we run other side-project infra | |

### Option B — Redis sidecar in `adnexus-api` deploy (compose / multi-container)

Add `redis:7-alpine` alongside API in a Coolify **docker-compose** application (pattern in `docs/SELF_HOSTING.md`).

| Pros | Cons |
|---|---|
| Single-app mental model | **Redis data lost** on full stack redeploy unless volume carefully mounted |
| Lowest latency (localhost) | Coolify today uses `dockerfile` build pack for `adnexus-api` — requires migration to compose pack |
| Good for ephemeral previews | API + Redis scale together (can't scale workers separately later) |
| | Harder to share Redis with a future dedicated worker container |

### Option C — Coolify Redis on **dedicated preview host** (`95.217.117.169`)

| Pros | Cons |
|---|---|
| Already hosts flagship previews | **Wrong server** for AdNexus (`adnexus-api` is on VPS, not 95.217) |
| | Cross-host traffic: latency, firewall, TLS complexity |
| | Violates network isolation best practice |
| | **Reject for AdNexus** |

### Option D — Beast local Redis

| Pros | Cons |
|---|---|
| Fast for `beast typecheck` / local dev | Not reachable from Coolify preview/prod |
| | **Dev-only** — document in `HANDOFF.md`, not production path |

---

## Recommendation

**Preview + early prod:** **Option A** — Coolify managed Redis on the **VPS Coolify instance** (same destination as `adnexus-api`), `redis:7-alpine`, password auth, persistent volume, `maxmemory` + `allkeys-lru`, AOF enabled.

**Later prod (post-V1):** keep Option A on VPS until traffic warrants it; then evaluate (1) dedicated Redis on docker-fleet with replication, or (2) split `adnexus-worker` container sharing the same `REDIS_URL` — still self-hosted, not SaaS.

Do **not** put AdNexus Redis on `95.217.117.169` unless we migrate the entire AdNexus stack there.

---

## Security

| Control | Implementation |
|---|---|
| **Auth** | `requirepass` / ACL user; never unauthenticated Redis |
| **TLS** | Internal Docker network: `redis://` is OK. If cross-host ever required: `rediss://` + stunnel or Redis 6+ TLS |
| **Network** | No public port publish; only `adnexus-api` (+ future worker) on Coolify internal network |
| **Secrets** | `REDIS_PASSWORD` in Coolify secrets; compose URL at runtime |
| **Env shape** | `REDIS_URL=redis://:PASSWORD@adnexus-redis:6379/0` (DB `0` = queues+cache+pubsub; DB `1` optional for dev isolation) |
| **Key prefix** | Optional `REDIS_KEY_PREFIX=adnexus:` for shared-instance safety (not implemented in code yet — add in `lib/redis.ts`) |
| **Memory** | `maxmemory 256mb` preview / `512mb` prod, `allkeys-lru` |
| **Persistence** | AOF `appendonly yes`; nightly RDB copy off-box for prod |

---

## Migration path

### Phase 0 — Today (no `REDIS_URL`)

- API runs; rate limits and OAuth use per-process memory.
- Background jobs disabled; morning brief not scheduled.
- `/ready` → `redis: not_configured`.

### Phase 1 — Preview (VPS Coolify)

1. Create Coolify Redis service `adnexus-redis` on VPS destination.
2. Set `REDIS_URL` on `adnexus-api` (and PR preview template if supported).
3. Verify `/ready` → `redis: ok`; logs show `Redis connected`.
4. Enable morning brief scheduler; smoke-test OAuth round-trip on PR preview.
5. Document rollback: unset `REDIS_URL` → graceful degrade (no deploy of Redis removal needed for emergency).

### Phase 2 — Wire remaining workers

1. Add `workers/index.ts` bootstrap called from `index.ts` when `isRedisAvailable()` (single entry point).
2. Lazy-import workers (avoid `rule-evaluator.ts` throw-at-import).
3. Feature-flag heavy workers: `WORKERS_ENABLED=true` default off in preview until tested.

### Phase 3 — Prod hardening

1. Increase memory limit; enable backup cron.
2. Add Grafana alert: Redis memory > 80%, connected_clients spike.
3. Optional: split `adnexus-worker` Coolify app (same `REDIS_URL`, runs BullMQ consumers only).
4. Update `HANDOFF.md` / `V1_LAUNCH_READINESS.md` — remove Upstash references.

### Graceful degrade vs hard requirement

| Feature | Degrade? |
|---|---|
| Rate limiting | Yes — in-memory |
| OAuth nonce | Partial — works single-instance; **needs Redis for multi-replica** |
| Cache | Yes — miss to DB |
| SSE cross-pod | No — single instance only without Redis |
| BullMQ workers | **Hard** — jobs don't run |
| Webhook retry queue | **Hard** when webhook service enabled |

---

## Acceptance criteria (Linear)

See child issue under SB-3098 for tracked work items.

---

## References

- `apps/api/src/lib/redis.ts` — singleton client
- `apps/api/src/config/index.ts` — `REDIS_URL` optional
- `docs/SELF_HOSTING.md` — compose Redis example
- `docs/V1_LAUNCH_READINESS.md` — env checklist
- `HANDOFF.md` — legacy Upstash mention (to update)
