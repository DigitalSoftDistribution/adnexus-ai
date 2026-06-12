# SB-3230 Spike — Creative Explorer UI

**Linear:** [SB-3230](https://linear.app/softblaze/issue/SB-3230/v2-creative-explorer-ui-fatiguedowntrend-ad-templates-with-draft-first)  
**Branch:** `spike/sb-3230-creative-explorer-2026-06-11`  
**Status:** Spike only — not production-ready

## Goal

Prove the data path from the existing **detect-fatigue worker** output to a dashboard **Creative Explorer** skeleton, without building full refresh/draft workflows.

## What already exists

| Layer | Artifact | Notes |
|-------|----------|-------|
| Worker | `apps/api/src/workers/detect-fatigue.ts` | BullMQ job `detect-fatigue`; composite score from CTR/frequency/CVR trends; writes alerts + AI refresh recs + drafts on critical. Still `@ts-nocheck` — depends on Prisma models not wired in production worker host. |
| DB | `ads.fatigue_score`, `ads.fatigue_status` | Populated by worker (target) and morning-brief heuristics (today). |
| v2 API | `GET /api/v2/ads` | Returns `fatigueScore` + `fatigueStatus` per ad via `AdRepository`. |
| v2 API | `GET /api/v2/ads/:id/creative-performance` | Trend + fatigue analysis envelope for detail drawer. |
| v2 API | `GET /api/v2/drafts` | Draft-first actions for refresh variants (worker creates `source: ai_fatigue_recommendation`). |
| Realtime | Redis pub `workspace:{id}:fatigue` + `GET /api/v2/events` SSE | Worker publishes `creative.fatigue.detected` / `creative.fatigue.summary`; UI not subscribed yet. |

## Spike scaffold (this PR)

- Route: `/dashboard/creatives` → `CreativeExplorerSkeleton`
- Fetches `GET /api/v2/ads?status=active&limit=100`, sorts by `fatigueScore` desc
- Renders fatigue badge + placeholder “Create refresh draft” CTA (disabled — full flow tracked in SB-3230)
- Nav entry under **Workspace** (`nav-config.ts`)

## Wiring diagram

```mermaid
flowchart LR
  W[detect-fatigue worker] --> DB[(ads.fatigue_* + alerts)]
  W --> R[Redis workspace:fatigue]
  DB --> API[GET /api/v2/ads]
  API --> UI[Creative Explorer skeleton]
  R -.future.-> SSE[/api/v2/events]
  SSE -.future.-> UI
  UI --> D[GET /api/v2/drafts]
```

## Gaps for full feature (out of spike)

1. Port worker off Prisma → Supabase/Drizzle (same track as SB-3218 worker port).
2. Workspace-level list endpoint with fatigue filters (`?fatigueStatus=warning,critical`) — today client-side filter only.
3. Detail panel using `creative-performance` + trend charts.
4. Draft-first actions: approve worker-generated drafts, manual refresh wizard.
5. i18n keys across 6 locales; remove hardcoded spike banner copy.
6. E2E: seed fatigued ads → explorer shows sorted list → navigate to draft.

## Recommended implementation slices

| Slice | Effort | Depends on |
|-------|--------|------------|
| A. Production worker + nightly fatigue scores | M | SB-3218 worker host |
| B. Explorer list + filters (this spike → prod) | S | A optional (seed data OK) |
| C. Detail drawer + SSE live updates | M | A |
| D. Draft refresh actions | M | drafts execute path for ad create |

## Verification (spike)

1. Open `/dashboard/creatives` on preview with authenticated session.
2. Confirm ads load from `/api/v2/ads` and fatigue badges render when `fatigueScore > 0`.
3. No new API routes required for spike.
