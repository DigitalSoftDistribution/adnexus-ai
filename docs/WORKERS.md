# Background workers — env flags & enablement

Workers are **default-off**. The API process starts a worker only when the master switch and the per-worker flag are both `true`, plus `REDIS_URL` is set and Redis is ready.

## Coolify env vars (`adnexus-api`)

| Variable | Required for worker | Default | Purpose |
|---|---|---|---|
| `REDIS_URL` | **Yes** | unset | BullMQ connection (`redis://…` or `rediss://…`) |
| `BACKGROUND_JOBS_ENABLED` | **Yes** | `false` | Master switch for gated background workers |
| `BACKGROUND_METRICS_SYNC_ENABLED` | metrics-sync | `false` | Starts BullMQ `metrics-sync` queue consumer on API boot |
| `BACKGROUND_EVALUATE_RULES_ENABLED` | evaluate-rules | `false` | Rule evaluation worker (separate SB; not wired at boot yet) |

### Enable metrics-sync only (Phase 2 partial — SB-3240)

```bash
coolify env-set adnexus-api REDIS_URL 'redis://<host>:6379'
coolify env-set adnexus-api BACKGROUND_JOBS_ENABLED true
coolify env-set adnexus-api BACKGROUND_METRICS_SYNC_ENABLED true
coolify deploy adnexus-api --force   # once after all vars saved
```

**Rollback:** unset `BACKGROUND_METRICS_SYNC_ENABLED` (or set to `false`) and redeploy — the API skips worker startup without crashing.

### Verify after deploy

```bash
API=https://adnexus-api.apps.softblaze.net
curl -sS "$API/ready" | python3 -m json.tool
# Expected when REDIS_URL is set and reachable: "redis": "ok"
```

Check Coolify build/runtime logs for `Metrics sync worker started` or a disabled reason (`BACKGROUND_JOBS_ENABLED is not true`, `Redis is not ready`, etc.).

## Worker modules

| Worker | Module | Boot wiring |
|---|---|---|
| Metrics sync | `apps/api/src/workers/metrics-sync.ts` | `startMetricsSyncWorker()` from `apps/api/src/index.ts` when flags enabled |
| Evaluate rules | `apps/api/src/workers/evaluate-rules.ts` | `startEvaluateRulesWorker()` — gated internally; boot wiring pending |
| Morning brief | `apps/api/src/workers/morning-brief.ts` | Legacy: starts when Redis is available (PR #79 central scheduler pending) |

See also: [`docs/redis-self-host-plan.md`](./redis-self-host-plan.md), [`qa/V1-LAUNCH-CHECKLIST.md`](../qa/V1-LAUNCH-CHECKLIST.md).
