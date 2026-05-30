# V2 Migration Status

**Last Updated:** 2026-05-30

The API has two routing layers: v1 Legacy (`src/routes/`, 24 files, 13,662 lines) and v2 Clean Architecture (`src/interface/http/routes/`, 12 files).

## Fully Migrated

| v1 Route | Lines | v2 Equivalent |
|----------|-------|---------------|
| `campaigns.ts` | 830 | `routes/campaigns.ts` |
| `drafts.ts` | 1,676 | `routes/drafts.ts` |
| `ads.ts` | 659 | `routes/ads.ts` |
| `billing.ts` | 259 | `routes/billing.ts` |
| `settings.ts` | 891 | `routes/settings.ts` |
| `audiences.ts` | 1,002 | `routes/audiences.ts` |
| `reports.ts` | 1,029 | `routes/reports.ts` |
| `alerts.ts` | 808 | `routes/alerts.ts` |
| `search.ts` | 241 | `routes/search.ts` |
| `notifications.ts` | 391 | `routes/notifications.ts` |

## Partially Migrated

| v1 Route | Lines | v2 Equivalent | Gap |
|----------|-------|---------------|-----|
| `webhooks-config.ts` | 636 | `routes/webhooks.ts` | v2 has list+create only |
| `api-keys.ts` | 251 | `routes/settings.ts` | v2 has list+create+revoke via settings |

## Not Started

| v1 Route | Lines | Priority | Notes |
|----------|-------|----------|-------|
| `goals.ts` | 68 | HIGH | Small file, easy migration |
| `audit-log.ts` | 427 | MEDIUM | Read-heavy, needs v2 route |
| `comments.ts` | 244 | MEDIUM | Draft comment threading |
| `exports.ts` | 269 | MEDIUM | Export service |
| `upload.ts` | 612 | MEDIUM | File storage |
| `agent.ts` | 1,017 | LOW | AI agent, complex |
| `ad-accounts` | -- | HIGH | New standalone v2 route [NEW] |

## Keep v1

| v1 Route | Lines | Reason |
|----------|-------|--------|
| `auth.ts` | 932 | Supabase Auth + JWT |
| `auth/meta.ts` | 302 | Meta OAuth callback |
| `auth/google.ts` | 170 | Google OAuth callback |
| `webhooks.ts` | 317 | Platform webhook receivers |
| `public-audit.ts` | 189 | Public audit endpoint |
| `admin.ts` | 442 | Admin-only operations |

## V2 Route Map

- `/api/v2/auth` -> createAuthRoutes()
- `/api/v2/campaigns` -> createCampaignRoutes(container)
- `/api/v2/drafts` -> createDraftRoutes(container)
- `/api/v2/billing` -> createBillingRoutes(container)
- `/api/v2/ads` -> createAdRoutes(container)
- `/api/v2/settings` -> createSettingsRoutes(container)
- `/api/v2/audiences` -> createAudienceRoutes(container)
- `/api/v2/reports` -> createReportRoutes(container)
- `/api/v2/alerts` -> createAlertRoutes(container)
- `/api/v2/search` -> createSearchRoutes(container)
- `/api/v2/notifications` -> createNotificationRoutes(container)
- `/api/v2/webhooks` -> createWebhookRoutes(container)
- `/api/v2/ad-accounts` -> createAdAccountRoutes(container) [NEW]
- `/api/v2/events` -> SSE handler (realtime)
- `/api/v2/openapi.json` -> OpenAPI spec
- `/api/v2/docs` -> Scalar API reference
