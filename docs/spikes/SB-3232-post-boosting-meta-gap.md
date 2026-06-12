# SB-3232 Spike — Post Boosting Meta API Gap

**Linear:** [SB-3232](https://linear.app/softblaze/issue/SB-3232/v2-organic-post-to-ad-boosting-rules-igfb-engagement-triggers)  
**Branch:** `spike/sb-3232-post-boosting-2026-06-11`  
**Status:** Spike only — gap analysis, no implementation

## Goal

Document the gap between AdNexus today and **organic post-to-ad boosting** (IG/FB engagement triggers). Competitor reference: Birch post boosting on engagement thresholds.

## Target product behavior

1. Monitor organic Page/IG posts for engagement signals (likes, shares, saves, comment velocity).
2. When a rule fires (e.g. ER > 5% in 24h), create a **draft ad** that boosts the post (`object_story_id` / IG media id).
3. User approves draft → execute publishes boost ad to selected ad account.

## AdNexus today

| Capability | Status | Location |
|------------|--------|----------|
| Meta OAuth | `ads_read`, `ads_management`, `business_management` only | `apps/api/src/routes/auth/meta.ts` |
| Fetch organic posts | ❌ | — |
| Page/IG insights | ❌ | — |
| Boost post → ad | ❌ | — |
| Automation rules | ✅ `creative_fatigue` trigger type | agent rules API |
| Draft-first publish | ✅ approve → execute | `apps/api/src/interface/http/routes/drafts.ts` |
| Meta campaign writes | pause/resume only | `MetaPlatformWriteService` |

## Meta API requirements (missing)

| Capability | Meta Graph API | Notes |
|------------|----------------|-------|
| List Page posts | `GET /{page-id}/posts` | Needs `pages_read_engagement`, `pages_show_list` |
| List IG media | `GET /{ig-user-id}/media` | Needs `instagram_basic`, `instagram_manage_insights` |
| Post insights | `GET /{post-id}/insights` | Engagement rate for rule triggers |
| Create boost ad | `POST /{ad-account-id}/ads` with `object_story_id` or `source_instagram_media_id` | Same structural gap as SB-3231 |
| AdCreative from post | `POST /{ad-account-id}/adcreatives` with `object_story_spec` | Not implemented |

## OAuth scope gap

Current `REQUIRED_SCOPES`:

```
ads_read, ads_management, business_management
```

Post boosting additionally requires (minimum):

```
pages_read_engagement, pages_show_list, instagram_basic, instagram_manage_insights
```

**Blocker:** SB-3226 / SB-3234 Meta OAuth setup must prove extended scopes before any organic fetch in production.

## Rule engine gap

Existing automation supports `creative_fatigue` on ad metrics. Post boosting needs:

| New piece | Description |
|-----------|-------------|
| Trigger type | `organic_post_boost` — evaluates Page/IG insights on schedule |
| Worker | Poll organic posts + insights (BullMQ, Redis-backed) |
| Draft payload | `{ type: 'post_boost', objectStoryId, adAccountId, budget, targeting }` |
| Execute path | Reuse draft execute → new Meta ad create (SB-3231 dependency) |

## Recommended implementation slices

| Slice | Effort | Depends on |
|-------|--------|------------|
| A. Extended OAuth scopes + token storage | M | SB-3234 |
| B. Organic post fetch + cache | M | A |
| C. Insights polling worker | M | B |
| D. Rule trigger + draft creation | S | C + drafts |
| E. Meta ad create on execute | M | SB-3231 platform writes |

## Deferral note

Without organic insights scopes verified in App Review, post boosting should remain **draft-only + WireMock sandbox**. Do not ship live boost execute until SB-3234 completes scope audit.

## Verification (spike)

This PR adds documentation only. Reviewers confirm OAuth scopes and Meta API references against current `meta.ts` and `MetaPlatformWriteService`.
