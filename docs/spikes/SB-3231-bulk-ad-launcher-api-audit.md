# SB-3231 Spike — Bulk Ad Launcher API Audit

**Linear:** [SB-3231](https://linear.app/softblaze/issue/SB-3231/v2-bulk-ad-launcher-with-pre-flight-validation-multi-ad-set-deploy)  
**Branch:** `spike/sb-3231-bulk-ad-launcher-2026-06-11`  
**Status:** Spike only — audit doc, no implementation

## Goal

Map what a **Bulk Ad Launcher** (multi-ad-set deploy with pre-flight validation) needs against today's v2 Clean Architecture surface (`mountV2Routes`). Competitor reference: Birch/Revealbot bulk launch workflows.

## Bulk launcher user story (target)

1. User selects a campaign + multiple ad sets (or creates new ones).
2. User uploads/selects N creative variants (image/video + copy matrix).
3. **Pre-flight** runs: policy warnings, size/placement mismatches, naming collisions, budget caps.
4. System creates a **draft batch** (never live) — approve once, execute to Meta.

## mountV2 inventory (relevant today)

| Domain | Routes | Bulk-launcher relevance |
|--------|--------|-------------------------|
| Campaigns | `GET/POST /campaigns`, `POST /:id/duplicate`, pause/activate | ✅ target campaign selection |
| Ad sets | `GET/POST /ad-sets`, CRUD | ✅ per-set targeting; nested under campaign in UI |
| Ads | `GET /ads`, `GET /:id`, `PUT /:id`, `POST /:id/duplicate`, performance endpoints | ⚠️ read + duplicate only — **no create** |
| Assets | `GET/POST /assets` | ✅ creative library upload |
| Drafts | `GET/POST /drafts`, approve/reject/**execute** | ⚠️ single-draft lifecycle; no batch id |
| Integrations | connect/sync/mock-traffic | ✅ account context |

## Gap matrix

| Need | mountV2 today | Gap |
|------|---------------|-----|
| List ad sets for campaign | `GET /campaigns/:id` + ad set list | ✅ (via ad-sets route) |
| List creatives/assets | `GET /assets`, `GET /ads` | ✅ read only |
| Create single ad | — | ❌ no `POST /ads` |
| Batch create ads | — | ❌ no bulk route |
| Pre-flight validation | — | ❌ no validate endpoint |
| Draft batch approve/execute | single `/:id/approve`, `/:id/execute` | ⚠️ N sequential calls; no atomic batch |
| Meta ad + AdCreative create | `meta-api.ts`: campaign CRUD + insights only | ❌ no `createMetaAd` / AdCreative |
| Platform write | `MetaPlatformWriteService`: pause/resume only | ❌ no structural writes |

## Recommended v2 additions (implementation — not this spike)

| Route | Purpose |
|-------|---------|
| `POST /api/v2/ads/bulk/validate` | Run pre-flight checks; return warnings/errors per row |
| `POST /api/v2/ads/bulk` | Create draft batch (`source: bulk_launcher`) — never live |
| `POST /api/v2/drafts/bulk/approve` | Approve batch atomically |
| `POST /api/v2/drafts/bulk/execute` | Execute approved batch via platform write layer |

Extend `MetaPlatformWriteService` (or new `MetaAdWriteService`) with:

- `createAdCreative` → `POST /{ad-account-id}/adcreatives`
- `createAd` → `POST /{ad-account-id}/ads`

WireMock-first: bulk execute should hit sandbox before live Meta (same pattern as draft execute).

## Dependencies

| Blocker | Issue track |
|---------|-------------|
| Draft execute for ad create | Existing drafts flow — extend payload types |
| Meta structural writes | SB-3226 OAuth + platform write expansion |
| Worker/queue for long batches | SB-3218 worker host (optional async execute) |

## Verification (spike)

This PR adds documentation only. No runtime changes. Reviewers confirm gap matrix matches `apps/api/src/interface/http/routes/*.ts` and `meta-api.ts` exports.
