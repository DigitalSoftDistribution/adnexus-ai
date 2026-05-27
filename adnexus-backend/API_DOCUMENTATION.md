# AdNexus AI — API Documentation v1.0

> **Base URL:** `https://api.adnexus.ai/api/v1`  
> **Current Version:** `1.0.0`  
> **Authentication:** JWT Bearer Token  
> **Content-Type:** `application/json` (unless noted)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Campaigns](#2-campaigns)
3. [Drafts](#3-drafts)
4. [AI Agent](#4-ai-agent)
5. [Reports](#5-reports)
6. [Audiences](#6-audiences)
7. [Goals](#7-goals)
8. [Settings](#8-settings)
9. [Notifications](#9-notifications)
10. [Billing](#10-billing)
11. [Webhooks](#11-webhooks)
12. [Search](#12-search)
13. [Exports](#13-exports)
14. [Real-Time (SSE)](#14-real-time-sse)
15. [Health & Observability](#15-health--observability)
16. [Error Reference](#16-error-reference)
17. [Common Patterns](#17-common-patterns)

---

## Global Headers

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Rate Limits

| Plan | Requests/minute |
|------|----------------|
| Free | 60 |
| Pro | 300 |
| Premium | 1000 |
| Agency | 5000 |

---

## 1. Authentication

All auth endpoints are **public** (no `Authorization` header required).

---

### POST /auth/signup

Register a new user account with an initial workspace.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/signup` |
| **Auth Required** | No |

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePass123",
  "name": "Jane Doe"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | `string` | Yes | Valid email format |
| `password` | `string` | Yes | Min 8 characters |
| `name` | `string` | Yes | Min 1, max 100 characters |

#### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    },
    "workspace": {
      "id": "uuid",
      "name": "Jane Doe's Workspace",
      "slug": "jane-doe-1705312800000",
      "plan": "free",
      "owner_id": "uuid",
      "branding": {},
      "settings": {},
      "created_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid email format or password too short |
| `VALIDATION_ERROR` | 400 | Email already registered |

---

### POST /auth/signin

Authenticate an existing user and retrieve access tokens.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/signin` |
| **Auth Required** | No |

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePass123"
}
```

| Field | Type | Required |
|-------|------|----------|
| `email` | `string` | Yes |
| `password` | `string` | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": "uuid", "email": "user@example.com", "name": "Jane Doe" },
    "workspace": { "id": "uuid", "name": "Jane Doe's Workspace", "plan": "free" }
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid email or password |
| `UNAUTHORIZED` | 401 | No workspace found for user |

---

### POST /auth/refresh

Refresh an expired access token using a refresh token.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/refresh` |
| **Auth Required** | No |

#### Request Body

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...new_token..."
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired refresh token |
| `UNAUTHORIZED` | 401 | User no longer exists |

---

### POST /auth/forgot-password

Request a password reset link (returns reset token in development mode).

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/forgot-password` |
| **Auth Required** | No |

#### Request Body

```json
{
  "email": "user@example.com"
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a reset email has been sent",
    "reset_token": "eyJhbGciOiJIUzI1NiIs...dev_only..."
  }
}
```

> **Note:** `reset_token` is only included when `NODE_ENV=development`.

---

### POST /auth/reset-password

Reset password using a reset token.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/reset-password` |
| **Auth Required** | No |

#### Request Body

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "password": "newSecurePass456"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `token` | `string` | Yes | Reset token from forgot-password |
| `password` | `string` | Yes | Min 8 characters |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired reset token |

---

### GET /auth/me

Retrieve the current authenticated user's profile and workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/auth/me` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "name": "Jane Doe" },
    "workspace": { "id": "uuid", "name": "Jane Doe's Workspace", "plan": "free" }
  }
}
```

---

### POST /auth/signout

Sign out the current user (client-side token removal).

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/signout` |
| **Auth Required** | No |

#### Response `200 OK`

```json
{
  "success": true,
  "data": { "message": "Signed out" }
}
```

---

## 2. Campaigns

> **Auth Required:** Yes (all endpoints)

---

### GET /campaigns

List all campaigns for the current workspace with optional filters.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/campaigns` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `platform` | `string` | - | Filter by platform (`meta`, `google`, `tiktok`, `snap`) |
| `status` | `string` | - | Filter by status (`active`, `paused`, `draft`) |
| `page` | `integer` | `1` | Page number (min 1) |
| `limit` | `integer` | `20` | Items per page (min 1, max 100) |

#### Response `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ad_account_id": "uuid",
      "platform_campaign_id": "act_123456",
      "name": "Summer Sale 2024",
      "status": "active",
      "objective": "conversions",
      "daily_budget": 100.00,
      "spend": 2450.00,
      "impressions": 125000,
      "clicks": 3750,
      "ctr": 3.0,
      "conversions": 120,
      "cpa": 20.42,
      "roas": 4.5,
      "frequency": 1.8,
      "reach": 69444,
      "platform": "meta",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

---

### POST /campaigns

Create a new campaign draft. (All campaign creation goes through the approval workflow.)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/campaigns` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "ad_account_id": "uuid",
  "name": "Summer Sale 2024",
  "objective": "conversions",
  "daily_budget": 100,
  "status": "paused"
}
```

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `ad_account_id` | `string (uuid)` | Yes | - | Valid workspace ad account |
| `name` | `string` | Yes | - | Min 1, max 500 characters |
| `objective` | `string` | Yes | - | e.g., `conversions`, `awareness` |
| `daily_budget` | `number` | No | - | Must be positive |
| `status` | `string` | No | `paused` | One of: `active`, `paused`, `draft` |

#### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "platform": "meta",
    "draft_type": "campaign_create",
    "change_summary": "Create campaign \"Summer Sale 2024\"",
    "change_detail": { "name": "Summer Sale 2024", "objective": "conversions", "status": "paused" },
    "status": "pending",
    "actor_type": "user",
    "created_at": "2024-01-15T10:00:00Z"
  },
  "message": "Campaign creation drafted. Review and approve to go live."
}
```

---

### GET /campaigns/:id

Retrieve a single campaign by ID.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/campaigns/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Campaign ID |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ad_account_id": "uuid",
    "platform_campaign_id": "act_123456",
    "name": "Summer Sale 2024",
    "status": "active",
    "objective": "conversions",
    "daily_budget": 100.00,
    "spend": 2450.00,
    "impressions": 125000,
    "clicks": 3750,
    "ctr": 3.0,
    "conversions": 120,
    "cpa": 20.42,
    "roas": 4.5,
    "frequency": 1.8,
    "reach": 69444,
    "platform": "meta",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Campaign not found |

---

### PATCH /campaigns/:id

Update a campaign. (Creates a draft for approval — no direct live changes.)

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/campaigns/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Campaign ID |

#### Request Body

```json
{
  "name": "Summer Sale 2024 - Updated",
  "daily_budget": 150,
  "status": "active"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | `string` | No | New campaign name |
| `daily_budget` | `number` | No | Must be positive |
| `status` | `string` | No | `active`, `paused`, or `draft` |

> **Note:** At least one field must differ from the current value.

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "draft_type": "budget_change",
    "change_summary": "Update Summer Sale 2024: daily_budget",
    "change_detail": {
      "platform_campaign_id": "act_123456",
      "daily_budget": { "old": 100, "new": 150 }
    },
    "status": "pending"
  },
  "message": "Campaign update drafted. Review and approve to apply."
}
```

---

### GET /campaigns/:id/insights

Retrieve performance insights for a campaign over a date range.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/campaigns/:id/insights` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Campaign ID |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date_start` | `string` | 30 days ago | Start date (`YYYY-MM-DD`) |
| `date_end` | `string` | Today | End date (`YYYY-MM-DD`) |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "campaign_id": "uuid",
    "name": "Summer Sale 2024",
    "date_range": { "start": "2024-01-01", "end": "2024-01-30" },
    "spend": 2450.00,
    "impressions": 125000,
    "clicks": 3750,
    "ctr": 3.0,
    "conversions": 120,
    "cpa": 20.42,
    "roas": 4.5,
    "frequency": 1.8,
    "reach": 69444
  }
}
```

---

### GET /campaigns/summary

Get a summary of all campaigns by status and connected platforms.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/campaigns/summary` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "total_campaigns": 42,
    "by_status": { "active": 15, "paused": 20, "draft": 5, "error": 2 },
    "connected_platforms": ["meta", "google"]
  }
}
```

---

## 3. Drafts

> **Auth Required:** Yes (all endpoints)

The Drafts system is the core safety model of AdNexus. Every campaign change goes through a pending draft that must be approved before being applied to live ad accounts.

---

### GET /drafts

List all drafts for the workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/drafts` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `string` | - | Filter: `pending`, `approved`, `rejected`, `auto_applied`, `scheduled`, `error` |
| `platform` | `string` | - | Filter: `meta`, `google`, `tiktok`, `snap`, `all` |
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `50` | Items per page |

#### Response `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "platform": "meta",
      "campaign_id": "uuid",
      "campaign_name": "Summer Sale 2024",
      "draft_type": "budget_change",
      "change_summary": "Update Summer Sale 2024: daily_budget",
      "change_detail": { "daily_budget": { "old": 100, "new": 150 } },
      "ai_reasoning": "User-initiated budget increase",
      "impact_estimate": null,
      "status": "pending",
      "actor_type": "user",
      "actor_id": "uuid",
      "actor_name": "Jane Doe",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12
  }
}
```

---

### POST /drafts

Create a new draft change request manually.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/drafts` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "platform": "meta",
  "campaign_id": "uuid",
  "draft_type": "budget_change",
  "change_summary": "Increase budget for top performer",
  "change_detail": { "daily_budget": { "old": 100, "new": 150 } },
  "ai_reasoning": "ROAS above 4.0 warrants budget increase",
  "impact_estimate": "Estimated +32% conversions"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | `enum` | Yes | `meta`, `google`, `tiktok`, `snap`, `all` |
| `campaign_id` | `string (uuid)` | No | Target campaign ID |
| `draft_type` | `enum` | Yes | `budget_change`, `status_change`, `bid_adjustment`, `targeting_edit`, `creative_upload`, `campaign_create`, `campaign_duplicate`, `budget_reallocation`, `rule_based`, `audience_edit` |
| `change_summary` | `string` | Yes | Human-readable summary |
| `change_detail` | `object` | Yes | Structured change data |
| `ai_reasoning` | `string` | No | Explanation for the change |
| `impact_estimate` | `string` | No | Expected impact description |

#### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "draft_type": "budget_change",
    "change_summary": "Increase budget for top performer",
    "change_detail": { "daily_budget": { "old": 100, "new": 150 } },
    "actor_type": "user",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### GET /drafts/stats

Get draft statistics for the workspace (today's counts).

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/drafts/stats` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "pending": 5,
    "approved_today": 3,
    "rejected_today": 1,
    "auto_applied_today": 0
  }
}
```

---

### GET /drafts/:id

Retrieve a single draft by ID.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/drafts/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Draft ID |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "platform": "meta",
    "draft_type": "budget_change",
    "change_summary": "Increase budget for top performer",
    "change_detail": { "daily_budget": { "old": 100, "new": 150 } },
    "ai_reasoning": "ROAS above 4.0 warrants budget increase",
    "status": "pending",
    "actor_type": "user",
    "actor_id": "uuid",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Draft not found |

---

### POST /drafts/:id/approve

Approve a pending draft and apply the change to the live ad account.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/drafts/:id/approve` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Draft ID |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approver_id": "uuid",
    "executed_at": "2024-01-15T10:05:00Z",
    "resolved_at": "2024-01-15T10:05:00Z"
  },
  "message": "Draft approved and applied"
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Draft not found |
| `VALIDATION_ERROR` | 400 | Draft is not in `pending` status |

---

### POST /drafts/:id/reject

Reject a pending draft.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/drafts/:id/reject` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Draft ID |

#### Request Body

```json
{
  "reason": "Budget too high for this quarter"
}
```

| Field | Type | Required |
|-------|------|----------|
| `reason` | `string` | No |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "rejected",
    "approver_id": "uuid",
    "approval_note": "Budget too high for this quarter",
    "resolved_at": "2024-01-15T10:06:00Z"
  },
  "message": "Draft rejected"
}
```

---

### POST /drafts/:id/schedule

Schedule a pending draft for future execution.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/drafts/:id/schedule` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Draft ID |

#### Request Body

```json
{
  "execute_at": "2024-01-20T09:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `execute_at` | `string` | Yes | ISO 8601 datetime for scheduled execution |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "scheduled",
    "scheduled_at": "2024-01-20T09:00:00Z"
  },
  "message": "Draft scheduled"
}
```

---

## 4. AI Agent

> **Auth Required:** Yes (all endpoints)

The AI Agent provides automated rule-based campaign optimization. Rules run every 15 minutes.

---

### GET /agent/rules

List all automation rules for the workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/agent/rules` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "name": "Pause Low ROAS",
      "description": "Pause campaigns with ROAS below 1.0 after 3 days",
      "conditions": [
        { "metric": "roas", "operator": "lt", "value": 1.0 }
      ],
      "actions": [
        { "type": "pause", "params": {} }
      ],
      "platforms": ["meta", "google"],
      "status": "active",
      "applied_count": 12,
      "last_applied_at": "2024-01-14T08:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /agent/rules

Create a new automation rule.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/agent/rules` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "name": "Pause Low ROAS",
  "description": "Pause campaigns with ROAS below 1.0",
  "conditions": [
    { "metric": "roas", "operator": "lt", "value": 1.0 }
  ],
  "actions": [
    { "type": "pause", "params": {} }
  ],
  "platforms": ["meta", "google"],
  "status": "active"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | Yes | - | Rule name |
| `description` | `string` | No | - | Human-readable description |
| `conditions` | `array` | Yes | - | Array of `{ metric, operator, value }` |
| `actions` | `array` | Yes | - | Array of `{ type, params }` |
| `platforms` | `string[]` | No | `["meta"]` | Platforms to apply rule |
| `status` | `string` | No | `active` | `active` or `paused` |

#### Condition Operators

| Operator | Description |
|----------|-------------|
| `gt` | Greater than |
| `lt` | Less than |
| `eq` | Equal to |
| `gte` | Greater than or equal |
| `lte` | Less than or equal |
| `pct_change_gt` | Percentage change greater than |

#### Action Types

| Type | Description |
|------|-------------|
| `pause` | Pause campaign |
| `increase_budget` | Increase budget |
| `decrease_budget` | Decrease budget |
| `adjust_bid` | Adjust bid |
| `create_draft` | Create a draft |
| `notify` | Send notification |

#### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "Pause Low ROAS",
    "conditions": [{ "metric": "roas", "operator": "lt", "value": 1.0 }],
    "actions": [{ "type": "pause", "params": {} }],
    "platforms": ["meta", "google"],
    "status": "active",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### PATCH /agent/rules/:id

Update an automation rule.

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/agent/rules/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Rule ID |

#### Request Body

Partial update of any rule fields (same schema as POST).

```json
{
  "status": "paused",
  "name": "Pause Low ROAS (Updated)"
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Pause Low ROAS (Updated)",
    "status": "paused"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Rule not found |

---

### DELETE /agent/rules/:id

Delete an automation rule.

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/agent/rules/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Rule ID |

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Rule deleted"
}
```

---

### GET /agent/status

Get the current AI Agent operational status.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/agent/status` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "is_running": true,
    "check_interval_minutes": 15,
    "last_check": "2024-01-15T10:00:00Z",
    "next_check": "2024-01-15T10:15:00Z"
  }
}
```

---

### POST /agent/run-now

Manually trigger the AI Agent rule evaluation cycle.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/agent/run-now` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "triggered": 3,
    "drafts": 3
  },
  "message": "Evaluated rules: 3 triggered, 3 drafts created"
}
```

---

### GET /agent/optimizations

Get recent agent optimization actions from the audit log.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/agent/optimizations` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "actor_type": "ai",
      "action": "Draft created: Pause campaign with ROAS 0.8",
      "action_category": "agent_action",
      "campaign_id": "uuid",
      "details": { "rule_id": "uuid", "triggered_metric": "roas" },
      "source": "ai_agent",
      "created_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

---

## 5. Reports

> **Auth Required:** Yes (all endpoints)

---

### GET /reports/cross-platform

Aggregate performance metrics across all connected platforms.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/reports/cross-platform` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date_start` | `string` | 30 days ago | Start date (`YYYY-MM-DD`) |
| `date_end` | `string` | Today | End date (`YYYY-MM-DD`) |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "date_range": { "start": "2024-01-01", "end": "2024-01-30" },
    "platforms": [
      {
        "platform": "meta",
        "spend": 15000.00,
        "impressions": 750000,
        "clicks": 22500,
        "ctr": "3.00",
        "conversions": 720,
        "roas": "4.50",
        "cpa": "20.83"
      },
      {
        "platform": "google",
        "spend": 12000.00,
        "impressions": 600000,
        "clicks": 18000,
        "ctr": "3.00",
        "conversions": 600,
        "roas": "4.20",
        "cpa": "20.00"
      }
    ]
  }
}
```

---

### GET /reports/funnel

Get the conversion funnel from impressions to revenue.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/reports/funnel` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "stages": [
      { "name": "Impressions", "value": 1350000 },
      { "name": "Clicks", "value": 40500, "rate": "3.00%" },
      { "name": "Conversions", "value": 1320, "rate": "3.26%" },
      { "name": "Revenue", "value": "$94,500" }
    ]
  }
}
```

---

### GET /reports/scheduled

List scheduled reports for the workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/reports/scheduled` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "name": "Weekly Performance",
      "frequency": "weekly",
      "format": "pdf",
      "recipients": ["user@example.com"],
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 6. Audiences

> **Auth Required:** Yes (all endpoints)

---

### GET /audiences

List all audiences for the workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/audiences` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Women 25-34 US",
      "type": "custom",
      "platform": "meta",
      "size": "4.2M",
      "campaigns": 3,
      "status": "active"
    },
    {
      "id": "2",
      "name": "Cart Abandoners",
      "type": "retargeting",
      "platform": "meta",
      "size": "24K",
      "campaigns": 1,
      "status": "active"
    },
    {
      "id": "3",
      "name": "In-Market Fitness",
      "type": "interest",
      "platform": "google",
      "size": "8.5M",
      "campaigns": 1,
      "status": "active"
    }
  ]
}
```

---

### POST /audiences

Create a new audience definition.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/audiences` |
| **Auth Required** | Yes |

#### Request Body

Any valid audience properties object.

```json
{
  "name": "High-Value Customers",
  "type": "custom",
  "platform": "meta",
  "criteria": { "min_ltv": 500, "purchase_count": 2 }
}
```

#### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "new",
    "name": "High-Value Customers",
    "type": "custom",
    "platform": "meta",
    "criteria": { "min_ltv": 500, "purchase_count": 2 }
  }
}
```

---

### GET /audiences/:id

Get a single audience by ID. (Currently returns placeholder data.)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/audiences/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Audience ID |

#### Response `200 OK`

Returns audience object (same shape as list items).

---

### GET /audiences/:id/overlap

Get audience overlap analysis with other audiences.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/audiences/:id/overlap` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Audience ID |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "audience_id": "1",
    "audience_name": "Women 25-34 US",
    "overlaps": [
      {
        "audience_id": "2",
        "audience_name": "Cart Abandoners",
        "overlap_pct": 15.3,
        "overlap_size": "3.6K"
      }
    ]
  }
}
```

---

## 7. Goals

> **Auth Required:** Yes (all endpoints)

---

### GET /goals

List all performance goals for the workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/goals` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "name": "Q1 ROAS Target",
      "goal_type": "roas",
      "platform": "meta",
      "target_value": 4.0,
      "current_value": 3.8,
      "baseline_value": 2.5,
      "unit": "x",
      "start_date": "2024-01-01",
      "end_date": "2024-03-31",
      "status": "at_risk",
      "campaign_ids": ["uuid1", "uuid2"],
      "progress_pct": 95.0,
      "alert_when": "at_risk",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /goals

Create a new performance goal.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/goals` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "name": "Q1 ROAS Target",
  "goal_type": "roas",
  "platform": "meta",
  "target_value": 4.0,
  "baseline_value": 2.5,
  "unit": "x",
  "start_date": "2024-01-01",
  "end_date": "2024-03-31",
  "campaign_ids": ["uuid1", "uuid2"],
  "alert_when": "at_risk"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | Yes | - | Goal name |
| `goal_type` | `enum` | Yes | - | `roas`, `cpa`, `ctr`, `spend`, `conversions`, `custom` |
| `platform` | `string` | No | - | Platform filter |
| `target_value` | `number` | Yes | - | Target metric value |
| `baseline_value` | `number` | No | 0 | Starting value |
| `unit` | `string` | No | - | Unit label |
| `start_date` | `string` | Yes | - | Start date (`YYYY-MM-DD`) |
| `end_date` | `string` | Yes | - | End date (`YYYY-MM-DD`) |
| `campaign_ids` | `string[]` | No | - | Campaigns to track |
| `alert_when` | `enum` | No | `at_risk` | `at_risk`, `off_track`, `never` |

#### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Q1 ROAS Target",
    "goal_type": "roas",
    "target_value": 4.0,
    "current_value": 2.5,
    "status": "active",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### PATCH /goals/:id

Update a performance goal.

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/goals/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Goal ID |

#### Request Body

Partial update of any goal fields.

```json
{
  "target_value": 5.0,
  "status": "active"
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "target_value": 5.0,
    "status": "active"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Goal not found |

---

### DELETE /goals/:id

Delete a performance goal.

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/goals/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Goal ID |

#### Response `200 OK`

```json
{
  "success": true
}
```

---

### GET /goals/:id/progress

Get goal progress and status.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/goals/:id/progress` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Goal ID |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "goal": { "id": "uuid", "name": "Q1 ROAS Target", "target_value": 4.0, "current_value": 3.8 },
    "progress_pct": "95.0",
    "status": "on_track"
  }
}
```

#### Status Mapping

| Progress | Status |
|----------|--------|
| >= 100% | `completed` |
| >= 80% | `on_track` |
| >= 50% | `at_risk` |
| < 50% | `off_track` |

---

## 8. Settings

> **Auth Required:** Yes (all endpoints)

---

### GET /settings

Retrieve the current workspace settings.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/settings` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Jane Doe's Workspace",
    "slug": "jane-doe-1705312800000",
    "plan": "pro",
    "owner_id": "uuid",
    "branding": { "primary_color": "#6366F1" },
    "settings": { "timezone": "America/New_York", "currency": "USD" },
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### PATCH /settings

Update workspace settings.

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/settings` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "name": "Acme Corp Workspace",
  "settings": { "timezone": "America/Los_Angeles", "currency": "USD" }
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Acme Corp Workspace",
    "settings": { "timezone": "America/Los_Angeles", "currency": "USD" }
  }
}
```

---

### GET /settings/team

List all team members in the workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/settings/team` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "user_id": "uuid",
      "users": { "id": "uuid", "email": "owner@example.com", "name": "Jane Doe" },
      "role": "owner",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "user_id": "uuid",
      "users": { "id": "uuid", "email": "analyst@example.com", "name": "John Smith" },
      "role": "analyst",
      "created_at": "2024-01-10T00:00:00Z"
    }
  ]
}
```

---

### POST /settings/team/invite

Invite a new team member to the workspace.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/settings/team/invite` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "email": "newuser@example.com",
  "role": "analyst"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | Valid email |
| `role` | `enum` | Yes | `admin`, `analyst`, `viewer` |

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Invitation sent"
}
```

---

### DELETE /settings/team/:id

Remove a team member from the workspace.

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/settings/team/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Workspace member ID |

#### Response `200 OK`

```json
{
  "success": true
}
```

---

### GET /settings/integrations

List connected platform integrations.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/settings/integrations` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "ad_accounts": [
      { "platform": "meta", "name": "Meta Ads", "status": "active", "created_at": "2024-01-01T00:00:00Z" },
      { "platform": "google", "name": "Google Ads", "status": "active", "created_at": "2024-01-05T00:00:00Z" }
    ],
    "slack": { "connected": false }
  }
}
```

---

## 9. Notifications

> **Auth Required:** Yes (all endpoints)

---

### GET /notifications

List notifications for the current user in the workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/notifications` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `integer` | `50` | Max items to return |
| `offset` | `integer` | `0` | Pagination offset |
| `status` | `string` | `all` | `read`, `unread`, or `all` |
| `type` | `string` | - | Filter by notification type |

#### Notification Types

| Type | Description |
|------|-------------|
| `draft_approved` | A draft was approved |
| `draft_rejected` | A draft was rejected |
| `draft_pending` | New draft pending approval |
| `rule_triggered` | AI rule triggered a draft |
| `goal_at_risk` | Goal is at risk |
| `goal_off_track` | Goal is off track |
| `budget_alert` | Budget threshold reached |
| `team_invite` | New team invitation |
| `welcome` | Welcome message |
| `system` | System notification |

#### Response `200 OK`

```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "user_id": null,
      "type": "rule_triggered",
      "title": "AI Rule: Pause Low ROAS",
      "message": "Campaign 'Winter Sale' has ROAS 0.7. Draft created to pause.",
      "data": { "rule_id": "uuid", "campaign_id": "uuid" },
      "status": "unread",
      "read_at": null,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "unread_count": 3,
  "total": 15
}
```

---

### GET /notifications/unread-count

Get the count of unread notifications.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/notifications/unread-count` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "count": 3
}
```

---

### PATCH /notifications/:id/read

Mark a single notification as read.

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/notifications/:id/read` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Notification ID |

#### Response `200 OK`

```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "status": "read",
    "read_at": "2024-01-15T10:05:00Z"
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Notification not found |
| `FORBIDDEN` | 403 | Cannot mark another user's notification |

---

### PATCH /notifications/read-all

Mark all notifications as read.

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/notifications/read-all` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "updated": 3
}
```

---

### DELETE /notifications/:id

Delete a notification.

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/notifications/:id` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (uuid)` | Notification ID |

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

### GET /notifications/preferences

Get notification preferences.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/notifications/preferences` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "preferences": {
    "workspace_id": "uuid",
    "user_id": "uuid",
    "email": {
      "draft_approved": true,
      "draft_rejected": true,
      "rule_triggered": true,
      "goal_alert": true,
      "budget_alert": true,
      "daily_digest": true,
      "weekly_summary": false
    },
    "in_app": {
      "draft_approved": true,
      "draft_rejected": true,
      "rule_triggered": true,
      "goal_alert": true,
      "budget_alert": true,
      "daily_digest": true,
      "weekly_summary": false
    },
    "slack_channel": null,
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### PUT /notifications/preferences

Update notification preferences.

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Path** | `/api/v1/notifications/preferences` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "email": {
    "rule_triggered": false,
    "goal_alert": false
  },
  "in_app": {
    "weekly_summary": true
  },
  "slack_channel": "#ad-alerts"
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "preferences": {
    "workspace_id": "uuid",
    "user_id": "uuid",
    "email": {
      "draft_approved": true,
      "draft_rejected": true,
      "rule_triggered": false,
      "goal_alert": false,
      "budget_alert": true,
      "daily_digest": true,
      "weekly_summary": false
    },
    "in_app": {
      "draft_approved": true,
      "draft_rejected": true,
      "rule_triggered": true,
      "goal_alert": true,
      "budget_alert": true,
      "daily_digest": true,
      "weekly_summary": true
    },
    "slack_channel": "#ad-alerts",
    "updated_at": "2024-01-15T10:05:00Z"
  }
}
```

---

## 10. Billing

> **Auth Required:** Yes (all endpoints)

---

### GET /billing/subscription

Get the current subscription details and credit usage.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/billing/subscription` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "plan_name": "Pro",
    "price": 9900,
    "credits_used": 850,
    "credits_limit": 2000,
    "credits_remaining": 1150,
    "month": "2024-01"
  }
}
```

> **Note:** `price` is in cents (e.g., `9900` = $99.00).

#### Plans

| Plan | Price | Credits | Ad Accounts |
|------|-------|---------|-------------|
| Free | $0 | 100/month | 1 |
| Pro | $99/mo | 2,000/month | 5 |
| Premium | $299/mo | 10,000/month | 20 |
| Agency | $499/mo | 50,000/month | Unlimited |

---

### GET /billing/credits

Get detailed credit usage and breakdown.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/billing/credits` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `month` | `string` | Current month | `YYYY-MM` format |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "balance": {
      "month": "2024-01",
      "used": 850,
      "limit": 2000,
      "remaining": 1150
    },
    "by_feature": {
      "morning_brief": 40,
      "ai_chat_query": 30,
      "campaign_analysis": 100,
      "creative_generation": 150,
      "budget_optimization": 80
    },
    "log": [
      {
        "id": "uuid",
        "feature": "morning_brief",
        "action": "Generate morning brief",
        "platform": null,
        "credits_used": 8,
        "cost_estimate": 0.072,
        "created_at": "2024-01-15T08:00:00Z"
      }
    ]
  }
}
```

#### Credit Costs

| Feature | Credits |
|---------|---------|
| `morning_brief` | 8 |
| `ai_chat_query` | 3 |
| `creative_generation` | 15 |
| `campaign_analysis` | 10 |
| `anomaly_detection` | 12 |
| `report_generation` | 10 |
| `budget_optimization` | 8 |
| `audience_insight` | 5 |
| `ab_test_analysis` | 10 |
| `mcp_tool_call` | 2 |
| `audit_run` | 15 |

---

### POST /billing/use-credits

Internal endpoint for tracking credit consumption.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/billing/use-credits` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "feature": "campaign_analysis",
  "action": "Analyze ROAS trend",
  "platform": "meta"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `feature` | `string` | Yes | Feature key from credit costs table |
| `action` | `string` | Yes | Human-readable action description |
| `platform` | `string` | No | Platform identifier |

#### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "credits_used": 10,
    "remaining": 1140
  }
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `CREDIT_LIMIT` | 429 | Monthly credit limit exceeded |

---

## 11. Webhooks

> **Auth Required:** No — verified via platform-specific signatures and secrets.

All webhook endpoints respond with `200 OK` immediately and process payloads asynchronously.

---

### POST /webhooks/meta

Receive Meta (Facebook) platform webhooks.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/webhooks/meta` |
| **Auth Required** | No |

#### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Hub-Signature-256` | Yes | HMAC-SHA256 signature |

#### Request Body

Meta webhook payload (varies by event type).

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Received"
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Missing signature header |

---

### GET /webhooks/meta

Meta webhook verification endpoint (subscription setup).

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/webhooks/meta` |
| **Auth Required** | No |

#### Query Parameters

| Parameter | Description |
|-----------|-------------|
| `hub.mode` | Must be `subscribe` |
| `hub.verify_token` | Verification token |
| `hub.challenge` | Echo challenge |

#### Response

Returns the `hub.challenge` value as plain text on success, or `403` on failure.

---

### POST /webhooks/google

Receive Google Ads webhook events.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/webhooks/google` |
| **Auth Required** | No |

#### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `secret` | Yes | Webhook shared secret |

#### Request Body

Google webhook payload.

#### Response `200 OK`

```json
{ "success": true, "message": "Received" }
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Missing or invalid secret |

---

### POST /webhooks/tiktok

Receive TikTok webhook events.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/webhooks/tiktok` |
| **Auth Required** | No |

#### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Signature` | Yes | TikTok signature |

#### Response `200 OK`

```json
{ "success": true, "message": "Received" }
```

---

### POST /webhooks/snap

Receive Snap (Snapchat) webhook events.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/webhooks/snap` |
| **Auth Required** | No |

#### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `secret` | No | Optional shared secret for validation |

#### Response `200 OK`

```json
{ "success": true, "message": "Received" }
```

---

### POST /webhooks/custom/:workspaceId

Custom webhook for external integrations.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/webhooks/custom/:workspaceId` |
| **Auth Required** | No |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspaceId` | `string (uuid)` | Target workspace |

#### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Verification token |

#### Request Body

Any JSON payload. Forwarded to the workspace's configured webhook URL.

#### Response `200 OK`

```json
{ "success": true, "message": "Received" }
```

---

### POST /webhooks/register

Register a new webhook configuration.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/webhooks/register` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "workspace_id": "uuid",
  "platform": "meta",
  "webhook_url": "https://example.com/webhooks/meta",
  "events": ["campaign_updated", "ad_performance"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_id` | `string (uuid)` | Yes | Workspace ID |
| `platform` | `enum` | Yes | `meta`, `google`, `tiktok`, `snap`, `custom` |
| `webhook_url` | `string (url)` | Yes | Target URL |
| `events` | `string[]` | Yes | Events to subscribe to |

#### Response `201 Created`

```json
{
  "success": true,
  "message": "Webhook registered for meta"
}
```

---

## 12. Search

> **Auth Required:** Yes (all endpoints)

---

### GET /search

Global search across all entities (campaigns, adsets, ads, drafts).

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/search` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | `string` | **Required** | Search query (min 1 char) |
| `platform` | `string` | - | Filter by platform |
| `status` | `string` | - | Filter by status |
| `date_from` | `string` | - | Start date filter |
| `date_to` | `string` | - | End date filter |
| `min_spend` | `number` | - | Min spend filter |
| `max_spend` | `number` | - | Max spend filter |
| `min_roas` | `number` | - | Min ROAS filter |
| `limit` | `integer` | `20` | Max results |
| `offset` | `integer` | `0` | Pagination offset |
| `sort` | `string` | `relevance` | `relevance`, `spend`, `roas`, `created_at` |

#### Response `200 OK`

```json
{
  "success": true,
  "results": {
    "campaigns": [{ "id": "uuid", "name": "Summer Sale", "status": "active" }],
    "adsets": [{ "id": "uuid", "name": "US Audiences", "status": "active" }],
    "ads": [{ "id": "uuid", "name": "Carousel Ad 1", "status": "active" }],
    "drafts": [{ "id": "uuid", "change_summary": "Budget change", "status": "pending" }]
  },
  "total": 42,
  "query": "summer"
}
```

---

### GET /search/campaigns

Search campaigns only.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/campaigns` |
| **Auth Required** | Yes |

#### Query Parameters

Same as global search.

#### Response `200 OK`

```json
{
  "success": true,
  "campaigns": [...],
  "total": 15
}
```

---

### GET /search/adsets

Search adsets only.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/adsets` |
| **Auth Required** | Yes |

---

### GET /search/ads

Search ads only.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/ads` |
| **Auth Required** | Yes |

---

### GET /search/drafts

Search drafts only.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/drafts` |
| **Auth Required** | Yes |

---

### GET /search/audit

Search audit log entries.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/audit` |
| **Auth Required** | Yes |

#### Response `200 OK`

```json
{
  "success": true,
  "entries": [...],
  "total": 50
}
```

---

### GET /search/suggestions

Get autocomplete search suggestions.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/suggestions` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | `string` | **Required** | Partial query |
| `limit` | `integer` | `10` | Max suggestions |

#### Response `200 OK`

```json
{
  "success": true,
  "suggestions": ["summer sale", "summer campaign", "summer 2024"]
}
```

---

### GET /search/recent

Get recent searches for the current user.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/recent` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `integer` | `10` | Max items |

#### Response `200 OK`

```json
{
  "success": true,
  "searches": ["summer sale", "high roas campaigns", "budget over 500"]
}
```

---

### POST /search/recent

Save a search query to recent searches.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/search/recent` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "query": "summer sale campaign"
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Search saved"
}
```

---

## 13. Exports

> **Auth Required:** Yes (all endpoints)

All export endpoints return binary file data with appropriate `Content-Type` headers.

---

### GET /exports/campaigns.csv

Export campaigns as CSV.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/exports/campaigns.csv` |
| **Auth Required** | Yes |
| **Content-Type** | `text/csv; charset=utf-8` |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `platform` | `string` | - | Filter by platform |
| `status` | `string` | - | Filter by status |
| `date_from` | `string` | - | Start date |
| `date_to` | `string` | - | End date |
| `search` | `string` | - | Search term |
| `campaign_ids` | `string` | - | Comma-separated IDs |
| `columns` | `string` | all | Comma-separated column names |
| `include_insights` | `boolean` | `false` | Include performance data |

#### Response

Returns CSV file with `Content-Disposition: attachment` header.

---

### GET /exports/campaigns.xlsx

Export campaigns as Excel file.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/exports/campaigns.xlsx` |
| **Auth Required** | Yes |
| **Content-Type** | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

#### Query Parameters

Same as CSV export, plus:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_adsets` | `boolean` | `false` | Include adset data |
| `include_ads` | `boolean` | `false` | Include ad data |

---

### GET /exports/campaigns/stream.csv

Stream campaigns as CSV for large datasets (1000+ campaigns).

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/exports/campaigns/stream.csv` |
| **Auth Required** | Yes |
| **Content-Type** | `text/csv; charset=utf-8` |

Uses streaming response for memory-efficient large exports.

---

### GET /exports/insights.csv

Export campaign insights as CSV.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/exports/insights.csv` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `granularity` | `string` | - | `daily`, `weekly`, or `monthly` |

---

### GET /exports/audit.csv

Export audit log as CSV.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/exports/audit.csv` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `action_category` | `string` | Filter by action type |
| `date_from` | `string` | Start date |
| `date_to` | `string` | End date |

---

### GET /exports/reports/:reportId.pdf

Export a report as PDF.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/exports/reports/:reportId.pdf` |
| **Auth Required** | Yes |
| **Content-Type** | `text/html; charset=utf-8` (print-to-PDF) |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `reportId` | `string` | Report identifier |

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | `string` | Custom report title |
| `date_from` | `string` | Report start date |
| `date_to` | `string` | Report end date |

---

### GET /exports/reports/:reportId.xlsx

Export a report as Excel.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/exports/reports/:reportId.xlsx` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `template` | `string` | Report template name |

---

### POST /exports/queue

Queue an export job for asynchronous processing.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Path** | `/api/v1/exports/queue` |
| **Auth Required** | Yes |

#### Request Body

```json
{
  "type": "campaigns",
  "format": "csv",
  "filter": {
    "platform": "meta",
    "status": "active",
    "date_from": "2024-01-01",
    "date_to": "2024-01-31",
    "campaign_ids": ["uuid1", "uuid2"],
    "search": "summer"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | Export type |
| `format` | `enum` | Yes | `csv`, `excel`, or `pdf` |
| `filter` | `object` | No | Export filters |

#### Response `202 Accepted`

```json
{
  "success": true,
  "jobId": "uuid",
  "status": "queued",
  "message": "Export job queued. Use GET /api/v1/exports/jobs/:jobId to check status."
}
```

---

### GET /exports/jobs/:jobId

Check the status of a queued export job.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/exports/jobs/:jobId` |
| **Auth Required** | Yes |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `jobId` | `string (uuid)` | Job ID from queue response |

#### Response `200 OK`

```json
{
  "success": true,
  "status": "completed",
  "downloadUrl": "https://cdn.adnexus.ai/exports/uuid.csv",
  "error": null
}
```

Job statuses: `queued`, `processing`, `completed`, `failed`.

---

## 14. Real-Time (SSE)

> **Auth Required:** Yes

Server-Sent Events for real-time dashboard updates. Connects via persistent HTTP connection with automatic heartbeat pings (30s interval).

---

### GET /realtime/events

Subscribe to real-time events for a workspace.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/api/v1/realtime/events` |
| **Auth Required** | Yes |
| **Content-Type** | `text/event-stream` |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | `string (uuid)` | Yes | Workspace to subscribe to |

#### Headers

```
Authorization: Bearer <jwt_token>
Accept: text/event-stream
Cache-Control: no-cache
```

#### SSE Event Types

| Event Type | Description | Data Shape |
|------------|-------------|------------|
| `connected` | Initial connection | `{ clientId, workspaceId, connectedAt }` |
| `draft_updated` | Draft status changed | `{ draft: { id, status, change_summary, ... } }` |
| `campaign_updated` | Campaign metrics changed | `{ campaign: { id, name, spend, roas, ... } }` |
| `new_notification` | New notification | `{ notification: { id, type, title, message, ... } }` |
| `rule_triggered` | AI rule fired | `{ rule: { id, name, ... }, draft: { ... } }` |
| `goal_alert` | Goal status alert | `{ goal: { id, name, status, progress_pct, ... } }` |
| `budget_alert` | Budget threshold | `{ campaign, percentUsed, remainingBudget }` |
| `metrics_synced` | Metrics sync completed | `{ result: { campaignsUpdated, adsetsUpdated, ... } }` |
| `server_shutdown` | Server is shutting down | `{ message }` |

#### Example Event Stream

```
event: draft_updated
data: {"type":"draft_updated","timestamp":"2024-01-15T10:00:00Z","data":{"draft":{"id":"uuid","status":"approved","change_summary":"Budget increase"}}}

:ping

event: campaign_updated
data: {"type":"campaign_updated","timestamp":"2024-01-15T10:00:00Z","data":{"campaign":{"id":"uuid","spend":1500,"roas":4.2}}}
```

---

## 15. Health & Observability

> **Auth Required:** No (all endpoints)

---

### GET /live

Simple liveness check.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/live` |

#### Response `200 OK`

```json
{ "status": "alive" }
```

---

### GET /ready

Readiness check — verifies database connectivity.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/ready` |

#### Response `200 OK` (ready)

```json
{
  "status": "ready",
  "checks": { "db": "ok", "redis": "ok" }
}
```

#### Response `503 Service Unavailable` (not ready)

```json
{
  "status": "not_ready",
  "checks": { "db": "error" }
}
```

---

### GET /health

Enhanced health check with dependency status.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/health` |

#### Response `200 OK`

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": 86400,
  "checks": {
    "db": "ok",
    "redis": "ok"
  }
}
```

#### Response `503` (degraded)

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": 86400,
  "checks": {
    "db": "ok",
    "redis": "error"
  }
}
```

| Check Value | Description |
|-------------|-------------|
| `ok` | Dependency is healthy |
| `error` | Dependency is unreachable |
| `not_configured` | Dependency is optional and not configured |

---

### GET /metrics

Prometheus-compatible metrics endpoint.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Path** | `/metrics` |
| **Content-Type** | `text/plain; version=0.0.4` |

#### Response

Returns raw Prometheus metrics text (HTTP requests, response times, active connections, etc.).

---

## 16. Error Reference

### Error Response Format

All errors follow this consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

### Error Codes

| Code | Status | Description | When It Occurs |
|------|--------|-------------|----------------|
| `UNAUTHORIZED` | 401 | Missing or invalid credentials | No/invalid JWT, expired token |
| `FORBIDDEN` | 403 | Access denied | Insufficient role, wrong workspace |
| `NOT_FOUND` | 404 | Resource not found | Invalid ID, deleted resource |
| `VALIDATION_ERROR` | 400 | Invalid input data | Schema mismatch, missing required fields |
| `RATE_LIMIT` | 429 | Rate limit exceeded | Too many requests |
| `CREDIT_LIMIT` | 429 | Monthly credit limit exceeded | AI feature overuse |
| `PLATFORM_ERROR` | 502 | Ad platform API error | Meta/Google/TikTok API failure |
| `INTERNAL_ERROR` | 500 | Server error | Unexpected server failure |

### HTTP Status Code Summary

| Status | Meaning |
|--------|---------|
| `200 OK` | Request successful |
| `201 Created` | Resource created successfully |
| `202 Accepted` | Async job queued |
| `400 Bad Request` | Validation error |
| `401 Unauthorized` | Authentication required |
| `403 Forbidden` | Access denied |
| `404 Not Found` | Resource not found |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Server error |
| `502 Bad Gateway` | Platform API error |
| `503 Service Unavailable` | Service degraded |

---

## 17. Common Patterns

### Authentication Flow

```
1. POST /api/v1/auth/signin → { token, refresh_token, user, workspace }
2. Store token securely
3. Send Authorization: Bearer <token> on every request
4. On 401: POST /api/v1/auth/refresh → { token }
5. On refresh failure: redirect to signin
```

### Draft Approval Workflow

```
1. POST /api/v1/campaigns → creates draft (status: pending)
2. (or AI Agent creates draft via rules)
3. User reviews: GET /api/v1/drafts/:id
4. User approves: POST /api/v1/drafts/:id/approve
5. Change is applied to live ad account
6. Real-time: draft_updated event sent via SSE
```

### Pagination

All list endpoints use consistent pagination:

```
GET /api/v1/campaigns?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Filtering Pattern

```
GET /api/v1/campaigns?platform=meta&status=active
GET /api/v1/drafts?status=pending&platform=google
GET /api/v1/notifications?status=unread&type=rule_triggered
```

### Date Range Filtering

```
GET /api/v1/campaigns/:id/insights?date_start=2024-01-01&date_end=2024-01-31
GET /api/v1/reports/cross-platform?date_start=2024-01-01&date_end=2024-01-31
```

### WebSocket Alternative (SSE)

```javascript
const eventSource = new EventSource(
  '/api/v1/realtime/events?workspace_id=WORKSPACE_ID',
  { headers: { 'Authorization': 'Bearer ' + token } }
);

eventSource.addEventListener('draft_updated', (e) => {
  const data = JSON.parse(e.data);
  console.log('Draft updated:', data.data.draft);
});

eventSource.addEventListener('campaign_updated', (e) => {
  const data = JSON.parse(e.data);
  console.log('Campaign metrics:', data.data.campaign);
});
```

---

*Generated from source code analysis. Last updated: 2024-01-15*
