# AdNexus AI — Comprehensive V2 API & Architecture Plan

> ⚠️ **SUPERSEDED (2026-06-02) for status accuracy.** The "✅ COMPLETE / Migrated"
> markers below are *aspirational*. As verified during the testing pass:
> the v2 Clean Architecture layer (`createServer.ts`, ~110 use-cases, 19 route
> groups) is **built but NOT served** — `apps/api/src/index.ts` mounts v1 only and
> never imports `createServer.ts`. Treat this file as the v2 *design spec*, and
> read [docs/PATH_TO_V1.md](docs/PATH_TO_V1.md) +
> [docs/architecture/test-coverage-matrix.md](docs/architecture/test-coverage-matrix.md)
> for the real status and the prioritized path to v1.
>
> **Version:** 2.0.0-draft  
> **Date:** 2026-05-29  
> **Status:** Design spec (v2 not yet wired into the running server — see PATH_TO_V1)  
> **Branch:** `main` (`feat/v2-redesign` fully merged)

---

## 1. Executive Summary

The AdNexus AI platform currently has **~166 v1 API endpoints** spread across 24 route files using a legacy Express pattern. The v2 Clean Architecture layer has only **3 route files** with ~8 endpoints. This plan defines the complete v2 migration strategy: which routes to migrate, which to consolidate, and which new capabilities to add.

### Current State
| Layer | Route Files | Endpoints | Architecture | Notes |
|-------|------------|-----------|--------------|-------|
| v1 (legacy) | 24 | ~166 | Express handlers, direct DB access | Full feature coverage |
| v2 (clean) | 3 | ~8 | Domain → Application → Infrastructure → Interface | Only campaigns + drafts |
| Web (Next.js) | 15 pages | 15 routes | App Router, dashboard-focused | 6 are placeholders |

### Target State
| Layer | Route Files | Endpoints | Architecture |
|-------|------------|-----------|--------------|
| v2 (clean) | 18 | ~140 | Full Clean Architecture + OpenAPI |
| v1 (legacy) | 6 | ~26 | Auth, webhooks, OAuth (stable, low-change) |
| Web (Next.js) | 22+ pages | 22+ routes | Complete feature coverage |

---

## 2. V2 Route Architecture

### 2.1 Design Principles

1. **Resource-oriented URLs** — `/api/v2/{resource}/{id}/{sub-resource}`
2. **Consistent response envelope** — `{ success: boolean, data?: T, error?: { code, message, details } }`
3. **Typed controllers** — `asyncHandler<AuthenticatedRequest>` for all authenticated routes
4. **Zod validation** — Request/response schemas with OpenAPI generation
5. **RBAC middleware** — `requireRole('owner', 'admin', 'editor', 'viewer')`
6. **Audit logging** — Every mutating operation logged via `IAuditLogger`
7. **Event-driven** — Domain events published via `IEventBus`

### 2.2 Folder Structure

```
apps/api/src/interface/http/routes/
├── index.ts              # Route registry, mounts all v2 routes
├── auth.ts               # Authentication (v1 proxy during migration)
├── campaigns.ts          # Campaign CRUD + summary + sync
├── drafts.ts             # AI draft proposals + approval flow
├── ads.ts                # Ad sets + ads under campaigns
├── audiences.ts          # Audience segments + targeting
├── reports.ts            # Performance reports + analytics
├── alerts.ts             # Alert rules + notifications
├── billing.ts            # Subscriptions + invoices + usage
├── settings.ts           # Workspace + user settings
├── webhooks.ts           # Incoming platform webhooks
├── integrations.ts       # OAuth + platform connections
├── search.ts             # Global search + filtering
├── audit-log.ts          # Audit trail
├── admin.ts              # Admin operations
├── goals.ts              # Campaign goals + tracking
├── comments.ts           # Draft/campaign comments
├── uploads.ts            # File uploads + assets
├── notifications.ts      # In-app notifications
└── exports.ts            # Data exports (CSV, PDF, XLSX)
```

---

## 3. Route-by-Route V2 Specification

### 3.1 Authentication (`/api/v2/auth`)

**Migration Strategy:** Proxy to v1 auth during transition. v1 auth is stable and battle-tested.

| Method | Path | Description | Auth | V1 Equivalent |
|--------|------|-------------|------|---------------|
| POST | `/auth/signup` | Create account + workspace | Public | `POST /api/v1/auth/signup` |
| POST | `/auth/signin` | Email/password login | Public | `POST /api/v1/auth/signin` |
| POST | `/auth/refresh` | Refresh access token | Public | `POST /api/v1/auth/refresh` |
| POST | `/auth/signout` | Revoke session | Bearer | `POST /api/v1/auth/signout` |
| POST | `/auth/reset-password` | Request password reset | Public | `POST /api/v1/auth/reset-password` |
| POST | `/auth/change-password` | Change password | Bearer | `POST /api/v1/auth/change-password` |
| POST | `/auth/invite` | Invite team member | Bearer | `POST /api/v1/auth/invite` |
| POST | `/auth/accept-invite` | Accept invitation | Public | `POST /api/v1/auth/accept-invite` |
| GET | `/auth/me` | Current user profile | Bearer | `GET /api/v1/auth/me` |
| GET | `/auth/meta` | Meta OAuth URL | Public | `GET /api/v1/auth/meta` |
| GET | `/auth/meta/callback` | Meta OAuth callback | Public | `GET /api/v1/auth/meta/callback` |
| GET | `/auth/google` | Google OAuth URL | Public | `GET /api/v1/auth/google` |
| GET | `/auth/google/callback` | Google OAuth callback | Public | `GET /api/v1/auth/google/callback` |

**New Endpoints:**
| POST | `/auth/mfa/enable` | Enable TOTP MFA | Bearer | NEW |
| POST | `/auth/mfa/verify` | Verify TOTP code | Bearer | NEW |
| POST | `/auth/sessions` | List active sessions | Bearer | NEW |
| DELETE | `/auth/sessions/:id` | Revoke session | Bearer | NEW |

---

### 3.2 Campaigns (`/api/v2/campaigns`)

**Migration Priority:** HIGH — Core feature, already partially migrated.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/campaigns` | List campaigns (paginated, filterable) | viewer+ | ✅ Migrated |
| GET | `/campaigns/summary` | Dashboard KPI summary | viewer+ | ✅ Migrated |
| GET | `/campaigns/:id` | Get single campaign | viewer+ | ✅ Migrated |
| POST | `/campaigns` | Create campaign | editor+ | ✅ Migrated |
| PUT | `/campaigns/:id` | Update campaign | editor+ | ✅ Migrated |
| DELETE | `/campaigns/:id` | Archive/delete campaign | admin+ | ✅ Migrated |
| POST | `/campaigns/:id/pause` | Pause campaign | editor+ | ✅ Migrated |
| POST | `/campaigns/:id/activate` | Activate campaign | editor+ | ✅ Migrated |
| POST | `/campaigns/:id/duplicate` | Duplicate campaign | editor+ | ✅ Migrated |
| GET | `/campaigns/:id/insights` | Campaign performance data | viewer+ | ✅ Migrated |
| GET | `/campaigns/:id/history` | Change history | viewer+ | ✅ Migrated |
| POST | `/campaigns/:id/sync` | Force platform sync | editor+ | ✅ Migrated |

**Use Cases Needed:**
- ✅ `UpdateCampaignUseCase`
- ✅ `DeleteCampaignUseCase`
- ✅ `PauseCampaignUseCase`
- ✅ `ActivateCampaignUseCase`
- ✅ `DuplicateCampaignUseCase`
- 🔄 `GetCampaignInsightsUseCase`
- 🔄 `GetCampaignHistoryUseCase`
- 🔄 `SyncCampaignUseCase`

---

### 3.3 Ads (`/api/v2/ads`)

**Migration Priority:** HIGH — Required for campaign detail pages.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/campaigns/:campaignId/adsets` | List ad sets | viewer+ | ✅ Migrated |
| GET | `/adsets/:id` | Get ad set | viewer+ | ✅ Migrated |
| PUT | `/adsets/:id` | Update ad set | editor+ | ✅ Migrated |
| POST | `/adsets` | Create ad set | editor+ | ✅ Migrated |
| DELETE | `/adsets/:id` | Delete ad set | admin+ | ✅ Migrated |
| GET | `/adsets/:adsetId/ads` | List ads | viewer+ | ✅ Migrated |
| GET | `/ads/:id` | Get ad creative | viewer+ | ✅ Migrated |
| PUT | `/ads/:id` | Update ad | editor+ | 🔄 TODO |
| POST | `/ads/:id/duplicate` | Duplicate ad | editor+ | 🔄 TODO |

---

### 3.4 Drafts (`/api/v2/drafts`)

**Migration Priority:** HIGH — AI Agent core feature.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/drafts` | List drafts (paginated) | viewer+ | ✅ Migrated |
| GET | `/drafts/:id` | Get draft details | viewer+ | ✅ Migrated |
| POST | `/drafts` | Create draft (AI or manual) | editor+ | ✅ Migrated |
| POST | `/drafts/:id/approve` | Approve draft | admin+ | ✅ Migrated |
| POST | `/drafts/:id/reject` | Reject draft | admin+ | ✅ Migrated |
| POST | `/drafts/:id/execute` | Execute approved draft | editor+ | ✅ Migrated |
| GET | `/drafts/:id/comments` | Get draft comments | viewer+ | ✅ Migrated |
| POST | `/drafts/:id/comments` | Add comment | viewer+ | ✅ Migrated |
| DELETE | `/drafts/:id/comments/:commentId` | Delete comment | admin+ | ✅ Migrated |

**Use Cases Needed:**
- ✅ `GetDraftByIdUseCase`
- ✅ `RejectDraftUseCase`
- ✅ `ExecuteDraftUseCase`
- 🔄 `ListDraftCommentsUseCase`
- 🔄 `AddDraftCommentUseCase`
- 🔄 `DeleteDraftCommentUseCase`

---

### 3.5 AI Agent (`/api/v2/agent`)

**Migration Priority:** MEDIUM — Complex, v1 is functional.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/agent/status` | Agent health + status | viewer+ | ✅ Migrated |
| GET | `/agent/recommendations` | AI recommendations | viewer+ | 🔄 Proxy to v1 |
| POST | `/agent/recommendations/:id/apply` | Apply recommendation | editor+ | 🔄 Proxy to v1 |
| POST | `/agent/recommendations/:id/dismiss` | Dismiss recommendation | editor+ | 🔄 Proxy to v1 |
| GET | `/agent/conversations` | Chat history | viewer+ | 🔄 Proxy to v1 |
| POST | `/agent/conversations` | Start new conversation | viewer+ | 🔄 Proxy to v1 |
| GET | `/agent/conversations/:id` | Get conversation | viewer+ | 🔄 Proxy to v1 |
| POST | `/agent/conversations/:id/messages` | Send message | viewer+ | 🔄 Proxy to v1 |
| GET | `/agent/insights` | AI-generated insights | viewer+ | 🔄 Proxy to v1 |
| POST | `/agent/rules` | Create automation rule | editor+ | ✅ Migrated |
| GET | `/agent/rules` | List automation rules | viewer+ | ✅ Migrated |
| PUT | `/agent/rules/:id` | Update rule | editor+ | ✅ Migrated |
| DELETE | `/agent/rules/:id` | Delete rule | editor+ | ✅ Migrated |
| POST | `/agent/rules/:id/toggle` | Enable/disable rule | editor+ | ✅ Migrated |
| GET | `/agent/rules/:id/history` | Rule execution history | viewer+ | 🔄 Proxy to v1 |

---

### 3.6 Audiences (`/api/v2/audiences`)

**Migration Priority:** MEDIUM — Frontend page exists.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/audiences` | List audiences | viewer+ | ✅ Migrated |
| GET | `/audiences/:id` | Get audience details | viewer+ | ✅ Migrated |
| POST | `/audiences` | Create audience | editor+ | ✅ Migrated |
| PUT | `/audiences/:id` | Update audience | editor+ | ✅ Migrated |
| DELETE | `/audiences/:id` | Delete audience | admin+ | ✅ Migrated |
| GET | `/audiences/:id/insights` | Audience performance | viewer+ | ✅ Migrated |
| POST | `/audiences/:id/duplicate` | Duplicate audience | editor+ | 🔄 TODO |
| GET | `/audiences/:id/sync` | Sync with platform | editor+ | 🔄 TODO |

---

### 3.7 Reports (`/api/v2/reports`)

**Migration Priority:** MEDIUM — Frontend page exists.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/reports` | List saved reports | viewer+ | ✅ Migrated |
| GET | `/reports/:id` | Get report | viewer+ | ✅ Migrated |
| POST | `/reports` | Create report | editor+ | ✅ Migrated |
| PUT | `/reports/:id` | Update report | editor+ | ✅ Migrated |
| DELETE | `/reports/:id` | Delete report | admin+ | ✅ Migrated |
| POST | `/reports/:id/run` | Run report | viewer+ | ✅ Migrated |
| GET | `/reports/:id/results` | Get report results | viewer+ | 🔄 TODO |
| POST | `/reports/scheduled` | Create scheduled report | editor+ | 🔄 TODO |
| GET | `/reports/scheduled` | List scheduled reports | viewer+ | 🔄 TODO |
| DELETE | `/reports/scheduled/:id` | Cancel scheduled | admin+ | 🔄 TODO |

---

### 3.8 Alerts (`/api/v2/alerts`)

**Migration Priority:** MEDIUM — Frontend page exists.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/alerts` | List alerts | viewer+ | ✅ Migrated |
| GET | `/alerts/:id` | Get alert | viewer+ | ✅ Migrated |
| POST | `/alerts` | Create alert rule | editor+ | ✅ Migrated |
| PUT | `/alerts/:id` | Update alert | editor+ | ✅ Migrated |
| DELETE | `/alerts/:id` | Delete alert | admin+ | ✅ Migrated |
| POST | `/alerts/:id/toggle` | Enable/disable | editor+ | ✅ Migrated |
| POST | `/alerts/:id/test` | Test alert | editor+ | 🔄 TODO |
| GET | `/alerts/:id/history` | Alert history | viewer+ | ✅ Migrated |
| GET | `/alerts/:id/stats` | Alert statistics | viewer+ | 🔄 TODO |

---

### 3.9 Billing (`/api/v2/billing`)

**Migration Priority:** HIGH — Required for plan upgrades/downgrades.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/billing` | Current plan + usage | viewer+ | ✅ Migrated |
| POST | `/billing/checkout` | Create checkout session | owner | ✅ Migrated |
| POST | `/billing/portal` | Customer portal | owner | ✅ Migrated |
| GET | `/billing/invoices` | List invoices | viewer+ | ✅ Migrated |
| GET | `/billing/usage` | Detailed usage | viewer+ | 🔄 TODO |
| POST | `/billing/upgrade` | Upgrade plan | owner | 🔄 TODO |
| POST | `/billing/downgrade` | Downgrade plan | owner | 🔄 TODO |
| POST | `/billing/cancel` | Cancel subscription | owner | ✅ Migrated |
| GET | `/billing/plans` | Available plans | Public | 🔄 TODO |
| POST | `/billing/webhook` | Stripe webhook | Public | v1 only |

---

### 3.10 Settings (`/api/v2/settings`)

**Migration Priority:** MEDIUM — Frontend page exists.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/settings/workspace` | Workspace settings | viewer+ | ✅ Migrated |
| PUT | `/settings/workspace` | Update workspace | admin+ | ✅ Migrated |
| GET | `/settings/profile` | User profile | viewer+ | 🔄 TODO |
| PUT | `/settings/profile` | Update profile | viewer+ | 🔄 TODO |
| GET | `/settings/team` | Team members | viewer+ | ✅ Migrated |
| POST | `/settings/team` | Add member | admin+ | 🔄 TODO |
| PUT | `/settings/team/:id` | Update member role | admin+ | ✅ Migrated |
| DELETE | `/settings/team/:id` | Remove member | admin+ | ✅ Migrated |
| GET | `/settings/notifications` | Notification prefs | viewer+ | ✅ Migrated |
| PUT | `/settings/notifications` | Update prefs | viewer+ | ✅ Migrated |
| GET | `/settings/integrations` | Connected platforms | viewer+ | ✅ Migrated |
| POST | `/settings/integrations/:platform` | Connect platform | admin+ | 🔄 TODO |
| DELETE | `/settings/integrations/:platform` | Disconnect | admin+ | 🔄 TODO |
| GET | `/settings/api-keys` | API keys | admin+ | ✅ Migrated |
| POST | `/settings/api-keys` | Create API key | admin+ | ✅ Migrated |
| DELETE | `/settings/api-keys/:id` | Revoke API key | admin+ | ✅ Migrated |

---

### 3.11 Integrations (`/api/v2/integrations`)

**Migration Priority:** LOW — v1 works, mostly OAuth flows.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/integrations` | List integrations | viewer+ | ✅ Migrated |
| GET | `/integrations/:platform` | Platform status | viewer+ | 🔄 TODO |
| POST | `/integrations/:platform/connect` | Initiate connect | admin+ | 🔄 TODO |
| POST | `/integrations/:platform/disconnect` | Disconnect | admin+ | 🔄 TODO |
| GET | `/integrations/:platform/accounts` | Ad accounts | viewer+ | ✅ Migrated |
| POST | `/integrations/:platform/accounts/:id/select` | Select account | admin+ | 🔄 TODO |
| GET | `/integrations/:platform/health` | Health check | viewer+ | 🔄 TODO |

---

### 3.12 Webhooks (`/api/v2/webhooks`)

**Migration Priority:** LOW — Keep v1, stable inbound webhooks.

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| POST | `/webhooks/meta` | Meta platform webhook | Signature | v1 |
| POST | `/webhooks/google` | Google Ads webhook | Signature | v1 |
| POST | `/webhooks/tiktok` | TikTok webhook | Signature | v1 |
| POST | `/webhooks/snap` | Snap webhook | Signature | v1 |
| GET | `/webhooks/config` | List webhook configs | Bearer | ✅ Migrated |
| POST | `/webhooks/config` | Create config | admin+ | ✅ Migrated |
| PUT | `/webhooks/config/:id` | Update config | admin+ | 🔄 TODO |
| DELETE | `/webhooks/config/:id` | Delete config | admin+ | 🔄 TODO |
| POST | `/webhooks/config/:id/test` | Test webhook | admin+ | 🔄 TODO |
| GET | `/webhooks/deliveries` | Delivery history | admin+ | 🔄 TODO |

---

### 3.13 Search (`/api/v2/search`)

**Migration Priority:** LOW — v1 functional.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/search` | Global search | viewer+ | ✅ Migrated |
| GET | `/search/campaigns` | Campaign search | viewer+ | 🔄 TODO |
| GET | `/search/audiences` | Audience search | viewer+ | 🔄 TODO |
| GET | `/search/reports` | Report search | viewer+ | 🔄 TODO |
| GET | `/search/suggestions` | Autocomplete | viewer+ | ✅ Migrated |
| GET | `/search/recent` | Recent searches | viewer+ | 🔄 TODO |
| POST | `/search/recent` | Save search | viewer+ | 🔄 TODO |
| DELETE | `/search/recent/:id` | Remove search | viewer+ | 🔄 TODO |
| GET | `/search/filters` | Available filters | viewer+ | 🔄 TODO |

---

### 3.14 Audit Log (`/api/v2/audit-log`)

**Migration Priority:** LOW — v1 functional, read-heavy.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/audit-log` | List audit entries | viewer+ | ✅ Migrated |
| GET | `/audit-log/:id` | Get entry | viewer+ | 🔄 TODO |
| GET | `/audit-log/export` | Export audit log | admin+ | 🔄 TODO |
| GET | `/audit-log/summary` | Activity summary | admin+ | ✅ Migrated |

---

### 3.15 Admin (`/api/v2/admin`)

**Migration Priority:** LOW — Internal use only.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/admin/stats` | Platform stats | admin | 🔄 TODO |
| GET | `/admin/users` | List all users | admin | 🔄 TODO |
| GET | `/admin/workspaces` | List workspaces | admin | 🔄 TODO |
| GET | `/admin/errors` | Error log | admin | 🔄 TODO |
| GET | `/admin/api-usage` | API usage stats | admin | 🔄 TODO |
| GET | `/admin/feature-flags` | Feature flags | admin | 🔄 TODO |
| POST | `/admin/feature-flags` | Update flag | admin | 🔄 TODO |

---

### 3.16 Notifications (`/api/v2/notifications`)

**Migration Priority:** MEDIUM — Frontend page exists.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/notifications` | List notifications | viewer+ | ✅ Migrated |
| POST | `/notifications/:id/read` | Mark as read | viewer+ | ✅ Migrated |
| POST | `/notifications/read-all` | Mark all read | viewer+ | ✅ Migrated |

---

### 3.16 Goals (`/api/v2/goals`)

**Migration Priority:** LOW — v1 functional.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/goals` | List goals | viewer+ | ✅ Migrated |
| POST | `/goals` | Create goal | editor+ | ✅ Migrated |
| GET | `/goals/:id` | Get goal | viewer+ | ✅ Migrated |
| PUT | `/goals/:id` | Update goal | editor+ | ✅ Migrated |
| DELETE | `/goals/:id` | Delete goal | admin+ | ✅ Migrated |
| GET | `/goals/:id/progress` | Goal progress | viewer+ | ✅ Migrated |

---

### 3.17 Comments (`/api/v2/comments`)

**Migration Priority:** LOW — v1 functional.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| GET | `/comments` | List comments | viewer+ | 🔄 TODO |
| POST | `/comments` | Create comment | viewer+ | 🔄 TODO |
| GET | `/comments/:id` | Get comment | viewer+ | 🔄 TODO |
| DELETE | `/comments/:id` | Delete comment | admin+ | 🔄 TODO |

---

### 3.18 Uploads (`/api/v2/uploads`)

**Migration Priority:** LOW — v1 functional.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| POST | `/uploads` | Upload file | editor+ | 🔄 TODO |
| GET | `/uploads` | List uploads | viewer+ | 🔄 TODO |
| GET | `/uploads/:id` | Get upload | viewer+ | 🔄 TODO |
| DELETE | `/uploads/:id` | Delete upload | admin+ | 🔄 TODO |
| PATCH | `/uploads/:id` | Update metadata | editor+ | 🔄 TODO |

---

### 3.19 Notifications (`/api/v2/notifications`)

**Migration Priority:** LOW — v1 functional. (Merged into section 3.16 above)

---

### 3.20 Exports (`/api/v2/exports`)

**Migration Priority:** LOW — v1 functional.

| Method | Path | Description | Roles | Status |
|--------|------|-------------|-------|--------|
| POST | `/exports` | Create export | viewer+ | ✅ Migrated |
| GET | `/exports` | List exports | viewer+ | ✅ Migrated |
| GET | `/exports/:id` | Get export status | viewer+ | ✅ Migrated |
| GET | `/exports/:id/download` | Download file | viewer+ | 🔄 TODO |
| DELETE | `/exports/:id` | Cancel/delete | viewer+ | ✅ Migrated |

---

## 4. Implementation Phases

### Phase 1: Foundation (Week 1) — ✅ COMPLETE
- [x] Fix remaining type errors (MetaPlatformClient, realtime, openapi)
- [x] Complete Container DI wiring for all use cases
- [x] Add missing domain repositories (IAdRepository, IAudienceRepository, etc.)
- [x] Set up v2 route mounting in `createServer.ts`
- [x] Add `GET /campaigns/:id` endpoint
- [x] Add `GET /drafts` endpoint

### Phase 2: Core Features (Week 2-3) — ✅ COMPLETE
- [x] Migrate all Campaign endpoints (PUT, DELETE, pause, activate, duplicate)
- [x] Migrate all Draft endpoints (GET/:id, reject, execute)
- [x] Migrate Ad endpoints (list, get by id, performance)
- [x] Migrate Billing endpoints (info, checkout, portal, invoices, cancel)
- [x] Migrate Settings endpoints (workspace, team, notifications, integrations, api-keys)

### Phase 3: Supporting Features (Week 4) — ✅ COMPLETE
- [x] Migrate Audience endpoints (list, get, create, update, delete, insights)
- [x] Migrate Report endpoints (list, get, create, update, delete, run)
- [x] Migrate Alert endpoints (list, get, create, update, delete, toggle, history)
- [x] Migrate Search endpoints (global search, suggestions)
- [x] Migrate Notification endpoints (list, mark read, mark all read)
- [x] Migrate Webhook endpoints (list configs, create config)

### Phase 4: Advanced Features (Week 5) — ✅ COMPLETE
- [x] Migrate AI Agent endpoints to v2 (rules CRUD + status)
- [x] Migrate Audit Log endpoints (list + summary)
- [x] Migrate Goals endpoints
- [x] Migrate Draft Comments endpoints
- [x] Campaign insights, history, sync
- [x] Ad set management (CRUD)
- [x] Migrate Exports endpoints
- [x] Asset management (uploads)
- [x] Admin panel endpoints (stats, users, workspaces, impersonate)
- [ ] Full ad creative management (update, duplicate) — proxy to v1

### Phase 5: Polish (Week 6) — ✅ COMPLETE
- [x] Frontend wiring: audiences, alerts, reports → v2 APIs
- [x] Campaign detail: ad sets tab + history tab → v2 APIs
- [x] Error handling on dashboard
- [x] OpenAPI spec completeness (all v2 endpoints documented)
- [x] Rate limiting per endpoint (Redis-backed sliding window)
- [x] Caching layer (Redis) — campaign list, insights
- [x] Performance optimization (cache + rate limit headers)
- [ ] Load testing — future work

---

## 5. Domain Model Expansion

### New Entities Needed

```typescript
// domain/entities/AdSet.ts
export interface AdSet {
  id: string;
  campaignId: string;
  platformAdSetId: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  budget: number;
  bidStrategy: string;
  targeting: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// domain/entities/Ad.ts
export interface Ad {
  id: string;
  adSetId: string;
  platformAdId: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  creativeType: 'image' | 'video' | 'carousel' | 'collection';
  creativeUrl?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  createdAt: Date;
  updatedAt: Date;
}

// domain/entities/Audience.ts
export interface Audience {
  id: string;
  workspaceId: string;
  platform: Platform;
  platformAudienceId: string;
  name: string;
  type: 'custom' | 'lookalike' | 'saved' | 'retargeting';
  size?: number;
  targeting: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// domain/entities/Report.ts
export interface Report {
  id: string;
  workspaceId: string;
  name: string;
  type: 'performance' | 'attribution' | 'creative' | 'custom';
  config: Record<string, unknown>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// domain/entities/Alert.ts
export interface Alert {
  id: string;
  workspaceId: string;
  name: string;
  type: 'budget' | 'performance' | 'anomaly' | 'opportunity';
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// domain/entities/Goal.ts
export interface Goal {
  id: string;
  workspaceId: string;
  campaignId?: string;
  name: string;
  metric: 'roas' | 'cpa' | 'conversions' | 'spend' | 'ctr';
  target: number;
  deadline?: Date;
  status: 'active' | 'achieved' | 'missed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. Frontend Route Alignment

### Current Web Pages (15)

| Route | Feature | V2 API Needed |
|-------|---------|---------------|
| `/` | Landing | None |
| `/auth/signin` | Sign in | `POST /auth/signin` |
| `/auth/signup` | Sign up | `POST /auth/signup` |
| `/dashboard` | Dashboard | `GET /campaigns/summary` |
| `/dashboard/campaigns` | Campaign list | `GET /campaigns` |
| `/dashboard/campaigns/[id]` | Campaign detail | `GET /campaigns/:id`, `GET /campaigns/:id/insights` |
| `/dashboard/drafts` | Drafts | `GET /drafts` |
| `/dashboard/ai-agent` | AI Agent | `GET /agent/*` |
| `/dashboard/audiences` | Audiences | `GET /audiences` |
| `/dashboard/reports` | Reports | `GET /reports` |
| `/dashboard/alerts` | Alerts | `GET /alerts` |
| `/dashboard/billing` | Billing | `GET /billing` |
| `/dashboard/settings` | Settings | `GET /settings/*` |
| `/dashboard/integrations` | Integrations | `GET /integrations` |
| `/dashboard/webhooks` | Webhooks | `GET /webhooks/config` |

### Missing Web Pages (should add)

| Route | Feature | Priority |
|-------|---------|----------|
| `/dashboard/campaigns/[id]/adsets` | Ad set management | HIGH |
| `/dashboard/campaigns/[id]/ads` | Ad creative management | HIGH |
| `/dashboard/campaigns/[id]/history` | Campaign history | MEDIUM |
| `/dashboard/drafts/[id]` | Draft detail | HIGH |
| `/dashboard/reports/[id]` | Report detail | MEDIUM |
| `/dashboard/reports/new` | Create report | MEDIUM |
| `/dashboard/audiences/[id]` | Audience detail | MEDIUM |
| `/dashboard/audiences/new` | Create audience | MEDIUM |
| `/dashboard/alerts/[id]` | Alert detail | LOW |
| `/dashboard/alerts/new` | Create alert | LOW |
| `/dashboard/goals` | Goals tracking | LOW |
| `/dashboard/team` | Team management | MEDIUM |
| `/dashboard/api-keys` | API key management | LOW |
| `/dashboard/notifications` | Notification center | LOW |
| `/dashboard/exports` | Data exports | LOW |
| `/dashboard/search` | Global search | LOW |
| `/dashboard/audit-log` | Audit trail | LOW |

---

## 7. Technical Decisions

### 7.1 Keep v1 For
- **Stripe webhooks** — Must remain stable, signature verification
- **Meta/Google OAuth callbacks** — Complex flow, low change frequency
- **Platform webhooks** (Meta, Google, TikTok, Snap) — Signature-based, security-critical
- **Auth endpoints** — Battle-tested, high security requirements

### 7.2 Migrate to v2
- All CRUD operations on business entities (campaigns, drafts, audiences, reports, alerts)
- All dashboard data endpoints (summary, insights, analytics)
- All user-facing configuration (settings, billing, team)
- All AI Agent interactions

### 7.3 New in v2
- **Batch operations** — `POST /campaigns/batch-update`, `POST /campaigns/batch-delete`
- **Real-time subscriptions** — WebSocket events for live updates
- **Advanced filtering** — `GET /campaigns?filter=status:active,platform:meta`
- **Field selection** — `GET /campaigns?fields=id,name,status,spend`
- **Cursor pagination** — Replace offset with cursor for large datasets
- **Rate limit headers** — `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **ETag support** — Conditional requests for caching
- **Bulk exports** — Async export jobs with webhook notification

---

## 8. Testing Strategy

### Unit Tests (per use case)
- Happy path
- Validation errors
- Permission denied
- Not found
- Repository failure
- Event bus failure

### Integration Tests (per route)
- Authentication required
- RBAC enforcement
- Request validation
- Response shape
- Error handling
- Rate limiting

### E2E Tests (critical flows)
- Sign up → Create workspace → Connect Meta → Create campaign
- AI generates draft → Approve draft → Campaign updated
- Upgrade plan → Billing webhook → Credits updated
- Alert triggered → Notification sent → User views alert

---

## 9. Monitoring & Observability

### Metrics
- Request count by endpoint
- Response time P50/P95/P99
- Error rate by endpoint
- Rate limit hits
- Cache hit/miss ratio

### Logging
- Structured JSON logs
- Request ID propagation
- Sensitive data redaction
- Performance timing

### Alerting
- Error rate > 1%
- P95 latency > 500ms
- 5xx rate > 0.1%
- Rate limit exhaustion

---

## 10. Appendix: Complete Endpoint Count

| Feature Area | v1 Endpoints | v2 Target | v2 Done | Remaining |
|--------------|-------------|-----------|---------|-----------|
| Auth | ~13 | 16 | 0 | 16 |
| Campaigns | ~11 | 12 | 3 | 9 |
| Ads | ~9 | 7 | 0 | 7 |
| Drafts | ~8 | 9 | 2 | 7 |
| AI Agent | ~16 | 15 | 0 | 15 |
| Audiences | ~5 | 8 | 0 | 8 |
| Reports | ~13 | 10 | 0 | 10 |
| Alerts | ~9 | 9 | 0 | 9 |
| Billing | ~6 | 10 | 0 | 10 |
| Settings | ~14 | 15 | 0 | 15 |
| Integrations | ~7 | 7 | 0 | 7 |
| Webhooks | ~6 | 10 | 0 | 10 |
| Search | ~9 | 9 | 0 | 9 |
| Audit Log | ~4 | 4 | 0 | 4 |
| Admin | ~6 | 7 | 0 | 7 |
| Goals | ~5 | 6 | 0 | 6 |
| Comments | ~3 | 4 | 0 | 4 |
| Uploads | ~5 | 5 | 0 | 5 |
| Notifications | ~8 | 8 | 0 | 8 |
| Exports | ~9 | 5 | 0 | 5 |
| **TOTAL** | **~166** | **~176** | **5** | **~171** |

---

---

## 11. Research Findings (2026-05-29)

### 11.1 v1 API Route Catalog

**24 legacy route files** under `apps/api/src/routes/`:

| File | Mount | Endpoints | Notes |
|------|-------|-----------|-------|
| `auth.ts` | `/api/v1/auth` | 9 | signup, signin, refresh, me, reset-password, change-password, invite, accept-invite, signout |
| `auth/meta.ts` | `/api/v1/auth/meta` | 3 | Meta OAuth connect, callback, disconnect |
| `auth/google.ts` | `/api/v1/auth/google` | 2 | Google OAuth connect, callback |
| `campaigns.ts` | `/api/v1/campaigns` | 10 | list, summary, detail, create, update, delete, pause, resume, duplicate, insights |
| `ads.ts` | `/api/v1/ads` | 9 | list, detail, create, update, pause, resume, duplicate, performance, creative-performance |
| `drafts.ts` | `/api/v1/drafts` | 8 | list, stats, detail, create, approve, reject, cancel, schedule |
| `agent.ts` | `/api/v1/agent` | 16 | status, rules CRUD, toggle, logs, insights, recommendations, execute, creative-fatigue, pause, resume, morning-brief, run-now |
| `reports.ts` | `/api/v1/reports` | 13 | templates, dashboard, generate, scheduled CRUD, saved CRUD, export, cross-platform, funnel |
| `audiences.ts` | `/api/v1/audiences` | 5 | list, detail, performance, overlap, suggestions |
| `settings.ts` | `/api/v1/settings` | 14 | workspace CRUD, accounts, team CRUD, billing, notifications, AI settings |
| `notifications.ts` | `/api/v1/notifications` | 8 | inbox, unread-count, mark read, read-all, delete, preferences, test |
| `billing.ts` | `/api/v1/billing` | 5 | plan, checkout, portal, webhook, invoices |
| `goals.ts` | `/api/v1/goals` | 5 | CRUD + progress |
| `exports.ts` | `/api/v1/exports` | 9 | CSV, XLSX, PDF, streaming, queued jobs |
| `search.ts` | `/api/v1/search` | 9 | global, campaigns, adsets, ads, drafts, audit, suggestions, recent |
| `webhooks.ts` | `/api/v1/webhooks` | 7 | inbound receivers (meta, google, tiktok, snap, custom, register, verification) |
| `webhooks-config.ts` | `/api/v1/webhooks` | 6 | config CRUD, test, deliveries |
| `audit-log.ts` | `/api/v1/audit-log` | 4 | list, detail, export, stats |
| `admin.ts` | `/api/v1/admin` | 7 | stats, users, workspaces, errors, api-usage, feature-flags |
| `api-keys.ts` | `/api/v1/api-keys` | 4 | list, create, revoke, stats |
| `comments.ts` | `/api/v1/comments` | 3 | draft comments, create, delete |
| `upload.ts` | `/api/v1/upload` | 5 | upload, list, detail, delete, patch |
| `alerts.ts` | `/api/v1/alerts` | 9 | CRUD, toggle, test, history, stats |
| `public-audit.ts` | `/api/v1/public` | 1 | unauthenticated audit endpoint |

**Known v1 Issues:**
- `/api/v1/reports/cross-platform` and `/funnel` declared AFTER `/:id` — may be shadowed
- `/api/v1/audiences/overlap` and `/suggestions` declared AFTER `/:id` — may be shadowed
- `/api/v1/webhooks` mount collision: receiver routes (before auth) vs config routes (after auth)
- `/api/v1/comments/comments/:id` has redundant path segment
- `/api/v1/upload/upload` and `/uploads` have repeated wording

### 11.2 Web App Route Catalog

**15 page.tsx files** under `apps/web/app/`:

| Route | File | Status | API Calls |
|-------|------|--------|-----------|
| `/` | `app/page.tsx` | redirect to /dashboard | — |
| `/auth/signin` | `app/auth/signin/page.tsx` | active | `POST /api/v1/auth/signin` |
| `/auth/signup` | `app/auth/signup/page.tsx` | active | `POST /api/v1/auth/signup` |
| `/dashboard` | `app/dashboard/page.tsx` | active | `GET /api/v2/campaigns/summary` |
| `/dashboard/campaigns` | `app/dashboard/campaigns/page.tsx` | active | `GET /api/v2/campaigns` |
| `/dashboard/campaigns/[id]` | `app/dashboard/campaigns/[id]/page.tsx` | active | `GET /api/v2/campaigns/:id` |
| `/dashboard/ai-agent` | `app/dashboard/ai-agent/page.tsx` | active (mock) | `GET /api/v1/agent/*` |
| `/dashboard/drafts` | `app/dashboard/drafts/page.tsx` | active | `GET /api/v2/drafts` |
| `/dashboard/reports` | `app/dashboard/reports/page.tsx` | placeholder | — |
| `/dashboard/audiences` | `app/dashboard/audiences/page.tsx` | placeholder | — |
| `/dashboard/alerts` | `app/dashboard/alerts/page.tsx` | placeholder | — |
| `/dashboard/billing` | `app/dashboard/billing/page.tsx` | placeholder | — |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | placeholder | — |
| `/dashboard/integrations` | `app/dashboard/integrations/page.tsx` | active (static) | NOT in sidebar nav |
| `/dashboard/webhooks` | `app/dashboard/webhooks/page.tsx` | placeholder | NOT in sidebar nav |

**Missing Pages (referenced but not built):**
- `/dashboard/campaigns/new` — linked from CampaignsContent "New Campaign" button

**Sidebar Navigation (9 items):**
Dashboard, Campaigns, AI Agent, Drafts, Reports, Audiences, Alerts, Billing, Settings

**Hidden Routes (2 pages exist but not in sidebar):**
Integrations, Webhooks

### 11.3 Build Health Status

| Check | Status | Details |
|-------|--------|---------|
| API typecheck | PASS | 0 errors |
| Web typecheck | PASS | 0 errors |
| Web ESLint | PASS | 0 errors, 0 warnings |
| API ESLint | TBD | Configured, needs verification |

---

*This plan is a living document. Update as implementation progresses.*
