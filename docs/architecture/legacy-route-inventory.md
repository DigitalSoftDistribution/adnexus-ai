# Legacy Route Inventory

**Last Updated:** 2026-05-30
**Source:** `apps/api/src/routes/`

## Route Files by Size (descending)

| # | File | Lines | V2 Status | Priority | Dependencies | Complexity |
|---|------|-------|-----------|----------|-------------|------------|
| 1 | `drafts.ts` | 1,676 | DONE | -- | DraftEngine, DraftValidator, ChangeApplier, NotificationDispatcher | Very High - multi-step draft lifecycle with validation, approval workflow, execution, rollback |
| 2 | `reports.ts` | 1,029 | DONE | -- | chart-service, pdf-service, export-service, data-aggregation-service | High - aggregation queries, chart generation, PDF export, scheduling |
| 3 | `agent.ts` | 1,017 | TODO | LOW | ai-engine, ai-service, openai | Very High - AI agent orchestration, conversation state, tool execution |
| 4 | `audiences.ts` | 1,002 | DONE | -- | meta-api, google-api | High - platform audience sync, segmentation |
| 5 | `auth.ts` | 932 | KEEP V1 | -- | supabase (auth), stripe | Medium - Supabase Auth integration, JWT, session management |
| 6 | `settings.ts` | 891 | DONE | -- | stripe, slack, notification-service | Medium - workspace settings, team management, integrations |
| 7 | `campaigns.ts` | 830 | DONE | -- | meta-api, google-api, tiktok-api, snap-api | High - multi-platform campaign CRUD, metrics sync |
| 8 | `alerts.ts` | 808 | DONE | -- | cache-service, notification-service | Medium - alert evaluation, threshold checking |
| 9 | `ads.ts` | 659 | DONE | -- | meta-api, google-api, tiktok-api, snap-api | High - ad CRUD, creative management, fatigue detection |
| 10 | `webhooks-config.ts` | 636 | PARTIAL | MEDIUM | webhook-handler, notification-service | Medium - webhook CRUD, test delivery, payload signing |
| 11 | `upload.ts` | 612 | TODO | MEDIUM | supabase (storage), file processing | Medium - file upload, image processing, storage |
| 12 | `admin.ts` | 442 | KEEP V1 | -- | supabase (admin), stripe | Low - admin dashboard, user management |
| 13 | `audit-log.ts` | 427 | TODO | MEDIUM | supabase | Low - read-only audit log queries |
| 14 | `notifications.ts` | 391 | DONE | -- | notification-service, email-service | Low - notification list, mark read |
| 15 | `webhooks.ts` | 317 | KEEP V1 | -- | meta-api, google-api, tiktok-api, snap-api | Medium - platform webhook verification and processing |
| 16 | `auth/meta.ts` | 302 | KEEP V1 | -- | meta-api, supabase (auth) | Low - Meta OAuth flow |
| 17 | `billing.ts` | 259 | DONE | -- | stripe, supabase | Low - Stripe checkout, portal, webhooks |
| 18 | `exports.ts` | 269 | TODO | MEDIUM | export-service, pdf-service, xlsx | Medium - data export in multiple formats |
| 19 | `api-keys.ts` | 251 | PARTIAL | MEDIUM | crypto (hashing) | Low - API key CRUD, hash generation |
| 20 | `comments.ts` | 244 | TODO | MEDIUM | supabase | Low - threaded comments with mentions |
| 21 | `search.ts` | 241 | DONE | -- | search-service | Low - full-text search |
| 22 | `auth/google.ts` | 170 | KEEP V1 | -- | google-api, supabase (auth) | Low - Google OAuth flow |
| 23 | `public-audit.ts` | 189 | KEEP V1 | -- | supabase | Low - public audit endpoint |
| 24 | `goals.ts` | 68 | TODO | HIGH | (minimal) | Low - simple CRUD, easy migration |

## Migration Priority Rationale

### HIGH Priority (migrate first)
- **`goals.ts`** (68 lines) - Smallest route, simple CRUD, low risk migration to validate the pattern
- **`ad-accounts`** - Critical for multi-platform connectivity, no v2 route exists yet

### MEDIUM Priority (next batch)
- **`webhooks-config.ts`** (636 lines) - v2 exists but incomplete; extend existing v2 routes
- **`upload.ts`** (612 lines) - Depends on IFileStorageService port being implemented
- **`audit-log.ts`** (427 lines) - Read-heavy, straightforward queries, good candidate
- **`exports.ts`** (269 lines) - Depends on export-service abstraction
- **`api-keys.ts`** (251 lines) - Partially migrated via settings routes
- **`comments.ts`** (244 lines) - Threading queries, needs comment repository

### LOW Priority (defer)
- **`agent.ts`** (1,017 lines) - Complex AI orchestration, no clear v2 equivalent yet

### KEEP V1 (no migration planned)
- **`auth.ts`**, **`auth/meta.ts`**, **`auth/google.ts`** - OAuth flows tied to Supabase Auth
- **`webhooks.ts`** - Platform webhook receivers, stateless
- **`public-audit.ts`** - Public endpoint with shared token auth
- **`admin.ts`** - Admin-only operations, separate auth context

## Total: 24 files, 13,065 lines (excludes blank lines and imports)
